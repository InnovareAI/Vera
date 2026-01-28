/**
 * VERA Competitive Monitor - Track competitor activity across platforms
 * 
 * Monitors mentions, news, and discussions about competitors.
 * Sends alerts when competitors are mentioned in high-value contexts.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const GOOGLE_CHAT_WEBHOOK_URL = Deno.env.get('GOOGLE_CHAT_WEBHOOK_URL') || ''
const UNIPILE_DSN = Deno.env.get('UNIPILE_DSN') || 'api6.unipile.com:13670'
const UNIPILE_API_KEY = Deno.env.get('UNIPILE_API_KEY') || ''
const UNIPILE_ACCOUNT_ID = Deno.env.get('UNIPILE_ACCOUNT_ID') || ''

// Competitors to monitor
const COMPETITORS = [
    { name: 'Apollo.io', keywords: ['apollo.io', 'apollo sales', 'apolloio'] },
    { name: 'Instantly', keywords: ['instantly.ai', 'instantly ai', 'instantly cold email'] },
    { name: 'Lemlist', keywords: ['lemlist', 'lem list'] },
    { name: 'Outreach', keywords: ['outreach.io', 'outreach sales'] },
    { name: 'Salesloft', keywords: ['salesloft', 'sales loft'] },
    { name: 'Clay', keywords: ['clay.com', 'clay data', 'clay enrichment'] },
    { name: 'Smartlead', keywords: ['smartlead', 'smart lead'] },
    { name: 'ZoomInfo', keywords: ['zoominfo', 'zoom info'] },
    { name: 'Seamless.AI', keywords: ['seamless.ai', 'seamless ai'] },
    { name: 'Lusha', keywords: ['lusha'] },
]

// Context patterns that make mentions high-value
const HIGH_VALUE_CONTEXTS = [
    /alternative to|instead of|switching from|leaving|left/i,
    /vs\.?|versus|compared to|comparison/i,
    /problems? with|issues? with|frustrated with|hate|disappointed/i,
    /raised|funding|acquired|acquisition|IPO|layoffs?/i,
    /pricing|cost|expensive|cheaper|free trial/i,
    /review|experience|honest|opinion/i,
]

interface CompetitorMention {
    competitor: string
    source: string
    title: string
    content: string
    url: string
    context: string
    isHighValue: boolean
    publishedAt?: string
}

/**
 * Search Google News for competitor mentions
 */
async function searchNewsForCompetitor(competitor: { name: string; keywords: string[] }): Promise<CompetitorMention[]> {
    const mentions: CompetitorMention[] = []

    for (const keyword of competitor.keywords.slice(0, 1)) { // Limit to first keyword
        try {
            const response = await fetch(
                `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`
            )

            if (!response.ok) continue

            const xml = await response.text()
            const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

            for (const match of itemMatches) {
                const itemXml = match[1]
                const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
                const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
                const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''

                if (!title) continue

                const isHighValue = HIGH_VALUE_CONTEXTS.some(pattern => pattern.test(title))
                const context = isHighValue ? 'High-value opportunity' : 'General mention'

                mentions.push({
                    competitor: competitor.name,
                    source: 'google-news',
                    title,
                    content: '',
                    url: link,
                    context,
                    isHighValue,
                    publishedAt: pubDate,
                })

                if (mentions.length >= 5) break
            }
        } catch (error) {
            console.error(`News search error for ${competitor.name}:`, error)
        }
    }

    return mentions
}

/**
 * Search LinkedIn for competitor mentions
 */
async function searchLinkedInForCompetitor(competitor: { name: string; keywords: string[] }): Promise<CompetitorMention[]> {
    if (!UNIPILE_API_KEY || !UNIPILE_ACCOUNT_ID) return []

    const mentions: CompetitorMention[] = []

    try {
        const response = await fetch(
            `https://${UNIPILE_DSN}/api/v1/linkedin/search?account_id=${UNIPILE_ACCOUNT_ID}`,
            {
                method: 'POST',
                headers: {
                    'X-API-KEY': UNIPILE_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api: 'classic',
                    category: 'posts',
                    keywords: competitor.name,
                    date_posted: 'past_week',
                    sort_by: 'date',
                }),
            }
        )

        if (!response.ok) return []

        const data = await response.json()

        for (const post of (data.items || []).slice(0, 5)) {
            const text = post.text || ''
            const isHighValue = HIGH_VALUE_CONTEXTS.some(pattern => pattern.test(text))

            mentions.push({
                competitor: competitor.name,
                source: 'linkedin',
                title: `${post.author?.name || 'Unknown'}: ${text.substring(0, 100)}...`,
                content: text,
                url: post.share_url || '',
                context: isHighValue ? 'High-value opportunity' : 'General mention',
                isHighValue,
                publishedAt: post.parsed_datetime,
            })
        }
    } catch (error) {
        console.error(`LinkedIn search error for ${competitor.name}:`, error)
    }

    return mentions
}

/**
 * Search Hacker News for competitor mentions
 */
async function searchHNForCompetitor(competitor: { name: string; keywords: string[] }): Promise<CompetitorMention[]> {
    const mentions: CompetitorMention[] = []

    try {
        const response = await fetch(
            `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(competitor.name)}&tags=story&hitsPerPage=5`
        )

        if (!response.ok) return []

        const data = await response.json()

        for (const hit of (data.hits || [])) {
            const text = `${hit.title} ${hit.story_text || ''}`
            const isHighValue = HIGH_VALUE_CONTEXTS.some(pattern => pattern.test(text))

            mentions.push({
                competitor: competitor.name,
                source: 'hackernews',
                title: hit.title || '',
                content: hit.story_text || '',
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                context: isHighValue ? 'High-value opportunity' : 'General mention',
                isHighValue,
                publishedAt: hit.created_at,
            })
        }
    } catch (error) {
        console.error(`HN search error for ${competitor.name}:`, error)
    }

    return mentions
}

/**
 * Send Google Chat alert for competitor mentions
 */
async function sendAlert(mentions: CompetitorMention[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || mentions.length === 0) return false

    const highValueMentions = mentions.filter(m => m.isHighValue)
    if (highValueMentions.length === 0) return true // No high-value mentions to alert

    const sections = highValueMentions.slice(0, 5).map(m => ({
        header: `🎯 ${m.competitor} (${m.source})`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Title',
                    text: m.title.substring(0, 200),
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Context',
                    text: m.context,
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'View',
                        onClick: { openLink: { url: m.url } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-competitor-monitor',
            card: {
                header: {
                    title: '🎯 VERA Competitive Intel',
                    subtitle: `${highValueMentions.length} high-value competitor mentions`,
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

    console.log('🎯 Starting Competitive Monitor...')

    const stats = {
        competitorsChecked: 0,
        totalMentions: 0,
        highValueMentions: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        const allMentions: CompetitorMention[] = []

        // Check each competitor across sources
        for (const competitor of COMPETITORS) {
            stats.competitorsChecked++

            // Parallel search across sources
            const [newsMentions, linkedInMentions, hnMentions] = await Promise.all([
                searchNewsForCompetitor(competitor),
                searchLinkedInForCompetitor(competitor),
                searchHNForCompetitor(competitor),
            ])

            const competitorMentions = [...newsMentions, ...linkedInMentions, ...hnMentions]
            allMentions.push(...competitorMentions)

            console.log(`📊 ${competitor.name}: ${competitorMentions.length} mentions`)

            // Small delay between competitors
            await new Promise(r => setTimeout(r, 500))
        }

        stats.totalMentions = allMentions.length
        stats.highValueMentions = allMentions.filter(m => m.isHighValue).length

        // Save high-value mentions to database
        for (const mention of allMentions.filter(m => m.isHighValue)) {
            const mentionId = btoa(`${mention.competitor}-${mention.url}`).substring(0, 50)

            // Check if seen
            const { data: existing } = await supabase
                .from('seen_posts')
                .select('id')
                .eq('platform', 'competitor')
                .eq('post_id', mentionId)
                .single()

            if (existing) continue

            // Mark as seen
            await supabase.from('seen_posts').insert({
                platform: 'competitor',
                post_id: mentionId,
                url: mention.url,
            })

            // Save to topics
            await supabase.from('topics').insert({
                title: `Competitor: ${mention.competitor} - ${mention.title.substring(0, 80)}`,
                source: `competitor-${mention.source}`,
                source_url: mention.url,
                relevance_score: 0.9,
                content: JSON.stringify({
                    competitor: mention.competitor,
                    originalSource: mention.source,
                    context: mention.context,
                    content: mention.content,
                }),
            })
        }

        // Send alerts for high-value mentions
        if (stats.highValueMentions > 0) {
            const sent = await sendAlert(allMentions)
            if (sent) stats.alertsSent = stats.highValueMentions
        }

        console.log('🎯 Competitive Monitor complete:', stats)

        return new Response(
            JSON.stringify({
                success: true,
                stats,
                competitors: COMPETITORS.map(c => c.name),
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('❌ Monitor error:', error)
        return new Response(
            JSON.stringify({ error: 'Monitor failed', details: error instanceof Error ? error.message : 'Unknown' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
