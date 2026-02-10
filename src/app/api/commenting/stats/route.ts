import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/stats - Quick stats overview
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // 1. Total monitors count
    const { count: monitorsCount, error: monitorsError } = await supabase
      .from('vera_linkedin_post_monitors')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    if (monitorsError) throw monitorsError

    // 2. Pending comments count
    const { count: pendingCount, error: pendingError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending_approval')

    if (pendingError) throw pendingError

    // 3. Posted today count
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count: postedTodayCount, error: todayError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted')
      .gte('posted_at', todayStart.toISOString())

    if (todayError) throw todayError

    // 4. Posted this week count
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    const { count: postedWeekCount, error: weekError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted')
      .gte('posted_at', weekStart.toISOString())

    if (weekError) throw weekError

    return NextResponse.json({
      total_monitors: monitorsCount || 0,
      pending_comments: pendingCount || 0,
      posted_today: postedTodayCount || 0,
      posted_this_week: postedWeekCount || 0,
    })
  } catch (error: unknown) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
