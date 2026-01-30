import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/content-queue - List queue items
export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const workspaceId = searchParams.get('workspace_id')

        let query = supabase
            .from('content_queue')
            .select(`
        *,
        prompts:prompt_id (
          prompt_name,
          platform,
          content_type
        )
      `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (status) {
            query = query.eq('status', status)
        }

        if (workspaceId) {
            query = query.eq('workspace_id', workspaceId)
        }

        const { data, error } = await query

        if (error) throw error

        // Flatten the response
        const items = (data || []).map(item => ({
            ...item,
            platform: item.prompts?.platform,
            content_type: item.prompts?.content_type,
        }))

        return NextResponse.json(items)
    } catch (error: any) {
        console.error('Error fetching queue:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/content-queue - Add item to queue
export async function POST(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const body = await request.json()

        // Get the prompt details
        let platform = body.platform
        let contentType = body.content_type

        if (body.prompt_id) {
            const { data: prompt } = await supabase
                .from('prompts')
                .select('platform, content_type')
                .eq('id', body.prompt_id)
                .single()

            if (prompt) {
                platform = prompt.platform
                contentType = prompt.content_type
            }
        }

        const { data, error } = await supabase
            .from('content_queue')
            .insert({
                topic: body.topic,
                viewpoint: body.viewpoint || null,
                context: body.context || null,
                prompt_id: body.prompt_id || null,
                platform,
                content_type: contentType,
                model_override: body.model_override || null,
                tone_of_voice_id: body.tone_of_voice_id || null,
                status: 'pending',
                workspace_id: body.workspace_id || null,
                created_by: body.created_by || null,
                scheduled_for: body.scheduled_for || null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error('Error adding to queue:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
