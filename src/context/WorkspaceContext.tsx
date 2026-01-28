'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Workspace {
    id: string
    name: string
    slug: string
    logo_url?: string
    settings: Record<string, unknown>
    role: 'owner' | 'admin' | 'editor' | 'viewer'
    created_at: string
}

interface WorkspaceMember {
    id: string
    role: 'owner' | 'admin' | 'editor' | 'viewer'
    is_active: boolean
    user: {
        id: string
        email: string
        full_name?: string
        avatar_url?: string
    }
}

interface WorkspaceContextType {
    // State
    workspaces: Workspace[]
    currentWorkspace: Workspace | null
    members: WorkspaceMember[]
    isLoading: boolean
    error: string | null

    // Actions
    setCurrentWorkspace: (workspace: Workspace) => void
    createWorkspace: (name: string, slug: string) => Promise<Workspace | null>
    refreshWorkspaces: () => Promise<void>
    refreshMembers: () => Promise<void>
    inviteMember: (email: string, role: 'admin' | 'editor' | 'viewer') => Promise<boolean>
    removeMember: (memberId: string) => Promise<boolean>

    // Permissions
    canEdit: boolean
    canManageMembers: boolean
    isOwner: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children, userId }: { children: ReactNode; userId?: string }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null)
    const [members, setMembers] = useState<WorkspaceMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch workspaces on mount
    useEffect(() => {
        if (userId) {
            refreshWorkspaces()
        }
    }, [userId])

    // Fetch members when workspace changes
    useEffect(() => {
        if (currentWorkspace && userId) {
            refreshMembers()
        }
    }, [currentWorkspace?.id, userId])

    // Load saved workspace from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && workspaces.length > 0) {
            const savedId = localStorage.getItem('vera_current_workspace')
            const saved = workspaces.find(w => w.id === savedId)
            if (saved) {
                setCurrentWorkspaceState(saved)
            } else {
                setCurrentWorkspaceState(workspaces[0])
            }
        }
    }, [workspaces])

    const setCurrentWorkspace = (workspace: Workspace) => {
        setCurrentWorkspaceState(workspace)
        if (typeof window !== 'undefined') {
            localStorage.setItem('vera_current_workspace', workspace.id)
        }
    }

    const refreshWorkspaces = async () => {
        if (!userId) return

        setIsLoading(true)
        try {
            const response = await fetch('/api/workspaces', {
                headers: { 'x-user-id': userId }
            })

            if (!response.ok) throw new Error('Failed to fetch workspaces')

            const data = await response.json()
            setWorkspaces(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }

    const refreshMembers = async () => {
        if (!currentWorkspace || !userId) return

        try {
            const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`, {
                headers: { 'x-user-id': userId }
            })

            if (!response.ok) throw new Error('Failed to fetch members')

            const data = await response.json()
            setMembers(data)
        } catch (err) {
            console.error('Failed to fetch members:', err)
        }
    }

    const createWorkspace = async (name: string, slug: string): Promise<Workspace | null> => {
        if (!userId) return null

        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({ name, slug })
            })

            if (!response.ok) throw new Error('Failed to create workspace')

            const workspace = await response.json()
            await refreshWorkspaces()
            return workspace
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create workspace')
            return null
        }
    }

    const inviteMember = async (email: string, role: 'admin' | 'editor' | 'viewer'): Promise<boolean> => {
        if (!currentWorkspace || !userId) return false

        try {
            const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({ email, role })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to invite member')
            }

            await refreshMembers()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to invite member')
            return false
        }
    }

    const removeMember = async (memberId: string): Promise<boolean> => {
        if (!currentWorkspace || !userId) return false

        try {
            const response = await fetch(
                `/api/workspaces/${currentWorkspace.id}/members?memberId=${memberId}`,
                {
                    method: 'DELETE',
                    headers: { 'x-user-id': userId }
                }
            )

            if (!response.ok) throw new Error('Failed to remove member')

            await refreshMembers()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove member')
            return false
        }
    }

    // Permission helpers
    const canEdit = currentWorkspace?.role
        ? ['owner', 'admin', 'editor'].includes(currentWorkspace.role)
        : false

    const canManageMembers = currentWorkspace?.role
        ? ['owner', 'admin'].includes(currentWorkspace.role)
        : false

    const isOwner = currentWorkspace?.role === 'owner'

    return (
        <WorkspaceContext.Provider
            value={{
                workspaces,
                currentWorkspace,
                members,
                isLoading,
                error,
                setCurrentWorkspace,
                createWorkspace,
                refreshWorkspaces,
                refreshMembers,
                inviteMember,
                removeMember,
                canEdit,
                canManageMembers,
                isOwner
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext)
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider')
    }
    return context
}

// Export types
export type { Workspace, WorkspaceMember }
