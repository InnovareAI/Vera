-- HITL (Human-in-the-Loop) Approval System
-- Role-based content approval workflow for VERA
-- =============================================================================
-- =============================================================================
-- CONTENT APPROVAL STATUS ENUM
-- =============================================================================
CREATE TYPE content_approval_status AS ENUM (
    'draft',
    -- AI-generated, not yet submitted
    'pending_review',
    -- Submitted for review
    'changes_requested',
    -- Reviewer requested changes
    'approved',
    -- Approved and ready to publish
    'scheduled',
    -- Approved and scheduled for publishing
    'published',
    -- Successfully published
    'rejected' -- Permanently rejected
);
-- =============================================================================
-- CONTENT ITEMS TABLE (Updated with approval fields)
-- =============================================================================
-- First, check if content_items exists and add approval columns
DO $$ BEGIN -- Add approval-related columns if they don't exist
IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'content_items'
) THEN -- Add approval_status column
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'approval_status'
) THEN
ALTER TABLE content_items
ADD COLUMN approval_status content_approval_status DEFAULT 'draft';
END IF;
-- Add submitted_by
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'submitted_by'
) THEN
ALTER TABLE content_items
ADD COLUMN submitted_by uuid REFERENCES auth.users(id);
END IF;
-- Add submitted_at
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'submitted_at'
) THEN
ALTER TABLE content_items
ADD COLUMN submitted_at timestamptz;
END IF;
-- Add approved_by
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'approved_by'
) THEN
ALTER TABLE content_items
ADD COLUMN approved_by uuid REFERENCES auth.users(id);
END IF;
-- Add approved_at
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'approved_at'
) THEN
ALTER TABLE content_items
ADD COLUMN approved_at timestamptz;
END IF;
-- Add scheduled_for
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'scheduled_for'
) THEN
ALTER TABLE content_items
ADD COLUMN scheduled_for timestamptz;
END IF;
-- Add assigned_reviewer
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'assigned_reviewer'
) THEN
ALTER TABLE content_items
ADD COLUMN assigned_reviewer uuid REFERENCES auth.users(id);
END IF;
-- Add priority
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'content_items'
        AND column_name = 'priority'
) THEN
ALTER TABLE content_items
ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
END IF;
END IF;
END $$;
-- =============================================================================
-- APPROVAL AUDIT LOG
-- Track all approval actions for compliance and audit trails
-- =============================================================================
CREATE TABLE IF NOT EXISTS content_approval_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Reference to content
    content_item_id uuid REFERENCES content_items(id) ON DELETE CASCADE,
    -- What happened
    action text NOT NULL CHECK (
        action IN (
            'submitted',
            -- Submitted for review
            'approved',
            -- Approved by reviewer
            'rejected',
            -- Rejected by reviewer
            'changes_requested',
            -- Reviewer requested changes
            'resubmitted',
            -- Resubmitted after changes
            'scheduled',
            -- Scheduled for publishing
            'unscheduled',
            -- Removed from schedule
            'published',
            -- Published to platform
            'publish_failed',
            -- Publish attempt failed
            'edited',
            -- Content was edited
            'restored',
            -- Restored from rejected
            'assigned' -- Assigned to reviewer
        )
    ),
    -- Who did it
    performed_by uuid REFERENCES auth.users(id),
    performer_role text,
    -- Role at time of action
    -- Status transition
    previous_status text,
    new_status text,
    -- Context
    notes text,
    -- Reviewer feedback, rejection reason, etc.
    metadata jsonb DEFAULT '{}'::jsonb,
    -- Additional data (platform post IDs, etc.)
    -- Timestamp
    created_at timestamptz DEFAULT now()
);
-- =============================================================================
-- APPROVAL PERMISSIONS
-- Define who can approve content based on roles
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Role that can perform the action
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    -- What action they can perform
    can_submit boolean DEFAULT true,
    -- Submit for review
    can_approve boolean DEFAULT false,
    -- Approve content
    can_reject boolean DEFAULT false,
    -- Reject content
    can_request_changes boolean DEFAULT false,
    -- Request changes
    can_publish boolean DEFAULT false,
    -- Publish directly
    can_schedule boolean DEFAULT false,
    -- Schedule for later
    can_assign_reviewer boolean DEFAULT false,
    -- Assign reviewers
    can_view_all boolean DEFAULT false,
    -- View all content (not just own)
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    -- Unique per workspace+role
    UNIQUE(workspace_id, role)
);
-- =============================================================================
-- DEFAULT PERMISSIONS (Role-Based)
-- =============================================================================
-- Function to seed default permissions for a workspace
CREATE OR REPLACE FUNCTION create_default_approval_permissions(p_workspace_id uuid) RETURNS void AS $$ BEGIN -- Owner: Full permissions
INSERT INTO approval_permissions (
        workspace_id,
        role,
        can_submit,
        can_approve,
        can_reject,
        can_request_changes,
        can_publish,
        can_schedule,
        can_assign_reviewer,
        can_view_all
    )
VALUES (
        p_workspace_id,
        'owner',
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
    ) ON CONFLICT (workspace_id, role) DO NOTHING;
-- Admin: Full approval permissions, can publish
INSERT INTO approval_permissions (
        workspace_id,
        role,
        can_submit,
        can_approve,
        can_reject,
        can_request_changes,
        can_publish,
        can_schedule,
        can_assign_reviewer,
        can_view_all
    )
VALUES (
        p_workspace_id,
        'admin',
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
    ) ON CONFLICT (workspace_id, role) DO NOTHING;
-- Editor: Can submit and request changes, but not approve
INSERT INTO approval_permissions (
        workspace_id,
        role,
        can_submit,
        can_approve,
        can_reject,
        can_request_changes,
        can_publish,
        can_schedule,
        can_assign_reviewer,
        can_view_all
    )
VALUES (
        p_workspace_id,
        'editor',
        true,
        false,
        false,
        true,
        false,
        false,
        false,
        true
    ) ON CONFLICT (workspace_id, role) DO NOTHING;
-- Viewer: Can only view, no actions
INSERT INTO approval_permissions (
        workspace_id,
        role,
        can_submit,
        can_approve,
        can_reject,
        can_request_changes,
        can_publish,
        can_schedule,
        can_assign_reviewer,
        can_view_all
    )
VALUES (
        p_workspace_id,
        'viewer',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
    ) ON CONFLICT (workspace_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
-- =============================================================================
-- SCHEDULED POSTS TABLE
-- For managing scheduled publishing queue
-- =============================================================================
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Reference to content
    content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Scheduling
    scheduled_for timestamptz NOT NULL,
    timezone text DEFAULT 'UTC',
    -- Platform targeting
    platform text NOT NULL,
    -- 'linkedin', 'twitter', etc.
    account_id text,
    -- Platform account to post to
    -- Status
    status text DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'processing',
            'completed',
            'failed',
            'cancelled'
        )
    ),
    -- Execution results
    executed_at timestamptz,
    platform_post_id text,
    error_message text,
    -- Metadata
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_approval_log_content ON content_approval_log(content_item_id);
CREATE INDEX IF NOT EXISTS idx_approval_log_performer ON content_approval_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_approval_log_action ON content_approval_log(action);
CREATE INDEX IF NOT EXISTS idx_approval_log_created ON content_approval_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_time ON scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_workspace ON scheduled_posts(workspace_id);
-- Index for content_items approval queries
CREATE INDEX IF NOT EXISTS idx_content_items_approval ON content_items(approval_status)
WHERE approval_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_reviewer ON content_items(assigned_reviewer)
WHERE assigned_reviewer IS NOT NULL;
-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE content_approval_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
-- Approval Log: Workspace members can view logs for their workspace content
CREATE POLICY "Workspace members can view approval logs" ON content_approval_log FOR
SELECT USING (
        content_item_id IN (
            SELECT id
            FROM content_items
            WHERE workspace_id IN (
                    SELECT workspace_id
                    FROM workspace_members
                    WHERE user_id = auth.uid()
                        
                )
        )
    );
-- Approval Permissions: Workspace members can view their workspace permissions
CREATE POLICY "Workspace members can view permissions" ON approval_permissions FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                
        )
    );
-- Admins/Owners can manage permissions
CREATE POLICY "Admins can manage permissions" ON approval_permissions FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            
    )
);
-- Scheduled Posts: Workspace members can view, editors+ can manage
CREATE POLICY "Workspace members can view scheduled posts" ON scheduled_posts FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                
        )
    );
CREATE POLICY "Editors can manage scheduled posts" ON scheduled_posts FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
            
    )
);
-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================
-- Function to check if user can perform approval action
CREATE OR REPLACE FUNCTION can_perform_approval_action(
        p_workspace_id uuid,
        p_user_id uuid,
        p_action text
    ) RETURNS boolean AS $$
DECLARE v_role text;
v_can_action boolean;
BEGIN -- Get user's role in workspace
SELECT role INTO v_role
FROM workspace_members
WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    ;
IF v_role IS NULL THEN RETURN false;
END IF;
-- Check permission for action
EXECUTE format(
    'SELECT %I FROM approval_permissions WHERE workspace_id = $1 AND role = $2',
    'can_' || p_action
) INTO v_can_action USING p_workspace_id,
v_role;
RETURN COALESCE(v_can_action, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to log approval action
CREATE OR REPLACE FUNCTION log_approval_action(
        p_content_id uuid,
        p_action text,
        p_user_id uuid,
        p_previous_status text,
        p_new_status text,
        p_notes text DEFAULT NULL
    ) RETURNS uuid AS $$
DECLARE v_log_id uuid;
v_user_role text;
v_workspace_id uuid;
BEGIN -- Get workspace and user role
SELECT ci.workspace_id,
    wm.role INTO v_workspace_id,
    v_user_role
FROM content_items ci
    LEFT JOIN workspace_members wm ON wm.workspace_id = ci.workspace_id
    AND wm.user_id = p_user_id
WHERE ci.id = p_content_id;
-- Insert log entry
INSERT INTO content_approval_log (
        content_item_id,
        action,
        performed_by,
        performer_role,
        previous_status,
        new_status,
        notes
    )
VALUES (
        p_content_id,
        p_action,
        p_user_id,
        v_user_role,
        p_previous_status,
        p_new_status,
        p_notes
    )
RETURNING id INTO v_log_id;
RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =============================================================================
-- TRIGGER: Auto-create permissions for new workspaces
-- =============================================================================
CREATE OR REPLACE FUNCTION auto_create_approval_permissions() RETURNS trigger AS $$ BEGIN PERFORM create_default_approval_permissions(NEW.id);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS on_workspace_created_approval ON workspaces;
CREATE TRIGGER on_workspace_created_approval
AFTER
INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION auto_create_approval_permissions();
-- =============================================================================
-- SEED PERMISSIONS FOR EXISTING WORKSPACES
-- =============================================================================
DO $$
DECLARE ws RECORD;
BEGIN FOR ws IN
SELECT id
FROM workspaces LOOP PERFORM create_default_approval_permissions(ws.id);
END LOOP;
END $$;