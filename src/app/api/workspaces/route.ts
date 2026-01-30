import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET - Fetch workspaces for current user
export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        // Get user from auth header
        const authHeader = request.headers.get('authorization')
        const userId = request.headers.get('x-user-id') // Simplified for now

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get workspaces user belongs to
        const { data: memberships, error } = await supabase
            .from('workspace_members')
            .select(`
        role,
        workspace:workspaces(
          id,
          name,
          slug,
          logo_url,
          settings,
          created_at
        )
      `)
            .eq('user_id', userId)
            .eq('is_active', true)

        if (error) throw error

        const workspaces = memberships?.map(m => ({
            ...m.workspace,
            role: m.role
        })) || []

        return NextResponse.json(workspaces)

    } catch (error) {
        console.error('Workspace fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
    }
}

// POST - Create new workspace
export async function POST(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, slug } = body

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
        }

        // Create workspace using helper function
        const { data, error } = await supabase
            .rpc('create_workspace_for_user', {
                p_user_id: userId,
                p_workspace_name: name,
                p_workspace_slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
            })

        if (error) throw error

        // Fetch the created workspace
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', data)
            .single()

        return NextResponse.json(workspace)

    } catch (error) {
        console.error('Workspace create error:', error)
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }
}
