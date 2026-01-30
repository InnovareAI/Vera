-- VERA Workspace Members & Connected Accounts
-- Enables multiple users per workspace with their social accounts for posting
-- ============================================================
-- 1. WORKSPACE MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS vera_workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Role within the workspace
    role TEXT NOT NULL DEFAULT 'member' CHECK (
        role IN (
            'owner',
            -- Full access, billing, can delete workspace
            'admin',
            -- Manage members, approve content, manage accounts
            'editor',
            -- Create and edit content, submit for approval
            'viewer' -- View only, no edit permissions
        )
    ),
    -- Permissions (granular control)
    permissions JSONB DEFAULT '{
        "can_create_content": true,
        "can_approve_content": false,
        "can_publish": false,
        "can_manage_accounts": false,
        "can_manage_members": false,
        "can_view_analytics": true
    }'::jsonb,
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint
    UNIQUE(workspace_id, user_id)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_vera_workspace_members_workspace ON vera_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vera_workspace_members_user ON vera_workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vera_workspace_members_role ON vera_workspace_members(role);
-- ============================================================
-- 2. CONNECTED SOCIAL ACCOUNTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS vera_connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Platform info
    platform TEXT NOT NULL CHECK (
        platform IN (
            'linkedin',
            'twitter',
            'instagram',
            'facebook',
            'tiktok',
            'youtube',
            'pinterest',
            'threads'
        )
    ),
    -- Account identifiers
    platform_user_id TEXT NOT NULL,
    -- Platform's user ID
    platform_username TEXT,
    -- @handle or display name
    platform_display_name TEXT,
    -- Full name on platform
    profile_url TEXT,
    -- Link to profile
    profile_image_url TEXT,
    -- Avatar URL
    -- Account type
    account_type TEXT DEFAULT 'personal' CHECK (
        account_type IN (
            'personal',
            -- Personal account
            'business',
            -- Business/creator account
            'page',
            -- Facebook Page, LinkedIn Company
            'ads_account' -- Ads manager account
        )
    ),
    -- OAuth tokens (encrypted in production)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    -- Permissions/scopes granted
    scopes TEXT [] DEFAULT '{}',
    -- Account status
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            -- Ready to use
            'expired',
            -- Token expired, needs refresh
            'revoked',
            -- User revoked access
            'error' -- Connection error
        )
    ),
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    posts_count INTEGER DEFAULT 0,
    -- Timestamps
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique: one account per platform per user per workspace
    UNIQUE(
        workspace_id,
        user_id,
        platform,
        platform_user_id
    )
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_vera_connected_accounts_workspace ON vera_connected_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vera_connected_accounts_user ON vera_connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_vera_connected_accounts_platform ON vera_connected_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_vera_connected_accounts_status ON vera_connected_accounts(status);
-- ============================================================
-- 3. POSTING ASSIGNMENTS TABLE
-- Who posts what content to which account
-- ============================================================
CREATE TABLE IF NOT EXISTS vera_posting_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    -- References content_queue
    -- Which account to post from
    connected_account_id UUID NOT NULL REFERENCES vera_connected_accounts(id) ON DELETE CASCADE,
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    timezone TEXT DEFAULT 'UTC',
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            -- Waiting for approval
            'approved',
            -- Ready to post
            'scheduled',
            -- Scheduled for posting
            'publishing',
            -- Currently posting
            'published',
            -- Successfully posted
            'failed',
            -- Posting failed
            'cancelled' -- Cancelled before posting
        )
    ),
    -- Result
    platform_post_id TEXT,
    -- ID of the post on the platform
    platform_post_url TEXT,
    -- URL to the published post
    published_at TIMESTAMPTZ,
    -- Error handling
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_vera_posting_assignments_workspace ON vera_posting_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vera_posting_assignments_content ON vera_posting_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_vera_posting_assignments_account ON vera_posting_assignments(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_vera_posting_assignments_status ON vera_posting_assignments(status);
CREATE INDEX IF NOT EXISTS idx_vera_posting_assignments_scheduled ON vera_posting_assignments(scheduled_for)
WHERE status IN ('approved', 'scheduled');
-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE vera_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_posting_assignments ENABLE ROW LEVEL SECURITY;
-- Workspace members: can view if member of workspace
CREATE POLICY "Members can view workspace members" ON vera_workspace_members FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM vera_workspace_members
            WHERE user_id = auth.uid()
                AND status = 'active'
        )
    );
-- Only admins/owners can manage members
CREATE POLICY "Admins can manage workspace members" ON vera_workspace_members FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM vera_workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
    )
);
-- Connected accounts: users can see their own
CREATE POLICY "Users can view their connected accounts" ON vera_connected_accounts FOR
SELECT USING (
        user_id = auth.uid()
        OR workspace_id IN (
            SELECT workspace_id
            FROM vera_workspace_members
            WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin')
                AND status = 'active'
        )
    );
-- Users can manage their own accounts
CREATE POLICY "Users can manage their connected accounts" ON vera_connected_accounts FOR ALL USING (user_id = auth.uid());
-- Posting assignments: workspace members can view
CREATE POLICY "Members can view posting assignments" ON vera_posting_assignments FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM vera_workspace_members
            WHERE user_id = auth.uid()
                AND status = 'active'
        )
    );
-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================
-- Get all accounts available for posting in a workspace
CREATE OR REPLACE FUNCTION get_workspace_posting_accounts(p_workspace_id UUID) RETURNS TABLE (
        account_id UUID,
        user_id UUID,
        user_email TEXT,
        platform TEXT,
        username TEXT,
        display_name TEXT,
        account_type TEXT,
        status TEXT
    ) AS $$ BEGIN RETURN QUERY
SELECT ca.id as account_id,
    ca.user_id,
    u.email as user_email,
    ca.platform,
    ca.platform_username as username,
    ca.platform_display_name as display_name,
    ca.account_type,
    ca.status
FROM vera_connected_accounts ca
    JOIN auth.users u ON u.id = ca.user_id
WHERE ca.workspace_id = p_workspace_id
    AND ca.status = 'active'
ORDER BY ca.platform,
    ca.platform_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Check if user has permission in workspace
CREATE OR REPLACE FUNCTION check_vera_permission(
        p_workspace_id UUID,
        p_user_id UUID,
        p_permission TEXT
    ) RETURNS BOOLEAN AS $$
DECLARE v_member RECORD;
BEGIN
SELECT * INTO v_member
FROM vera_workspace_members
WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND status = 'active';
IF NOT FOUND THEN RETURN FALSE;
END IF;
-- Owners and admins have all permissions
IF v_member.role IN ('owner', 'admin') THEN RETURN TRUE;
END IF;
-- Check specific permission
RETURN COALESCE(
    (v_member.permissions->>p_permission)::boolean,
    FALSE
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- 6. TRIGGERS
-- ============================================================
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_vera_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_vera_workspace_members_updated BEFORE
UPDATE ON vera_workspace_members FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();
CREATE TRIGGER trigger_vera_connected_accounts_updated BEFORE
UPDATE ON vera_connected_accounts FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();
CREATE TRIGGER trigger_vera_posting_assignments_updated BEFORE
UPDATE ON vera_posting_assignments FOR EACH ROW EXECUTE FUNCTION update_vera_updated_at();
-- ============================================================
-- 7. GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON vera_workspace_members TO authenticated;
GRANT ALL ON vera_connected_accounts TO authenticated;
GRANT ALL ON vera_posting_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_posting_accounts TO authenticated;
GRANT EXECUTE ON FUNCTION check_vera_permission TO authenticated;
-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE vera_workspace_members IS 'Multi-user workspace support - tracks who belongs to which VERA workspace and their role/permissions';
COMMENT ON TABLE vera_connected_accounts IS 'Social media accounts connected by users for posting. Each user connects their own accounts which can then be used for publishing content.';
COMMENT ON TABLE vera_posting_assignments IS 'Tracks which content should be posted to which connected account. Enables multi-account publishing workflows.';