-- VERA Medium Integration

CREATE TABLE vera_medium_brand_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  publication_id TEXT,
  default_tags TEXT[],
  article_format TEXT DEFAULT 'markdown',
  reading_time_target INTEGER DEFAULT 7,
  publish_status TEXT DEFAULT 'draft',
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, is_active)
);
