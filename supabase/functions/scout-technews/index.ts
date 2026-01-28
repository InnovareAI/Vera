/**
 * VERA Scout TechCrunch - Tech/Startup News Monitoring
 * 
 * Monitors TechCrunch RSS for startup and tech news.
 * Free, no API key needed.
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

// TechCrunch RSS feeds to monitor
const FEEDS = [
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { name: 'TC Startups', url: 'https://techcrunch.com/category/startups/feed/' },
    { name: 'TC AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
    { name: 'TheVerge Tech', url: 'https://www.theverge.com/rss/index.xml' },
]

interface NewsArticle {
    title: string
    url: string
    source: string
    description: string
    publishedAt: string
    author?: string
}

/**
 * Fetch news RSS
 */
async function fetchNewsFeed(name: string, feedUrl: string): Promise<NewsArticle[]> {
    try {
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'VERA-Scout/1.0 (News Aggregator)',
            }
        })

        if (!response.ok) {
            console.log(`⚠️ ${name} returned ${response.status}`)
            return []
        }

        const xml = await response.text()
        const articles: NewsArticle[] = []

        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

        for (const match of itemMatches) {
            const itemXml = match[1]
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
            const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim().substring(0, 300) || ''
            const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''
            const author = itemXml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''

            if (title && link) {
                articles.push({
                    title,
                    url: link,
                    source: name,
                    description,
                    publishedAt: pubDate,
                    author,
                })
            }

            if (articles.length >= 10) break
        }

        console.log(`✅ Found ${articles.length} articles from ${name}`)
        return articles
    } catch (error) {
        console.error(`RSS error for ${name}:`, error)
        return []
    }
}

/**
 * Score article relevance for B2B content
 */
function scoreArticle(article: NewsArticle): number {
    let score = 30 // Base score
    const text = `${article.title} ${article.description}`.toLowerCase()

    // High-value topics
    if (/ai|artificial intelligence|machine learning/i.test(text)) score += 25
    if (/saas|b2b|enterprise/i.test(text)) score += 20
    if (/startup|raised|funding|series [a-d]|ipo/i.test(text)) score += 20
    if (/sales|marketing|growth|revenue/i.test(text)) score += 15
    if (/automation|workflow|productivity/i.test(text)) score += 15

    // Competitor/industry mentions
    if (/salesforce|hubspot|outreach|apollo|instantly/i.test(text)) score += 20

    // Action-oriented
    if (/launch|release|announce|unveil|introduce/i.test(text)) score += 10

    return Math.min(100, score)
}

/**
 * Send Google Chat alert
 */
async function sendAlert(articles: { article: NewsArticle; score: number }[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || articles.length === 0) return false

    const sections = articles.slice(0, 5).map(a => ({
        header: `📰 ${a.article.source}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Headline',
                    text: a.article.title,
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Summary',
                    text: a.article.description.substring(0, 150) + '...',
                    wrapText: true,
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'Read Article',
                        onClick: { openLink: { url: a.article.url } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-techcrunch-scout',
            card: {
                header: {
                    title: '📰 VERA Tech News Scout',
                    subtitle: `${articles.length} relevant tech articles`,
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

    console.log('📰 Starting Tech News Scout...')

    const stats = {
        feedsChecked: 0,
        articlesFound: 0,
        newArticles: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'technews')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((count || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allArticles: { article: NewsArticle; score: number }[] = []

        for (const feed of FEEDS) {
            stats.feedsChecked++

            const articles = await fetchNewsFeed(feed.name, feed.url)
            stats.articlesFound += articles.length

            for (const article of articles) {
                const articleId = `technews-${btoa(article.url).substring(0, 50)}`

                // Check if seen
                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'technews')
                    .eq('post_id', articleId)
                    .single()

                if (existing) continue

                const score = scoreArticle(article)

                // Only save if relevant (score >= 40)
                if (score < 40) continue

                // Mark as seen
                await supabase.from('seen_posts').insert({
                    platform: 'technews',
                    post_id: articleId,
                    url: article.url,
                })

                stats.newArticles++

                // Save to topics
                await supabase.from('topics').insert({
                    title: article.title,
                    source: 'technews',
                    source_url: article.url,
                    relevance_score: score / 100,
                    content: JSON.stringify({
                        source: article.source,
                        description: article.description,
                        author: article.author,
                        publishedAt: article.publishedAt,
                    }),
                })

                if (score >= 60) {
                    allArticles.push({ article, score })
                }
            }

            await new Promise(r => setTimeout(r, 300))
        }

        // Send alerts
        if (allArticles.length > 0) {
            const top = allArticles.sort((a, b) => b.score - a.score).slice(0, 5)
            const sent = await sendAlert(top)
            if (sent) stats.alertsSent = top.length
        }

        console.log('📰 Tech News Scout complete:', stats)

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
