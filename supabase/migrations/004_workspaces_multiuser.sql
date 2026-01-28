-- Workspaces and Multi-User Support
-- Enables workspace separation with multiple users per workspace
-- =============================================================================
-- WORKSPACES
-- =============================================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    -- URL-friendly identifier
    -- Settings
    settings jsonb DEFAULT '{}'::jsonb,
    -- Limits (for future billing tiers)
    max_users integer DEFAULT 5,
    max_campaigns_per_month integer DEFAULT 50,
    -- Metadata
    logo_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- =============================================================================
-- WORKSPACE MEMBERS
-- =============================================================================
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TABLE IF NOT EXISTS workspace_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Role & Permissions
    role workspace_role NOT NULL DEFAULT 'viewer',
    -- Invite tracking
    invited_by uuid REFERENCES auth.users(id),
    invited_at timestamptz DEFAULT now(),
    accepted_at timestamptz,
    -- Status
    is_active boolean DEFAULT true,
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    -- Unique constraint: one membership per user per workspace
    UNIQUE(workspace_id, user_id)
);
-- =============================================================================
-- USER PROFILES (extends Supabase Auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    -- Default workspace (for quick access)
    default_workspace_id uuid REFERENCES workspaces(id),
    -- Preferences
    preferences jsonb DEFAULT '{}'::jsonb,
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- =============================================================================
-- UPDATE EXISTING TABLES TO ADD WORKSPACE SUPPORT
-- =============================================================================
-- Add workspace_id to brand_profiles
ALTER TABLE brand_profiles
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
-- Add workspace_id to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
-- Add created_by to track who created what
ALTER TABLE brand_profiles
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_workspace ON brand_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id);
-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Owners and admins can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
-- Workspaces: Users can view workspaces they're a member of
CREATE POLICY "Users can view workspaces they belong to" ON workspaces FOR
SELECT USING (
        id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
-- Workspaces: Owners and admins can update
CREATE POLICY "Owners and admins can update workspace" ON workspaces FOR
UPDATE USING (
        id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin')
                AND is_active = true
        )
    );
-- Workspace Members: Users can view members of their workspaces
CREATE POLICY "Users can view workspace members" ON workspace_members FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
-- Workspace Members: Owners and admins can manage
CREATE POLICY "Owners and admins can manage members" ON workspace_members FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
    )
);
-- User Profiles: Users can view/update their own
CREATE POLICY "Users can view their own profile" ON user_profiles FOR
SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON user_profiles FOR
UPDATE USING (id = auth.uid());
-- Brand Profiles: Workspace members can view
DROP POLICY IF EXISTS "Allow all access to brand_profiles" ON brand_profiles;
CREATE POLICY "Workspace members can view brand profiles" ON brand_profiles FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
-- Brand Profiles: Editors+ can manage
CREATE POLICY "Editors can manage brand profiles" ON brand_profiles FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
            AND is_active = true
    )
);
-- Campaigns: Workspace members can view
DROP POLICY IF EXISTS "Allow all access to campaigns" ON campaigns;
CREATE POLICY "Workspace members can view campaigns" ON campaigns FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
-- Campaigns: Editors+ can manage
CREATE POLICY "Editors can manage campaigns" ON campaigns FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
            AND is_active = true
    )
);
-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================
-- Function to create a new workspace (called when user signs up)
CREATE OR REPLACE FUNCTION create_workspace_for_user(
        p_user_id uuid,
        p_workspace_name text,
        p_workspace_slug text
    ) RETURNS uuid AS $$
DECLARE v_workspace_id uuid;
BEGIN -- Create workspace
INSERT INTO workspaces (name, slug)
VALUES (p_workspace_name, p_workspace_slug)
RETURNING id INTO v_workspace_id;
-- Add user as owner
INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at)
VALUES (v_workspace_id, p_user_id, 'owner', now());
-- Update user's default workspace
UPDATE user_profiles
SET default_workspace_id = v_workspace_id
WHERE id = p_user_id;
RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to invite user to workspace
CREATE OR REPLACE FUNCTION invite_user_to_workspace(
        p_workspace_id uuid,
        p_email text,
        p_role workspace_role DEFAULT 'viewer'
    ) RETURNS uuid AS $$
DECLARE v_user_id uuid;
v_member_id uuid;
BEGIN -- Check if user exists
SELECT id INTO v_user_id
FROM auth.users
WHERE email = p_email;
IF v_user_id IS NULL THEN -- Return null if user doesn't exist (they'll need to sign up first)
RETURN NULL;
END IF;
-- Add membership
INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
VALUES (p_workspace_id, v_user_id, p_role, auth.uid()) ON CONFLICT (workspace_id, user_id) DO NOTHING
RETURNING id INTO v_member_id;
RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$ BEGIN
INSERT INTO user_profiles (id, email, full_name)
VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        )
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();