import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/cold-email/analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const campaignId = searchParams.get('campaign_id')

    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    if (campaignId) {
      // Single campaign analytics
      const { data: campaign } = await supabase
        .from('vera_cold_email_campaigns')
        .select('id, name, sent_count, open_count, click_count, reply_count, bounce_count, status, created_at')
        .eq('id', campaignId)
        .single()

      if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

      const openRate = campaign.sent_count > 0 ? ((campaign.open_count / campaign.sent_count) * 100).toFixed(1) : '0'
      const clickRate = campaign.sent_count > 0 ? ((campaign.click_count / campaign.sent_count) * 100).toFixed(1) : '0'
      const bounceRate = campaign.sent_count > 0 ? ((campaign.bounce_count / campaign.sent_count) * 100).toFixed(1) : '0'

      return NextResponse.json({ ...campaign, open_rate: openRate, click_rate: clickRate, bounce_rate: bounceRate })
    }

    // Workspace-level analytics
    const { data: campaigns } = await supabase
      .from('vera_cold_email_campaigns')
      .select('sent_count, open_count, click_count, reply_count, bounce_count')
      .eq('workspace_id', workspaceId)
      .neq('status', 'deleted')

    const totals = (campaigns || []).reduce(
      (acc, c) => ({
        sent: acc.sent + (c.sent_count || 0),
        opens: acc.opens + (c.open_count || 0),
        clicks: acc.clicks + (c.click_count || 0),
        replies: acc.replies + (c.reply_count || 0),
        bounces: acc.bounces + (c.bounce_count || 0),
      }),
      { sent: 0, opens: 0, clicks: 0, replies: 0, bounces: 0 }
    )

    return NextResponse.json({
      total_campaigns: campaigns?.length || 0,
      ...totals,
      open_rate: totals.sent > 0 ? ((totals.opens / totals.sent) * 100).toFixed(1) : '0',
      click_rate: totals.sent > 0 ? ((totals.clicks / totals.sent) * 100).toFixed(1) : '0',
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
