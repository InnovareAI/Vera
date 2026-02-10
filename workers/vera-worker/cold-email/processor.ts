import { SupabaseClient } from '@supabase/supabase-js';
import { withLock } from '../lib/distributed-lock.js';

export async function processColdEmailBatch(supabase: SupabaseClient) {
  return withLock(supabase, 'cold-email-send', async () => {
    // Find pending jobs
    const { data: jobs } = await supabase
      .from('vera_jobs_queue')
      .select('*')
      .eq('job_type', 'cold-email-send')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (!jobs?.length) return;
    const job = jobs[0];

    await supabase
      .from('vera_jobs_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    try {
      const campaignId = job.payload.campaign_id;

      // Fetch pending recipients
      const { data: recipients } = await supabase
        .from('vera_cold_email_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .limit(500);

      if (!recipients?.length) {
        await supabase
          .from('vera_jobs_queue')
          .update({ status: 'completed', completed_at: new Date().toISOString(), result: { sent: 0 } })
          .eq('id', job.id);
        return;
      }

      // Fetch campaign for template
      const { data: campaign } = await supabase
        .from('vera_cold_email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

      // TODO: Send via Postmark batch - interpolate variables per recipient
      // For now, mark as sent
      let sentCount = 0;
      for (const recipient of recipients) {
        // TODO: Implement actual Postmark sending with variable interpolation
        await supabase
          .from('vera_cold_email_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', recipient.id);
        sentCount++;
      }

      // Update campaign counts
      await supabase
        .from('vera_cold_email_campaigns')
        .update({ sent_count: (campaign.sent_count || 0) + sentCount })
        .eq('id', campaignId);

      await supabase
        .from('vera_jobs_queue')
        .update({ status: 'completed', completed_at: new Date().toISOString(), result: { sent: sentCount } })
        .eq('id', job.id);

    } catch (error) {
      await supabase
        .from('vera_jobs_queue')
        .update({ status: 'failed', error_message: (error as Error).message, completed_at: new Date().toISOString() })
        .eq('id', job.id);
      throw error;
    }
  });
}
