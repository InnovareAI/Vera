-- ============================================================
-- 017: VERA Commenting Agent
-- LinkedIn commenting agent tables, indexes, RLS, views
-- All tables use vera_ prefix. No SAM references.
-- workspace_id is UUID indexed but without FK to workspaces.
-- ============================================================

-- ============================================================
-- 1. vera_linkedin_brand_guidelines
--    Brand voice / style settings for the commenting agent
-- ============================================================
CREATE TABLE vera_linkedin_brand_guidelines (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,

  -- Core voice settings
  tone                      TEXT DEFAULT 'professional',
  formality                 TEXT DEFAULT 'semi_formal',
  comment_length            TEXT DEFAULT 'medium',
  question_frequency        TEXT DEFAULT 'sometimes',
  perspective_style         TEXT DEFAULT 'additive',
  confidence_level          TEXT DEFAULT 'balanced',

  -- Knowledge & context
  use_workspace_knowledge   BOOLEAN DEFAULT false,
  what_you_do               TEXT,
  what_youve_learned        TEXT,
  pov_on_future             TEXT,
  industry_talking_points   TEXT,

  -- Voice reference
  voice_reference           TEXT,
  tone_of_voice             TEXT,
  writing_style             TEXT,
  dos_and_donts             TEXT,

  -- Personality flags
  okay_funny                BOOLEAN DEFAULT false,
  okay_blunt                BOOLEAN DEFAULT false,
  casual_openers            BOOLEAN DEFAULT true,
  personal_experience       BOOLEAN DEFAULT true,
  strictly_professional     BOOLEAN DEFAULT false,

  -- Framework
  framework_preset          TEXT DEFAULT 'aca_i',
  custom_framework          TEXT,
  max_characters            INTEGER DEFAULT 300,

  -- Examples / admired
  example_comments          JSONB DEFAULT '[]'::jsonb,
  admired_comments          JSONB DEFAULT '[]'::jsonb,

  -- Targeting & scope
  default_relationship_tag  TEXT DEFAULT 'unknown',
  comment_scope             TEXT DEFAULT 'my_expertise',
  auto_skip_generic         BOOLEAN DEFAULT true,
  post_age_awareness        BOOLEAN DEFAULT true,
  recent_comment_memory     BOOLEAN DEFAULT true,
  competitors_never_mention TEXT[],

  -- CTA
  end_with_cta              TEXT DEFAULT 'never',
  cta_style                 TEXT DEFAULT 'question_only',

  -- Scheduling
  timezone                  TEXT DEFAULT 'America/New_York',
  posting_start_time        TEXT,
  posting_end_time          TEXT,
  post_on_weekends          BOOLEAN DEFAULT false,
  post_on_holidays          BOOLEAN DEFAULT false,
  skip_business_hours       BOOLEAN DEFAULT false,

  -- Warmup
  warmup_start_date         TIMESTAMPTZ,
  daily_comment_limit       INTEGER DEFAULT 5,

  -- Priority profiles
  priority_profiles         JSONB DEFAULT '[]'::jsonb,

  -- Opportunity digest
  opportunity_digest_enabled BOOLEAN DEFAULT false,
  opportunity_digest_time   TEXT,
  digest_email              TEXT,
  digest_enabled            BOOLEAN DEFAULT false,
  digest_time               TEXT,
  digest_timezone           TEXT,
  digest_cc_email           TEXT,

  -- Posting windows
  posting_windows           JSONB,
  skip_weekends             BOOLEAN DEFAULT true,
  skip_holidays             BOOLEAN DEFAULT true,

  -- System
  system_prompt             TEXT,
  is_active                 BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workspace_id, is_active)
);

CREATE INDEX idx_vera_li_brand_guidelines_workspace
  ON vera_linkedin_brand_guidelines(workspace_id);

-- ============================================================
-- 2. vera_linkedin_post_monitors
--    Hashtag / keyword / profile monitors
-- ============================================================
CREATE TABLE vera_linkedin_post_monitors (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,
  name                      TEXT,
  hashtags                  TEXT[] NOT NULL DEFAULT '{}',
  keywords                  TEXT[],
  monitor_type              TEXT DEFAULT 'hashtag',
  status                    TEXT DEFAULT 'active',
  monitor_comments          BOOLEAN DEFAULT false,
  reply_to_comments         BOOLEAN DEFAULT false,
  timezone                  TEXT DEFAULT 'America/New_York',
  daily_start_time          TEXT,
  auto_approve_enabled      BOOLEAN DEFAULT false,
  auto_approve_start_time   TEXT,
  auto_approve_end_time     TEXT,
  metadata                  JSONB DEFAULT '{}'::jsonb,
  created_by                UUID,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vera_li_post_monitors_workspace
  ON vera_linkedin_post_monitors(workspace_id);
CREATE INDEX idx_vera_li_post_monitors_status
  ON vera_linkedin_post_monitors(workspace_id, status);

-- ============================================================
-- 3. vera_linkedin_posts_discovered
--    Posts found by monitors
-- ============================================================
CREATE TABLE vera_linkedin_posts_discovered (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,
  monitor_id                UUID REFERENCES vera_linkedin_post_monitors(id) ON DELETE SET NULL,
  social_id                 TEXT UNIQUE NOT NULL,
  share_url                 TEXT NOT NULL,
  post_content              TEXT,
  author_name               TEXT,
  author_profile_id         TEXT,
  author_headline           TEXT,
  hashtags                  TEXT[],
  post_date                 TIMESTAMPTZ,
  engagement_metrics        JSONB,
  engagement_quality_score  FLOAT,
  quality_factors           JSONB,
  status                    TEXT DEFAULT 'discovered'
                            CHECK (status IN ('discovered','processing','commented','skipped','expired')),
  skip_reason               TEXT,
  parent_post_id            UUID,
  is_comment                BOOLEAN DEFAULT false,
  comment_author            TEXT,
  expires_at                TIMESTAMPTZ,
  expired_at                TIMESTAMPTZ,
  comment_eligible_at       TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vera_li_posts_disc_workspace
  ON vera_linkedin_posts_discovered(workspace_id);
CREATE INDEX idx_vera_li_posts_disc_status
  ON vera_linkedin_posts_discovered(workspace_id, status);
CREATE INDEX idx_vera_li_posts_disc_social_id
  ON vera_linkedin_posts_discovered(social_id);
CREATE INDEX idx_vera_li_posts_disc_monitor
  ON vera_linkedin_posts_discovered(monitor_id);
CREATE INDEX idx_vera_li_posts_disc_created
  ON vera_linkedin_posts_discovered(created_at DESC);
CREATE INDEX idx_vera_li_posts_disc_author
  ON vera_linkedin_posts_discovered(author_profile_id);

-- ============================================================
-- 4. vera_linkedin_comment_queue
--    Primary table for generated comments
-- ============================================================
CREATE TABLE vera_linkedin_comment_queue (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,
  post_id                   UUID REFERENCES vera_linkedin_posts_discovered(id) ON DELETE SET NULL,
  post_social_id            TEXT NOT NULL,
  comment_text              TEXT NOT NULL,
  comment_length            INTEGER,
  status                    TEXT DEFAULT 'pending_approval'
                            CHECK (status IN (
                              'pending_approval','approved','rejected','scheduled',
                              'posting','posted','failed','skipped','saved_for_later'
                            )),
  approved_by               UUID,
  approved_at               TIMESTAMPTZ,
  approved_via_token        BOOLEAN DEFAULT false,
  scheduled_for             TIMESTAMPTZ,
  generated_by              TEXT DEFAULT 'claude',
  generation_model          TEXT,
  confidence_score          FLOAT,
  reasoning                 TEXT,
  quality_indicators        JSONB,
  extracted_facts           JSONB,
  suggested_approaches      JSONB,
  is_reply_to_comment       BOOLEAN DEFAULT false,
  reply_to_comment_id       TEXT,
  reply_to_author_name      TEXT,
  user_feedback             TEXT,
  feedback_at               TIMESTAMPTZ,
  posted_at                 TIMESTAMPTZ,
  error_message             TEXT,
  expires_at                TIMESTAMPTZ,
  expired_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- Unique partial index: one active comment per post per workspace
CREATE UNIQUE INDEX idx_vera_comment_queue_unique_active
  ON vera_linkedin_comment_queue(workspace_id, post_id)
  WHERE status IN ('pending_approval','approved','scheduled','posting','posted');

CREATE INDEX idx_vera_li_comment_queue_workspace
  ON vera_linkedin_comment_queue(workspace_id);
CREATE INDEX idx_vera_li_comment_queue_status
  ON vera_linkedin_comment_queue(workspace_id, status);
CREATE INDEX idx_vera_li_comment_queue_post_social
  ON vera_linkedin_comment_queue(post_social_id);
CREATE INDEX idx_vera_li_comment_queue_created
  ON vera_linkedin_comment_queue(created_at DESC);
CREATE INDEX idx_vera_li_comment_queue_scheduled
  ON vera_linkedin_comment_queue(scheduled_for)
  WHERE status = 'scheduled';

-- ============================================================
-- 5. vera_linkedin_comments_posted
--    Posted comments with engagement tracking
-- ============================================================
CREATE TABLE vera_linkedin_comments_posted (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,
  post_id                   UUID REFERENCES vera_linkedin_posts_discovered(id) ON DELETE SET NULL,
  queue_id                  UUID REFERENCES vera_linkedin_comment_queue(id) ON DELETE SET NULL,
  comment_id                TEXT UNIQUE NOT NULL,
  post_social_id            TEXT NOT NULL,
  comment_text              TEXT NOT NULL,
  engagement_metrics        JSONB,
  reactions_count           INTEGER DEFAULT 0,
  replies_count             INTEGER DEFAULT 0,
  performance_score         FLOAT,
  user_replied              BOOLEAN DEFAULT false,
  author_replied            BOOLEAN DEFAULT false,
  author_liked              BOOLEAN DEFAULT false,
  last_reply_at             TIMESTAMPTZ,
  posted_at                 TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vera_li_comments_posted_workspace
  ON vera_linkedin_comments_posted(workspace_id);
CREATE INDEX idx_vera_li_comments_posted_post
  ON vera_linkedin_comments_posted(post_social_id);
CREATE INDEX idx_vera_li_comments_posted_posted_at
  ON vera_linkedin_comments_posted(posted_at DESC);
CREATE INDEX idx_vera_li_comments_posted_queue
  ON vera_linkedin_comments_posted(queue_id);
CREATE INDEX idx_vera_li_comments_posted_performance
  ON vera_linkedin_comments_posted(workspace_id, performance_score DESC NULLS LAST);

-- ============================================================
-- 6. vera_linkedin_author_relationships
--    Engagement history with LinkedIn authors
-- ============================================================
CREATE TABLE vera_linkedin_author_relationships (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,
  author_profile_id         TEXT NOT NULL,
  author_name               TEXT,
  total_comments            INTEGER DEFAULT 0,
  total_replies_received    INTEGER DEFAULT 0,
  total_likes_received      INTEGER DEFAULT 0,
  avg_performance_score     FLOAT,
  last_commented_at         TIMESTAMPTZ,
  relationship_strength     TEXT DEFAULT 'cold',
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workspace_id, author_profile_id)
);

CREATE INDEX idx_vera_li_author_rel_workspace
  ON vera_linkedin_author_relationships(workspace_id);
CREATE INDEX idx_vera_li_author_rel_strength
  ON vera_linkedin_author_relationships(workspace_id, relationship_strength);

-- ============================================================
-- 7. vera_comment_feedback_log
--    Feedback for ML training and learning
-- ============================================================
CREATE TABLE vera_comment_feedback_log (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,
  comment_id                UUID,
  feedback_type             TEXT NOT NULL,
  feedback_text             TEXT,
  original_comment          TEXT,
  revised_comment           TEXT,
  metadata                  JSONB,
  created_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vera_comment_feedback_workspace
  ON vera_comment_feedback_log(workspace_id);
CREATE INDEX idx_vera_comment_feedback_type
  ON vera_comment_feedback_log(workspace_id, feedback_type);
CREATE INDEX idx_vera_comment_feedback_created
  ON vera_comment_feedback_log(created_at DESC);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE vera_linkedin_brand_guidelines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_linkedin_post_monitors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_linkedin_posts_discovered    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_linkedin_comment_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_linkedin_comments_posted     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_linkedin_author_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_comment_feedback_log         ENABLE ROW LEVEL SECURITY;

-- ---------- vera_linkedin_brand_guidelines ----------
CREATE POLICY vera_li_brand_guidelines_select ON vera_linkedin_brand_guidelines
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_brand_guidelines_insert ON vera_linkedin_brand_guidelines
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );
CREATE POLICY vera_li_brand_guidelines_update ON vera_linkedin_brand_guidelines
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );
CREATE POLICY vera_li_brand_guidelines_delete ON vera_linkedin_brand_guidelines
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );

-- ---------- vera_linkedin_post_monitors ----------
CREATE POLICY vera_li_post_monitors_select ON vera_linkedin_post_monitors
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_post_monitors_insert ON vera_linkedin_post_monitors
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );
CREATE POLICY vera_li_post_monitors_update ON vera_linkedin_post_monitors
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );
CREATE POLICY vera_li_post_monitors_delete ON vera_linkedin_post_monitors
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );

-- ---------- vera_linkedin_posts_discovered ----------
CREATE POLICY vera_li_posts_disc_select ON vera_linkedin_posts_discovered
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_posts_disc_insert ON vera_linkedin_posts_discovered
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_posts_disc_update ON vera_linkedin_posts_discovered
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_posts_disc_delete ON vera_linkedin_posts_discovered
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );

-- ---------- vera_linkedin_comment_queue ----------
CREATE POLICY vera_li_comment_queue_select ON vera_linkedin_comment_queue
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_comment_queue_insert ON vera_linkedin_comment_queue
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_comment_queue_update ON vera_linkedin_comment_queue
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_comment_queue_delete ON vera_linkedin_comment_queue
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );

-- ---------- vera_linkedin_comments_posted ----------
CREATE POLICY vera_li_comments_posted_select ON vera_linkedin_comments_posted
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_comments_posted_insert ON vera_linkedin_comments_posted
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_comments_posted_update ON vera_linkedin_comments_posted
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_comments_posted_delete ON vera_linkedin_comments_posted
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );

-- ---------- vera_linkedin_author_relationships ----------
CREATE POLICY vera_li_author_rel_select ON vera_linkedin_author_relationships
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_author_rel_insert ON vera_linkedin_author_relationships
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_author_rel_update ON vera_linkedin_author_relationships
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_li_author_rel_delete ON vera_linkedin_author_relationships
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );

-- ---------- vera_comment_feedback_log ----------
CREATE POLICY vera_comment_feedback_select ON vera_comment_feedback_log
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_comment_feedback_insert ON vera_comment_feedback_log
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_comment_feedback_update ON vera_comment_feedback_log
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY vera_comment_feedback_delete ON vera_comment_feedback_log
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM vera_workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'
    )
  );


-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON vera_linkedin_brand_guidelines     TO authenticated;
GRANT ALL ON vera_linkedin_brand_guidelines     TO service_role;
GRANT ALL ON vera_linkedin_post_monitors        TO authenticated;
GRANT ALL ON vera_linkedin_post_monitors        TO service_role;
GRANT ALL ON vera_linkedin_posts_discovered     TO authenticated;
GRANT ALL ON vera_linkedin_posts_discovered     TO service_role;
GRANT ALL ON vera_linkedin_comment_queue        TO authenticated;
GRANT ALL ON vera_linkedin_comment_queue        TO service_role;
GRANT ALL ON vera_linkedin_comments_posted      TO authenticated;
GRANT ALL ON vera_linkedin_comments_posted      TO service_role;
GRANT ALL ON vera_linkedin_author_relationships TO authenticated;
GRANT ALL ON vera_linkedin_author_relationships TO service_role;
GRANT ALL ON vera_comment_feedback_log          TO authenticated;
GRANT ALL ON vera_comment_feedback_log          TO service_role;


-- ============================================================
-- TRIGGER: prevent deletion on vera_linkedin_comment_queue
-- Comments must be soft-deleted (status = 'skipped' / 'rejected')
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_vera_comment_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Deletion of comment queue records is not allowed. Set status to skipped or rejected instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_vera_comment_deletion
  BEFORE DELETE ON vera_linkedin_comment_queue
  FOR EACH ROW
  EXECUTE FUNCTION prevent_vera_comment_deletion();


-- ============================================================
-- TRIGGERS: updated_at auto-maintenance
-- Uses existing update_vera_updated_at() from 011_vera_infrastructure
-- ============================================================

CREATE TRIGGER trigger_vera_li_brand_guidelines_updated
  BEFORE UPDATE ON vera_linkedin_brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();

CREATE TRIGGER trigger_vera_li_post_monitors_updated
  BEFORE UPDATE ON vera_linkedin_post_monitors
  FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();

CREATE TRIGGER trigger_vera_li_posts_disc_updated
  BEFORE UPDATE ON vera_linkedin_posts_discovered
  FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();

CREATE TRIGGER trigger_vera_li_comment_queue_updated
  BEFORE UPDATE ON vera_linkedin_comment_queue
  FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();

CREATE TRIGGER trigger_vera_li_comments_posted_updated
  BEFORE UPDATE ON vera_linkedin_comments_posted
  FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();

CREATE TRIGGER trigger_vera_li_author_rel_updated
  BEFORE UPDATE ON vera_linkedin_author_relationships
  FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();


-- ============================================================
-- VIEW: vera_commenting_queue_summary
-- Count of comments by status per workspace
-- ============================================================

CREATE OR REPLACE VIEW vera_commenting_queue_summary AS
SELECT
  workspace_id,
  status,
  COUNT(*)                                    AS comment_count,
  MIN(created_at)                             AS earliest,
  MAX(created_at)                             AS latest
FROM vera_linkedin_comment_queue
GROUP BY workspace_id, status;


-- ============================================================
-- VIEW: vera_commenting_posted_with_engagement
-- Posted comments joined with full post context
-- ============================================================

CREATE OR REPLACE VIEW vera_commenting_posted_with_engagement AS
SELECT
  cp.id                     AS posted_id,
  cp.workspace_id,
  cp.comment_id,
  cp.comment_text,
  cp.posted_at,
  cp.reactions_count,
  cp.replies_count,
  cp.performance_score,
  cp.user_replied,
  cp.author_replied,
  cp.author_liked,
  cp.engagement_metrics     AS comment_engagement_metrics,
  pd.social_id              AS post_social_id,
  pd.share_url              AS post_share_url,
  pd.post_content,
  pd.author_name            AS post_author_name,
  pd.author_profile_id      AS post_author_profile_id,
  pd.author_headline        AS post_author_headline,
  pd.post_date,
  pd.engagement_metrics     AS post_engagement_metrics,
  pd.engagement_quality_score AS post_quality_score,
  cq.confidence_score       AS generation_confidence,
  cq.generated_by,
  cq.generation_model,
  cq.reasoning              AS generation_reasoning
FROM vera_linkedin_comments_posted cp
LEFT JOIN vera_linkedin_posts_discovered pd ON pd.id = cp.post_id
LEFT JOIN vera_linkedin_comment_queue cq    ON cq.id = cp.queue_id;


-- ============================================================
-- Done.
-- ============================================================
