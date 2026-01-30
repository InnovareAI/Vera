import { NextResponse } from 'next/server'
import { createLinkedInPost } from '@/lib/unipile'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const { accountId, content, workspaceId } = await req.json()

        if (!accountId || !content || !workspaceId) {
            return NextResponse.json(
                { error: 'Missing accountId, content, or workspaceId' },
                { status: 400 }
            )
        }

        const supabase = createAdminClient()

        // 1. Create the post via Unipile
        const result = await createLinkedInPost(accountId, content)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to post' },
                { status: 500 }
            )
        }

        // 2. Identify the author (member) based on accountId
        const { data: authorMember } = await supabase
            .from('vera_workspace_members')
            .select('email, name')
            .eq('workspace_id', workspaceId)
            .limit(1)
            .single() // Simplified: assuming the one who clicks is the one connected

        // 3. Queue engagement for other team members
        if (authorMember) {
            const { data: teamMembers } = await supabase
                .from('vera_workspace_members')
                .select('email')
                .eq('workspace_id', workspaceId)
                .eq('engagement_loop_enabled', true)
                .neq('email', authorMember.email)

            if (teamMembers && teamMembers.length > 0) {
                const engagementTasks = teamMembers.map(member => ({
                    workspace_id: workspaceId,
                    post_id: result.post_id,
                    post_url: `https://www.linkedin.com/feed/update/${result.post_id}`,
                    post_author_email: authorMember.email,
                    target_member_email: member.email,
                    engagement_type: 'like',
                    status: 'pending'
                }))

                await supabase.from('team_engagement_tasks').insert(engagementTasks)
            }
        }

        return NextResponse.json({
            success: true,
            postId: result.post_id,
            amplified: true
        })

    } catch (error: any) {
        console.error('API Error in direct share:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
