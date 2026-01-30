-- Team Amplification & Staggered Scheduling System
-- ============================================================
-- 1. Extend Workspace Member with Scheduling Preferences
ALTER TABLE vera_workspace_members
ADD COLUMN IF NOT EXISTS posting_stagger_minutes INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS preferred_posting_start TIME DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS preferred_posting_end TIME DEFAULT '18:00:00',
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS engagement_loop_enabled BOOLEAN DEFAULT true;
-- 2. Team Engagement Log
-- Tracks which team members have engaged with which posts to avoid duplicate likes
CREATE TABLE IF NOT EXISTS team_engagement_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    post_url TEXT NOT NULL,
    post_author_email TEXT NOT NULL,
    target_member_email TEXT NOT NULL,
    -- Who should like it
    engagement_type TEXT DEFAULT 'like' CHECK (
        engagement_type IN (
            'like',
            'celebrate',
            'insightful',
            'love',
            'support'
        )
    ),
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'failed', 'skipped')
    ),
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure we don't create duplicate engagement tasks for the same post/member
    UNIQUE(post_url, target_member_email)
);
-- 3. Staggered Posting Queue Extensions
-- If a table already exists for scheduled_posts, we ensure it has slot tracking
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS stagger_group_id UUID,
    ADD COLUMN IF NOT EXISTS sequence_index INTEGER;
-- RLS for Engagement Tasks
ALTER TABLE team_engagement_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_can_view_tasks ON team_engagement_tasks FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM vera_workspace_members
            WHERE vera_workspace_members.workspace_id = team_engagement_tasks.workspace_id
                AND status = 'active'
        )
    );
CREATE POLICY admins_can_manage_tasks ON team_engagement_tasks FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM vera_workspace_members
        WHERE vera_workspace_members.workspace_id = team_engagement_tasks.workspace_id
            AND role IN ('owner', 'admin', 'approver')
            AND status = 'active'
    )
);
-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_engagement_pending ON team_engagement_tasks(status)
WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_engagement_post_url ON team_engagement_tasks(post_url);
GRANT ALL ON team_engagement_tasks TO authenticated;
GRANT ALL ON team_engagement_tasks TO service_role;