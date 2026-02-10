-- VERA Twitter/X Integration

CREATE TABLE vera_twitter_brand_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  tone TEXT DEFAULT 'witty',
  max_tweet_length INTEGER DEFAULT 280,
  thread_style TEXT DEFAULT 'numbered',
  hashtag_usage TEXT DEFAULT 'minimal',
  emoji_usage TEXT DEFAULT 'occasional',
  engagement_style TEXT,
  content_themes TEXT[],
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, is_active)
);
