/**
 * VERA Industry Monitor - Configurable Industry-Specific News & Trends
 * 
 * Monitors industry-specific publications, regulations, and news.
 * Configurable for any vertical: Healthcare, Finance, Legal, Real Estate, etc.
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

const DAILY_CAP = 100

// Industry configurations with RSS feeds and keywords
const INDUSTRIES = {
    healthcare: {
        name: 'Healthcare & Pharma',
        emoji: '🏥',
        feeds: [
            { name: 'MedCity News', url: 'https://medcitynews.com/feed/' },
            { name: 'Healthcare IT News', url: 'https://www.healthcareitnews.com/rss.xml' },
            { name: 'Fierce Healthcare', url: 'https://www.fiercehealthcare.com/rss/xml' },
            { name: 'STAT News', url: 'https://www.statnews.com/feed/' },
        ],
        keywords: ['HIPAA', 'telehealth', 'EHR', 'clinical', 'FDA', 'pharma', 'biotech', 'patient', 'healthcare AI'],
        regulations: ['HIPAA', 'FDA', 'CMS', 'HITECH'],
    },
    finance: {
        name: 'Finance & FinTech',
        emoji: '💰',
        feeds: [
            { name: 'Finextra', url: 'https://www.finextra.com/rss/headlines.aspx' },
            { name: 'American Banker', url: 'https://www.americanbanker.com/feed' },
            { name: 'FinTech Futures', url: 'https://www.fintechfutures.com/feed/' },
            { name: 'Pymnts', url: 'https://www.pymnts.com/feed/' },
        ],
        keywords: ['banking', 'fintech', 'payments', 'lending', 'crypto', 'DeFi', 'neobank', 'investment', 'SEC'],
        regulations: ['SEC', 'FINRA', 'SOX', 'PCI-DSS', 'AML', 'KYC'],
    },
    legal: {
        name: 'Legal & LegalTech',
        emoji: '⚖️',
        feeds: [
            { name: 'Law.com', url: 'https://www.law.com/rss/' },
            { name: 'ABA Journal', url: 'https://www.abajournal.com/feed' },
            { name: 'Legal Tech News', url: 'https://www.legaltechnews.com/rss/' },
            { name: 'Above the Law', url: 'https://abovethelaw.com/feed/' },
        ],
        keywords: ['law firm', 'legal tech', 'litigation', 'contract', 'compliance', 'attorney', 'court', 'regulation'],
        regulations: ['ABA', 'ethics', 'privilege', 'discovery'],
    },
    realestate: {
        name: 'Real Estate & PropTech',
        emoji: '🏠',
        feeds: [
            { name: 'Inman', url: 'https://www.inman.com/feed/' },
            { name: 'HousingWire', url: 'https://www.housingwire.com/feed/' },
            { name: 'The Real Deal', url: 'https://therealdeal.com/feed/' },
            { name: 'CRE Tech', url: 'https://www.cretech.com/feed/' },
        ],
        keywords: ['proptech', 'mortgage', 'commercial real estate', 'residential', 'broker', 'listing', 'housing market'],
        regulations: ['RESPA', 'fair housing', 'zoning'],
    },
    insurance: {
        name: 'Insurance & InsurTech',
        emoji: '🛡️',
        feeds: [
            { name: 'Insurance Journal', url: 'https://www.insurancejournal.com/rss/' },
            { name: 'InsurTech News', url: 'https://insurtechnews.com/feed/' },
            { name: 'Carrier Management', url: 'https://www.carriermanagement.com/feed/' },
        ],
        keywords: ['insurtech', 'underwriting', 'claims', 'policy', 'P&C', 'life insurance', 'risk', 'actuary'],
        regulations: ['state insurance', 'NAIC', 'solvency'],
    },
    ecommerce: {
        name: 'E-commerce & Retail',
        emoji: '🛒',
        feeds: [
            { name: 'Retail Dive', url: 'https://www.retaildive.com/rss/' },
            { name: 'Digital Commerce 360', url: 'https://www.digitalcommerce360.com/feed/' },
            { name: 'Modern Retail', url: 'https://www.modernretail.co/feed/' },
            { name: 'Ecommerce Times', url: 'https://www.ecommercetimes.com/perl/syndication/rssfull.pl' },
        ],
        keywords: ['e-commerce', 'DTC', 'marketplace', 'fulfillment', 'omnichannel', 'Shopify', 'Amazon', 'retail tech'],
        regulations: ['FTC', 'consumer protection', 'CCPA', 'GDPR'],
    },
    manufacturing: {
        name: 'Manufacturing & Industry 4.0',
        emoji: '🏭',
        feeds: [
            { name: 'Manufacturing.net', url: 'https://www.manufacturing.net/rss' },
            { name: 'Industry Week', url: 'https://www.industryweek.com/rss' },
            { name: 'Smart Industry', url: 'https://www.smartindustry.com/feed/' },
        ],
        keywords: ['Industry 4.0', 'IoT', 'automation', 'supply chain', 'robotics', 'smart factory', 'lean', 'OEM'],
        regulations: ['OSHA', 'EPA', 'ISO'],
    },
    education: {
        name: 'Education & EdTech',
        emoji: '📚',
        feeds: [
            { name: 'EdSurge', url: 'https://www.edsurge.com/rss' },
            { name: 'Education Week', url: 'https://www.edweek.org/rss' },
            { name: 'Inside Higher Ed', url: 'https://www.insidehighered.com/rss.xml' },
            { name: 'EdTech Magazine', url: 'https://edtechmagazine.com/k12/rss.xml' },
        ],
        keywords: ['edtech', 'LMS', 'e-learning', 'K-12', 'higher ed', 'online learning', 'curriculum', 'student'],
        regulations: ['FERPA', 'COPPA', 'Title IX', 'accreditation'],
    },
}

interface IndustryArticle {
    title: string
    url: string
    source: string
    industry: string
    industryName: string
    description: string
    publishedAt: string
    hasRegulation: boolean
    regulationMentions: string[]
}

/**
 * Fetch RSS feed
 */
async function fetchFeed(feedName: string, feedUrl: string, industryKey: string): Promise<IndustryArticle[]> {
    try {
        const industry = INDUSTRIES[industryKey as keyof typeof INDUSTRIES]

        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'VERA-Scout/1.0 (Industry Monitor)',
            }
        })

        if (!response.ok) {
            console.log(`⚠️ ${feedName} returned ${response.status}`)
            return []
        }

        const xml = await response.text()
        const articles: IndustryArticle[] = []

        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

        for (const match of itemMatches) {
            const itemXml = match[1]
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
            const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim().substring(0, 300) || ''
            const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''

            if (!title || !link) continue

            // Check for regulation mentions
            const text = `${title} ${description}`.toLowerCase()
            const regulationMentions = industry.regulations.filter(reg =>
                text.includes(reg.toLowerCase())
            )

            articles.push({
                title,
                url: link,
                source: feedName,
                industry: industryKey,
                industryName: industry.name,
                description,
                publishedAt: pubDate,
                hasRegulation: regulationMentions.length > 0,
                regulationMentions,
            })

            if (articles.length >= 5) break
        }

        return articles
    } catch (error) {
        console.error(`Feed error for ${feedName}:`, error)
        return []
    }
}

/**
 * Score article relevance for content creation
 */
function scoreArticle(article: IndustryArticle): number {
    let score = 40 // Base score
    const text = `${article.title} ${article.description}`.toLowerCase()

    // Regulation mentions are high-value
    if (article.hasRegulation) score += 25

    // Trend indicators
    if (/trend|rising|growing|emerging|new|launch/i.test(text)) score += 15
    if (/report|study|research|data|survey/i.test(text)) score += 15
    if (/2024|2025|2026|forecast|prediction/i.test(text)) score += 10

    // Actionable content
    if (/how to|guide|tips|best practice|strategy/i.test(text)) score += 15
    if (/case study|success|example/i.test(text)) score += 10

    // Industry disruption
    if (/disrupt|transform|revolution|change|AI|automation/i.test(text)) score += 15

    return Math.min(100, score)
}

/**
 * Send Google Chat alert
 */
async function sendAlert(articles: { article: IndustryArticle; score: number }[], industriesCovered: string[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || articles.length === 0) return false

    const sections = articles.slice(0, 5).map(a => ({
        header: `${INDUSTRIES[a.article.industry as keyof typeof INDUSTRIES].emoji} ${a.article.industryName}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: a.article.source,
                    text: a.article.title,
                    wrapText: true,
                }
            },
            ...(a.article.hasRegulation ? [{
                decoratedText: {
                    topLabel: '⚠️ Regulation',
                    text: a.article.regulationMentions.join(', '),
                }
            }] : []),
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
            cardId: 'vera-industry-monitor',
            card: {
                header: {
                    title: '🏢 VERA Industry Monitor',
                    subtitle: `${articles.length} articles from ${industriesCovered.length} industries`,
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

    console.log('🏢 Starting Industry Monitor...')

    // Parse request body for specific industries (optional)
    let targetIndustries: string[] = Object.keys(INDUSTRIES)
    try {
        const body = await req.json()
        if (body.industries && Array.isArray(body.industries)) {
            targetIndustries = body.industries.filter((i: string) => i in INDUSTRIES)
        }
    } catch {
        // Use all industries if no body
    }

    const stats = {
        industriesMonitored: 0,
        feedsChecked: 0,
        articlesFound: 0,
        newArticles: 0,
        regulationMentions: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'industry')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((count || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allArticles: { article: IndustryArticle; score: number }[] = []
        const industriesCovered: string[] = []

        for (const industryKey of targetIndustries) {
            const industry = INDUSTRIES[industryKey as keyof typeof INDUSTRIES]
            if (!industry) continue

            stats.industriesMonitored++
            industriesCovered.push(industry.name)

            for (const feed of industry.feeds.slice(0, 2)) { // Limit feeds per industry
                stats.feedsChecked++

                const articles = await fetchFeed(feed.name, feed.url, industryKey)
                stats.articlesFound += articles.length

                for (const article of articles) {
                    const articleId = `industry-${btoa(article.url).substring(0, 50)}`

                    // Check if seen
                    const { data: existing } = await supabase
                        .from('seen_posts')
                        .select('id')
                        .eq('platform', 'industry')
                        .eq('post_id', articleId)
                        .single()

                    if (existing) continue

                    const score = scoreArticle(article)

                    // Only save relevant articles
                    if (score < 40) continue

                    // Mark as seen
                    await supabase.from('seen_posts').insert({
                        platform: 'industry',
                        post_id: articleId,
                        url: article.url,
                    })

                    stats.newArticles++
                    if (article.hasRegulation) stats.regulationMentions++

                    // Save to topics
                    await supabase.from('topics').insert({
                        title: article.title,
                        source: `industry-${article.industry}`,
                        source_url: article.url,
                        relevance_score: score / 100,
                        content: JSON.stringify({
                            industry: article.industryName,
                            source: article.source,
                            description: article.description,
                            regulations: article.regulationMentions,
                            publishedAt: article.publishedAt,
                        }),
                    })

                    if (score >= 55) {
                        allArticles.push({ article, score })
                    }
                }

                await new Promise(r => setTimeout(r, 300))
            }
        }

        // Send alerts for top articles
        if (allArticles.length > 0) {
            const top = allArticles.sort((a, b) => b.score - a.score).slice(0, 5)
            const sent = await sendAlert(top, industriesCovered)
            if (sent) stats.alertsSent = top.length
        }

        console.log('🏢 Industry Monitor complete:', stats)

        return new Response(
            JSON.stringify({
                success: true,
                stats,
                industries: industriesCovered,
                availableIndustries: Object.keys(INDUSTRIES),
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
