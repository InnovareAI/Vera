/**
 * VERA Scout Substack - Newsletter & Thought Leader Monitoring
 * 
 * Monitors popular Substack newsletters for trending content ideas.
 * Uses RSS feeds (free, no API key needed).
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

const DAILY_CAP = 50

// Popular B2B/SaaS/Marketing Substacks to monitor
const SUBSTACKS = [
    { name: 'Lenny Rachitsky', slug: 'lennysnewsletter' },
    { name: 'The Hustle', slug: 'thehustle' },
    { name: 'Growth Unhinged', slug: 'growthunhinged' },
    { name: 'Demand Curve', slug: 'demandcurve' },
    { name: 'Marketing Examples', slug: 'marketingexamples' },
    { name: 'SaaStr', slug: 'saastr' },
    { name: 'Elena Verna', slug: 'elenaverna' },
    { name: 'Kyle Poyar', slug: 'kylepoyar' },
    { name: 'Product Hunt', slug: 'producthunt' },
    { name: 'Startup Archive', slug: 'startuparchive' },
]

interface SubstackPost {
    title: string
    url: string
    author: string
    description: string
    publishedAt: string
}

/**
 * Fetch Substack RSS
 */
async function fetchSubstack(author: string, slug: string): Promise<SubstackPost[]> {
    try {
        const rssUrl = `https://${slug}.substack.com/feed`

        const response = await fetch(rssUrl, {
            headers: {
                'User-Agent': 'VERA-Scout/1.0 (Content Research)',
            }
        })

        if (!response.ok) {
            console.log(`⚠️ Substack ${slug} returned ${response.status}`)
            return []
        }

        const xml = await response.text()
        const posts: SubstackPost[] = []

        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

        for (const match of itemMatches) {
            const itemXml = match[1]
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
            const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim().substring(0, 300) || ''
            const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''

            if (title && link) {
                posts.push({
                    title,
                    url: link,
                    author,
                    description,
                    publishedAt: pubDate,
                })
            }

            if (posts.length >= 5) break
        }

        console.log(`✅ Found ${posts.length} posts from ${author}`)
        return posts
    } catch (error) {
        console.error(`Substack RSS error for ${slug}:`, error)
        return []
    }
}

/**
 * Score post relevance
 */
function scorePost(post: SubstackPost): number {
    let score = 50 // Base score from thought leader
    const text = `${post.title} ${post.description}`.toLowerCase()

    // Topic relevance
    if (/growth|scale|startup|saas/i.test(text)) score += 15
    if (/marketing|content|brand/i.test(text)) score += 10
    if (/sales|revenue|pipeline/i.test(text)) score += 15
    if (/ai|automation|product/i.test(text)) score += 10
    if (/strategy|framework|playbook/i.test(text)) score += 15

    // Engagement indicators
    if (/\d+%|\$\d+|million|billion/i.test(post.title)) score += 10

    return Math.min(100, score)
}

/**
 * Send Google Chat alert
 */
async function sendAlert(posts: { post: SubstackPost; score: number }[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || posts.length === 0) return false

    const sections = posts.slice(0, 5).map(p => ({
        header: `📰 ${p.post.author}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Title',
                    text: p.post.title,
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Summary',
                    text: p.post.description.substring(0, 150) + '...',
                    wrapText: true,
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'Read Newsletter',
                        onClick: { openLink: { url: p.post.url } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-substack-scout',
            card: {
                header: {
                    title: '📰 VERA Substack Scout',
                    subtitle: `${posts.length} new thought leader posts`,
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

    console.log('📰 Starting Substack Scout...')

    const stats = {
        newslettersChecked: 0,
        postsFound: 0,
        newPosts: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'substack')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((count || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allPosts: { post: SubstackPost; score: number }[] = []

        for (const substack of SUBSTACKS) {
            stats.newslettersChecked++

            const posts = await fetchSubstack(substack.name, substack.slug)
            stats.postsFound += posts.length

            for (const post of posts) {
                const postId = `substack-${btoa(post.url).substring(0, 50)}`

                // Check if seen
                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'substack')
                    .eq('post_id', postId)
                    .single()

                if (existing) continue

                // Mark as seen
                await supabase.from('seen_posts').insert({
                    platform: 'substack',
                    post_id: postId,
                    url: post.url,
                })

                stats.newPosts++

                const score = scorePost(post)

                // Save to topics
                await supabase.from('topics').insert({
                    title: post.title,
                    source: 'substack',
                    source_url: post.url,
                    relevance_score: score / 100,
                    content: JSON.stringify({
                        author: post.author,
                        description: post.description,
                        publishedAt: post.publishedAt,
                    }),
                })

                if (score >= 60) {
                    allPosts.push({ post, score })
                }
            }

            await new Promise(r => setTimeout(r, 300))
        }

        // Send alerts
        if (allPosts.length > 0) {
            const top = allPosts.sort((a, b) => b.score - a.score).slice(0, 5)
            const sent = await sendAlert(top)
            if (sent) stats.alertsSent = top.length
        }

        console.log('📰 Substack Scout complete:', stats)

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
