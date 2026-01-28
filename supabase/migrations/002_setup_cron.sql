-- Migration: Setup pg_cron for Scout Reddit
-- Run this after deploying edge functions
-- Enable pg_cron extension (requires Supabase Pro or higher)
-- This may already be enabled via Supabase dashboard
create extension if not exists pg_cron;
-- Grant usage on cron schema
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
-- Create the cron job to run Scout Reddit every 15 minutes
-- Note: The edge function URL should be updated after deployment
select cron.schedule(
        'scout-reddit-job',
        -- job name
        '*/15 * * * *',
        -- every 15 minutes
        $$
        select net.http_post(
                url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/scout-reddit',
                headers := jsonb_build_object(
                    'Content-Type',
                    'application/json',
                    'Authorization',
                    'Bearer ' || current_setting('supabase.service_role_key')
                ),
                body := '{}'::jsonb
            ) as request_id $$
    );
-- View scheduled jobs
-- select * from cron.job;
-- View job run history
-- select * from cron.job_run_details order by start_time desc limit 20;
-- To unschedule (if needed):
-- select cron.unschedule('scout-reddit-job');