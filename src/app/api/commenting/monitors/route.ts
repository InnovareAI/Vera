import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/monitors - Fetch all monitors for a workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Fetch monitors with count of discovered posts per monitor
    const { data: monitors, error } = await supabase
      .from('vera_linkedin_post_monitors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get post counts per monitor
    const monitorIds = (monitors || []).map(m => m.id)

    let postCounts: Record<string, number> = {}
    if (monitorIds.length > 0) {
      const { data: counts, error: countError } = await supabase
        .from('vera_linkedin_posts_discovered')
        .select('monitor_id')
        .in('monitor_id', monitorIds)

      if (!countError && counts) {
        postCounts = counts.reduce((acc: Record<string, number>, row) => {
          acc[row.monitor_id] = (acc[row.monitor_id] || 0) + 1
          return acc
        }, {})
      }
    }

    // Merge post counts into monitors
    const monitorsWithCounts = (monitors || []).map(monitor => ({
      ...monitor,
      posts_discovered_count: postCounts[monitor.id] || 0,
    }))

    return NextResponse.json(monitorsWithCounts)
  } catch (error: unknown) {
    console.error('Monitors GET error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/commenting/monitors - Create a new monitor
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { workspace_id, name, hashtags, keywords, monitor_type, created_by } = body

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }
    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return NextResponse.json({ error: 'At least one hashtag is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_linkedin_post_monitors')
      .insert({
        workspace_id,
        name: name || hashtags.join(', '),
        hashtags,
        keywords: keywords || [],
        monitor_type: monitor_type || 'hashtag',
        created_by: created_by || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error('Monitors POST error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
