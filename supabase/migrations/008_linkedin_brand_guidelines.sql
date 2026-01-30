-- LinkedIn Brand Guidelines & Commenting Agent Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS linkedin_brand_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Core Identity
    tone_of_voice TEXT,
    writing_style TEXT,
    topics_and_perspective TEXT,
    dos_and_donts TEXT,
    -- Generation Preferences
    comment_framework TEXT,
    perspective_style TEXT DEFAULT 'additive',
    confidence_level TEXT DEFAULT 'balanced',
    tone TEXT DEFAULT 'professional',
    formality TEXT DEFAULT 'semi_formal',
    comment_length TEXT DEFAULT 'medium',
    question_frequency TEXT DEFAULT 'sometimes',
    -- Content Control
    max_characters INTEGER DEFAULT 300,
    use_workspace_knowledge BOOLEAN DEFAULT false,
    what_you_do TEXT,
    what_youve_learned TEXT,
    pov_on_future TEXT,
    industry_talking_points TEXT,
    -- Posting Automation (inherited from SAM)
    auto_approve_enabled BOOLEAN DEFAULT false,
    auto_approve_start_time TIME DEFAULT '09:00:00',
    auto_approve_end_time TIME DEFAULT '17:00:00',
    daily_comment_limit INTEGER DEFAULT 20,
    posting_start_time TIME DEFAULT '09:00:00',
    posting_end_time TIME DEFAULT '17:00:00',
    skip_weekends BOOLEAN DEFAULT true,
    skip_holidays BOOLEAN DEFAULT true,
    -- Advanced / System
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique: one active guideline per workspace
    UNIQUE(workspace_id, is_active)
);
-- RLS
ALTER TABLE linkedin_brand_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view brand guidelines" ON linkedin_brand_guidelines FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM vera_workspace_members
            WHERE user_id = auth.uid()
                AND status = 'active'
        )
    );
CREATE POLICY "Workspace admins can manage brand guidelines" ON linkedin_brand_guidelines FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM vera_workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
    )
);
-- Trigger for updated_at
CREATE TRIGGER trigger_linkedin_brand_guidelines_updated BEFORE
UPDATE ON linkedin_brand_guidelines FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();
GRANT ALL ON linkedin_brand_guidelines TO authenticated;