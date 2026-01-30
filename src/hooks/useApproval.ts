'use client'

import { useState, useEffect, useCallback } from 'react'

export type ApprovalAction =
    | 'submit'
    | 'approve'
    | 'reject'
    | 'request_changes'
    | 'schedule'
    | 'unschedule'
    | 'publish'
    | 'assign'
    | 'restore'

export interface ApprovalPermissions {
    can_submit: boolean
    can_approve: boolean
    can_reject: boolean
    can_request_changes: boolean
    can_publish: boolean
    can_schedule: boolean
    can_assign_reviewer: boolean
    can_view_all: boolean
}

export interface ApprovalUserInfo {
    role: 'owner' | 'admin' | 'editor' | 'viewer'
    permissions: ApprovalPermissions
    roleHierarchy: number
}

export interface AuditLogEntry {
    id: string
    content_item_id: string
    action: string
    performed_by: string
    performer_role: string
    previous_status: string | null
    new_status: string
    notes: string | null
    metadata: Record<string, unknown>
    created_at: string
    performer?: {
        email: string
        full_name: string | null
    }
}

export interface ApprovalStats {
    draft: number
    pending_review: number
    changes_requested: number
    approved: number
    scheduled: number
    published: number
    rejected: number
}

interface UseApprovalOptions {
    workspaceId: string
    userId: string
}

export function useApproval({ workspaceId, userId }: UseApprovalOptions) {
    const [userInfo, setUserInfo] = useState<ApprovalUserInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Fetch user permissions
    const fetchPermissions = useCallback(async () => {
        if (!workspaceId || !userId) {
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch(
                `/api/content/approve?workspaceId=${workspaceId}&userId=${userId}&type=permissions`
            )

            if (!response.ok) {
                throw new Error('Failed to fetch permissions')
            }

            const data = await response.json()
            setUserInfo(data)
            setError(null)
        } catch (err) {
            console.error('Error fetching permissions:', err)
            setError(err instanceof Error ? err.message : 'Failed to load permissions')
            // Set default viewer permissions on error
            setUserInfo({
                role: 'viewer',
                permissions: {
                    can_submit: false,
                    can_approve: false,
                    can_reject: false,
                    can_request_changes: false,
                    can_publish: false,
                    can_schedule: false,
                    can_assign_reviewer: false,
                    can_view_all: false
                },
                roleHierarchy: 1
            })
        } finally {
            setIsLoading(false)
        }
    }, [workspaceId, userId])

    useEffect(() => {
        fetchPermissions()
    }, [fetchPermissions])

    // Perform an approval action
    const performAction = useCallback(async (
        action: ApprovalAction,
        contentId: string,
        options?: {
            notes?: string
            scheduledFor?: string
            assigneeId?: string
        }
    ): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> => {
        if (!workspaceId || !userId) {
            return { success: false, error: 'Missing workspace or user ID' }
        }

        setActionLoading(contentId)
        setError(null)

        try {
            const response = await fetch('/api/content/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    contentId,
                    workspaceId,
                    userId,
                    notes: options?.notes,
                    scheduledFor: options?.scheduledFor,
                    assigneeId: options?.assigneeId
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Action failed')
            }

            return { success: true, data }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Action failed'
            setError(message)
            return { success: false, error: message }
        } finally {
            setActionLoading(null)
        }
    }, [workspaceId, userId])

    // Helper methods for common actions
    const submitForReview = useCallback(
        (contentId: string, notes?: string) =>
            performAction('submit', contentId, { notes }),
        [performAction]
    )

    const approve = useCallback(
        (contentId: string, notes?: string) =>
            performAction('approve', contentId, { notes }),
        [performAction]
    )

    const reject = useCallback(
        (contentId: string, notes?: string) =>
            performAction('reject', contentId, { notes }),
        [performAction]
    )

    const requestChanges = useCallback(
        (contentId: string, notes: string) =>
            performAction('request_changes', contentId, { notes }),
        [performAction]
    )

    const schedule = useCallback(
        (contentId: string, scheduledFor: string, notes?: string) =>
            performAction('schedule', contentId, { scheduledFor, notes }),
        [performAction]
    )

    const unschedule = useCallback(
        (contentId: string) =>
            performAction('unschedule', contentId),
        [performAction]
    )

    const assignReviewer = useCallback(
        (contentId: string, assigneeId: string) =>
            performAction('assign', contentId, { assigneeId }),
        [performAction]
    )

    const restore = useCallback(
        (contentId: string) =>
            performAction('restore', contentId),
        [performAction]
    )

    // Fetch audit log for a content item
    const fetchAuditLog = useCallback(async (contentId: string): Promise<AuditLogEntry[]> => {
        try {
            const response = await fetch(
                `/api/content/approve?workspaceId=${workspaceId}&userId=${userId}&type=audit&contentId=${contentId}`
            )
            const data = await response.json()
            return data.auditLog || []
        } catch (err) {
            console.error('Error fetching audit log:', err)
            return []
        }
    }, [workspaceId, userId])

    // Fetch approval stats
    const fetchStats = useCallback(async (): Promise<ApprovalStats | null> => {
        try {
            const response = await fetch(
                `/api/content/approve?workspaceId=${workspaceId}&userId=${userId}&type=stats`
            )
            const data = await response.json()
            return data.stats || null
        } catch (err) {
            console.error('Error fetching stats:', err)
            return null
        }
    }, [workspaceId, userId])

    // Check if user can perform a specific action
    const canPerform = useCallback((action: ApprovalAction): boolean => {
        if (!userInfo?.permissions) return false

        const permissionMap: Record<ApprovalAction, keyof ApprovalPermissions> = {
            submit: 'can_submit',
            approve: 'can_approve',
            reject: 'can_reject',
            request_changes: 'can_request_changes',
            schedule: 'can_schedule',
            unschedule: 'can_schedule',
            publish: 'can_publish',
            assign: 'can_assign_reviewer',
            restore: 'can_approve' // Only approvers can restore
        }

        return userInfo.permissions[permissionMap[action]] ?? false
    }, [userInfo])

    // Get role display info
    const getRoleInfo = useCallback(() => {
        if (!userInfo) return null

        const roleLabels = {
            owner: { label: 'Owner', color: 'text-purple-400', bg: 'bg-purple-600/20' },
            admin: { label: 'Admin', color: 'text-blue-400', bg: 'bg-blue-600/20' },
            editor: { label: 'Editor', color: 'text-green-400', bg: 'bg-green-600/20' },
            viewer: { label: 'Viewer', color: 'text-gray-400', bg: 'bg-gray-600/20' }
        }

        return roleLabels[userInfo.role]
    }, [userInfo])

    return {
        // State
        userInfo,
        isLoading,
        error,
        actionLoading,

        // Permission checks
        canPerform,
        getRoleInfo,

        // Actions
        performAction,
        submitForReview,
        approve,
        reject,
        requestChanges,
        schedule,
        unschedule,
        assignReviewer,
        restore,

        // Data fetching
        fetchAuditLog,
        fetchStats,
        refreshPermissions: fetchPermissions
    }
}

// Status helpers
export const APPROVAL_STATUS_CONFIG = {
    draft: {
        label: 'Draft',
        icon: '📝',
        color: 'text-gray-400',
        bg: 'bg-gray-600/20',
        border: 'border-gray-500/30'
    },
    pending_review: {
        label: 'Pending Review',
        icon: '⏳',
        color: 'text-yellow-400',
        bg: 'bg-yellow-600/20',
        border: 'border-yellow-500/30'
    },
    pending: {
        label: 'Pending Review',
        icon: '⏳',
        color: 'text-yellow-400',
        bg: 'bg-yellow-600/20',
        border: 'border-yellow-500/30'
    },
    changes_requested: {
        label: 'Changes Requested',
        icon: '✏️',
        color: 'text-orange-400',
        bg: 'bg-orange-600/20',
        border: 'border-orange-500/30'
    },
    approved: {
        label: 'Approved',
        icon: '✅',
        color: 'text-green-400',
        bg: 'bg-green-600/20',
        border: 'border-green-500/30'
    },
    scheduled: {
        label: 'Scheduled',
        icon: '📅',
        color: 'text-blue-400',
        bg: 'bg-blue-600/20',
        border: 'border-blue-500/30'
    },
    published: {
        label: 'Published',
        icon: '🚀',
        color: 'text-cyan-400',
        bg: 'bg-cyan-600/20',
        border: 'border-cyan-500/30'
    },
    rejected: {
        label: 'Rejected',
        icon: '❌',
        color: 'text-red-400',
        bg: 'bg-red-600/20',
        border: 'border-red-500/30'
    },
    dismissed: {
        label: 'Dismissed',
        icon: '❌',
        color: 'text-red-400',
        bg: 'bg-red-600/20',
        border: 'border-red-500/30'
    }
}

export function getStatusConfig(status: string) {
    return APPROVAL_STATUS_CONFIG[status as keyof typeof APPROVAL_STATUS_CONFIG]
        || APPROVAL_STATUS_CONFIG.draft
}
