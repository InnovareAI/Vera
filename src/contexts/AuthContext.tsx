'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import type { Profile, WorkspaceWithRole, OrganizationWithRole } from '@/types/database'
import type { Project } from '@/types/project'

// DEV MODE - Bypass auth and use mock data (no OAuth configured yet)
const DEV_MODE = true

// Mock data for development
const DEV_USER: User = {
    id: 'dev-user-001',
    email: 'dev@vera.ai',
    app_metadata: {},
    user_metadata: { full_name: 'Dev User' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
} as User

const DEV_PROFILE: Profile = {
    id: 'dev-user-001',
    email: 'dev@vera.ai',
    full_name: 'Dev User',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

const DEV_WORKSPACES: WorkspaceWithRole[] = [
    {
        id: 'ws-innovare',
        organization_id: 'org-001',
        name: 'InnovareAI',
        slug: 'innovare-ai',
        logo_url: null,
        brand_colors: { primary: '#7c3aed', secondary: '#a855f7' },
        brand_voice: 'Professional, innovative, forward-thinking',
        settings: { industry: 'AI/Tech' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'owner'
    },
    {
        id: 'ws-findabl',
        organization_id: 'org-001',
        name: 'Findabl',
        slug: 'findabl',
        logo_url: null,
        brand_colors: { primary: '#3b82f6', secondary: '#60a5fa' },
        brand_voice: 'Friendly, helpful, expert',
        settings: { industry: 'SaaS' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'owner'
    },
    {
        id: 'ws-demo',
        organization_id: 'org-001',
        name: 'Demo Company',
        slug: 'demo',
        logo_url: null,
        brand_colors: { primary: '#10b981', secondary: '#34d399' },
        brand_voice: 'Casual, approachable',
        settings: { industry: 'General' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'owner'
    }
]

const DEV_ORGANIZATIONS: OrganizationWithRole[] = [
    {
        id: 'org-001',
        name: 'InnovareAI',
        slug: 'innovare',
        plan: 'pro',
        billing_email: 'dev@vera.ai',
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'owner'
    }
]

const DEV_PROJECTS: Project[] = [
    {
        id: 'proj-innovare-001',
        workspace_id: 'ws-innovare',
        name: 'InnovareAI',
        slug: 'innovare-ai',
        description: 'AI-powered marketing intelligence platform',
        website_url: 'https://innovare.ai',
        logo_url: null,
        brand_colors: { primary: '#7c3aed', secondary: '#a855f7' },
        industry: 'AI/Tech',
        products: [
            { name: 'Vera.AI', description: 'Agentic content engine for LinkedIn, X, Medium', url: 'https://innovare.ai/vera' },
            { name: 'SAM', description: 'Social amplification & team engagement platform', url: 'https://innovare.ai/sam' }
        ],
        icp: {
            target_roles: ['CMO', 'VP Marketing', 'Head of Content', 'Growth Lead'],
            target_industries: ['SaaS', 'B2B Tech', 'AI/ML', 'Marketing Agencies'],
            company_size: '51-200',
            pain_points: ['Content creation at scale', 'LinkedIn engagement', 'Brand consistency across channels'],
            goals: ['Increase LinkedIn reach', 'Automate content pipeline', 'Build thought leadership']
        },
        tone_of_voice: {
            style: 'professional',
            formality: 'semi-formal',
            personality: ['innovative', 'forward-thinking', 'data-driven', 'approachable'],
            dos: ['Use concrete examples', 'Reference real metrics', 'Be direct and actionable'],
            donts: ['No corporate jargon', 'No empty buzzwords', 'Never be salesy']
        },
        enabled_platforms: ['linkedin', 'twitter', 'medium', 'newsletter'],
        platform_settings: {},
        status: 'active',
        is_default: true,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
]

interface AuthContextType {
    user: User | null
    profile: Profile | null
    session: Session | null
    isLoading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    signInWithGoogle: () => Promise<{ error: Error | null }>
}

interface WorkspaceContextType {
    currentWorkspace: WorkspaceWithRole | null
    workspaces: WorkspaceWithRole[]
    currentOrganization: OrganizationWithRole | null
    organizations: OrganizationWithRole[]
    currentProject: Project | null
    projects: Project[]
    isLoading: boolean
    switchWorkspace: (workspaceId: string) => void
    switchProject: (projectId: string) => void
    refreshWorkspaces: () => Promise<void>
    refreshProjects: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)
const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(DEV_MODE ? DEV_USER : null)
    const [profile, setProfile] = useState<Profile | null>(DEV_MODE ? DEV_PROFILE : null)
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(!DEV_MODE)

    const supabase = getSupabase()

    const fetchProfile = useCallback(async (userId: string) => {
        if (DEV_MODE) return // Skip in dev mode

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (data) {
            setProfile(data as Profile)
        }
    }, [supabase])

    useEffect(() => {
        // In dev mode, we're already set up
        if (DEV_MODE) {
            setIsLoading(false)
            return
        }

        // Get initial session
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            }
            setIsLoading(false)
        }
        initSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, session: Session | null) => {
                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user) {
                    await fetchProfile(session.user.id)
                } else {
                    setProfile(null)
                }

                setIsLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase, fetchProfile])

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }

    const signUp = async (email: string, password: string, fullName?: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        })
        return { error }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        })
        return { error }
    }

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            session,
            isLoading,
            signIn,
            signUp,
            signOut,
            signInWithGoogle
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const auth = useAuth()
    const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>(DEV_MODE ? DEV_WORKSPACES : [])
    const [organizations, setOrganizations] = useState<OrganizationWithRole[]>(DEV_MODE ? DEV_ORGANIZATIONS : [])
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceWithRole | null>(DEV_MODE ? DEV_WORKSPACES[0] : null)
    const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(DEV_MODE ? DEV_ORGANIZATIONS[0] : null)
    const [projects, setProjects] = useState<Project[]>(DEV_MODE ? DEV_PROJECTS.filter(p => p.workspace_id === DEV_WORKSPACES[0].id) : [])
    const [currentProject, setCurrentProject] = useState<Project | null>(DEV_MODE ? DEV_PROJECTS.find(p => p.workspace_id === DEV_WORKSPACES[0].id && p.is_default) || null : null)
    const [isLoading, setIsLoading] = useState(!DEV_MODE)

    const supabase = getSupabase()

    const fetchWorkspaces = useCallback(async () => {
        // In dev mode, use mock data
        if (DEV_MODE) {
            // Check localStorage for saved workspace preference
            const savedWorkspaceId = localStorage.getItem('vera_current_workspace')
            const savedWorkspace = DEV_WORKSPACES.find(w => w.id === savedWorkspaceId)
            if (savedWorkspace) {
                setCurrentWorkspace(savedWorkspace)
            }
            setIsLoading(false)
            return
        }

        if (!auth?.user) {
            setWorkspaces([])
            setOrganizations([])
            setCurrentWorkspace(null)
            setCurrentOrganization(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        try {
            // Fetch workspace memberships with workspace data
            const { data: workspaceMemberships } = await supabase
                .from('workspace_members')
                .select(`
          role,
          workspace:workspaces(*)
        `)
                .eq('user_id', auth.user.id)

            const mappedWorkspaces: WorkspaceWithRole[] = (workspaceMemberships || [])
                .filter((m: any) => m.workspace)
                .map((m: any) => ({
                    ...(m.workspace as any),
                    role: m.role as 'owner' | 'admin' | 'editor' | 'viewer'
                }))

            setWorkspaces(mappedWorkspaces)

            // Fetch organization memberships with org data
            const { data: orgMemberships } = await supabase
                .from('organization_members')
                .select(`
          role,
          organization:organizations(*)
        `)
                .eq('user_id', auth.user.id)

            const mappedOrgs: OrganizationWithRole[] = (orgMemberships || [])
                .filter((m: any) => m.organization)
                .map((m: any) => ({
                    ...(m.organization as any),
                    role: m.role as 'owner' | 'admin' | 'member'
                }))

            setOrganizations(mappedOrgs)

            // Set current workspace from localStorage or first available
            const savedWorkspaceId = localStorage.getItem('vera_current_workspace')
            const savedWorkspace = mappedWorkspaces.find(w => w.id === savedWorkspaceId)

            if (savedWorkspace) {
                setCurrentWorkspace(savedWorkspace)
                const org = mappedOrgs.find(o => o.id === savedWorkspace.organization_id)
                setCurrentOrganization(org || null)
            } else if (mappedWorkspaces.length > 0) {
                setCurrentWorkspace(mappedWorkspaces[0])
                const org = mappedOrgs.find(o => o.id === mappedWorkspaces[0].organization_id)
                setCurrentOrganization(org || null)
                localStorage.setItem('vera_current_workspace', mappedWorkspaces[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch workspaces:', error)
        }

        setIsLoading(false)
    }, [auth?.user, supabase])

    useEffect(() => {
        if (!auth?.isLoading) {
            fetchWorkspaces()
        }
    }, [auth?.isLoading, auth?.user, fetchWorkspaces])

    const switchWorkspace = (workspaceId: string) => {
        const workspaceList = DEV_MODE ? DEV_WORKSPACES : workspaces
        const orgList = DEV_MODE ? DEV_ORGANIZATIONS : organizations
        const workspace = workspaceList.find(w => w.id === workspaceId)
        if (workspace) {
            setCurrentWorkspace(workspace)
            const org = orgList.find(o => o.id === workspace.organization_id)
            setCurrentOrganization(org || null)
            localStorage.setItem('vera_current_workspace', workspaceId)
        }
    }

    const fetchProjects = useCallback(async (workspaceId?: string) => {
        const wsId = workspaceId || currentWorkspace?.id
        if (!wsId) return

        if (DEV_MODE) {
            const wsProjects = DEV_PROJECTS.filter(p => p.workspace_id === wsId)
            setProjects(wsProjects)
            const savedProjectId = localStorage.getItem('vera_current_project')
            const savedProject = wsProjects.find(p => p.id === savedProjectId)
            setCurrentProject(savedProject || wsProjects.find(p => p.is_default) || wsProjects[0] || null)
            return
        }

        try {
            const res = await fetch(`/api/projects?workspace_id=${wsId}`)
            if (res.ok) {
                const data = await res.json()
                setProjects(data)
                const savedProjectId = localStorage.getItem('vera_current_project')
                const savedProject = data.find((p: Project) => p.id === savedProjectId)
                setCurrentProject(savedProject || data.find((p: Project) => p.is_default) || data[0] || null)
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error)
        }
    }, [currentWorkspace?.id])

    useEffect(() => {
        if (currentWorkspace) {
            fetchProjects(currentWorkspace.id)
        }
    }, [currentWorkspace?.id])

    const switchProject = (projectId: string) => {
        const project = projects.find(p => p.id === projectId)
        if (project) {
            setCurrentProject(project)
            localStorage.setItem('vera_current_project', projectId)
        }
    }

    return (
        <WorkspaceContext.Provider value={{
            currentWorkspace,
            workspaces,
            currentOrganization,
            organizations,
            currentProject,
            projects,
            isLoading,
            switchWorkspace,
            switchProject,
            refreshWorkspaces: fetchWorkspaces,
            refreshProjects: fetchProjects
        }}>
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext)
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider')
    }
    return context
}

// Combined provider for convenience
export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <WorkspaceProvider>
                {children}
            </WorkspaceProvider>
        </AuthProvider>
    )
}
