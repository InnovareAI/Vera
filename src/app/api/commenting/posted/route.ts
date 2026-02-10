import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/posted - Fetch posted comments history
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Fetch posted comments from the comment queue
    const { data: postedComments, error: queueError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select(`
        *,
        vera_linkedin_posts_discovered (
          id,
          social_id,
          share_url,
          post_content,
          author_name,
          author_profile_id,
          author_headline,
          hashtags,
          post_date,
          engagement_metrics
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queueError) throw queueError

    // Fetch engagement data from comments_posted if exists
    const postSocialIds = (postedComments || []).map(c => c.post_social_id).filter(Boolean)

    let engagementMap: Record<string, Record<string, unknown>> = {}
    if (postSocialIds.length > 0) {
      const { data: engagementData } = await supabase
        .from('vera_linkedin_comments_posted')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('post_social_id', postSocialIds)

      if (engagementData) {
        engagementMap = engagementData.reduce((acc: Record<string, Record<string, unknown>>, row) => {
          acc[row.post_social_id] = {
            comment_id: row.comment_id,
            reactions_count: row.reactions_count,
            replies_count: row.replies_count,
            performance_score: row.performance_score,
            user_replied: row.user_replied,
            author_replied: row.author_replied,
            author_liked: row.author_liked,
            engagement_metrics: row.engagement_metrics,
          }
          return acc
        }, {})
      }
    }

    // Merge engagement data
    const results = (postedComments || []).map(comment => ({
      ...comment,
      engagement: engagementMap[comment.post_social_id] || null,
    }))

    return NextResponse.json(results)
  } catch (error: unknown) {
    console.error('Posted comments error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
