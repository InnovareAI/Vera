/**
 * VERA Trend Monitor - Detect emerging trends and hot topics
 * 
 * Analyzes aggregated data from all scouts to identify:
 * - Trending keywords
 * - Rising topics
 * - Sudden spikes in discussions
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
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''

// Trend-related keywords to watch
const TREND_INDICATORS = [
    'new', 'launch', 'released', 'announced', 'breakthrough',
    'trending', 'viral', 'hot', 'rising', 'emerging',
    'game-changer', 'disrupting', 'revolutionary', 'next-gen',
]

// Categories to analyze
const TREND_CATEGORIES = [
    { name: 'AI Sales', keywords: ['ai sales', 'ai sdr', 'ai outbound', 'ai prospecting'] },
    { name: 'Email Deliverability', keywords: ['deliverability', 'inbox placement', 'email warm-up', 'spam'] },
    { name: 'Cold Outreach', keywords: ['cold email', 'cold outreach', 'cold calling', 'outbound'] },
    { name: 'Lead Generation', keywords: ['lead generation', 'lead gen', 'prospecting', 'lead enrichment'] },
    { name: 'Sales Automation', keywords: ['sales automation', 'workflow automation', 'sales ops'] },
    { name: 'Revenue Operations', keywords: ['revops', 'revenue operations', 'sales ops', 'growth ops'] },
]

interface TrendData {
    category: string
    mentionCount: number
    recentMentions: number // Last 24 hours
    weeklyMentions: number // Last 7 days
    growthRate: number // Percentage change
    topSources: { source: string; count: number }[]
    sampleTopics: string[]
    trendScore: number
}

interface TopicData {
    id: string
    title: string
    source: string
    source_url: string
    relevance_score: number
    content: string
    created_at: string
}

/**
 * Analyze trends from stored topics
 */
async function analyzeTrends(supabase: any): Promise<TrendData[]> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const trends: TrendData[] = []

    for (const category of TREND_CATEGORIES) {
        // Get recent topics matching this category
        const { data: recentTopics } = await supabase
            .from('topics')
            .select('*')
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })

        const { data: weeklyTopics } = await supabase
            .from('topics')
            .select('*')
            .gte('created_at', oneWeekAgo)
            .lt('created_at', oneDayAgo)

        const { data: previousWeekTopics } = await supabase
            .from('topics')
            .select('*')
            .gte('created_at', twoWeeksAgo)
            .lt('created_at', oneWeekAgo)

        // Count mentions matching category keywords
        const countMatches = (topics: TopicData[] | null, keywords: string[]) => {
            if (!topics) return 0
            return topics.filter(t => {
                const text = `${t.title} ${t.content || ''}`.toLowerCase()
                return keywords.some(kw => text.includes(kw.toLowerCase()))
            }).length
        }

        const recentCount = countMatches(recentTopics, category.keywords)
        const weeklyCount = countMatches(weeklyTopics, category.keywords)
        const previousWeekCount = countMatches(previousWeekTopics, category.keywords)

        // Calculate growth rate
        const totalThisWeek = recentCount + weeklyCount
        const growthRate = previousWeekCount > 0
            ? ((totalThisWeek - previousWeekCount) / previousWeekCount) * 100
            : totalThisWeek > 0 ? 100 : 0

        // Count by source
        const sourceCounts: Record<string, number> = {}
        const matchingTopics = (recentTopics || []).filter((t: TopicData) => {
            const text = `${t.title} ${t.content || ''}`.toLowerCase()
            return category.keywords.some(kw => text.includes(kw.toLowerCase()))
        })

        for (const topic of matchingTopics) {
            sourceCounts[topic.source] = (sourceCounts[topic.source] || 0) + 1
        }

        const topSources = Object.entries(sourceCounts)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)

        // Sample topics
        const sampleTopics = matchingTopics
            .slice(0, 3)
            .map((t: TopicData) => t.title.substring(0, 100))

        // Calculate trend score (0-100)
        const trendScore = Math.min(100, Math.max(0,
            (recentCount * 10) +
            (growthRate > 50 ? 30 : growthRate > 20 ? 20 : growthRate > 0 ? 10 : 0) +
            (totalThisWeek > 10 ? 20 : totalThisWeek > 5 ? 10 : 0)
        ))

        trends.push({
            category: category.name,
            mentionCount: recentCount + weeklyCount,
            recentMentions: recentCount,
            weeklyMentions: weeklyCount,
            growthRate: Math.round(growthRate),
            topSources,
            sampleTopics,
            trendScore,
        })
    }

    // Sort by trend score
    trends.sort((a, b) => b.trendScore - a.trendScore)

    return trends
}

/**
 * Get AI-generated trend insights
 */
async function getAIInsights(trends: TrendData[]): Promise<string> {
    if (!OPENROUTER_API_KEY) return ''

    const topTrends = trends.slice(0, 3)
    const prompt = `Analyze these B2B sales industry trends and provide 2-3 actionable insights in bullet points:

${topTrends.map(t => `- ${t.category}: ${t.mentionCount} mentions, ${t.growthRate}% growth, samples: ${t.sampleTopics.join(', ')}`).join('\n')}

Keep insights brief (max 50 words each), focused on content opportunities or market signals.`

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
            }),
        })

        if (!response.ok) return ''

        const data = await response.json()
        return data.choices?.[0]?.message?.content || ''
    } catch (error) {
        console.error('AI insights error:', error)
        return ''
    }
}

/**
 * Send Google Chat alert for trending topics
 */
async function sendTrendAlert(trends: TrendData[], insights: string): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL) return false

    const hotTrends = trends.filter(t => t.trendScore >= 30)
    if (hotTrends.length === 0) return true

    const sections = hotTrends.slice(0, 4).map(t => ({
        header: `📈 ${t.category} (Score: ${t.trendScore})`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Mentions',
                    text: `${t.recentMentions} today | ${t.weeklyMentions} this week`,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Growth',
                    text: `${t.growthRate > 0 ? '+' : ''}${t.growthRate}% vs last week`,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Top Sources',
                    text: t.topSources.map(s => `${s.source} (${s.count})`).join(', ') || 'N/A',
                }
            },
        ]
    }))

    if (insights) {
        sections.push({
            header: '💡 AI Insights',
            widgets: [{
                decoratedText: {
                    topLabel: 'Analysis',
                    text: insights.substring(0, 500),
                    wrapText: true,
                }
            }]
        })
    }

    const message = {
        cardsV2: [{
            cardId: 'vera-trend-monitor',
            card: {
                header: {
                    title: '📈 VERA Trend Report',
                    subtitle: `${hotTrends.length} trending topics in B2B sales`,
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

    console.log('📈 Starting Trend Monitor...')

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Analyze trends from stored data
        const trends = await analyzeTrends(supabase)

        // Get AI insights for top trends
        const insights = await getAIInsights(trends)

        // Send alert for hot trends
        const alertSent = await sendTrendAlert(trends, insights)

        console.log('📈 Trend Monitor complete')

        return new Response(
            JSON.stringify({
                success: true,
                trends,
                insights,
                alertSent,
                categories: TREND_CATEGORIES.length,
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
