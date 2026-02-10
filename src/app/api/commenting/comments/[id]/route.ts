import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// PATCH /api/commenting/comments/[id] - Update comment text (only for pending_approval)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { comment_text } = body

    if (!comment_text || typeof comment_text !== 'string') {
      return NextResponse.json(
        { error: 'comment_text is required and must be a string' },
        { status: 400 }
      )
    }

    // Fetch current comment to validate status
    const { data: existing, error: fetchError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existing.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot edit comment with status '${existing.status}'. Only pending_approval comments can be edited.` },
        { status: 400 }
      )
    }

    // Update comment text and length
    const { data, error } = await supabase
      .from('vera_linkedin_comment_queue')
      .update({
        comment_text,
        comment_length: comment_text.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Comment PATCH error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
