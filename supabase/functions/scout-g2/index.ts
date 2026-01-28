/**
 * VERA Scout G2 - Software Review Monitoring
 * 
 * Monitors G2 for software reviews to find:
 * - Competitor pain points
 * - User feedback trends
 * - Alternative seekers
 * 
 * Uses G2's public pages (no API needed).
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

const DAILY_CAP = 30

// Software categories to monitor on G2
const G2_CATEGORIES = [
    { name: 'Sales Engagement', slug: 'sales-engagement' },
    { name: 'Email Marketing', slug: 'email-marketing' },
    { name: 'Lead Intelligence', slug: 'lead-intelligence' },
    { name: 'Sales Automation', slug: 'sales-automation' },
    { name: 'CRM', slug: 'crm' },
    { name: 'Marketing Automation', slug: 'marketing-automation' },
]

// Competitors to specifically track
const COMPETITORS = [
    'apollo-io',
    'instantly',
    'lemlist',
    'outreach',
    'salesloft',
    'smartlead',
]

interface G2CategoryData {
    category: string
    products: Array<{
        name: string
        rating: number
        reviewCount: number
        url: string
    }>
}

interface G2CompetitorData {
    competitor: string
    recentReviews: Array<{
        title: string
        rating: number
        pros: string
        cons: string
        url: string
    }>
}

/**
 * Fetch G2 category leaderboard
 */
async function fetchG2Category(name: string, slug: string): Promise<G2CategoryData | null> {
    try {
        // G2 has public JSON endpoints for categories
        const url = `https://www.g2.com/categories/${slug}.json`

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; VERA-Scout/1.0)',
                'Accept': 'application/json',
            }
        })

        if (!response.ok) {
            // Fallback to RSS if available
            console.log(`⚠️ G2 ${slug} returned ${response.status}, trying RSS`)
            return fetchG2RSS(name, slug)
        }

        const data = await response.json()

        // Extract top products
        const products = (data.products || []).slice(0, 5).map((p: any) => ({
            name: p.name || '',
            rating: p.star_rating || 0,
            reviewCount: p.reviews_count || 0,
            url: `https://www.g2.com${p.url || ''}`,
        }))

        return { category: name, products }
    } catch (error) {
        console.error(`G2 error for ${slug}:`, error)
        return fetchG2RSS(name, slug)
    }
}

/**
 * Fallback: Fetch G2 via RSS
 */
async function fetchG2RSS(name: string, slug: string): Promise<G2CategoryData | null> {
    try {
        const rssUrl = `https://www.g2.com/categories/${slug}/reviews.rss`

        const response = await fetch(rssUrl, {
            headers: {
                'User-Agent': 'VERA-Scout/1.0',
            }
        })

        if (!response.ok) return null

        const xml = await response.text()
        const products: G2CategoryData['products'] = []

        // Parse RSS for recent reviews mentioning products
        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
        const seenProducts = new Set<string>()

        for (const match of itemMatches) {
            const itemXml = match[1]
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''

            // Extract product name from title (usually "Product Name Review: ...")
            const productMatch = title.match(/^([^:]+) Review/i)
            if (productMatch && !seenProducts.has(productMatch[1])) {
                seenProducts.add(productMatch[1])
                products.push({
                    name: productMatch[1],
                    rating: 0,
                    reviewCount: 0,
                    url: link,
                })
            }

            if (products.length >= 5) break
        }

        return products.length > 0 ? { category: name, products } : null
    } catch (error) {
        console.error(`G2 RSS error for ${slug}:`, error)
        return null
    }
}

/**
 * Send Google Chat alert
 */
async function sendAlert(categories: G2CategoryData[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || categories.length === 0) return false

    const sections = categories.slice(0, 4).map(c => ({
        header: `📊 ${c.category}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Top Products',
                    text: c.products.slice(0, 3).map(p =>
                        `${p.name}${p.rating ? ` (${p.rating}★)` : ''}`
                    ).join(' • '),
                    wrapText: true,
                }
            },
            {
                buttonList: {
                    buttons: c.products.slice(0, 2).map(p => ({
                        text: p.name,
                        onClick: { openLink: { url: p.url } }
                    }))
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-g2-scout',
            card: {
                header: {
                    title: '📊 VERA G2 Scout',
                    subtitle: `${categories.length} categories monitored`,
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

    console.log('📊 Starting G2 Scout...')

    const stats = {
        categoriesChecked: 0,
        productsFound: 0,
        dataPoints: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'g2')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((count || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allCategories: G2CategoryData[] = []

        for (const category of G2_CATEGORIES) {
            stats.categoriesChecked++

            const data = await fetchG2Category(category.name, category.slug)

            if (data && data.products.length > 0) {
                allCategories.push(data)
                stats.productsFound += data.products.length

                // Save category data point
                const categoryId = `g2-${category.slug}-${today}`

                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'g2')
                    .eq('post_id', categoryId)
                    .single()

                if (!existing) {
                    await supabase.from('seen_posts').insert({
                        platform: 'g2',
                        post_id: categoryId,
                        url: `https://www.g2.com/categories/${category.slug}`,
                    })

                    // Save to topics
                    await supabase.from('topics').insert({
                        title: `G2 ${category.name} Leaderboard`,
                        source: 'g2',
                        source_url: `https://www.g2.com/categories/${category.slug}`,
                        relevance_score: 0.8,
                        content: JSON.stringify({
                            category: category.name,
                            products: data.products,
                            capturedAt: new Date().toISOString(),
                        }),
                    })

                    stats.dataPoints++
                }
            }

            await new Promise(r => setTimeout(r, 1000)) // Rate limiting
        }

        // Send alerts if we have new data
        if (stats.dataPoints > 0 && allCategories.length > 0) {
            const sent = await sendAlert(allCategories)
            if (sent) stats.alertsSent = allCategories.length
        }

        console.log('📊 G2 Scout complete:', stats)

        return new Response(
            JSON.stringify({
                success: true,
                stats,
                categories: allCategories.map(c => c.category),
                timestamp: new Date().toISOString()
            }),
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
