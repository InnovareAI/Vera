/**
 * Scout Reddit Edge Function
 * 
 * Monitors Reddit for high-intent B2B sales opportunities
 * Uses Reddit's Official OAuth API (free tier: 100 req/min)
 * 
 * - Fetches from configured subreddits
 * - Scores posts by keyword relevance
 * - Deduplicates with seen_posts table
 * - Sends Google Chat alerts for high-fit opportunities
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
        'smartlead alternative', 'clay alternative', 'looking for sdr tool',
        'need sales automation', 'recommend sales tool'
    ],
    problem_aware: [
        'outbound without sdr', 'cant afford sdr', 'sdr too expensive',
        'solo founder sales', 'founder-led sales', 'cold outreach automation',
        'outbound at scale', 'scaling outbound', 'how to do cold email',
        'how to find leads', 'lead generation advice'
    ],
    pain_points: [
        'sdr turnover', 'sdr ramp time', 'cac too high',
        'outbound not working', 'cold email not working', 'cold email dead',
        'sales team struggling', 'not enough leads', 'pipeline problem'
    ]
}

// Target subreddits for B2B SaaS/Sales
const SUBREDDITS = [
    'startups',
    'SaaS',
    'sales',
    'Entrepreneur',
    'smallbusiness',
    'indiehackers',
    'growmybusiness'
]

interface RedditPost {
    id: string
    title: string
    selftext: string
    author: string
    subreddit: string
    permalink: string
    score: number
    num_comments: number
    created_utc: number
    url: string
}

interface ScoredPost extends RedditPost {
    relevanceScore: number
    category: 'high_intent' | 'problem_aware' | 'pain_point' | 'general'
    matchedKeywords: string[]
}

interface AlertPayload {
    post: ScoredPost
    suggestedResponse?: string
}

// Reddit OAuth token cache
let cachedToken: { token: string; expiresAt: number } | null = null

// Get Reddit OAuth access token
async function getRedditAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.token
    }

    const clientId = Deno.env.get('REDDIT_CLIENT_ID')
    const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
        throw new Error('Reddit API credentials not configured')
    }

    const auth = btoa(`${clientId}:${clientSecret}`)

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'VERA-Scout/1.0'
        },
        body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Reddit OAuth failed: ${response.status} - ${error}`)
    }

    const data = await response.json()

    // Cache the token (expires in ~1 hour, we'll refresh at 50 min)
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (50 * 60 * 1000) // 50 minutes
    }

    return data.access_token
}

// Calculate relevance score based on keyword matching
function scorePost(post: RedditPost): ScoredPost {
    const text = `${post.title} ${post.selftext}`.toLowerCase()
    const matched: string[] = []

    // Check high intent first (highest value)
    for (const kw of KEYWORDS.high_intent) {
        if (text.includes(kw)) matched.push(kw)
    }
    if (matched.length > 0) {
        return {
            ...post,
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
            ...post,
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
            ...post,
            relevanceScore: 0.5 + (matched.length * 0.05),
            category: 'pain_point',
            matchedKeywords: matched
        }
    }

    return {
        ...post,
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

    const postUrl = `https://reddit.com${post.permalink}`

    return {
        cardsV2: [{
            cardId: `reddit-${post.id}`,
            card: {
                header: {
                    title: `${categoryEmoji[post.category]} ${categoryLabel[post.category]}`,
                    subtitle: `r/${post.subreddit} • u/${post.author} • ${timeAgo(post.created_utc)}`,
                    imageUrl: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
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
                            ...(post.selftext ? [{
                                textParagraph: {
                                    text: post.selftext.length > 400
                                        ? post.selftext.slice(0, 400) + '...'
                                        : post.selftext
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
                                    text: `<b>Score:</b> ${post.score} pts | <b>Comments:</b> ${post.num_comments} | <b>Relevance:</b> ${(post.relevanceScore * 100).toFixed(0)}%`
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
                                        text: "Open on Reddit",
                                        onClick: {
                                            openLink: { url: postUrl }
                                        }
                                    }
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

// Fetch posts from a subreddit using Reddit OAuth API
async function fetchSubreddit(accessToken: string, subreddit: string, limit = 25): Promise<RedditPost[]> {
    try {
        const url = `https://oauth.reddit.com/r/${subreddit}/new?limit=${limit}`

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'VERA-Scout/1.0'
            }
        })

        if (!response.ok) {
            console.error(`Failed to fetch r/${subreddit}:`, response.status, await response.text())
            return []
        }

        const data = await response.json()
        const posts: RedditPost[] = []

        for (const child of data?.data?.children || []) {
            const p = child.data
            posts.push({
                id: p.id,
                title: p.title,
                selftext: p.selftext || '',
                author: p.author,
                subreddit: p.subreddit,
                permalink: p.permalink,
                score: p.score,
                num_comments: p.num_comments,
                created_utc: p.created_utc,
                url: p.url
            })
        }

        return posts
    } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error)
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
                'X-Title': 'VERA Scout'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-sonnet-4-20250514',
                max_tokens: 300,
                messages: [{
                    role: 'user',
                    content: `You're helping a B2B SaaS founder craft a helpful Reddit reply. The goal is to be genuinely helpful, NOT salesy.

Post Title: ${post.title}
Post Content: ${post.selftext || '(no body text)'}
Subreddit: r/${post.subreddit}

Write a 2-3 paragraph Reddit reply that:
- Directly addresses their question or pain point
- Shares practical advice from experience
- Is authentic and conversational (not marketing speak)
- Does NOT mention any specific product names
- Ends with an offer to share more if helpful

Keep it under 150 words.`
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
        const MAX_POST_AGE_HOURS = 6

        const cutoffTime = Math.floor(Date.now() / 1000) - (MAX_POST_AGE_HOURS * 3600)

        console.log(`🔍 Scout Reddit starting... Checking ${SUBREDDITS.length} subreddits`)

        // Get Reddit access token
        let accessToken: string
        try {
            accessToken = await getRedditAccessToken()
            console.log('✅ Reddit OAuth token acquired')
        } catch (error) {
            console.error('❌ Failed to get Reddit token:', error)
            return new Response(JSON.stringify({
                success: false,
                error: 'Reddit authentication failed. Check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.',
                details: error instanceof Error ? error.message : 'Unknown error'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Fetch posts from all subreddits
        const allPosts: RedditPost[] = []
        for (const subreddit of SUBREDDITS) {
            const posts = await fetchSubreddit(accessToken, subreddit, 25)
            console.log(`📥 r/${subreddit}: ${posts.length} posts`)
            allPosts.push(...posts)
            // Rate limiting - be nice to Reddit API
            await new Promise(r => setTimeout(r, 200))
        }

        console.log(`📥 Fetched ${allPosts.length} total posts`)

        // Filter by time and score posts
        const recentPosts = allPosts.filter(p => p.created_utc > cutoffTime)
        const scoredPosts = recentPosts.map(scorePost)

        // Filter to relevant posts only
        const relevantPosts = scoredPosts
            .filter(p => p.relevanceScore >= MIN_RELEVANCE_SCORE)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)

        console.log(`✅ Found ${relevantPosts.length} relevant posts (score >= ${MIN_RELEVANCE_SCORE})`)

        // Check for duplicates and process new posts
        let newPostsCount = 0
        let alertsSent = 0

        for (const post of relevantPosts) {
            const postKey = `reddit_${post.id}`

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
                    platform: 'reddit',
                    seen_at: new Date().toISOString()
                })

            // Save to topics table
            await supabase
                .from('topics')
                .insert({
                    source: 'reddit',
                    source_url: `https://reddit.com${post.permalink}`,
                    title: post.title,
                    content: post.selftext,
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
                subredditsScanned: SUBREDDITS.length,
                totalPostsFetched: allPosts.length,
                recentPosts: recentPosts.length,
                relevantPosts: relevantPosts.length,
                newPosts: newPostsCount,
                alertsSent
            },
            timestamp: new Date().toISOString()
        }

        console.log('📊 Scout complete:', result.stats)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Scout Reddit error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
