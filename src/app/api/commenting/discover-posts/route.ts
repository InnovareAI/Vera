import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const UNIPILE_DSN = process.env.UNIPILE_DSN || 'https://api6.unipile.com:13670'
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_ACCOUNT_ID = process.env.UNIPILE_ACCOUNT_ID

const MAX_POSTS_PER_DAY = 25
const MIN_CONTENT_LENGTH = 50

interface UnipilePost {
  id: string
  text?: string
  content?: string
  author?: {
    name?: string
    provider_id?: string
    headline?: string
  }
  author_name?: string
  author_provider_id?: string
  author_headline?: string
  share_url?: string
  url?: string
  created_at?: string
  date?: string
  reactions_count?: number
  num_likes?: number
  comments_count?: number
  num_comments?: number
  shares_count?: number
  hashtags?: string[]
  language?: string
  lang?: string
}

// POST /api/commenting/discover-posts - Discover posts via hashtag search
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { workspace_id, monitor_id } = body

    if (!workspace_id || !monitor_id) {
      return NextResponse.json(
        { error: 'workspace_id and monitor_id are required' },
        { status: 400 }
      )
    }

    if (!UNIPILE_API_KEY) {
      return NextResponse.json(
        { error: 'Unipile API key is not configured' },
        { status: 500 }
      )
    }

    // Fetch the monitor
    const { data: monitor, error: monitorError } = await supabase
      .from('vera_linkedin_post_monitors')
      .select('*')
      .eq('id', monitor_id)
      .single()

    if (monitorError || !monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // Check daily cap: count posts discovered today for this workspace
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count: todayCount } = await supabase
      .from('vera_linkedin_posts_discovered')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id)
      .gte('created_at', todayStart.toISOString())

    const currentCount = todayCount || 0
    if (currentCount >= MAX_POSTS_PER_DAY) {
      return NextResponse.json({
        discovered: 0,
        skipped: 0,
        message: `Daily cap of ${MAX_POSTS_PER_DAY} posts reached for this workspace`,
      })
    }

    const remainingSlots = MAX_POSTS_PER_DAY - currentCount

    // Get existing social_ids to avoid duplicates
    const { data: existingPosts } = await supabase
      .from('vera_linkedin_posts_discovered')
      .select('social_id')
      .eq('workspace_id', workspace_id)

    const existingSocialIds = new Set((existingPosts || []).map(p => p.social_id))

    let totalDiscovered = 0
    let totalSkipped = 0
    const postsToInsert: Record<string, unknown>[] = []

    // Search for each hashtag via Unipile
    for (const hashtag of monitor.hashtags || []) {
      if (postsToInsert.length >= remainingSlots) break

      try {
        const searchQuery = hashtag.startsWith('#') ? hashtag : `#${hashtag}`
        const accountId = UNIPILE_ACCOUNT_ID || ''

        const response = await fetch(
          `${UNIPILE_DSN}/api/v1/posts/search?q=${encodeURIComponent(searchQuery)}&account_id=${accountId}&limit=20`,
          {
            method: 'GET',
            headers: {
              'X-API-KEY': UNIPILE_API_KEY,
              'Accept': 'application/json',
            },
          }
        )

        if (!response.ok) {
          console.error(`Unipile search failed for ${hashtag}: ${response.status}`)
          continue
        }

        const data = await response.json()
        const posts: UnipilePost[] = data.items || data || []

        for (const post of posts) {
          if (postsToInsert.length >= remainingSlots) break

          const socialId = post.id
          const postContent = post.text || post.content || ''
          const language = post.language || post.lang || ''

          // Filter: skip non-English
          if (language && !language.toLowerCase().startsWith('en')) {
            totalSkipped++
            continue
          }

          // Filter: skip short content
          if (postContent.length < MIN_CONTENT_LENGTH) {
            totalSkipped++
            continue
          }

          // Filter: skip already discovered
          if (existingSocialIds.has(socialId)) {
            totalSkipped++
            continue
          }

          // Add to insert batch
          existingSocialIds.add(socialId) // prevent duplicates within batch

          const authorName = post.author?.name || post.author_name || 'Unknown'
          const authorProfileId = post.author?.provider_id || post.author_provider_id || ''
          const authorHeadline = post.author?.headline || post.author_headline || ''
          const shareUrl = post.share_url || post.url || ''
          const postDate = post.created_at || post.date || new Date().toISOString()

          // Extract hashtags from content
          const extractedHashtags = postContent.match(/#\w+/g) || []

          postsToInsert.push({
            workspace_id,
            monitor_id,
            social_id: socialId,
            share_url: shareUrl || `https://linkedin.com/feed/update/${socialId}`,
            post_content: postContent,
            author_name: authorName,
            author_profile_id: authorProfileId,
            author_headline: authorHeadline,
            hashtags: extractedHashtags,
            post_date: postDate,
            engagement_metrics: {
              reactions: post.reactions_count || post.num_likes || 0,
              comments: post.comments_count || post.num_comments || 0,
              shares: post.shares_count || 0,
            },
            status: 'discovered',
            comment_eligible_at: new Date(
              Date.now() + Math.random() * 10 * 60 * 1000 // Random 0-10 min delay
            ).toISOString(),
          })
        }
      } catch (hashtagError) {
        console.error(`Error searching hashtag ${hashtag}:`, hashtagError)
      }
    }

    // Insert discovered posts
    if (postsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('vera_linkedin_posts_discovered')
        .insert(postsToInsert)

      if (insertError) {
        console.error('Error inserting discovered posts:', insertError)
        throw insertError
      }

      totalDiscovered = postsToInsert.length
    }

    return NextResponse.json({
      discovered: totalDiscovered,
      skipped: totalSkipped,
      daily_total: currentCount + totalDiscovered,
      daily_cap: MAX_POSTS_PER_DAY,
    })
  } catch (error: unknown) {
    console.error('Discover posts error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
