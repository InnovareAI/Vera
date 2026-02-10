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
  const baseGapMinutes = 25 + Math.random() * 30
  const jitterRange = 8 + Math.random() * 4
  const jitter = (Math.random() < 0.5 ? -1 : 1) * jitterRange
  const totalMinutes = baseGapMinutes + jitter
  const scheduled = new Date(referenceTime.getTime() + totalMinutes * 60 * 1000)

  const minutes = scheduled.getMinutes()
  if (minutes === 0 || minutes === 30) {
    const shift = 3 + Math.floor(Math.random() * 5)
    scheduled.setMinutes(minutes + shift)
  }

  return scheduled
}

// POST /api/commenting/bulk-approve - Approve multiple comments with staggered scheduling
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { comment_ids, workspace_id } = body

    if (!comment_ids || !Array.isArray(comment_ids) || comment_ids.length === 0) {
      return NextResponse.json(
        { error: 'comment_ids array is required and must not be empty' },
        { status: 400 }
      )
    }
    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Fetch all specified comments
    const { data: comments, error: fetchError } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('id, status')
      .in('id', comment_ids)
      .eq('workspace_id', workspace_id)

    if (fetchError) throw fetchError

    // Filter to only pending_approval comments
    const eligibleIds = (comments || [])
      .filter(c => c.status === 'pending_approval')
      .map(c => c.id)

    if (eligibleIds.length === 0) {
      return NextResponse.json({
        approved: 0,
        message: 'No eligible comments found (must be pending_approval status)',
      })
    }

    let approved = 0
    let lastScheduledTime = new Date()

    // Approve each comment with staggered scheduling
    for (const commentId of eligibleIds) {
      const scheduledFor = calculateScheduledTime(lastScheduledTime)
      lastScheduledTime = scheduledFor // Next comment starts from this time

      const { error: updateError } = await supabase
        .from('vera_linkedin_comment_queue')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: body.approved_by || null,
          scheduled_for: scheduledFor.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)

      if (!updateError) {
        approved++
      } else {
        console.error(`Failed to approve comment ${commentId}:`, updateError)
      }
    }

    return NextResponse.json({
      approved,
      total_requested: comment_ids.length,
      ineligible: comment_ids.length - eligibleIds.length,
    })
  } catch (error: unknown) {
    console.error('Bulk approve error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
