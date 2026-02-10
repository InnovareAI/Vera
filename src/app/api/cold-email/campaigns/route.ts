import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/cold-email/campaigns
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('vera_cold_email_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/cold-email/campaigns
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    if (!body.workspace_id || !body.name || !body.subject || !body.body_template) {
      return NextResponse.json({ error: 'workspace_id, name, subject, and body_template required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_cold_email_campaigns')
      .insert({
        workspace_id: body.workspace_id,
        name: body.name,
        subject: body.subject,
        subject_b: body.subject_b || null,
        body_template: body.body_template,
        body_template_b: body.body_template_b || null,
        from_name: body.from_name || null,
        from_email: body.from_email || null,
        reply_to: body.reply_to || null,
        variables: body.variables || [],
        created_by: body.created_by || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
