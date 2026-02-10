import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/settings - Fetch brand guidelines for workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_linkedin_brand_guidelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

    return NextResponse.json(data || null)
  } catch (error: unknown) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// POST /api/commenting/settings - Create or update brand guidelines
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { workspace_id, ...guidelineFields } = body

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Check if active guidelines already exist for this workspace
    const { data: existing } = await supabase
      .from('vera_linkedin_brand_guidelines')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single()

    let data
    let error

    if (existing) {
      // Update existing guidelines
      const result = await supabase
        .from('vera_linkedin_brand_guidelines')
        .update({
          ...guidelineFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      data = result.data
      error = result.error
    } else {
      // Insert new guidelines
      const result = await supabase
        .from('vera_linkedin_brand_guidelines')
        .insert({
          workspace_id,
          is_active: true,
          ...guidelineFields,
        })
        .select()
        .single()

      data = result.data
      error = result.error
    }

    if (error) throw error

    return NextResponse.json(data, { status: existing ? 200 : 201 })
  } catch (error: unknown) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
