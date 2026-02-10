import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/pending - Fetch pending + scheduled comments with full context
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Fetch pending_approval and scheduled comments with post and monitor context
    const { data: comments, error } = await supabase
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
          engagement_metrics,
          monitor_id,
          vera_linkedin_post_monitors (
            id,
            name,
            hashtags,
            monitor_type
          )
        )
      `)
      .eq('workspace_id', workspaceId)
      .in('status', ['pending_approval', 'scheduled'])
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(comments || [])
  } catch (error: unknown) {
    console.error('Pending comments error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
