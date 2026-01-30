import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const getSupabase = () => createAdminClient()

// GET /api/prompts - List all prompts
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const platform = searchParams.get('platform')
        const workspaceId = searchParams.get('workspace_id')

        let query = getSupabase()
            .from('prompts')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (platform) {
            query = query.eq('platform', platform)
        }

        if (workspaceId) {
            query = query.eq('workspace_id', workspaceId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error fetching prompts:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/prompts - Create new prompt
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const { data, error } = await getSupabase()
            .from('prompts')
            .insert({
                prompt_name: body.prompt_name,
                platform: body.platform,
                content_type: body.content_type,
                system_prompt: body.system_prompt,
                user_prompt: body.user_prompt,
                preferred_model_id: body.preferred_model_id || null,
                include_tone_of_voice: body.include_tone_of_voice ?? true,
                default_word_count: body.default_word_count,
                include_hashtags: body.include_hashtags ?? false,
                include_emoji: body.include_emoji ?? true,
                include_cta: body.include_cta ?? true,
                is_active: body.is_active ?? true,
                workspace_id: body.workspace_id || null,
                created_by: body.created_by || null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error('Error creating prompt:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
