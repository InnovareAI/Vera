import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Fetch workspace members
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: workspaceId } = await params
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user is member of workspace
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
        }

        // Fetch all members
        const { data: members, error } = await supabase
            .from('workspace_members')
            .select(`
        id,
        role,
        is_active,
        created_at,
        accepted_at,
        user:user_profiles(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json(members)

    } catch (error) {
        console.error('Members fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }
}

// POST - Invite member to workspace
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: workspaceId } = await params
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user is owner/admin
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 })
        }

        const body = await request.json()
        const { email, role = 'viewer' } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Invite using helper function
        const { data: memberId, error } = await supabase
            .rpc('invite_user_to_workspace', {
                p_workspace_id: workspaceId,
                p_email: email,
                p_role: role
            })

        if (error) throw error

        if (!memberId) {
            return NextResponse.json({
                error: 'User not found. They must sign up first.',
                needsInvite: true
            }, { status: 404 })
        }

        return NextResponse.json({ success: true, memberId })

    } catch (error) {
        console.error('Invite error:', error)
        return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 })
    }
}

// DELETE - Remove member from workspace
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: workspaceId } = await params
        const userId = request.headers.get('x-user-id')
        const { searchParams } = new URL(request.url)
        const memberIdToRemove = searchParams.get('memberId')

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!memberIdToRemove) {
            return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
        }

        // Verify user is owner/admin
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 })
        }

        // Deactivate member (soft delete)
        const { error } = await supabase
            .from('workspace_members')
            .update({ is_active: false })
            .eq('id', memberIdToRemove)
            .eq('workspace_id', workspaceId)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Remove member error:', error)
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }
}
