/**
 * VERA Scout YouTube - Video Trend Monitoring
 * 
 * Monitors YouTube for trending videos and content ideas
 * using the free YouTube Data API v3.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const GOOGLE_CHAT_WEBHOOK_URL = Deno.env.get('GOOGLE_CHAT_WEBHOOK_URL') || ''
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || ''

const MAX_RESULTS = 10
const DAILY_CAP = 50

// Search queries for content ideas
const SEARCH_QUERIES = [
    'AI sales automation',
    'B2B marketing strategy',
    'cold email tips',
    'LinkedIn growth',
    'startup marketing',
    'SaaS content marketing',
    'sales automation tools',
    'AI for business',
]

interface YouTubeVideo {
    id: string
    title: string
    description: string
    channelTitle: string
    publishedAt: string
    thumbnailUrl: string
    viewCount?: string
    likeCount?: string
}

/**
 * Search YouTube videos
 */
async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
    if (!YOUTUBE_API_KEY) {
        console.log('⚠️ No YouTube API key configured, using RSS fallback')
        return searchYouTubeRSS(query)
    }

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=date&maxResults=${MAX_RESULTS}&key=${YOUTUBE_API_KEY}`

        const response = await fetch(url)

        if (!response.ok) {
            console.error(`YouTube API error: ${response.status}`)
            return searchYouTubeRSS(query)
        }

        const data = await response.json()

        return (data.items || []).map((item: any) => ({
            id: item.id?.videoId || '',
            title: item.snippet?.title || '',
            description: item.snippet?.description || '',
            channelTitle: item.snippet?.channelTitle || '',
            publishedAt: item.snippet?.publishedAt || '',
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url || '',
        }))
    } catch (error) {
        console.error('YouTube API error:', error)
        return searchYouTubeRSS(query)
    }
}

/**
 * Fallback: Search YouTube via RSS (no API key needed)
 */
async function searchYouTubeRSS(query: string): Promise<YouTubeVideo[]> {
    try {
        // Use YouTube's RSS feed for search results
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?search_query=${encodeURIComponent(query)}`

        const response = await fetch(rssUrl)
        if (!response.ok) return []

        const xml = await response.text()
        const videos: YouTubeVideo[] = []

        const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)

        for (const match of entryMatches) {
            const entryXml = match[1]
            const id = entryXml.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1] || ''
            const title = entryXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
            const channelTitle = entryXml.match(/<name>([\s\S]*?)<\/name>/)?.[1] || ''
            const publishedAt = entryXml.match(/<published>([\s\S]*?)<\/published>/)?.[1] || ''

            if (id && title) {
                videos.push({
                    id,
                    title,
                    description: '',
                    channelTitle,
                    publishedAt,
                    thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
                })
            }

            if (videos.length >= MAX_RESULTS) break
        }

        return videos
    } catch (error) {
        console.error('YouTube RSS error:', error)
        return []
    }
}

/**
 * Score video relevance
 */
function scoreVideo(video: YouTubeVideo, query: string): number {
    let score = 50 // Base score

    const text = `${video.title} ${video.description}`.toLowerCase()

    // Keyword relevance
    const keywords = query.toLowerCase().split(' ')
    for (const kw of keywords) {
        if (text.includes(kw)) score += 10
    }

    // Quality indicators in title
    if (/how to|tutorial|guide|tips|strategy/i.test(video.title)) score += 15
    if (/\d{4}|new|latest/i.test(video.title)) score += 10

    return Math.min(100, score)
}

/**
 * Send Google Chat alert
 */
async function sendAlert(videos: { video: YouTubeVideo; score: number; query: string }[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || videos.length === 0) return false

    const sections = videos.slice(0, 5).map(v => ({
        header: `🎬 ${v.query}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Title',
                    text: v.video.title,
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Channel',
                    text: v.video.channelTitle,
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'Watch Video',
                        onClick: { openLink: { url: `https://youtube.com/watch?v=${v.video.id}` } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-youtube-scout',
            card: {
                header: {
                    title: '🎬 VERA YouTube Scout',
                    subtitle: `${videos.length} trending videos found`,
                },
                sections,
            }
        }]
    }

    try {
        const response = await fetch(GOOGLE_CHAT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        })
        return response.ok
    } catch (error) {
        console.error('Alert error:', error)
        return false
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('🎬 Starting YouTube Scout...')

    const stats = {
        queriesSearched: 0,
        videosFound: 0,
        newVideos: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'youtube')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((count || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allVideos: { video: YouTubeVideo; score: number; query: string }[] = []

        for (const query of SEARCH_QUERIES.slice(0, 4)) {
            stats.queriesSearched++

            const videos = await searchYouTube(query)
            stats.videosFound += videos.length

            for (const video of videos) {
                const videoId = `yt-${video.id}`

                // Check if seen
                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'youtube')
                    .eq('post_id', videoId)
                    .single()

                if (existing) continue

                // Mark as seen
                await supabase.from('seen_posts').insert({
                    platform: 'youtube',
                    post_id: videoId,
                    url: `https://youtube.com/watch?v=${video.id}`,
                })

                stats.newVideos++

                const score = scoreVideo(video, query)

                // Save to topics
                await supabase.from('topics').insert({
                    title: video.title,
                    source: 'youtube',
                    source_url: `https://youtube.com/watch?v=${video.id}`,
                    relevance_score: score / 100,
                    content: JSON.stringify({
                        channel: video.channelTitle,
                        description: video.description,
                        thumbnail: video.thumbnailUrl,
                        query,
                    }),
                })

                if (score >= 60) {
                    allVideos.push({ video, score, query })
                }
            }

            await new Promise(r => setTimeout(r, 500))
        }

        // Send alerts
        if (allVideos.length > 0) {
            const top = allVideos.sort((a, b) => b.score - a.score).slice(0, 5)
            const sent = await sendAlert(top)
            if (sent) stats.alertsSent = top.length
        }

        console.log('🎬 YouTube Scout complete:', stats)

        return new Response(
            JSON.stringify({ success: true, stats, timestamp: new Date().toISOString() }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('❌ Scout error:', error)
        return new Response(
            JSON.stringify({ error: 'Scout failed', details: error instanceof Error ? error.message : 'Unknown' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
