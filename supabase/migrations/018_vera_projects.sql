-- 018_vera_projects.sql
-- Project system for VERA - brand context, products, ICP, tone of voice, platforms

CREATE TABLE vera_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  brand_colors JSONB DEFAULT '{"primary":"#7c3aed","secondary":"#a855f7"}',
  industry TEXT,
  products JSONB DEFAULT '[]',
  icp JSONB DEFAULT '{}',
  tone_of_voice JSONB DEFAULT '{}',
  enabled_platforms JSONB DEFAULT '["linkedin"]',
  platform_settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  is_default BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

CREATE INDEX idx_vera_projects_workspace ON vera_projects(workspace_id, status);

ALTER TABLE vera_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON vera_projects FOR ALL USING (true) WITH CHECK (true);
