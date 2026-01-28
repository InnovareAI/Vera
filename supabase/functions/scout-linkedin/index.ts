/**
 * VERA Scout LinkedIn - LinkedIn Post Discovery via Unipile API
 * 
 * Searches LinkedIn for posts matching B2B sales-related keywords/hashtags
 * and alerts via Google Chat when opportunities are found.
 * 
 * Based on SAM's proven discover-posts-hashtag implementation.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const UNIPILE_DSN = Deno.env.get('UNIPILE_DSN') || 'api6.unipile.com:13670'
const UNIPILE_API_KEY = Deno.env.get('UNIPILE_API_KEY') || ''
const UNIPILE_ACCOUNT_ID = Deno.env.get('UNIPILE_ACCOUNT_ID') || ''

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const GOOGLE_CHAT_WEBHOOK_URL = Deno.env.get('GOOGLE_CHAT_WEBHOOK_URL') || ''
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''

// Limits
const MAX_POSTS_PER_KEYWORD = 10
const MAX_KEYWORDS_PER_RUN = 5
const DAILY_POST_CAP = 50

// B2B Sales Keywords to Monitor
const SEARCH_KEYWORDS = [
    // High-intent product keywords
    '#AIsales',
    '#salesautomation',
    '#B2BSales',
    '#SaaS',
    '#coldoutreach',
    // Problem-aware keywords  
    '#SDRlife',
    '#founderledsales',
    '#startupgrowth',
    '#salestech',
    '#outbound',
]

// Intent Categories and Scoring
const INTENT_PATTERNS = {
    high_intent: {
        weight: 100,
        patterns: [
            /looking for.*(SDR|sales|outbound|tool|solution)/i,
            /anyone (know|recommend|use).*(SDR|sales|outbound|automation)/i,
            /what.*(tool|solution|platform).*(use|recommend)/i,
            /need help (with|finding).*(outbound|sales|lead)/i,
            /considering.*(AI|automation).*(sales|SDR)/i,
        ]
    },
    competitor_mention: {
        weight: 80,
        patterns: [
            /apollo.*(alternative|vs|compared|instead|replacement)/i,
            /instantly.*(alternative|vs|compared|instead|replacement)/i,
            /lemlist.*(alternative|vs|compared|instead|replacement)/i,
            /outreach.*(alternative|vs|compared|instead|replacement)/i,
            /salesloft.*(alternative|vs|compared|instead|replacement)/i,
        ]
    },
    problem_aware: {
        weight: 60,
        patterns: [
            /SDR.*(expensive|costly|turnover|ramp|quit|leaving)/i,
            /outbound.*(hard|difficult|struggling|not working|broken)/i,
            /cold email.*(hard|difficult|struggling|deliverability)/i,
            /can't afford.*(SDR|sales team|headcount)/i,
            /scaling.*(outbound|sales).*(challenge|hard|difficult)/i,
        ]
    },
    pain_point: {
        weight: 40,
        patterns: [
            /spending too much.*(time|money).*(outreach|prospecting|sales)/i,
            /manual.*(prospecting|outreach|sales).*(time|inefficient)/i,
            /how to.*(scale|automate).*(outbound|sales|prospecting)/i,
            /founder.*(doing|handling).*(sales|outreach)/i,
        ]
    },
}

// Content exclusion patterns (low-value posts)
const EXCLUDE_PATTERNS = [
    /completed?.*(certification|certificate|course|training)/i,
    /just (earned|received|obtained|passed).*(certification|certificate|badge)/i,
    /happy to (share|announce).*(certification|certificate|completed)/i,
    /proud to (share|announce).*(certification|certificate|completed)/i,
    /i('ve| have) (successfully )?completed/i,
    /coursera|udemy|linkedin learning/i,
    /check out my (new )?(profile|resume|cv)/i,
    /i('m| am) (now )?(looking for|open to|seeking) (new )?(opportunities|roles|job)/i,
]

// Quality indicators (for scoring)
const QUALITY_INDICATORS = [
    /\b(insight|perspective|lesson|learned|takeaway)\b/i,
    /\b(unpopular opinion|hot take|here's (what|why))\b/i,
    /\b(strategy|framework|approach|methodology)\b/i,
    /\b(challenge|problem|solution|opportunity)\b/i,
    /\?(.*)?\$/,  // Ends with a question
]

// ============================================================================
// TYPES
// ============================================================================

interface UnipilePost {
    social_id: string
    share_url: string
    text: string
    date: string
    parsed_datetime?: string
    reaction_counter: number
    comment_counter: number
    repost_counter: number
    author: {
        id: string
        name: string
        headline?: string
        public_identifier: string
        is_company: boolean
    }
}

interface ScoredPost {
    post: UnipilePost
    score: number
    category: string
    matchedPatterns: string[]
    keyword: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if post should be excluded
 */
function shouldExcludePost(text: string): boolean {
    if (!text || text.trim().length < 50) return true

    for (const pattern of EXCLUDE_PATTERNS) {
        if (pattern.test(text)) return true
    }

    return false
}

/**
 * Score post by intent patterns
 */
function scorePost(post: UnipilePost, keyword: string): ScoredPost | null {
    const text = post.text || ''

    let maxScore = 0
    let matchedCategory = ''
    const matchedPatterns: string[] = []

    // Check each intent category
    for (const [category, config] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(text)) {
                if (config.weight > maxScore) {
                    maxScore = config.weight
                    matchedCategory = category
                }
                matchedPatterns.push(pattern.source.substring(0, 40))
            }
        }
    }

    // Add quality bonuses
    for (const pattern of QUALITY_INDICATORS) {
        if (pattern.test(text)) {
            maxScore += 5
        }
    }

    // Engagement bonuses
    if (post.reaction_counter > 10) maxScore += 5
    if (post.reaction_counter > 50) maxScore += 10
    if (post.comment_counter > 5) maxScore += 10
    if (post.comment_counter > 20) maxScore += 15

    // Only return if score meets threshold
    if (maxScore < 20) return null

    return {
        post,
        score: maxScore,
        category: matchedCategory || 'general',
        matchedPatterns,
        keyword,
    }
}

/**
 * Search LinkedIn posts via Unipile API
 */
async function searchLinkedInPosts(keyword: string): Promise<UnipilePost[]> {
    console.log(`🔍 Searching LinkedIn for: ${keyword}`)

    if (!UNIPILE_API_KEY || !UNIPILE_ACCOUNT_ID) {
        console.error('❌ Unipile credentials not configured')
        return []
    }

    try {
        const requestBody = {
            api: 'classic',
            category: 'posts',
            keywords: keyword,
            date_posted: 'past_week',
            sort_by: 'date',
        }

        const response = await fetch(
            `https://${UNIPILE_DSN}/api/v1/linkedin/search?account_id=${UNIPILE_ACCOUNT_ID}`,
            {
                method: 'POST',
                headers: {
                    'X-API-KEY': UNIPILE_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        )

        if (!response.ok) {
            const error = await response.text()
            console.error(`❌ Unipile search error (${response.status}): ${error}`)
            return []
        }

        const data = await response.json()
        const posts = data.items || []

        console.log(`✅ Found ${posts.length} posts for "${keyword}"`)
        return posts.slice(0, MAX_POSTS_PER_KEYWORD)
    } catch (error) {
        console.error(`❌ Search error for "${keyword}":`, error)
        return []
    }
}

/**
 * Send Google Chat alert for high-value opportunities
 */
async function sendGoogleChatAlert(scoredPosts: ScoredPost[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL) {
        console.log('⚠️ No Google Chat webhook configured')
        return false
    }

    if (scoredPosts.length === 0) return true

    // Build card message
    const sections = scoredPosts.map(sp => ({
        header: `💡 ${sp.category.toUpperCase()} (Score: ${sp.score})`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Author',
                    text: `${sp.post.author?.name || 'Unknown'} - ${sp.post.author?.headline || ''}`,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Post',
                    text: (sp.post.text || '').substring(0, 300) + '...',
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Engagement',
                    text: `👍 ${sp.post.reaction_counter || 0} | 💬 ${sp.post.comment_counter || 0}`,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Keyword',
                    text: sp.keyword,
                }
            },
            {
                buttonList: {
                    buttons: [
                        {
                            text: 'View on LinkedIn',
                            onClick: {
                                openLink: {
                                    url: sp.post.share_url || `https://linkedin.com/posts/${sp.post.social_id}`,
                                }
                            }
                        }
                    ]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-linkedin-scout',
            card: {
                header: {
                    title: '🔍 VERA LinkedIn Scout',
                    subtitle: `${scoredPosts.length} new B2B opportunities found`,
                    imageUrl: 'https://www.gstatic.com/images/branding/product/2x/chat_48dp.png',
                },
                sections: sections.slice(0, 5), // Max 5 cards
            }
        }]
    }

    try {
        const response = await fetch(GOOGLE_CHAT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        })

        if (!response.ok) {
            console.error(`❌ Google Chat error: ${response.status}`)
            return false
        }

        console.log(`✅ Sent ${scoredPosts.length} alerts to Google Chat`)
        return true
    } catch (error) {
        console.error('❌ Google Chat send error:', error)
        return false
    }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('🚀 Starting VERA LinkedIn Scout...')

    const startTime = Date.now()
    const stats = {
        keywordsSearched: 0,
        totalPostsFetched: 0,
        relevantPosts: 0,
        newPosts: 0,
        alertsSent: 0,
    }

    try {
        // Initialize Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count: todayCount } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'linkedin')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((todayCount || 0) >= DAILY_POST_CAP) {
            console.log(`📊 Daily cap reached (${todayCount}/${DAILY_POST_CAP})`)
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Daily post cap reached',
                    stats,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const keywordsToSearch = SEARCH_KEYWORDS.slice(0, MAX_KEYWORDS_PER_RUN)
        const allScoredPosts: ScoredPost[] = []

        // Search each keyword
        for (const keyword of keywordsToSearch) {
            stats.keywordsSearched++

            const posts = await searchLinkedInPosts(keyword)
            stats.totalPostsFetched += posts.length

            // Process and score each post
            for (const post of posts) {
                // Skip excluded content
                if (shouldExcludePost(post.text || '')) {
                    continue
                }

                // Score the post
                const scored = scorePost(post, keyword)
                if (!scored) continue

                stats.relevantPosts++

                // Check if we've seen this post before
                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'linkedin')
                    .eq('post_id', post.social_id)
                    .single()

                if (existing) {
                    console.log(`⏭️ Already seen: ${post.social_id}`)
                    continue
                }

                // Mark as seen
                await supabase.from('seen_posts').insert({
                    platform: 'linkedin',
                    post_id: post.social_id,
                    url: post.share_url,
                })

                stats.newPosts++

                // Save to topics table for later use
                await supabase.from('topics').insert({
                    title: `LinkedIn: ${(post.text || '').substring(0, 100)}...`,
                    source: 'linkedin',
                    source_url: post.share_url,
                    relevance_score: scored.score / 100,
                    content: JSON.stringify({
                        author: post.author?.name,
                        headline: post.author?.headline,
                        text: post.text,
                        engagement: {
                            likes: post.reaction_counter,
                            comments: post.comment_counter,
                        },
                        category: scored.category,
                        matchedPatterns: scored.matchedPatterns,
                        keyword: scored.keyword,
                    }),
                })

                allScoredPosts.push(scored)
            }

            // Small delay between searches
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Send alerts for high-score posts
        const highValuePosts = allScoredPosts
            .filter(sp => sp.score >= 40)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

        if (highValuePosts.length > 0) {
            const alertSent = await sendGoogleChatAlert(highValuePosts)
            if (alertSent) {
                stats.alertsSent = highValuePosts.length
            }
        }

        const duration = Date.now() - startTime
        console.log(`🎉 LinkedIn Scout complete in ${duration}ms:`, stats)

        return new Response(
            JSON.stringify({
                success: true,
                stats,
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('❌ LinkedIn Scout error:', error)
        return new Response(
            JSON.stringify({
                error: 'LinkedIn Scout failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
