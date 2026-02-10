import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/commenting/monitors/[id] - Fetch single monitor by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('vera_linkedin_post_monitors')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Monitor GET error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// PATCH /api/commenting/monitors/[id] - Update monitor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields: Record<string, unknown> = {}
    if (body.name !== undefined) allowedFields.name = body.name
    if (body.hashtags !== undefined) allowedFields.hashtags = body.hashtags
    if (body.keywords !== undefined) allowedFields.keywords = body.keywords
    if (body.status !== undefined) allowedFields.status = body.status
    if (body.settings !== undefined) allowedFields.metadata = body.settings

    const { data, error } = await supabase
      .from('vera_linkedin_post_monitors')
      .update({ ...allowedFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Monitor PATCH error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// DELETE /api/commenting/monitors/[id] - Delete monitor and associated posts
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Delete associated discovered posts first
    const { error: postsError } = await supabase
      .from('vera_linkedin_posts_discovered')
      .delete()
      .eq('monitor_id', id)

    if (postsError) {
      console.error('Error deleting monitor posts:', postsError)
    }

    // Delete the monitor
    const { error } = await supabase
      .from('vera_linkedin_post_monitors')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Monitor DELETE error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
