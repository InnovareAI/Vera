import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const platform = searchParams.get('platform')
        const limit = parseInt(searchParams.get('limit') || '20')

        // Fetch posts from the posts table (created by VERA scouts/publisher)
        let query = supabase
            .from('posts')
            .select(`
        id,
        platform,
        url,
        posted_at,
        engagement,
        draft:drafts(content, platform)
      `)
            .order('posted_at', { ascending: false })
            .limit(limit)

        if (platform) {
            query = query.eq('platform', platform)
        }

        const { data: posts, error } = await query

        if (error) {
            console.error('Error fetching posts:', error)
            return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
        }

        // Also fetch high-performing drafts that may not have been posted
        const { data: drafts, error: draftsError } = await supabase
            .from('drafts')
            .select('id, platform, content, status, created_at')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (draftsError) {
            console.error('Error fetching drafts:', draftsError)
        }

        // Transform to training examples format
        const examples = [
            ...(posts || []).map(post => ({
                id: post.id,
                platform: post.platform,
                content: ((post.draft as any)?.[0]?.content || (post.draft as any)?.content || '') as string,
                type: 'post' as const,
                performance: getPerformanceLevel(post.engagement),
                postedAt: post.posted_at,
                url: post.url
            })),
            ...(drafts || []).filter(d => d.content).map(draft => ({
                id: draft.id,
                platform: draft.platform,
                content: draft.content,
                type: 'post' as const,
                performance: 'good' as const, // Approved = good
                createdAt: draft.created_at
            }))
        ].filter(e => e.content) // Only include items with content

        return NextResponse.json({
            examples,
            count: examples.length
        })

    } catch (error) {
        console.error('Posts fetch error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Determine performance level based on engagement metrics
function getPerformanceLevel(engagement: Record<string, number> | null): 'top' | 'good' | 'average' {
    if (!engagement) return 'average'

    const likes = engagement.likes || 0
    const comments = engagement.comments || 0
    const shares = engagement.shares || 0

    const score = likes + (comments * 2) + (shares * 3)

    if (score >= 100) return 'top'
    if (score >= 20) return 'good'
    return 'average'
}
