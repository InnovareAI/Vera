import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/cold-email/campaigns/[id]/recipients
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('vera_cold_email_recipients')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/cold-email/campaigns/[id]/recipients - Add recipients
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { recipients } = await request.json()

    if (!recipients?.length) return NextResponse.json({ error: 'recipients array required' }, { status: 400 })

    const rows = recipients.map((r: { email: string; first_name?: string; last_name?: string; company?: string; variables?: Record<string, unknown> }) => ({
      campaign_id: id,
      email: r.email,
      first_name: r.first_name || null,
      last_name: r.last_name || null,
      company: r.company || null,
      variables: r.variables || {},
    }))

    const { data, error } = await supabase
      .from('vera_cold_email_recipients')
      .insert(rows)
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, added: data?.length || 0 }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// DELETE /api/cold-email/campaigns/[id]/recipients - Remove recipients
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { recipient_ids } = await request.json()

    if (!recipient_ids?.length) return NextResponse.json({ error: 'recipient_ids required' }, { status: 400 })

    const { error } = await supabase
      .from('vera_cold_email_recipients')
      .delete()
      .eq('campaign_id', id)
      .in('id', recipient_ids)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
