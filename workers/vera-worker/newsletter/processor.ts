import { SupabaseClient } from '@supabase/supabase-js';
import { withLock } from '../lib/distributed-lock.js';

export async function processNewsletterSend(supabase: SupabaseClient) {
  return withLock(supabase, 'newsletter-send', async () => {
    // Find pending newsletter jobs
    const { data: jobs } = await supabase
      .from('vera_jobs_queue')
      .select('*')
      .eq('job_type', 'newsletter-send')
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
      const issueId = job.payload.issue_id;

      // Fetch issue
      const { data: issue } = await supabase
        .from('vera_newsletter_issues')
        .select('*, vera_newsletter_config(*)')
        .eq('id', issueId)
        .single();

      if (!issue) throw new Error(`Newsletter issue ${issueId} not found`);

      // Fetch active subscribers
      const { data: subscribers } = await supabase
        .from('vera_newsletter_subscribers')
        .select('*')
        .eq('newsletter_id', issue.newsletter_id)
        .eq('status', 'active');

      if (!subscribers?.length) {
        await supabase
          .from('vera_jobs_queue')
          .update({ status: 'completed', completed_at: new Date().toISOString(), result: { sent: 0 } })
          .eq('id', job.id);
        return;
      }

      // TODO: Send via Postmark batch
      const sentCount = subscribers.length;

      // Update issue
      await supabase
        .from('vera_newsletter_issues')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipient_count: sentCount,
        })
        .eq('id', issueId);

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
