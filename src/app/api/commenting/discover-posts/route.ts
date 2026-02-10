import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  searchLinkedInPosts,
  getLinkedInPosts,
  resolveVanityUrl,
  parseUnipileDate,
  type UnipileSearchPost,
} from '@/lib/unipile'
import { isEnglishText } from '@/agents/commenting-agent'

export const dynamic = 'force-dynamic'

const MAX_POSTS_PER_DAY = 25
const MIN_CONTENT_LENGTH = 50

// Content exclusion patterns (spam, certificates, job seekers)
const EXCLUSION_PATTERNS = [
  /\bcertification\s+(earned|achieved|completed)\b/i,
  /\b(looking for|seeking)\s+(new|my next)\s+(role|opportunity|position)\b/i,
  /\b(i('m| am)\s+)?(hiring|we('re| are)\s+hiring)\b/i,
  /\bopen to work\b/i,
  /\bcongrats?\b.*\bnew (role|position|job)\b/i,
]

function shouldExcludeContent(text: string): boolean {
  return EXCLUSION_PATTERNS.some(pattern => pattern.test(text))
}

// POST /api/commenting/discover-posts - Discover posts via Unipile search
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

    // Fetch the monitor
    const { data: monitor, error: monitorError } = await supabase
      .from('vera_linkedin_post_monitors')
      .select('*')
      .eq('id', monitor_id)
      .single()

    if (monitorError || !monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // Get the Unipile account ID for this workspace
    const { data: linkedinAccount } = await supabase
      .from('vera_connected_accounts')
      .select('platform_user_id')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'linkedin')
      .eq('status', 'active')
      .limit(1)
      .single()

    // Fallback to env var if no connected account found
    const accountId = linkedinAccount?.platform_user_id || process.env.UNIPILE_ACCOUNT_ID || ''
    if (!accountId) {
      return NextResponse.json(
        { error: 'No LinkedIn account connected. Connect via Settings > Accounts.' },
        { status: 400 }
      )
    }

    // Check daily cap
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
        message: `Daily cap of ${MAX_POSTS_PER_DAY} posts reached`,
      })
    }

    const remainingSlots = MAX_POSTS_PER_DAY - currentCount

    // Get existing social_ids to deduplicate
    const { data: existingPosts } = await supabase
      .from('vera_linkedin_posts_discovered')
      .select('social_id')
      .eq('workspace_id', workspace_id)

    const existingSocialIds = new Set((existingPosts || []).map(p => p.social_id))

    let totalDiscovered = 0
    let totalSkipped = 0
    const postsToInsert: Record<string, unknown>[] = []

    const monitorType = monitor.monitor_type || 'hashtag'

    if (monitorType === 'profile') {
      // PROFILE MONITORING: Fetch posts from specific LinkedIn profiles
      for (const profileUrl of monitor.hashtags || []) {
        if (postsToInsert.length >= remainingSlots) break

        try {
          const providerId = await resolveVanityUrl(profileUrl, accountId)
          if (!providerId) {
            console.warn(`Could not resolve profile: ${profileUrl}`)
            continue
          }

          const posts = await getLinkedInPosts(providerId, accountId, 20)

          for (const post of posts) {
            if (postsToInsert.length >= remainingSlots) break

            const postContent = post.text || ''
            if (postContent.length < MIN_CONTENT_LENGTH) { totalSkipped++; continue }
            if (existingSocialIds.has(post.id)) { totalSkipped++; continue }
            if (!isEnglishText(postContent)) { totalSkipped++; continue }
            if (shouldExcludeContent(postContent)) { totalSkipped++; continue }

            existingSocialIds.add(post.id)
            const extractedHashtags = postContent.match(/#\w+/g) || []

            postsToInsert.push({
              workspace_id,
              monitor_id,
              social_id: post.id,
              share_url: `https://linkedin.com/feed/update/${post.id}`,
              post_content: postContent,
              author_name: 'Profile Monitor',
              author_profile_id: providerId,
              hashtags: extractedHashtags,
              post_date: post.created_at || post.date || new Date().toISOString(),
              engagement_metrics: {
                reactions: post.reactions_count || 0,
                comments: post.comments_count || 0,
                shares: post.shares_count || 0,
              },
              status: 'discovered',
              comment_eligible_at: new Date(
                Date.now() + (60 + Math.random() * 180) * 60 * 1000 // 1-4 hour random delay
              ).toISOString(),
            })
          }
        } catch (err) {
          console.error(`Error fetching profile posts for ${profileUrl}:`, err)
        }
      }
    } else {
      // HASHTAG/KEYWORD MONITORING: Search via Unipile
      for (const hashtag of monitor.hashtags || []) {
        if (postsToInsert.length >= remainingSlots) break

        try {
          const posts = await searchLinkedInPosts(accountId, hashtag, 'past_week')

          for (const post of posts) {
            if (postsToInsert.length >= remainingSlots) break

            const socialId = post.social_id
            const postContent = post.text || ''

            // Filter: skip short content
            if (postContent.length < MIN_CONTENT_LENGTH) { totalSkipped++; continue }

            // Filter: skip already discovered
            if (existingSocialIds.has(socialId)) { totalSkipped++; continue }

            // Filter: English only
            if (!isEnglishText(postContent)) { totalSkipped++; continue }

            // Filter: exclude spam patterns
            if (shouldExcludeContent(postContent)) { totalSkipped++; continue }

            // Filter: exact hashtag match (Unipile returns fuzzy matches)
            const hashtagLower = hashtag.replace('#', '').toLowerCase()
            const contentHashtags = (postContent.match(/#\w+/g) || []).map(h => h.replace('#', '').toLowerCase())
            if (!contentHashtags.includes(hashtagLower) && !postContent.toLowerCase().includes(hashtagLower)) {
              totalSkipped++
              continue
            }

            existingSocialIds.add(socialId)
            const extractedHashtags = postContent.match(/#\w+/g) || []
            const postDate = parseUnipileDate(post.date) || new Date()

            postsToInsert.push({
              workspace_id,
              monitor_id,
              social_id: socialId,
              share_url: post.share_url || `https://linkedin.com/feed/update/${socialId}`,
              post_content: postContent,
              author_name: post.author?.name || 'Unknown',
              author_profile_id: post.author?.id || '',
              author_headline: post.author?.headline || '',
              hashtags: extractedHashtags,
              post_date: postDate.toISOString(),
              engagement_metrics: {
                reactions: post.reaction_counter || 0,
                comments: post.comment_counter || 0,
                shares: post.repost_counter || 0,
              },
              status: 'discovered',
              comment_eligible_at: new Date(
                Date.now() + (60 + Math.random() * 180) * 60 * 1000 // 1-4 hour random delay
              ).toISOString(),
            })
          }
        } catch (hashtagError) {
          console.error(`Error searching hashtag ${hashtag}:`, hashtagError)
        }
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
