import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// POST /api/content-queue/[id]/generate - Generate content for a queue item
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = getSupabase()
    try {
        const { id } = await params

        // Get the queue item with its prompt
        const { data: item, error: itemError } = await supabase
            .from('content_queue')
            .select(`
        *,
        prompts:prompt_id (
          system_prompt,
          user_prompt,
          platform,
          content_type,
          include_hashtags,
          include_emoji,
          include_cta,
          default_word_count
        )
      `)
            .eq('id', id)
            .single()

        if (itemError || !item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        if (item.status === 'complete') {
            return NextResponse.json({ error: 'Already generated' }, { status: 400 })
        }

        // Update status to processing
        await supabase
            .from('content_queue')
            .update({ status: 'processing' })
            .eq('id', id)

        // Build the prompt
        const prompt = item.prompts
        const systemPrompt = prompt?.system_prompt || 'You are a helpful content writer.'

        let userPrompt = prompt?.user_prompt || 'Write content about the topic provided.'

        // Inject topic and viewpoint
        userPrompt = `${userPrompt}\n\nTopic: ${item.topic}`
        if (item.viewpoint) {
            userPrompt += `\n\nMy Viewpoint: ${item.viewpoint}`
        }
        if (item.context) {
            userPrompt += `\n\nAdditional Context: ${item.context}`
        }

        // Get tone of voice if available
        let toneGuide = ''
        if (item.tone_of_voice_id) {
            const { data: tone } = await supabase
                .from('tone_of_voice')
                .select('voice_document')
                .eq('id', item.tone_of_voice_id)
                .single()

            if (tone?.voice_document) {
                toneGuide = `\n\nTone of Voice Guidelines:\n${tone.voice_document}`
            }
        }

        // Determine which model to use
        let modelId = 'anthropic/claude-3.5-haiku' // Default - fast & cost-effective

        if (item.model_override) {
            const { data: model } = await supabase
                .from('ai_models')
                .select('model_id')
                .eq('id', item.model_override)
                .single()

            if (model) modelId = model.model_id
        } else if (prompt?.content_type === 'newsletter' || prompt?.content_type === 'article') {
            // Use Claude Sonnet for long-form content
            modelId = 'anthropic/claude-sonnet-4-20250514'
        }

        // Call OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://vera.innovareai.com',
                'X-Title': 'Vera.AI Content Engine',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: systemPrompt + toneGuide },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 4096,
                temperature: 0.7,
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`OpenRouter error: ${error}`)
        }

        const result = await response.json()
        const content = result.choices?.[0]?.message?.content || ''

        // Extract hashtags if present
        const hashtagMatch = content.match(/#\w+/g)
        const hashtags = hashtagMatch ? hashtagMatch.map((h: string) => h.replace('#', '')) : []

        // Update the queue item with generated content
        const { data: updated, error: updateError } = await supabase
            .from('content_queue')
            .update({
                finished_content: content,
                hashtags: hashtags.length > 0 ? hashtags : null,
                status: 'complete',
                processed_at: new Date().toISOString(),
                error_message: null,
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) throw updateError

        return NextResponse.json({
            success: true,
            item: updated,
            model_used: modelId,
        })

    } catch (error: any) {
        console.error('Error generating content:', error)

        // Update status to error
        await supabase
            .from('content_queue')
            .update({
                status: 'error',
                error_message: error.message,
            })
            .eq('id', (await params).id)

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
