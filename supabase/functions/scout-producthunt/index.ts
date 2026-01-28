/**
 * VERA Scout Product Hunt - New Product Monitoring
 * 
 * Monitors Product Hunt for new sales/automation tools,
 * competitor launches, and B2B SaaS products.
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

const DAILY_CAP = 30

// Categories of interest on Product Hunt
const INTEREST_KEYWORDS = [
    'sales',
    'outbound',
    'cold email',
    'lead generation',
    'CRM',
    'prospecting',
    'SDR',
    'B2B',
    'automation',
    'AI agent',
    'email automation',
    'sales intelligence',
]

// Competitor names to watch
const COMPETITORS = [
    'apollo',
    'instantly',
    'lemlist',
    'outreach',
    'salesloft',
    'smartlead',
    'clay',
    'seamless',
    'lusha',
    'zoominfo',
]

interface ProductHuntPost {
    id: number
    name: string
    tagline: string
    url: string
    votesCount: number
    commentsCount: number
    thumbnail?: { url: string }
    topics?: { name: string }[]
    makers?: { name: string }[]
}

interface ScoredProduct {
    product: ProductHuntPost
    score: number
    category: string
    matchedKeywords: string[]
}

/**
 * Fetch today's products from Product Hunt via public API
 */
async function fetchProductHuntPosts(): Promise<ProductHuntPost[]> {
    // Product Hunt's public posts endpoint (no auth required for basic data)
    const today = new Date().toISOString().split('T')[0]

    try {
        // Try the public RSS-to-JSON approach via their website
        const response = await fetch('https://www.producthunt.com/feed?category=developer-tools', {
            headers: {
                'User-Agent': 'VERA-Scout/1.0 (Product Monitor)',
                'Accept': 'application/rss+xml',
            }
        })

        if (!response.ok) {
            console.log(`⚠️ Product Hunt RSS returned ${response.status}, trying homepage scrape`)
            return await scrapeProductHuntHomepage()
        }

        const text = await response.text()
        return parseProductHuntRSS(text)
    } catch (error) {
        console.error('❌ Error fetching Product Hunt:', error)
        return await scrapeProductHuntHomepage()
    }
}

/**
 * Parse Product Hunt RSS feed
 */
function parseProductHuntRSS(xml: string): ProductHuntPost[] {
    const products: ProductHuntPost[] = []
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

    let id = 0
    for (const match of itemMatches) {
        const itemXml = match[1]

        const name = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
        const url = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
        const tagline = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''

        if (name && url) {
            products.push({
                id: id++,
                name,
                tagline,
                url,
                votesCount: 0,
                commentsCount: 0,
            })
        }
    }

    return products
}

/**
 * Fallback: Scrape Product Hunt homepage for today's products
 */
async function scrapeProductHuntHomepage(): Promise<ProductHuntPost[]> {
    try {
        const response = await fetch('https://www.producthunt.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html',
            }
        })

        if (!response.ok) {
            console.error(`❌ Homepage scrape failed: ${response.status}`)
            return []
        }

        const html = await response.text()

        // Extract product data from Next.js __NEXT_DATA__ script
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
        if (!nextDataMatch) {
            console.log('⚠️ No __NEXT_DATA__ found')
            return []
        }

        try {
            const nextData = JSON.parse(nextDataMatch[1])
            const posts = nextData?.props?.pageProps?.posts || []

            return posts.slice(0, 20).map((post: any) => ({
                id: post.id || 0,
                name: post.name || '',
                tagline: post.tagline || '',
                url: `https://www.producthunt.com/posts/${post.slug}`,
                votesCount: post.votesCount || 0,
                commentsCount: post.commentsCount || 0,
                topics: post.topics || [],
            }))
        } catch (e) {
            console.error('❌ Failed to parse __NEXT_DATA__:', e)
            return []
        }
    } catch (error) {
        console.error('❌ Homepage scrape error:', error)
        return []
    }
}

/**
 * Score product by relevance to our interests
 */
function scoreProduct(product: ProductHuntPost): ScoredProduct | null {
    const text = `${product.name} ${product.tagline}`.toLowerCase()
    const matchedKeywords: string[] = []
    let score = 0
    let category = 'general'

    // Check for competitor mentions (highest priority)
    for (const competitor of COMPETITORS) {
        if (text.includes(competitor)) {
            score += 100
            category = 'competitor'
            matchedKeywords.push(competitor)
        }
    }

    // Check for interest keywords
    for (const keyword of INTEREST_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
            score += 30
            matchedKeywords.push(keyword)
            if (category === 'general') category = 'sales_tech'
        }
    }

    // Topic bonuses
    const topicNames = product.topics?.map(t => t.name.toLowerCase()) || []
    const relevantTopics = ['sales', 'productivity', 'marketing', 'artificial-intelligence', 'saas']
    for (const topic of topicNames) {
        if (relevantTopics.some(rt => topic.includes(rt))) {
            score += 20
        }
    }

    // Engagement bonus
    if (product.votesCount > 100) score += 10
    if (product.votesCount > 500) score += 20
    if (product.commentsCount > 20) score += 10

    if (score < 30) return null

    return { product, score, category, matchedKeywords }
}

/**
 * Send Google Chat alert
 */
async function sendGoogleChatAlert(products: ScoredProduct[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || products.length === 0) return false

    const sections = products.slice(0, 5).map(sp => ({
        header: `🚀 ${sp.category.toUpperCase()}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Product',
                    text: sp.product.name,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Tagline',
                    text: sp.product.tagline,
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Keywords',
                    text: sp.matchedKeywords.join(', ') || 'General',
                }
            },
            {
                decoratedText: {
                    topLabel: 'Engagement',
                    text: `👍 ${sp.product.votesCount} | 💬 ${sp.product.commentsCount}`,
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'View on Product Hunt',
                        onClick: { openLink: { url: sp.product.url } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-ph-scout',
            card: {
                header: {
                    title: '🚀 VERA Product Hunt Scout',
                    subtitle: `${products.length} relevant products found`,
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

    console.log('🚀 Starting VERA Product Hunt Scout...')

    const stats = {
        productsFetched: 0,
        relevantProducts: 0,
        newProducts: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count: todayCount } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'producthunt')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((todayCount || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const products = await fetchProductHuntPosts()
        stats.productsFetched = products.length
        console.log(`📦 Fetched ${products.length} products`)

        const scoredProducts: ScoredProduct[] = []

        for (const product of products) {
            const scored = scoreProduct(product)
            if (!scored) continue

            stats.relevantProducts++

            const productId = `ph-${product.id || product.name.replace(/\s+/g, '-').toLowerCase()}`

            // Check if seen
            const { data: existing } = await supabase
                .from('seen_posts')
                .select('id')
                .eq('platform', 'producthunt')
                .eq('post_id', productId)
                .single()

            if (existing) continue

            // Mark as seen
            await supabase.from('seen_posts').insert({
                platform: 'producthunt',
                post_id: productId,
                url: product.url,
            })

            stats.newProducts++

            // Save to topics
            await supabase.from('topics').insert({
                title: `PH: ${product.name}`,
                source: 'producthunt',
                source_url: product.url,
                relevance_score: scored.score / 100,
                content: JSON.stringify({
                    tagline: product.tagline,
                    votes: product.votesCount,
                    comments: product.commentsCount,
                    category: scored.category,
                    keywords: scored.matchedKeywords,
                }),
            })

            scoredProducts.push(scored)
        }

        // Send alerts
        const topProducts = scoredProducts
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

        if (topProducts.length > 0) {
            const sent = await sendGoogleChatAlert(topProducts)
            if (sent) stats.alertsSent = topProducts.length
        }

        console.log('🎉 Product Hunt Scout complete:', stats)

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
