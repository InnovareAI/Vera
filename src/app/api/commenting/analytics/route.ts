import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/analytics - Analytics overview
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const range = searchParams.get('range') || '30d'

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Determine date range
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const rangeStart = new Date()
    rangeStart.setDate(rangeStart.getDate() - days)
    const rangeStartISO = rangeStart.toISOString()

    // 1. Total comments posted in range
    const { data: postedComments, error: postedError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('id, confidence_score, posted_at, created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted')
      .gte('posted_at', rangeStartISO)

    if (postedError) throw postedError

    const totalPosted = postedComments?.length || 0

    // 2. Average confidence score
    const scores = (postedComments || [])
      .map(c => c.confidence_score)
      .filter((s): s is number => s !== null && s !== undefined)
    const avgConfidence = scores.length > 0
      ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
      : 0

    // 3. Top monitors by comment count
    const { data: allPostedComments } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('post_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted')
      .gte('posted_at', rangeStartISO)

    // Get monitor IDs via posts
    const postIds = (allPostedComments || []).map(c => c.post_id).filter(Boolean)
    let topMonitors: { monitor_id: string; monitor_name: string; comment_count: number }[] = []

    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('vera_linkedin_posts_discovered')
        .select('monitor_id')
        .in('id', postIds)

      // Count per monitor
      const monitorCounts: Record<string, number> = {}
      for (const p of posts || []) {
        if (p.monitor_id) {
          monitorCounts[p.monitor_id] = (monitorCounts[p.monitor_id] || 0) + 1
        }
      }

      // Fetch monitor names
      const monitorIds = Object.keys(monitorCounts)
      if (monitorIds.length > 0) {
        const { data: monitors } = await supabase
          .from('vera_linkedin_post_monitors')
          .select('id, name')
          .in('id', monitorIds)

        const monitorNameMap: Record<string, string> = {}
        for (const m of monitors || []) {
          monitorNameMap[m.id] = m.name || 'Unnamed Monitor'
        }

        topMonitors = Object.entries(monitorCounts)
          .map(([monitorId, count]) => ({
            monitor_id: monitorId,
            monitor_name: monitorNameMap[monitorId] || 'Unknown',
            comment_count: count,
          }))
          .sort((a, b) => b.comment_count - a.comment_count)
          .slice(0, 10)
      }
    }

    // 4. Daily trend (comments per day)
    const dailyTrend: Record<string, number> = {}
    for (const comment of postedComments || []) {
      const date = comment.posted_at
        ? new Date(comment.posted_at).toISOString().split('T')[0]
        : new Date(comment.created_at).toISOString().split('T')[0]
      dailyTrend[date] = (dailyTrend[date] || 0) + 1
    }

    // Fill in missing days with 0
    const trendArray: { date: string; count: number }[] = []
    const currentDate = new Date(rangeStart)
    const today = new Date()
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0]
      trendArray.push({
        date: dateStr,
        count: dailyTrend[dateStr] || 0,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({
      range,
      total_posted: totalPosted,
      avg_confidence_score: avgConfidence,
      top_monitors: topMonitors,
      daily_trend: trendArray,
    })
  } catch (error: unknown) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
