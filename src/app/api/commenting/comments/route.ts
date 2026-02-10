import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/comments - Fetch comments with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Build query - join with discovered posts for context
    let query = supabase
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
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
