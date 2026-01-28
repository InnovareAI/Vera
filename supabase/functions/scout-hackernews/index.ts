/**
 * Scout Hacker News Edge Function
 * 
 * Monitors Hacker News for B2B sales opportunities
 * Uses Algolia's free HN API (no auth required)
 * 
 * - Searches for relevant keywords
 * - Scores posts by relevance
 * - Deduplicates with seen_posts table
 * - Sends Google Chat alerts
 * - Optionally generates AI response drafts
 * 
 * Trigger: Supabase pg_cron every 15 minutes
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// B2B Keywords for scoring relevance
const KEYWORDS = {
    high_intent: [
        'ai sdr', 'ai bdr', 'ai sales agent', 'ai outbound', 'automated prospecting',
        'apollo alternative', 'instantly alternative', 'lemlist alternative',
        'smartlead alternative', 'clay alternative', 'looking for sdr',
        'need sales automation', 'recommend sales tool', 'sales automation tool'
    ],
    problem_aware: [
        'outbound without sdr', 'cant afford sdr', 'sdr too expensive',
        'solo founder sales', 'founder-led sales', 'cold outreach automation',
        'outbound at scale', 'scaling outbound', 'how to do cold email',
        'how to find leads', 'lead generation', 'b2b leads'
    ],
    pain_points: [
        'sdr turnover', 'sdr ramp time', 'cac too high',
        'outbound not working', 'cold email not working', 'cold email dead',
        'sales team struggling', 'not enough leads', 'pipeline problem',
        'hiring sales', 'first sales hire'
    ]
}

// Search queries for HN
const SEARCH_QUERIES = [
    'sales automation',
    'cold email',
    'outbound sales',
    'SDR',
    'lead generation',
    'B2B sales',
    'sales tool',
    'prospecting',
    'founder sales'
]

interface HNPost {
    objectID: string
    title: string
    story_text: string | null
    url: string | null
    author: string
    points: number
    num_comments: number
    created_at: string
    created_at_i: number
}

interface ScoredPost {
    id: string
    title: string
    content: string
    author: string
    url: string
    hnUrl: string
    score: number
    numComments: number
    createdAt: number
    relevanceScore: number
    category: 'high_intent' | 'problem_aware' | 'pain_point' | 'general'
    matchedKeywords: string[]
}

interface AlertPayload {
    post: ScoredPost
    suggestedResponse?: string
}

// Calculate relevance score
function scorePost(post: HNPost): ScoredPost {
    const text = `${post.title} ${post.story_text || ''}`.toLowerCase()
    const matched: string[] = []

    const basePost = {
        id: post.objectID,
        title: post.title,
        content: post.story_text || '',
        author: post.author,
        url: post.url || `https://news.ycombinator.com/item?id=${post.objectID}`,
        hnUrl: `https://news.ycombinator.com/item?id=${post.objectID}`,
        score: post.points || 0,
        numComments: post.num_comments || 0,
        createdAt: post.created_at_i
    }

    // Check high intent first
    for (const kw of KEYWORDS.high_intent) {
        if (text.includes(kw)) matched.push(kw)
    }
    if (matched.length > 0) {
        return {
            ...basePost,
            relevanceScore: Math.min(0.9 + (matched.length * 0.02), 1.0),
            category: 'high_intent',
            matchedKeywords: matched
        }
    }

    // Check problem aware
    for (const kw of KEYWORDS.problem_aware) {
        if (text.includes(kw)) matched.push(kw)
    }
    if (matched.length > 0) {
        return {
            ...basePost,
            relevanceScore: 0.7 + (matched.length * 0.05),
            category: 'problem_aware',
            matchedKeywords: matched
        }
    }

    // Check pain points
    for (const kw of KEYWORDS.pain_points) {
        if (text.includes(kw)) matched.push(kw)
    }
    if (matched.length > 0) {
        return {
            ...basePost,
            relevanceScore: 0.5 + (matched.length * 0.05),
            category: 'pain_point',
            matchedKeywords: matched
        }
    }

    return {
        ...basePost,
        relevanceScore: 0.2,
        category: 'general',
        matchedKeywords: []
    }
}

// Format time ago
function timeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000 - timestamp)
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

// Build Google Chat message card
function buildChatCard(alert: AlertPayload): object {
    const { post, suggestedResponse } = alert
    const categoryEmoji = {
        high_intent: '🎯',
        problem_aware: '💡',
        pain_point: '😓',
        general: '📌'
    }

    const categoryLabel = {
        high_intent: 'HIGH-FIT OPPORTUNITY',
        problem_aware: 'PROBLEM-AWARE PROSPECT',
        pain_point: 'PAIN POINT DETECTED',
        general: 'GENERAL MATCH'
    }

    return {
        cardsV2: [{
            cardId: `hn-${post.id}`,
            card: {
                header: {
                    title: `${categoryEmoji[post.category]} ${categoryLabel[post.category]}`,
                    subtitle: `Hacker News • ${post.author} • ${timeAgo(post.createdAt)}`,
                    imageUrl: "https://news.ycombinator.com/y18.svg",
                    imageType: "CIRCLE"
                },
                sections: [
                    {
                        header: "Post",
                        widgets: [
                            {
                                textParagraph: {
                                    text: `<b>${post.title}</b>`
                                }
                            },
                            ...(post.content ? [{
                                textParagraph: {
                                    text: post.content.length > 400
                                        ? post.content.slice(0, 400) + '...'
                                        : post.content
                                }
                            }] : [])
                        ]
                    },
                    ...(suggestedResponse ? [{
                        header: "💬 Suggested Response",
                        widgets: [{
                            textParagraph: {
                                text: suggestedResponse
                            }
                        }]
                    }] : []),
                    {
                        widgets: [
                            {
                                textParagraph: {
                                    text: `<b>Points:</b> ${post.score} | <b>Comments:</b> ${post.numComments} | <b>Relevance:</b> ${(post.relevanceScore * 100).toFixed(0)}%`
                                }
                            },
                            {
                                textParagraph: {
                                    text: `<b>Keywords:</b> ${post.matchedKeywords.join(', ') || 'None matched'}`
                                }
                            }
                        ]
                    },
                    {
                        widgets: [{
                            buttonList: {
                                buttons: [
                                    {
                                        text: "Open on HN",
                                        onClick: {
                                            openLink: { url: post.hnUrl }
                                        }
                                    },
                                    ...(post.url !== post.hnUrl ? [{
                                        text: "Original Link",
                                        onClick: {
                                            openLink: { url: post.url }
                                        }
                                    }] : [])
                                ]
                            }
                        }]
                    }
                ]
            }
        }]
    }
}

// Send alert to Google Chat
async function sendGoogleChatAlert(webhookUrl: string, alert: AlertPayload): Promise<boolean> {
    try {
        const card = buildChatCard(alert)

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(card)
        })

        if (!response.ok) {
            console.error('Google Chat webhook failed:', await response.text())
            return false
        }

        return true
    } catch (error) {
        console.error('Error sending Google Chat alert:', error)
        return false
    }
}

// Search Hacker News using Algolia API
async function searchHN(query: string, hoursAgo = 24): Promise<HNPost[]> {
    try {
        const timestamp = Math.floor(Date.now() / 1000) - (hoursAgo * 3600)
        const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${timestamp}&hitsPerPage=20`

        const response = await fetch(url)

        if (!response.ok) {
            console.error(`HN search failed for "${query}":`, response.status)
            return []
        }

        const data = await response.json()
        return data.hits || []
    } catch (error) {
        console.error(`Error searching HN for "${query}":`, error)
        return []
    }
}

// Generate AI response suggestion using OpenRouter
async function generateSuggestedResponse(post: ScoredPost): Promise<string | null> {
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterKey) return null

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterKey}`,
                'HTTP-Referer': 'https://vera.innovare.ai',
                'X-Title': 'VERA Scout HN'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-sonnet-4-20250514',
                max_tokens: 300,
                messages: [{
                    role: 'user',
                    content: `You're helping a B2B SaaS founder craft a helpful Hacker News comment. The goal is to be genuinely helpful and add value to the discussion.

Post Title: ${post.title}
Post Content: ${post.content || '(link post, no text)'}

Write a thoughtful 2-3 paragraph HN comment that:
- Adds genuine value to the discussion
- Shares relevant experience or insights
- Is technical and substantive (HN readers appreciate depth)
- Does NOT promote any specific products
- Sounds like a knowledgeable peer, not marketing

Keep it under 150 words. HN readers value concise, insightful comments.`
                }]
            })
        })

        if (!response.ok) {
            console.error('OpenRouter API error:', await response.text())
            return null
        }

        const data = await response.json()
        return data.choices?.[0]?.message?.content || null
    } catch (error) {
        console.error('Error generating response:', error)
        return null
    }
}

serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const googleChatWebhook = Deno.env.get('GOOGLE_CHAT_WEBHOOK_URL')

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Configuration
        const MIN_RELEVANCE_SCORE = 0.5
        const GENERATE_RESPONSES = true
        const MAX_POST_AGE_HOURS = 24

        console.log(`🔍 Scout Hacker News starting... Searching ${SEARCH_QUERIES.length} queries`)

        // Search HN for all queries
        const allPosts: HNPost[] = []
        const seenIds = new Set<string>()

        for (const query of SEARCH_QUERIES) {
            const posts = await searchHN(query, MAX_POST_AGE_HOURS)
            for (const post of posts) {
                if (!seenIds.has(post.objectID)) {
                    seenIds.add(post.objectID)
                    allPosts.push(post)
                }
            }
            // Small delay between requests
            await new Promise(r => setTimeout(r, 100))
        }

        console.log(`📥 Fetched ${allPosts.length} unique posts`)

        // Score all posts
        const scoredPosts = allPosts.map(scorePost)

        // Filter to relevant posts only
        const relevantPosts = scoredPosts
            .filter(p => p.relevanceScore >= MIN_RELEVANCE_SCORE)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)

        console.log(`✅ Found ${relevantPosts.length} relevant posts (score >= ${MIN_RELEVANCE_SCORE})`)

        // Check for duplicates and process new posts
        let newPostsCount = 0
        let alertsSent = 0

        for (const post of relevantPosts) {
            const postKey = `hn_${post.id}`

            // Check if we've seen this post
            const { data: existing } = await supabase
                .from('seen_posts')
                .select('id')
                .eq('id', postKey)
                .single()

            if (existing) {
                continue
            }

            newPostsCount++

            // Mark as seen
            await supabase
                .from('seen_posts')
                .insert({
                    id: postKey,
                    platform: 'hackernews',
                    seen_at: new Date().toISOString()
                })

            // Save to topics table
            await supabase
                .from('topics')
                .insert({
                    source: 'hackernews',
                    source_url: post.hnUrl,
                    title: post.title,
                    content: post.content,
                    keywords: post.matchedKeywords,
                    category: post.category,
                    relevance_score: post.relevanceScore,
                    processed: false
                })

            // Generate AI response for high-intent posts
            let suggestedResponse: string | null = null
            if (GENERATE_RESPONSES && post.category === 'high_intent') {
                suggestedResponse = await generateSuggestedResponse(post)
            }

            // Send Google Chat alert
            if (googleChatWebhook) {
                const sent = await sendGoogleChatAlert(googleChatWebhook, {
                    post,
                    suggestedResponse: suggestedResponse || undefined
                })
                if (sent) alertsSent++
            }
        }

        const result = {
            success: true,
            stats: {
                queriesSearched: SEARCH_QUERIES.length,
                totalPostsFetched: allPosts.length,
                relevantPosts: relevantPosts.length,
                newPosts: newPostsCount,
                alertsSent
            },
            timestamp: new Date().toISOString()
        }

        console.log('📊 Scout HN complete:', result.stats)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Scout HN error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
