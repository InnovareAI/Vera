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
        return (data.items || []).map((p: any) => ({
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
        const body: any = {
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
        return (data.items || data || []).map((acc: any) => ({
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
