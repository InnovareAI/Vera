import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/newsletter/issues
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const newsletterId = searchParams.get('newsletter_id')
    const workspaceId = searchParams.get('workspace_id')

    let query = supabase
      .from('vera_newsletter_issues')
      .select('*')
      .order('created_at', { ascending: false })

    if (newsletterId) query = query.eq('newsletter_id', newsletterId)
    if (workspaceId) query = query.eq('workspace_id', workspaceId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/newsletter/issues
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    if (!body.newsletter_id || !body.subject) {
      return NextResponse.json({ error: 'newsletter_id and subject required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_newsletter_issues')
      .insert({
        newsletter_id: body.newsletter_id,
        workspace_id: body.workspace_id,
        subject: body.subject,
        preview_text: body.preview_text || null,
        body_html: body.body_html || null,
        body_markdown: body.body_markdown || null,
        scheduled_for: body.scheduled_for || null,
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
