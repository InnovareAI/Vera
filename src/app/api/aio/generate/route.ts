import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

async function generateText(prompt: string, systemPrompt: string): Promise<string> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://vera.innovare.ai',
            'X-Title': 'Vera.AI AIO Generator'
        },
        body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet', // Use Sonnet for better quality AIO
            max_tokens: 4000,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        })
    })

    if (!response.ok) throw new Error(`OpenRouter error: ${await response.text()}`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
}

async function generateImage(prompt: string): Promise<string> {
    const FAL_API_KEY = process.env.FAL_API_KEY
    if (!FAL_API_KEY) return 'https://placehold.co/1200x630/6366f1/ffffff?text=Image+Skip'

    try {
        const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_API_KEY}`
            },
            body: JSON.stringify({ prompt, image_size: 'landscape_16_9' })
        })
        const data = await response.json()

        // Wait for result if queued
        if (data.status_url) {
            let res = await fetch(data.status_url, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } })
            let status = await res.json()
            while (status.status !== 'COMPLETED' && status.status !== 'FAILED') {
                await new Promise(r => setTimeout(r, 2000))
                res = await fetch(data.status_url, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } })
                status = await res.json()
            }
            return status.images?.[0]?.url || ''
        }
        return data.images?.[0]?.url || ''
    } catch (e) {
        console.error('Image Error:', e)
        return ''
    }
}

export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    const { queries, idealAnswer, tldr, brandId } = await req.json()

    // 1. Fetch Brand Context
    const { data: brand } = await supabase.from('personas').select('*').eq('id', brandId).single()
    const brandContext = brand ? `Brand: ${brand.name}. bio: ${brand.bio}. Tonality: ${brand.attributes?.tone_tags?.join(', ')}` : 'A generic tech brand'

    // 2. Fetch AIO Prompt Template
    const { data: aioPrompt } = await supabase
        .from('prompts')
        .select('*')
        .eq('content_type', 'aio-blog')
        .eq('is_active', true)
        .limit(1)
        .single()

    if (!aioPrompt) return NextResponse.json({ error: 'AIO Prompt not found' }, { status: 404 })

    const systemPrompt = aioPrompt.system_prompt
    const userPrompt = aioPrompt.user_prompt
        .replace('{{queries}}', queries)
        .replace('{{idealAnswer}}', idealAnswer)
        .replace('{{tldr}}', tldr)
        .replace('{{brandContext}}', brandContext)

    // Setup SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }

            try {
                // Step 1: Generate Blog Content
                sendEvent({ status: 'generating_text', message: 'Generating AIO Optimized Blog Copy...' })
                const fullOutput = await generateText(userPrompt, systemPrompt)

                // Split output (Claude often puts blocks in markdown)
                const article = fullOutput.split('JSON_SCHEMA')[0].trim()
                const rest = fullOutput.split('JSON_SCHEMA')[1] || ''
                const schemaMatch = rest.match(/\{[\s\S]*\}/)
                const schema = schemaMatch ? schemaMatch[0] : '{}'
                const meta = rest.split('META_DESCRIPTION')[1]?.trim() || ''

                sendEvent({
                    status: 'text_complete',
                    content: { article, schema, meta }
                })

                // Step 2: Generate 4 Images
                sendEvent({ status: 'generating_images', message: 'Generating 4 brand-styled images...' })

                const imagePromises = [1, 2, 3, 4].map(async (i) => {
                    const imgPrompt = `A high-quality, professional marketing header image for a blog post about ${queries}. Style: clean, modern, editorial, brand colors: ${brand?.attributes?.brand_colors?.join(', ') || 'violet and cyan'}. Shot ${i} of 4.`
                    const url = await generateImage(imgPrompt)
                    return url
                })

                const images = await Promise.all(imagePromises)
                sendEvent({ status: 'images_complete', images })

                sendEvent({ status: 'complete', message: 'AIO Blog Pack generated successfully!' })
                controller.close()
            } catch (err: any) {
                sendEvent({ status: 'error', message: err.message })
                controller.close()
            }
        }
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    })
}
