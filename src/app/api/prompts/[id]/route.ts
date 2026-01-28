import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/prompts/[id] - Get single prompt
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const { data, error } = await supabase
            .from('prompts')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        if (!data) {
            return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching prompt:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT /api/prompts/[id] - Update prompt
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        const { data, error } = await supabase
            .from('prompts')
            .update({
                prompt_name: body.prompt_name,
                platform: body.platform,
                content_type: body.content_type,
                system_prompt: body.system_prompt,
                user_prompt: body.user_prompt,
                preferred_model_id: body.preferred_model_id || null,
                include_tone_of_voice: body.include_tone_of_voice,
                default_word_count: body.default_word_count,
                include_hashtags: body.include_hashtags,
                include_emoji: body.include_emoji,
                include_cta: body.include_cta,
                is_active: body.is_active,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error updating prompt:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE /api/prompts/[id] - Soft delete prompt
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const { error } = await supabase
            .from('prompts')
            .update({ is_active: false })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting prompt:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
