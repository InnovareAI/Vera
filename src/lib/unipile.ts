/**
 * Unipile Service - LinkedIn Research & Posting
 * 
 * Uses Unipile's unified API to:
 * - Get profile information
 * - Fetch posts from a profile for writing style analysis
 * - Analyze writing style for brand training
 * 
 * Based on SAM's proven Unipile integration
 */

const UNIPILE_DSN = process.env.UNIPILE_DSN || 'https://api6.unipile.com:13670'
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY

function getHeaders(): Record<string, string> {
    if (!UNIPILE_API_KEY) {
        throw new Error('UNIPILE_API_KEY is not configured')
    }
    return {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json',
    }
}

export interface LinkedInProfile {
    id: string
    provider_id?: string
    name?: string
    first_name?: string
    last_name?: string
    headline?: string
    profile_picture_url?: string
    location?: string
    industry?: string
    summary?: string
    connections_count?: number
    followers_count?: number
    company?: string
    title?: string
}

export interface LinkedInPost {
    id: string
    text: string
    content?: string
    created_at: string
    date?: string
    reactions_count?: number
    num_likes?: number
    comments_count?: number
    num_comments?: number
    shares_count?: number
    media?: {
        type: string
        url: string
    }[]
}

// Get profile by LinkedIn vanity URL (username)
export async function getLinkedInProfile(
    vanityOrProviderId: string,
    accountId: string
): Promise<LinkedInProfile | null> {
    try {
        const response = await fetch(
            `${UNIPILE_DSN}/api/v1/users/${vanityOrProviderId}?account_id=${accountId}`,
            {
                method: 'GET',
                headers: getHeaders()
            }
        )

        if (!response.ok) {
            console.error(`Unipile profile fetch failed: ${response.status}`)
            return null
        }

        const data = await response.json()
        return {
            id: data.id,
            provider_id: data.provider_id,
            name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            first_name: data.first_name,
            last_name: data.last_name,
            headline: data.headline,
            profile_picture_url: data.profile_picture_url,
            location: data.location,
            summary: data.summary,
            company: data.company,
            title: data.title,
        }
    } catch (error) {
        console.error('LinkedIn profile fetch error:', error)
        return null
    }
}

// Fetch posts from a LinkedIn profile
export async function getLinkedInPosts(
    providerId: string,
    accountId: string,
    limit = 30
): Promise<LinkedInPost[]> {
    try {
        const response = await fetch(
            `${UNIPILE_DSN}/api/v1/users/${providerId}/posts?account_id=${accountId}&limit=${limit}`,
            {
                method: 'GET',
                headers: getHeaders(),
            }
        )

        if (!response.ok) {
            console.error(`Unipile posts fetch failed: ${response.status}`)
            return []
        }

        const data = await response.json()
        return (data.items || []).map((p: {
            id: string;
            text?: string;
            content?: string;
            created_at?: string;
            date?: string;
            reactions_count?: number;
            num_likes?: number;
            comments_count?: number;
            num_comments?: number;
            shares_count?: number;
            media?: any[];
        }) => ({
            id: p.id,
            text: p.text || p.content || '',
            content: p.content,
            created_at: p.created_at || p.date,
            date: p.date,
            reactions_count: p.reactions_count || p.num_likes || 0,
            comments_count: p.comments_count || p.num_comments || 0,
            shares_count: p.shares_count || 0,
            media: p.media,
        }))
    } catch (error) {
        console.error('LinkedIn posts fetch error:', error)
        return []
    }
}

// Research a LinkedIn profile - get profile + posts for writing style analysis
export async function researchLinkedInProfile(
    vanityUrl: string,
    accountId: string
): Promise<{
    profile: LinkedInProfile | null
    posts: LinkedInPost[]
    writingSamples: string[]
    stats: {
        totalPosts: number
        avgLikes: number
        avgComments: number
        avgLength: number
    }
}> {
    try {
        // Extract vanity from URL if full URL provided
        let vanity = vanityUrl
        if (vanityUrl.includes('linkedin.com')) {
            // Extract from URL like https://www.linkedin.com/in/username
            const match = vanityUrl.match(/linkedin\.com\/in\/([^\/\?]+)/)
            if (match) {
                vanity = match[1]
            }
        }

        // Get profile
        const profile = await getLinkedInProfile(vanity, accountId)

        if (!profile) {
            return { profile: null, posts: [], writingSamples: [], stats: { totalPosts: 0, avgLikes: 0, avgComments: 0, avgLength: 0 } }
        }

        // Get their posts using provider_id
        const posts = await getLinkedInPosts(profile.provider_id || profile.id, accountId, 30)

        // Extract substantial writing samples (posts with real content)
        const writingSamples = posts
            .filter(p => p.text && p.text.length > 100)
            .map(p => p.text)
            .slice(0, 20)

        // Calculate engagement stats
        const postsWithContent = posts.filter(p => p.text && p.text.length > 50)
        const stats = {
            totalPosts: posts.length,
            avgLikes: postsWithContent.length > 0
                ? Math.round(postsWithContent.reduce((sum, p) => sum + (p.reactions_count || 0), 0) / postsWithContent.length)
                : 0,
            avgComments: postsWithContent.length > 0
                ? Math.round(postsWithContent.reduce((sum, p) => sum + (p.comments_count || 0), 0) / postsWithContent.length)
                : 0,
            avgLength: postsWithContent.length > 0
                ? Math.round(postsWithContent.reduce((sum, p) => sum + p.text.length, 0) / postsWithContent.length)
                : 0,
        }

        return { profile, posts, writingSamples, stats }
    } catch (error) {
        console.error('LinkedIn research error:', error)
        throw error
    }
}

// ============================================================================
// POSTING FUNCTIONS
// ============================================================================

export interface PostResult {
    success: boolean
    post_id?: string
    error?: string
}

export interface PostAttachment {
    type: 'image' | 'video' | 'document'
    url: string
}

// Create a LinkedIn post
export async function createLinkedInPost(
    accountId: string,
    text: string,
    attachments?: PostAttachment[]
): Promise<PostResult> {
    try {
        const body: {
            account_id: string;
            text: string;
            attachments?: { type: string; url: string }[];
        } = {
            account_id: accountId,
            text: text,
        }

        // Add attachments if provided
        if (attachments && attachments.length > 0) {
            body.attachments = attachments.map(att => ({
                type: att.type,
                url: att.url
            }))
        }

        const response = await fetch(
            `${UNIPILE_DSN}/api/v1/posts`,
            {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            }
        )

        if (!response.ok) {
            const errorData = await response.text()
            console.error('Unipile post creation failed:', response.status, errorData)
            return {
                success: false,
                error: `Failed to create post: ${response.status} - ${errorData}`
            }
        }

        const data = await response.json()
        console.log('✅ LinkedIn post created:', data)

        return {
            success: true,
            post_id: data.post_id || data.id
        }
    } catch (error: any) {
        console.error('LinkedIn post creation error:', error)
        return {
            success: false,
            error: error.message || 'Unknown error creating post'
        }
    }
}

// Get connected LinkedIn accounts
export async function getConnectedAccounts(): Promise<{
    id: string
    provider: string
    name?: string
    email?: string
    status?: string
}[]> {
    try {
        const response = await fetch(
            `${UNIPILE_DSN}/api/v1/accounts`,
            {
                method: 'GET',
                headers: getHeaders()
            }
        )

        if (!response.ok) {
            console.error('Unipile accounts fetch failed:', response.status)
            return []
        }

        const data = await response.json()
        return (data.items || data || []).map((acc: {
            id: string;
            provider: string;
            name?: string;
            email?: string;
            status?: string;
        }) => ({
            id: acc.id,
            provider: acc.provider,
            name: acc.name,
            email: acc.email,
            status: acc.status
        }))
    } catch (error) {
        console.error('Error fetching connected accounts:', error)
        return []
    }
}

// Get account details
export async function getAccountDetails(accountId: string): Promise<{
    id: string
    provider: string
    name?: string
    email?: string
    status?: string
    profile_url?: string
} | null> {
    try {
        const response = await fetch(
            `${UNIPILE_DSN}/api/v1/accounts/${accountId}`,
            {
                method: 'GET',
                headers: getHeaders()
            }
        )

        if (!response.ok) {
            console.error('Unipile account details fetch failed:', response.status)
            return null
        }

        const data = await response.json()
        return {
            id: data.id,
            provider: data.provider,
            name: data.name,
            email: data.email,
            status: data.status,
            profile_url: data.profile_url
        }
    } catch (error) {
        console.error('Error fetching account details:', error)
        return null
    }
}

// ============================================================================
// COMMENTING AGENT - LinkedIn Search, Comment Posting, Retry Logic
// ============================================================================

export interface UnipileSearchPost {
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
    attachments?: { type: string; url: string }[]
}

/**
 * Search LinkedIn posts by hashtag/keyword via Unipile
 * Used by the commenting agent to discover posts
 */
export async function searchLinkedInPosts(
    accountId: string,
    keyword: string,
    datePosted = 'past_week'
): Promise<UnipileSearchPost[]> {
    try {
        const searchKeyword = keyword.startsWith('#') ? keyword : `#${keyword}`
        const response = await unipileRequestWithRetry(
            `/api/v1/linkedin/search?account_id=${accountId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api: 'classic',
                    category: 'posts',
                    keywords: searchKeyword,
                    date_posted: datePosted,
                    sort_by: 'date'
                })
            }
        )

        if (!response.ok) {
            const err = await response.text()
            console.error(`Unipile search failed: ${response.status}`, err)
            return []
        }

        const data = await response.json()
        return data.items || []
    } catch (error) {
        console.error('LinkedIn search error:', error)
        return []
    }
}

/**
 * Post a comment on a LinkedIn post via Unipile
 * Core function for the commenting agent
 */
export async function postLinkedInComment(
    accountId: string,
    postSocialId: string,
    commentText: string,
    replyToCommentId?: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
    try {
        const body: Record<string, string> = {
            account_id: accountId,
            text: commentText,
        }
        if (replyToCommentId) {
            body.comment_id = replyToCommentId
        }

        const response = await unipileRequestWithRetry(
            `/api/v1/posts/${postSocialId}/comments`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`Unipile comment post failed: ${response.status}`, errorText)
            return { success: false, error: `${response.status}: ${errorText}` }
        }

        const data = await response.json()
        return {
            success: true,
            commentId: data.comment_id || data.id
        }
    } catch (error: any) {
        console.error('LinkedIn comment post error:', error)
        return { success: false, error: error.message || 'Unknown error' }
    }
}

/**
 * Get comments on a LinkedIn post via Unipile
 */
export async function getLinkedInPostComments(
    accountId: string,
    postSocialId: string,
    limit = 10
): Promise<{
    id: string
    text: string
    author_name: string
    author_id: string
    reactions_count: number
    created_at: string
}[]> {
    try {
        const response = await fetch(
            `${UNIPILE_DSN}/api/v1/posts/${postSocialId}/comments?account_id=${accountId}&limit=${limit}`,
            { method: 'GET', headers: getHeaders() }
        )

        if (!response.ok) {
            console.error(`Unipile get comments failed: ${response.status}`)
            return []
        }

        const data = await response.json()
        return (data.items || []).map((c: any) => ({
            id: c.id || c.comment_id,
            text: c.text || c.content || '',
            author_name: c.author?.name || c.author_name || 'Unknown',
            author_id: c.author?.id || c.author_id || '',
            reactions_count: c.reactions_count || c.num_likes || 0,
            created_at: c.created_at || c.date || ''
        }))
    } catch (error) {
        console.error('Get LinkedIn comments error:', error)
        return []
    }
}

/**
 * Resolve LinkedIn vanity URL to provider ID
 */
export async function resolveVanityUrl(
    vanityUrl: string,
    accountId: string
): Promise<string | null> {
    let vanity = vanityUrl
    if (vanityUrl.includes('linkedin.com')) {
        const match = vanityUrl.match(/linkedin\.com\/in\/([^\/\?]+)/)
        if (match) vanity = match[1]
    }

    const profile = await getLinkedInProfile(vanity, accountId)
    return profile?.provider_id || profile?.id || null
}

/**
 * Fetch with exponential backoff retry for Unipile rate limits
 * Retries on 429 (rate limited) with exponential backoff
 * Throws on 401/403 (auth errors)
 */
async function unipileRequestWithRetry(
    endpoint: string,
    options: RequestInit = {},
    maxRetries = 3,
    initialDelay = 1000
): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(`${UNIPILE_DSN}${endpoint}`, {
                ...options,
                headers: {
                    ...getHeaders(),
                    ...(options.headers as Record<string, string> || {}),
                },
            })

            // Auth errors - don't retry
            if (response.status === 401 || response.status === 403) {
                throw new Error(`Unipile auth error: ${response.status}`)
            }

            // Rate limited - retry with backoff
            if (response.status === 429 && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt)
                console.warn(`Unipile rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
            }

            return response
        } catch (error: any) {
            lastError = error
            if (attempt < maxRetries && !error.message?.includes('auth error')) {
                const delay = initialDelay * Math.pow(2, attempt)
                console.warn(`Unipile request failed, retrying in ${delay}ms:`, error.message)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }

    throw lastError || new Error('Unipile request failed after retries')
}

/**
 * Parse Unipile relative dates ("8h", "2d", "1w") to Date objects
 */
export function parseUnipileDate(dateStr: string): Date | null {
    if (!dateStr) return null

    // Try ISO date first
    const isoDate = new Date(dateStr)
    if (!isNaN(isoDate.getTime()) && dateStr.length > 5) return isoDate

    // Parse relative dates
    const match = dateStr.match(/^(\d+)\s*(h|d|w|m|mo)$/)
    if (!match) return null

    const amount = parseInt(match[1])
    const unit = match[2]
    const now = new Date()

    switch (unit) {
        case 'h': return new Date(now.getTime() - amount * 60 * 60 * 1000)
        case 'd': return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000)
        case 'w': return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000)
        case 'm':
        case 'mo': return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000)
        default: return null
    }
}

// Analyze writing style from samples (used for tone of voice creation)
export function analyzeWritingStyle(samples: string[]): {
    avgWordCount: number
    avgSentenceLength: number
    usesEmoji: boolean
    emojiFrequency: 'none' | 'occasional' | 'frequent'
    usesHashtags: boolean
    hashtagFrequency: 'none' | 'few' | 'many'
    commonOpenings: string[]
    writingPatterns: string[]
} {
    if (samples.length === 0) {
        return {
            avgWordCount: 0,
            avgSentenceLength: 0,
            usesEmoji: false,
            emojiFrequency: 'none',
            usesHashtags: false,
            hashtagFrequency: 'none',
            commonOpenings: [],
            writingPatterns: [],
        }
    }

    // Word count analysis
    const wordCounts = samples.map(s => s.split(/\s+/).length)
    const avgWordCount = Math.round(wordCounts.reduce((a, b) => a + b, 0) / samples.length)

    // Sentence analysis
    const sentenceLengths = samples.flatMap(s => {
        const sentences = s.split(/[.!?]+/).filter(sent => sent.trim().length > 10)
        return sentences.map(sent => sent.trim().split(/\s+/).length)
    })
    const avgSentenceLength = sentenceLengths.length > 0
        ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
        : 0

    // Emoji analysis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    const emojiCounts = samples.map(s => (s.match(emojiRegex) || []).length)
    const avgEmoji = emojiCounts.reduce((a, b) => a + b, 0) / samples.length
    const usesEmoji = avgEmoji > 0
    const emojiFrequency = avgEmoji === 0 ? 'none' : avgEmoji < 2 ? 'occasional' : 'frequent'

    // Hashtag analysis
    const hashtagCounts = samples.map(s => (s.match(/#\w+/g) || []).length)
    const avgHashtags = hashtagCounts.reduce((a, b) => a + b, 0) / samples.length
    const usesHashtags = avgHashtags > 0
    const hashtagFrequency = avgHashtags === 0 ? 'none' : avgHashtags < 3 ? 'few' : 'many'

    // Find common openings (first 3-5 words)
    const openings = samples
        .map(s => s.split(/\s+/).slice(0, 5).join(' ').toLowerCase())
        .filter(o => o.length > 10)
    const openingCounts = new Map<string, number>()
    openings.forEach(o => openingCounts.set(o, (openingCounts.get(o) || 0) + 1))
    const commonOpenings = Array.from(openingCounts.entries())
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([opening]) => opening)

    // Detect writing patterns
    const writingPatterns: string[] = []

    // Check for list usage
    const usesLists = samples.some(s => /^[-•*]\s/m.test(s) || /^\d+\./m.test(s))
    if (usesLists) writingPatterns.push('Uses bullet points or numbered lists')

    // Check for questions
    const usesQuestions = samples.filter(s => s.includes('?')).length / samples.length > 0.3
    if (usesQuestions) writingPatterns.push('Frequently asks questions')

    // Check for personal stories
    const usesFirstPerson = samples.filter(s => /\b(I |my |me |we |our )/i.test(s)).length / samples.length > 0.5
    if (usesFirstPerson) writingPatterns.push('Shares personal experiences (uses I/me/we)')

    // Check for short punchy sentences
    if (avgSentenceLength < 15) writingPatterns.push('Prefers short, punchy sentences')
    else if (avgSentenceLength > 25) writingPatterns.push('Uses longer, detailed sentences')

    return {
        avgWordCount,
        avgSentenceLength,
        usesEmoji,
        emojiFrequency,
        usesHashtags,
        hashtagFrequency,
        commonOpenings,
        writingPatterns,
    }
}
