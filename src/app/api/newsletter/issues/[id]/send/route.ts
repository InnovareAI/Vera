import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/newsletter/issues/[id]/send - Queue newsletter for sending
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: issue } = await supabase
      .from('vera_newsletter_issues')
      .select('*, vera_newsletter_config(*)')
      .eq('id', id)
      .single()

    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    if (issue.status === 'sent') return NextResponse.json({ error: 'Issue already sent' }, { status: 409 })
    if (!issue.body_html && !issue.body_markdown) {
      return NextResponse.json({ error: 'Issue has no content' }, { status: 400 })
    }

    // Count active subscribers
    const { count } = await supabase
      .from('vera_newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('newsletter_id', issue.newsletter_id)
      .eq('status', 'active')

    if (!count) return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })

    // Update status
    await supabase
      .from('vera_newsletter_issues')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', id)

    // Queue job
    await supabase.from('vera_jobs_queue').insert({
      job_type: 'newsletter-send',
      workspace_id: issue.workspace_id,
      payload: { issue_id: id, newsletter_id: issue.newsletter_id },
    })

    return NextResponse.json({ success: true, subscriber_count: count })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
