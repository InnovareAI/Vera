import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { postLinkedInComment } from '@/lib/unipile'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commenting/post-comment
 *
 * Actually posts an approved comment to LinkedIn via Unipile.
 * This is the final step in the commenting workflow:
 * Discover → Generate → Approve → POST (this route)
 *
 * Anti-detection: checks hard limits, validates scheduling, tracks posted comments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { comment_id, workspace_id } = body

    if (!comment_id || !workspace_id) {
      return NextResponse.json(
        { error: 'comment_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Fetch the comment
    const { data: comment, error: commentError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('*, post:vera_linkedin_posts_discovered(*)')
      .eq('id', comment_id)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Validate status - only approved or scheduled comments can be posted
    if (!['approved', 'scheduled'].includes(comment.status)) {
      return NextResponse.json(
        { error: `Cannot post comment with status '${comment.status}'. Must be approved or scheduled.` },
        { status: 400 }
      )
    }

    // Anti-detection: check hourly and daily limits
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [hourlyCount, dailyCount] = await Promise.all([
      supabase
        .from('vera_linkedin_comment_queue')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id)
        .eq('status', 'posted')
        .gte('posted_at', oneHourAgo),
      supabase
        .from('vera_linkedin_comment_queue')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id)
        .eq('status', 'posted')
        .gte('posted_at', todayStart.toISOString()),
    ])

    const HOURLY_LIMIT = 2
    const DAILY_LIMIT = 5

    if ((hourlyCount.count || 0) >= HOURLY_LIMIT) {
      return NextResponse.json(
        { error: `Hourly comment limit reached (${HOURLY_LIMIT}/hr). Try again later.` },
        { status: 429 }
      )
    }

    if ((dailyCount.count || 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `Daily comment limit reached (${DAILY_LIMIT}/day). Try again tomorrow.` },
        { status: 429 }
      )
    }

    // Check for duplicate: already commented on this post?
    const { count: existingCount } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id)
      .eq('post_social_id', comment.post_social_id)
      .eq('status', 'posted')

    if ((existingCount || 0) > 0) {
      // Mark as skipped to prevent reposting
      await supabase
        .from('vera_linkedin_comment_queue')
        .update({ status: 'skipped', error_message: 'Already commented on this post', updated_at: new Date().toISOString() })
        .eq('id', comment_id)

      return NextResponse.json(
        { error: 'Already commented on this post' },
        { status: 409 }
      )
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

    const accountId = linkedinAccount?.platform_user_id || process.env.UNIPILE_ACCOUNT_ID || ''
    if (!accountId) {
      return NextResponse.json(
        { error: 'No LinkedIn account connected' },
        { status: 400 }
      )
    }

    // Mark as 'posting' to prevent concurrent posts
    const { data: claimed, error: claimError } = await supabase
      .from('vera_linkedin_comment_queue')
      .update({ status: 'posting', updated_at: new Date().toISOString() })
      .eq('id', comment_id)
      .in('status', ['approved', 'scheduled'])
      .select()
      .single()

    if (claimError || !claimed) {
      return NextResponse.json(
        { error: 'Comment already being posted or status changed' },
        { status: 409 }
      )
    }

    // POST TO LINKEDIN via Unipile
    const result = await postLinkedInComment(
      accountId,
      comment.post_social_id,
      comment.comment_text,
      comment.is_reply_to_comment ? comment.reply_to_comment_id : undefined
    )

    if (!result.success) {
      // Mark as failed
      await supabase
        .from('vera_linkedin_comment_queue')
        .update({
          status: 'failed',
          error_message: result.error || 'Unknown Unipile error',
          updated_at: new Date().toISOString()
        })
        .eq('id', comment_id)

      return NextResponse.json(
        { error: `Failed to post comment: ${result.error}` },
        { status: 502 }
      )
    }

    const now = new Date().toISOString()

    // Mark as posted
    await supabase
      .from('vera_linkedin_comment_queue')
      .update({
        status: 'posted',
        posted_at: now,
        updated_at: now,
      })
      .eq('id', comment_id)

    // Insert into posted comments table for engagement tracking
    await supabase
      .from('vera_linkedin_comments_posted')
      .insert({
        workspace_id,
        post_id: comment.post_id,
        queue_id: comment.id,
        comment_id: result.commentId || `vera_${Date.now()}`,
        post_social_id: comment.post_social_id,
        comment_text: comment.comment_text,
        posted_at: now,
      })

    // Update the discovered post status to 'commented'
    if (comment.post_id) {
      await supabase
        .from('vera_linkedin_posts_discovered')
        .update({ status: 'commented', updated_at: now })
        .eq('id', comment.post_id)
    }

    // Update author relationship tracking
    const authorProfileId = comment.post?.author_profile_id
    if (authorProfileId) {
      try {
        await supabase
          .from('vera_linkedin_author_relationships')
          .upsert({
            workspace_id,
            author_profile_id: authorProfileId,
            author_name: comment.post?.author_name || 'Unknown',
            total_comments: 1,
            last_commented_at: now,
            updated_at: now,
          }, { onConflict: 'workspace_id,author_profile_id' })
      } catch {
        // Non-critical, don't fail the post
      }
    }

    return NextResponse.json({
      success: true,
      comment_id: result.commentId,
      posted_at: now,
      daily_count: (dailyCount.count || 0) + 1,
      daily_limit: DAILY_LIMIT,
    })
  } catch (error: unknown) {
    console.error('Post comment error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
