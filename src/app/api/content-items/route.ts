import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { workspace_id, project_id, content, platform, source_url, source_title, status, theme, hook, hashtags, character_count } = body

    if (!workspace_id || !content) {
      return NextResponse.json({ error: 'workspace_id and content are required' }, { status: 400 })
    }

    const insertData: Record<string, unknown> = {
      workspace_id,
      project_id: project_id || null,
      content,
      platform: platform || null,
      source_url: source_url || null,
      source_title: source_title || null,
      status: status || 'draft',
      created_at: new Date().toISOString(),
    }

    // Add optional fields if provided
    if (theme) insertData.theme = theme
    if (hook) insertData.hook = hook
    if (hashtags) insertData.hashtags = hashtags
    if (character_count) insertData.character_count = character_count

    const { data, error } = await supabase
      .from('content_items')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Content item save error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    let query = supabase
      .from('content_items')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (projectId) query = query.eq('project_id', projectId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query.limit(100)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
