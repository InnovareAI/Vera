import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization of Supabase client
let supabaseClient: SupabaseClient | null = null

function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
    }
    return supabaseClient
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
    owner: 4,
    admin: 3,
    editor: 2,
    viewer: 1
}

// Default permissions by role (fallback if not in DB)
const DEFAULT_PERMISSIONS = {
    owner: {
        can_submit: true,
        can_approve: true,
        can_reject: true,
        can_request_changes: true,
        can_publish: true,
        can_schedule: true,
        can_assign_reviewer: true,
        can_view_all: true
    },
    admin: {
        can_submit: true,
        can_approve: true,
        can_reject: true,
        can_request_changes: true,
        can_publish: true,
        can_schedule: true,
        can_assign_reviewer: true,
        can_view_all: true
    },
    editor: {
        can_submit: true,
        can_approve: false,
        can_reject: false,
        can_request_changes: true,
        can_publish: false,
        can_schedule: false,
        can_assign_reviewer: false,
        can_view_all: true
    },
    viewer: {
        can_submit: false,
        can_approve: false,
        can_reject: false,
        can_request_changes: false,
        can_publish: false,
        can_schedule: false,
        can_assign_reviewer: false,
        can_view_all: false
    }
}

interface ApprovalAction {
    action: 'submit' | 'approve' | 'reject' | 'request_changes' | 'schedule' | 'unschedule' | 'publish' | 'assign' | 'restore'
    contentId: string
    workspaceId: string
    userId: string
    notes?: string
    scheduledFor?: string
    assigneeId?: string
}

// Get user's role and permissions for a workspace
async function getUserPermissions(workspaceId: string, userId: string) {
    // Get user's role in the workspace
    const { data: membership, error: memberError } = await getSupabase()
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        
        .single()

    if (memberError || !membership) {
        return null
    }

    const role = membership.role as keyof typeof DEFAULT_PERMISSIONS

    // Try to get custom permissions from DB
    const { data: customPermissions } = await getSupabase()
        .from('approval_permissions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('role', role)
        .single()

    return {
        role,
        permissions: customPermissions || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer
    }
}

// Log an approval action
async function logAction(
    contentId: string,
    action: string,
    userId: string,
    userRole: string,
    previousStatus: string | null,
    newStatus: string,
    notes?: string,
    metadata?: Record<string, unknown>
) {
    await getSupabase()
        .from('content_approval_log')
        .insert({
            content_item_id: contentId,
            action,
            performed_by: userId,
            performer_role: userRole,
            previous_status: previousStatus,
            new_status: newStatus,
            notes,
            metadata: metadata || {}
        })
}

export async function POST(request: NextRequest) {
    try {
        const body: ApprovalAction = await request.json()
        const { action, contentId, workspaceId, userId, notes, scheduledFor, assigneeId } = body

        if (!action || !contentId || !workspaceId || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: action, contentId, workspaceId, userId' },
                { status: 400 }
            )
        }

        // Get user permissions
        const userInfo = await getUserPermissions(workspaceId, userId)
        if (!userInfo) {
            return NextResponse.json(
                { error: 'User is not a member of this workspace' },
                { status: 403 }
            )
        }

        const { role, permissions } = userInfo

        // Get current content state
        const { data: content, error: contentError } = await getSupabase()
            .from('content_items')
            .select('*')
            .eq('id', contentId)
            .eq('workspace_id', workspaceId)
            .single()

        if (contentError || !content) {
            return NextResponse.json(
                { error: 'Content not found' },
                { status: 404 }
            )
        }

        const currentStatus = content.approval_status || content.status || 'draft'
        let newStatus = currentStatus
        let updateData: Record<string, unknown> = {}

        // Process action based on type
        switch (action) {
            case 'submit':
                if (!permissions.can_submit) {
                    return NextResponse.json(
                        { error: 'You do not have permission to submit content for review' },
                        { status: 403 }
                    )
                }
                if (currentStatus !== 'draft' && currentStatus !== 'changes_requested' && currentStatus !== 'pending') {
                    return NextResponse.json(
                        { error: `Cannot submit content with status: ${currentStatus}` },
                        { status: 400 }
                    )
                }
                newStatus = 'pending_review'
                updateData = {
                    approval_status: newStatus,
                    status: 'pending',
                    submitted_by: userId,
                    submitted_at: new Date().toISOString()
                }
                break

            case 'approve':
                if (!permissions.can_approve) {
                    return NextResponse.json(
                        { error: 'You do not have permission to approve content. Only admins and owners can approve.' },
                        { status: 403 }
                    )
                }
                if (currentStatus !== 'pending_review' && currentStatus !== 'pending') {
                    return NextResponse.json(
                        { error: `Cannot approve content with status: ${currentStatus}. Content must be pending review.` },
                        { status: 400 }
                    )
                }
                newStatus = 'approved'
                updateData = {
                    approval_status: newStatus,
                    status: 'approved',
                    approved_by: userId,
                    approved_at: new Date().toISOString()
                }
                break

            case 'reject':
                if (!permissions.can_reject) {
                    return NextResponse.json(
                        { error: 'You do not have permission to reject content' },
                        { status: 403 }
                    )
                }
                if (currentStatus !== 'pending_review' && currentStatus !== 'pending') {
                    return NextResponse.json(
                        { error: `Cannot reject content with status: ${currentStatus}` },
                        { status: 400 }
                    )
                }
                newStatus = 'rejected'
                updateData = {
                    approval_status: newStatus,
                    status: 'dismissed'
                }
                break

            case 'request_changes':
                if (!permissions.can_request_changes) {
                    return NextResponse.json(
                        { error: 'You do not have permission to request changes' },
                        { status: 403 }
                    )
                }
                if (currentStatus !== 'pending_review' && currentStatus !== 'pending') {
                    return NextResponse.json(
                        { error: `Cannot request changes for content with status: ${currentStatus}` },
                        { status: 400 }
                    )
                }
                newStatus = 'changes_requested'
                updateData = {
                    approval_status: newStatus,
                    status: 'pending'
                }
                break

            case 'schedule':
                if (!permissions.can_schedule) {
                    return NextResponse.json(
                        { error: 'You do not have permission to schedule content' },
                        { status: 403 }
                    )
                }
                if (currentStatus !== 'approved') {
                    return NextResponse.json(
                        { error: 'Only approved content can be scheduled' },
                        { status: 400 }
                    )
                }
                if (!scheduledFor) {
                    return NextResponse.json(
                        { error: 'scheduledFor is required for scheduling' },
                        { status: 400 }
                    )
                }
                newStatus = 'scheduled'
                updateData = {
                    approval_status: newStatus,
                    status: 'scheduled',
                    scheduled_for: scheduledFor
                }
                // Also create scheduled_posts entry
                await getSupabase()
                    .from('scheduled_posts')
                    .insert({
                        content_item_id: contentId,
                        workspace_id: workspaceId,
                        scheduled_for: scheduledFor,
                        platform: content.platform || 'linkedin',
                        created_by: userId
                    })
                break

            case 'unschedule':
                if (!permissions.can_schedule) {
                    return NextResponse.json(
                        { error: 'You do not have permission to unschedule content' },
                        { status: 403 }
                    )
                }
                if (currentStatus !== 'scheduled') {
                    return NextResponse.json(
                        { error: 'Only scheduled content can be unscheduled' },
                        { status: 400 }
                    )
                }
                newStatus = 'approved'
                updateData = {
                    approval_status: newStatus,
                    status: 'approved',
                    scheduled_for: null
                }
                // Remove from scheduled_posts
                await getSupabase()
                    .from('scheduled_posts')
                    .delete()
                    .eq('content_item_id', contentId)
                    .eq('status', 'pending')
                break

            case 'assign':
                if (!permissions.can_assign_reviewer) {
                    return NextResponse.json(
                        { error: 'You do not have permission to assign reviewers' },
                        { status: 403 }
                    )
                }
                if (!assigneeId) {
                    return NextResponse.json(
                        { error: 'assigneeId is required for assigning' },
                        { status: 400 }
                    )
                }
                updateData = {
                    assigned_reviewer: assigneeId
                }
                break

            case 'restore':
                // Only owners/admins can restore rejected content
                if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY.admin) {
                    return NextResponse.json(
                        { error: 'Only admins and owners can restore rejected content' },
                        { status: 403 }
                    )
                }
                if (currentStatus !== 'rejected' && currentStatus !== 'dismissed') {
                    return NextResponse.json(
                        { error: 'Only rejected content can be restored' },
                        { status: 400 }
                    )
                }
                newStatus = 'draft'
                updateData = {
                    approval_status: newStatus,
                    status: 'pending'
                }
                break

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                )
        }

        // Update content
        const { error: updateError } = await getSupabase()
            .from('content_items')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', contentId)

        if (updateError) {
            console.error('Update error:', updateError)
            return NextResponse.json(
                { error: 'Failed to update content' },
                { status: 500 }
            )
        }

        // Log the action
        await logAction(
            contentId,
            action === 'request_changes' ? 'changes_requested' : action === 'submit' ? 'submitted' : action + 'd',
            userId,
            role,
            currentStatus,
            newStatus,
            notes
        )

        return NextResponse.json({
            success: true,
            action,
            previousStatus: currentStatus,
            newStatus,
            updatedAt: new Date().toISOString(),
            performedBy: {
                userId,
                role
            }
        })
    } catch (error: unknown) {
        console.error('Approval API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET: Fetch approval permissions and audit log
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const workspaceId = searchParams.get('workspaceId')
        const userId = searchParams.get('userId')
        const contentId = searchParams.get('contentId')
        const type = searchParams.get('type') || 'permissions' // 'permissions' | 'audit' | 'pending'

        if (!workspaceId || !userId) {
            return NextResponse.json(
                { error: 'Missing required params: workspaceId, userId' },
                { status: 400 }
            )
        }

        const userInfo = await getUserPermissions(workspaceId, userId)
        if (!userInfo) {
            return NextResponse.json(
                { error: 'User is not a member of this workspace' },
                { status: 403 }
            )
        }

        const { role, permissions } = userInfo

        switch (type) {
            case 'permissions':
                return NextResponse.json({
                    role,
                    permissions,
                    roleHierarchy: ROLE_HIERARCHY[role]
                })

            case 'audit':
                if (!contentId) {
                    return NextResponse.json(
                        { error: 'contentId required for audit log' },
                        { status: 400 }
                    )
                }
                const { data: auditLog } = await getSupabase()
                    .from('content_approval_log')
                    .select(`
                        *,
                        performer:performed_by(email, full_name)
                    `)
                    .eq('content_item_id', contentId)
                    .order('created_at', { ascending: false })

                return NextResponse.json({ auditLog: auditLog || [] })

            case 'pending':
                // Get content pending review (for reviewers)
                let query = getSupabase()
                    .from('content_items')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .in('status', ['pending'])

                // If user can't view all, only show their own submissions
                if (!permissions.can_view_all) {
                    query = query.eq('submitted_by', userId)
                }

                const { data: pendingContent } = await query.order('created_at', { ascending: false })

                return NextResponse.json({
                    pendingContent: pendingContent || [],
                    canApprove: permissions.can_approve,
                    userRole: role
                })

            case 'stats':
                // Get approval stats for the workspace
                const { data: allContent } = await getSupabase()
                    .from('content_items')
                    .select('status, approval_status')
                    .eq('workspace_id', workspaceId)

                const stats = {
                    draft: 0,
                    pending_review: 0,
                    changes_requested: 0,
                    approved: 0,
                    scheduled: 0,
                    published: 0,
                    rejected: 0
                }

                allContent?.forEach(item => {
                    const status = item.approval_status || item.status || 'draft'
                    if (status in stats) {
                        stats[status as keyof typeof stats]++
                    }
                })

                return NextResponse.json({ stats })

            default:
                return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
        }
    } catch (error) {
        console.error('Approval GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
