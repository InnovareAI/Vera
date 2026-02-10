import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/newsletter/subscribers
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const newsletterId = searchParams.get('newsletter_id')
    const status = searchParams.get('status')
    if (!newsletterId) return NextResponse.json({ error: 'newsletter_id required' }, { status: 400 })

    let query = supabase
      .from('vera_newsletter_subscribers')
      .select('*')
      .eq('newsletter_id', newsletterId)
      .order('subscribed_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/newsletter/subscribers - Add subscriber
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    if (!body.newsletter_id || !body.email) {
      return NextResponse.json({ error: 'newsletter_id and email required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_newsletter_subscribers')
      .insert({
        newsletter_id: body.newsletter_id,
        email: body.email,
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        tags: body.tags || [],
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// DELETE /api/newsletter/subscribers - Unsubscribe
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { subscriber_id } = await request.json()
    if (!subscriber_id) return NextResponse.json({ error: 'subscriber_id required' }, { status: 400 })

    const { error } = await supabase
      .from('vera_newsletter_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('id', subscriber_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
