import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/cold-email/campaigns/[id]/send - Queue campaign for sending
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Verify campaign exists and is ready
    const { data: campaign, error: campaignError } = await supabase
      .from('vera_cold_email_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'sending') return NextResponse.json({ error: 'Campaign already sending' }, { status: 409 })

    // Check for recipients
    const { count } = await supabase
      .from('vera_cold_email_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'pending')

    if (!count) return NextResponse.json({ error: 'No pending recipients' }, { status: 400 })

    // Update campaign status
    await supabase
      .from('vera_cold_email_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', id)

    // Queue job
    const { error: jobError } = await supabase
      .from('vera_jobs_queue')
      .insert({
        job_type: 'cold-email-send',
        workspace_id: campaign.workspace_id,
        payload: { campaign_id: id },
      })

    if (jobError) throw jobError

    return NextResponse.json({ success: true, pending_recipients: count })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
