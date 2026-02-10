import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/newsletter/config
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('vera_newsletter_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/newsletter/config
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    if (!body.workspace_id || !body.name) {
      return NextResponse.json({ error: 'workspace_id and name required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_newsletter_config')
      .insert({
        workspace_id: body.workspace_id,
        name: body.name,
        from_name: body.from_name || null,
        from_email: body.from_email || null,
        reply_to: body.reply_to || null,
        cadence: body.cadence || 'weekly',
        default_template: body.default_template || null,
        footer_html: body.footer_html || null,
        unsubscribe_url: body.unsubscribe_url || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// PATCH /api/newsletter/config
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('vera_newsletter_config')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
