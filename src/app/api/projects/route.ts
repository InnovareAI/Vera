import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/projects
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('vera_projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('status', 'archived')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    if (!body.workspace_id || !body.name) {
      return NextResponse.json({ error: 'workspace_id and name required' }, { status: 400 })
    }

    const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Check if this is the first project for the workspace
    const { count } = await supabase
      .from('vera_projects')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', body.workspace_id)
      .neq('status', 'archived')

    const isDefault = (count ?? 0) === 0

    const { data, error } = await supabase
      .from('vera_projects')
      .insert({
        workspace_id: body.workspace_id,
        name: body.name,
        slug,
        description: body.description || null,
        website_url: body.website_url || null,
        logo_url: body.logo_url || null,
        brand_colors: body.brand_colors || null,
        industry: body.industry || null,
        products: body.products || null,
        icp: body.icp || null,
        tone_of_voice: body.tone_of_voice || null,
        enabled_platforms: body.enabled_platforms || null,
        platform_settings: body.platform_settings || null,
        settings: body.settings || null,
        is_default: isDefault,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
