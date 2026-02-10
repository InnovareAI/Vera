import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/ai-search-agent/config
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('vera_ai_search_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return NextResponse.json(data || null)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/ai-search-agent/config
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('vera_ai_search_config')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// PATCH /api/ai-search-agent/config
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('vera_ai_search_config')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
