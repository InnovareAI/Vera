import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/commenting/reject - Reject a comment
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { comment_id, reason } = body

    if (!comment_id) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_linkedin_comment_queue')
      .update({
        status: 'rejected',
        user_feedback: reason || null,
        feedback_at: reason ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', comment_id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Reject comment error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
