import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Calculate a scheduled time with anti-detection randomization.
 * - Base gap: 25-55 minutes from reference time
 * - Jitter: +/- 8-12 minutes
 * - Avoids exact hour and half-hour marks
 */
function calculateScheduledTime(referenceTime: Date): Date {
  // Base gap: 25-55 minutes
  const baseGapMinutes = 25 + Math.random() * 30

  // Jitter: +/- 8-12 minutes
  const jitterRange = 8 + Math.random() * 4 // 8-12
  const jitter = (Math.random() < 0.5 ? -1 : 1) * jitterRange

  const totalMinutes = baseGapMinutes + jitter
  const scheduled = new Date(referenceTime.getTime() + totalMinutes * 60 * 1000)

  // Avoid exact hour marks (xx:00) and half-hour marks (xx:30)
  const minutes = scheduled.getMinutes()
  if (minutes === 0 || minutes === 30) {
    // Shift by 3-7 minutes
    const shift = 3 + Math.floor(Math.random() * 5)
    scheduled.setMinutes(minutes + shift)
  }

  return scheduled
}

// POST /api/commenting/approve - Approve a single comment
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { comment_id, workspace_id } = body

    if (!comment_id || !workspace_id) {
      return NextResponse.json(
        { error: 'comment_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Fetch the comment
    const { data: comment, error: fetchError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('*')
      .eq('id', comment_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot approve comment with status '${comment.status}'` },
        { status: 400 }
      )
    }

    // Calculate scheduled time with anti-detection randomization
    const scheduledFor = calculateScheduledTime(new Date())

    const { data, error } = await supabase
      .from('vera_linkedin_comment_queue')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: body.approved_by || null,
        scheduled_for: scheduledFor.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', comment_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Approve comment error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
