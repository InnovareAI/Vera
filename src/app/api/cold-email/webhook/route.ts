import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/cold-email/webhook - Postmark webhook for open/click/bounce/delivery
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const event = await request.json()

    const messageId = event.MessageID
    if (!messageId) return NextResponse.json({ error: 'No MessageID' }, { status: 400 })

    // Find recipient by message_id
    const { data: recipient } = await supabase
      .from('vera_cold_email_recipients')
      .select('id, campaign_id')
      .eq('message_id', messageId)
      .single()

    if (!recipient) {
      // Could be a newsletter event — check newsletter table
      return NextResponse.json({ skipped: true, reason: 'recipient not found' })
    }

    // Record event
    await supabase.from('vera_cold_email_events').insert({
      message_id: messageId,
      recipient_id: recipient.id,
      event_type: event.RecordType?.toLowerCase() || 'unknown',
      metadata: event,
    })

    // Update recipient status based on event type
    const recordType = event.RecordType?.toLowerCase()
    const updates: Record<string, unknown> = {}

    switch (recordType) {
      case 'delivery':
        updates.status = 'delivered'
        break
      case 'open':
        updates.opened_at = new Date().toISOString()
        break
      case 'click':
        updates.clicked_at = new Date().toISOString()
        break
      case 'bounce':
        updates.status = 'bounced'
        updates.bounced_at = new Date().toISOString()
        break
      case 'spamcomplaint':
        updates.status = 'bounced'
        break
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('vera_cold_email_recipients')
        .update(updates)
        .eq('id', recipient.id)
    }

    // Increment campaign counts
    if (recordType === 'open' || recordType === 'click' || recordType === 'bounce') {
      const field = recordType === 'open' ? 'open_count' : recordType === 'click' ? 'click_count' : 'bounce_count'
      const { data: campaign } = await supabase
        .from('vera_cold_email_campaigns')
        .select(field)
        .eq('id', recipient.campaign_id)
        .single()

      if (campaign) {
        await supabase
          .from('vera_cold_email_campaigns')
          .update({ [field]: ((campaign as Record<string, number>)[field] || 0) + 1 })
          .eq('id', recipient.campaign_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
