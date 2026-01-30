// Database types for VERA

export interface Organization {
    id: string
    name: string
    slug: string
    plan: 'starter' | 'pro' | 'enterprise'
    billing_email: string | null
    stripe_customer_id: string | null
    created_at: string
    updated_at: string
}

export interface Workspace {
    id: string
    organization_id: string
    name: string
    slug: string
    logo_url: string | null
    brand_colors: {
        primary: string
        secondary: string
    }
    brand_voice: string | null
    settings: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface Profile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    created_at: string
    updated_at: string
}

export interface OrganizationMember {
    id: string
    organization_id: string
    user_id: string
    role: 'owner' | 'admin' | 'member'
    created_at: string
}

export interface WorkspaceMember {
    id: string
    workspace_id: string
    user_id: string
    role: 'owner' | 'admin' | 'editor' | 'viewer'
    created_at: string
}

export interface Campaign {
    id: string
    workspace_id: string
    name: string
    description: string | null
    source_url: string | null
    source_content: string | null
    platform: 'linkedin' | 'twitter' | 'instagram' | 'tiktok' | 'blog'
    status: 'draft' | 'active' | 'completed' | 'archived'
    settings: Record<string, unknown>
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface ContentItem {
    id: string
    campaign_id: string
    workspace_id: string
    type: 'post' | 'article' | 'thread' | 'carousel' | 'video_script'
    theme: string | null
    hook: string | null
    content: string
    character_count: number | null
    hashtags: string[] | null
    image_url: string | null
    status: 'pending' | 'approved' | 'scheduled' | 'published' | 'dismissed'
    scheduled_for: string | null
    published_at: string | null
    platform_post_id: string | null
    engagement: Record<string, unknown> | null
    created_at: string
    updated_at: string
}

export interface Persona {
    id: string
    workspace_id: string
    name: string
    type: 'brand' | 'audience' | 'product'
    description: string | null
    attributes: Record<string, any>
    is_active: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

// Extended types with relations
export interface WorkspaceWithRole extends Workspace {
    role: 'owner' | 'admin' | 'editor' | 'viewer'
}

export interface OrganizationWithRole extends Organization {
    role: 'owner' | 'admin' | 'member'
}
