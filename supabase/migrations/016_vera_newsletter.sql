-- VERA Newsletter

CREATE TABLE vera_newsletter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  cadence TEXT DEFAULT 'weekly',
  default_template TEXT,
  footer_html TEXT,
  unsubscribe_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE vera_newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES vera_newsletter_config(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  UNIQUE(newsletter_id, email)
);

CREATE TABLE vera_newsletter_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES vera_newsletter_config(id),
  workspace_id UUID,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT,
  body_markdown TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_newsletter_issues_status ON vera_newsletter_issues(newsletter_id, status);
CREATE INDEX idx_newsletter_subscribers_active ON vera_newsletter_subscribers(newsletter_id, status) WHERE status = 'active';
