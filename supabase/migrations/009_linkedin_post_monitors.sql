-- LinkedIn Post Monitors Table
-- ============================================================
CREATE TABLE IF NOT EXISTS linkedin_post_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- Sources
    hashtags TEXT [] DEFAULT '{}',
    keywords TEXT [] DEFAULT '{}',
    profile_vanities TEXT [] DEFAULT '{}',
    -- LinkedIn handles
    profile_provider_ids TEXT [] DEFAULT '{}',
    -- LinkedIn URNs
    -- Configuration
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    daily_post_limit INTEGER DEFAULT 5,
    auto_approve_enabled BOOLEAN DEFAULT false,
    -- Metadata (JSONB for extensibility)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Run state
    last_scraped_at TIMESTAMPTZ,
    scrapes_today INTEGER DEFAULT 0,
    scrape_count_reset_date DATE DEFAULT CURRENT_DATE,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- Reference to a user or agent
);
-- RLS
ALTER TABLE linkedin_post_monitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_can_view_monitors ON linkedin_post_monitors FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM vera_workspace_members
            WHERE vera_workspace_members.workspace_id = linkedin_post_monitors.workspace_id
                AND status = 'active'
        )
    );
CREATE POLICY admins_can_manage_monitors ON linkedin_post_monitors FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM vera_workspace_members
        WHERE vera_workspace_members.workspace_id = linkedin_post_monitors.workspace_id
            AND role IN ('owner', 'admin', 'approver')
            AND status = 'active'
    )
);
-- Trigger for updated_at
CREATE TRIGGER trigger_linkedin_post_monitors_updated BEFORE
UPDATE ON linkedin_post_monitors FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();
GRANT ALL ON linkedin_post_monitors TO authenticated;
GRANT ALL ON linkedin_post_monitors TO service_role;