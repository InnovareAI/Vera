/**
 * VERA Scout DEV.to - Technical Content Monitoring
 * 
 * Monitors DEV.to for articles about sales tech, AI automation,
 * and B2B SaaS topics that could inform content strategy.
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

const MAX_ARTICLES_PER_TAG = 10
const DAILY_CAP = 40

// DEV.to tags to monitor
const TAGS_TO_MONITOR = [
    'ai',
    'saas',
    'startup',
    'automation',
    'productivity',
    'api',
    'python',
    'javascript',
]

// Content relevance patterns
const RELEVANCE_PATTERNS = {
    high_relevance: {
        weight: 100,
        patterns: [
            /build.*(AI|automation).*(agent|tool|bot)/i,
            /automat.*(sales|email|outreach|crm)/i,
            /AI.*(SDR|sales|prospecting)/i,
            /(sales|outbound|cold email).*(automation|AI)/i,
            /lead.*(generation|scoring|enrichment)/i,
        ]
    },
    medium_relevance: {
        weight: 60,
        patterns: [
            /build.*(saas|startup|mvp)/i,
            /API.*(integration|automation)/i,
            /(startup|founder).*(growth|sales|revenue)/i,
            /email.*(deliverability|marketing|automation)/i,
        ]
    },
    general_tech: {
        weight: 30,
        patterns: [
            /AI.*(tool|agent|assistant)/i,
            /automation.*(workflow|process)/i,
            /productivity.*(tool|hack|tip)/i,
        ]
    },
}

interface DevToArticle {
    id: number
    title: string
    description: string
    url: string
    published_at: string
    tag_list: string[]
    user: {
        name: string
        username: string
    }
    positive_reactions_count: number
    comments_count: number
    reading_time_minutes: number
}

interface ScoredArticle {
    article: DevToArticle
    score: number
    category: string
    tag: string
}

/**
 * Fetch articles from DEV.to API by tag
 */
async function fetchDevToArticles(tag: string): Promise<DevToArticle[]> {
    try {
        const response = await fetch(
            `https://dev.to/api/articles?tag=${tag}&top=7&per_page=${MAX_ARTICLES_PER_TAG}`,
            {
                headers: {
                    'User-Agent': 'VERA-Scout/1.0',
                    'Accept': 'application/json',
                }
            }
        )

        if (!response.ok) {
            console.error(`❌ DEV.to API error for tag ${tag}: ${response.status}`)
            return []
        }

        const articles = await response.json()
        console.log(`✅ Found ${articles.length} articles for #${tag}`)
        return articles
    } catch (error) {
        console.error(`❌ Error fetching DEV.to #${tag}:`, error)
        return []
    }
}

/**
 * Score article by relevance
 */
function scoreArticle(article: DevToArticle, tag: string): ScoredArticle | null {
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

    // Engagement bonus
    if (article.positive_reactions_count > 50) maxScore += 10
    if (article.positive_reactions_count > 200) maxScore += 20
    if (article.comments_count > 10) maxScore += 10
    if (article.comments_count > 50) maxScore += 15

    // Tag bonus for highly relevant tags
    const highValueTags = ['ai', 'automation', 'saas']
    if (article.tag_list.some(t => highValueTags.includes(t.toLowerCase()))) {
        maxScore += 15
    }

    if (maxScore < 25) return null

    return {
        article,
        score: maxScore,
        category: matchedCategory || 'general_tech',
        tag,
    }
}

/**
 * Send Google Chat alert
 */
async function sendGoogleChatAlert(articles: ScoredArticle[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || articles.length === 0) return false

    const sections = articles.slice(0, 5).map(sa => ({
        header: `📝 ${sa.category.replace('_', ' ').toUpperCase()}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Title',
                    text: sa.article.title,
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Author',
                    text: sa.article.user.name,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Tags',
                    text: sa.article.tag_list.slice(0, 5).map(t => `#${t}`).join(' '),
                }
            },
            {
                decoratedText: {
                    topLabel: 'Engagement',
                    text: `❤️ ${sa.article.positive_reactions_count} | 💬 ${sa.article.comments_count} | 📖 ${sa.article.reading_time_minutes} min`,
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'Read on DEV.to',
                        onClick: { openLink: { url: sa.article.url } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-devto-scout',
            card: {
                header: {
                    title: '📝 VERA DEV.to Scout',
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
        console.error('❌ Google Chat error:', error)
        return false
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('🚀 Starting VERA DEV.to Scout...')

    const stats = {
        tagsSearched: 0,
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
            .eq('platform', 'devto')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((todayCount || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allScoredArticles: ScoredArticle[] = []

        for (const tag of TAGS_TO_MONITOR) {
            stats.tagsSearched++

            const articles = await fetchDevToArticles(tag)
            stats.totalArticles += articles.length

            for (const article of articles) {
                const scored = scoreArticle(article, tag)
                if (!scored) continue

                stats.relevantArticles++

                const articleId = `devto-${article.id}`

                // Check if seen
                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'devto')
                    .eq('post_id', articleId)
                    .single()

                if (existing) continue

                // Mark as seen
                await supabase.from('seen_posts').insert({
                    platform: 'devto',
                    post_id: articleId,
                    url: article.url,
                })

                stats.newArticles++

                // Save to topics
                await supabase.from('topics').insert({
                    title: article.title,
                    source: 'devto',
                    source_url: article.url,
                    relevance_score: scored.score / 100,
                    content: JSON.stringify({
                        description: article.description,
                        author: article.user.name,
                        tags: article.tag_list,
                        reactions: article.positive_reactions_count,
                        comments: article.comments_count,
                        readingTime: article.reading_time_minutes,
                        category: scored.category,
                    }),
                })

                allScoredArticles.push(scored)
            }

            // Rate limiting - DEV.to allows 30 req/min
            await new Promise(r => setTimeout(r, 500))
        }

        // Send alerts for high-value articles
        const topArticles = allScoredArticles
            .filter(a => a.score >= 50)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

        if (topArticles.length > 0) {
            const sent = await sendGoogleChatAlert(topArticles)
            if (sent) stats.alertsSent = topArticles.length
        }

        console.log('🎉 DEV.to Scout complete:', stats)

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
