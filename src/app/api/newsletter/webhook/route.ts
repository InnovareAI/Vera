import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/newsletter/webhook - Postmark webhook for newsletter events
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const event = await request.json()

    const messageId = event.MessageID
    if (!messageId) return NextResponse.json({ error: 'No MessageID' }, { status: 400 })

    // Record type from Postmark
    const recordType = event.RecordType?.toLowerCase()
    const tag = event.Tag // We'll use tag to identify newsletter issues

    if (!tag?.startsWith('newsletter-')) {
      return NextResponse.json({ skipped: true, reason: 'not a newsletter event' })
    }

    const issueId = tag.replace('newsletter-', '')

    // Update issue counts based on event type
    if (recordType === 'open') {
      const { data: issue } = await supabase
        .from('vera_newsletter_issues')
        .select('open_count')
        .eq('id', issueId)
        .single()

      if (issue) {
        await supabase
          .from('vera_newsletter_issues')
          .update({ open_count: (issue.open_count || 0) + 1 })
          .eq('id', issueId)
      }
    } else if (recordType === 'click') {
      const { data: issue } = await supabase
        .from('vera_newsletter_issues')
        .select('click_count')
        .eq('id', issueId)
        .single()

      if (issue) {
        await supabase
          .from('vera_newsletter_issues')
          .update({ click_count: (issue.click_count || 0) + 1 })
          .eq('id', issueId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Newsletter webhook error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
