/**
 * VERA Scout Google News - Industry News Monitoring via RSS
 * 
 * Fetches SaaS/Sales tech news from Google News RSS feeds
 * and alerts via Google Chat for relevant articles.
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

const MAX_ARTICLES_PER_QUERY = 10
const DAILY_ARTICLE_CAP = 50

// Google News RSS search queries
const NEWS_QUERIES = [
    'AI sales automation',
    'SDR automation software',
    'B2B sales technology',
    'sales AI startup',
    'outbound sales tools',
    'Apollo Instantly Lemlist',
    'sales engagement platform',
    'cold email deliverability',
]

// Relevance scoring patterns
const RELEVANCE_PATTERNS = {
    high_relevance: {
        weight: 100,
        patterns: [
            /AI.*(sales|SDR|outbound|prospecting)/i,
            /(sales|SDR).*(automation|AI|tool)/i,
            /B2B.*(sales|outreach|engagement)/i,
            /(Apollo|Instantly|Lemlist|Outreach|Salesloft).*(alternative|competitor|vs|funding|raised)/i,
        ]
    },
    medium_relevance: {
        weight: 60,
        patterns: [
            /startup.*(sales|growth|revenue)/i,
            /cold.*(email|outreach|calling)/i,
            /lead.*(generation|scoring|enrichment)/i,
            /sales.*(tech|stack|tools|software)/i,
        ]
    },
    low_relevance: {
        weight: 30,
        patterns: [
            /SaaS.*(growth|funding|startup)/i,
            /CRM.*(market|trends|software)/i,
            /marketing.*(automation|tech)/i,
        ]
    },
}

interface NewsArticle {
    title: string
    link: string
    pubDate: string
    source: string
    description: string
}

interface ScoredArticle {
    article: NewsArticle
    score: number
    category: string
    query: string
}

/**
 * Parse Google News RSS XML
 */
function parseRSS(xml: string): NewsArticle[] {
    const articles: NewsArticle[] = []

    // Simple XML parsing for RSS items
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

    for (const match of itemMatches) {
        const itemXml = match[1]

        const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
        const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
        const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''
        const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
        const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''

        if (title && link) {
            articles.push({ title, link, pubDate, source, description })
        }
    }

    return articles
}

/**
 * Fetch Google News RSS for a query
 */
async function fetchGoogleNews(query: string): Promise<NewsArticle[]> {
    const encodedQuery = encodeURIComponent(query)
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`

    try {
        const response = await fetch(rssUrl, {
            headers: {
                'User-Agent': 'VERA-Scout/1.0 (News Aggregator)',
            }
        })

        if (!response.ok) {
            console.error(`❌ Google News fetch error: ${response.status}`)
            return []
        }

        const xml = await response.text()
        const articles = parseRSS(xml)

        console.log(`✅ Found ${articles.length} articles for "${query}"`)
        return articles.slice(0, MAX_ARTICLES_PER_QUERY)
    } catch (error) {
        console.error(`❌ Error fetching news for "${query}":`, error)
        return []
    }
}

/**
 * Score article by relevance patterns
 */
function scoreArticle(article: NewsArticle, query: string): ScoredArticle | null {
    const text = `${article.title} ${article.description}`

    let maxScore = 0
    let matchedCategory = ''

    for (const [category, config] of Object.entries(RELEVANCE_PATTERNS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(text)) {
                if (config.weight > maxScore) {
                    maxScore = config.weight
                    matchedCategory = category
                }
            }
        }
    }

    if (maxScore < 30) return null

    return {
        article,
        score: maxScore,
        category: matchedCategory,
        query,
    }
}

/**
 * Send Google Chat alert
 */
async function sendGoogleChatAlert(articles: ScoredArticle[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || articles.length === 0) return false

    const sections = articles.slice(0, 5).map(sa => ({
        header: `📰 ${sa.category.replace('_', ' ').toUpperCase()}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Headline',
                    text: sa.article.title,
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Source',
                    text: sa.article.source || 'Unknown',
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'Read Article',
                        onClick: { openLink: { url: sa.article.link } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-news-scout',
            card: {
                header: {
                    title: '📰 VERA News Scout',
                    subtitle: `${articles.length} relevant industry articles`,
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
        console.error('❌ Google Chat error:', error)
        return false
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('🚀 Starting VERA Google News Scout...')

    const stats = {
        queriesSearched: 0,
        totalArticles: 0,
        relevantArticles: 0,
        newArticles: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count: todayCount } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'google-news')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((todayCount || 0) >= DAILY_ARTICLE_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allScoredArticles: ScoredArticle[] = []

        for (const query of NEWS_QUERIES) {
            stats.queriesSearched++

            const articles = await fetchGoogleNews(query)
            stats.totalArticles += articles.length

            for (const article of articles) {
                const scored = scoreArticle(article, query)
                if (!scored) continue

                stats.relevantArticles++

                // Create unique ID from URL
                const articleId = btoa(article.link).substring(0, 50)

                // Check if seen
                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'google-news')
                    .eq('post_id', articleId)
                    .single()

                if (existing) continue

                // Mark as seen
                await supabase.from('seen_posts').insert({
                    platform: 'google-news',
                    post_id: articleId,
                    url: article.link,
                })

                stats.newArticles++

                // Save to topics
                await supabase.from('topics').insert({
                    title: article.title,
                    source: 'google-news',
                    source_url: article.link,
                    relevance_score: scored.score / 100,
                    content: JSON.stringify({
                        description: article.description,
                        source: article.source,
                        pubDate: article.pubDate,
                        category: scored.category,
                        query: scored.query,
                    }),
                })

                allScoredArticles.push(scored)
            }

            await new Promise(r => setTimeout(r, 500))
        }

        // Send alerts
        const topArticles = allScoredArticles
            .filter(a => a.score >= 60)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

        if (topArticles.length > 0) {
            const sent = await sendGoogleChatAlert(topArticles)
            if (sent) stats.alertsSent = topArticles.length
        }

        console.log('🎉 Google News Scout complete:', stats)

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
