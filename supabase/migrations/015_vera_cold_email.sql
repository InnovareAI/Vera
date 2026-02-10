-- VERA Cold Email Campaigns

CREATE TABLE vera_cold_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_b TEXT,
  body_template TEXT NOT NULL,
  body_template_b TEXT,
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  variables JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  send_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vera_cold_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES vera_cold_email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  variables JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vera_cold_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  recipient_id UUID REFERENCES vera_cold_email_recipients(id),
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cold_email_events_message ON vera_cold_email_events(message_id);
CREATE INDEX idx_cold_email_recipients_campaign ON vera_cold_email_recipients(campaign_id, status);
