import { NextRequest, NextResponse } from 'next/server'

// Campaign configuration type
interface CampaignConfig {
    brandName: string
    brandDescription: string
    brandVoice: string
    brandColors: string[]
    logoUrl?: string
    targetAudience: string
    personas: string[]
    influencers: string[]
    tonality: string
    campaignName: string
    campaignGoal: string
    keyMessages: string[]
    callToAction: string
    platforms: string[]
}

interface GeneratedContent {
    platform: string
    type: 'text' | 'image' | 'video'
    content: string
    mediaUrl?: string
    caption?: string
    hashtags?: string[]
    status: 'generating' | 'complete' | 'error'
}

// Platform content specifications
const platformSpecs: Record<string, { textLimit: number; outputs: string[] }> = {
    linkedin: { textLimit: 3000, outputs: ['text', 'image', 'video'] },
    twitter: { textLimit: 280, outputs: ['text', 'image', 'video'] },
    medium: { textLimit: 5000, outputs: ['text', 'image'] },
    instagram: { textLimit: 2200, outputs: ['text', 'image', 'video'] }
}

// OpenRouter API call for text generation
async function generateText(prompt: string, systemPrompt: string): Promise<string> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY not configured')
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://vera.innovare.ai',
            'X-Title': 'VERA Campaign Generator'
        },
        body: JSON.stringify({
            model: 'anthropic/claude-3.5-haiku', // Claude Haiku 4.5 - faster & cost-effective for content generation
            max_tokens: 2048,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenRouter API error: ${error}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
}

// FAL.AI API call for image generation
async function generateImage(prompt: string): Promise<string> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    if (!FAL_API_KEY) {
        // Return a placeholder if FAL is not configured
        console.warn('FAL_API_KEY not configured, using placeholder')
        return `https://placehold.co/1200x630/6366f1/ffffff?text=${encodeURIComponent('Generated Image')}`
    }

    try {
        const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                image_size: 'landscape_16_9',
                num_images: 1,
                enable_safety_checker: true,
                safety_tolerance: '2'
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('FAL API error:', error)
            return `https://placehold.co/1200x630/6366f1/ffffff?text=${encodeURIComponent('Generation Failed')}`
        }

        const data = await response.json()

        // Handle queue response
        if (data.request_id) {
            // Poll for result
            const resultUrl = `https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra/requests/${data.request_id}`
            let attempts = 0
            while (attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000))
                const statusResponse = await fetch(resultUrl, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` }
                })
                const statusData = await statusResponse.json()

                if (statusData.status === 'COMPLETED' && statusData.images?.[0]?.url) {
                    return statusData.images[0].url
                }
                if (statusData.status === 'FAILED') {
                    throw new Error('Image generation failed')
                }
                attempts++
            }
        }

        // Direct response
        if (data.images?.[0]?.url) {
            return data.images[0].url
        }

        return `https://placehold.co/1200x630/6366f1/ffffff?text=${encodeURIComponent('Image')}`
    } catch (error) {
        console.error('Image generation error:', error)
        return `https://placehold.co/1200x630/6366f1/ffffff?text=${encodeURIComponent('Generation Error')}`
    }
}

// FAL.AI API call for video generation
async function generateVideo(prompt: string): Promise<string> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    if (!FAL_API_KEY) {
        console.warn('FAL_API_KEY not configured, video generation skipped')
        return '' // Skip video generation if not configured
    }

    try {
        // Using Kling video model for short videos
        const response = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                duration: '5', // 5 second video
                aspect_ratio: '16:9'
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('FAL Video API error:', error)
            return ''
        }

        const data = await response.json()

        // Handle queue response
        if (data.request_id) {
            const resultUrl = `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${data.request_id}`
            let attempts = 0
            while (attempts < 60) { // Videos take longer
                await new Promise(resolve => setTimeout(resolve, 3000))
                const statusResponse = await fetch(resultUrl, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` }
                })
                const statusData = await statusResponse.json()

                if (statusData.status === 'COMPLETED' && statusData.video?.url) {
                    return statusData.video.url
                }
                if (statusData.status === 'FAILED') {
                    console.error('Video generation failed')
                    return ''
                }
                attempts++
            }
        }

        if (data.video?.url) {
            return data.video.url
        }

        return ''
    } catch (error) {
        console.error('Video generation error:', error)
        return ''
    }
}

// Extract hashtags from content
function extractHashtags(content: string): string[] {
    const matches = content.match(/#\w+/g) || []
    return matches.map(tag => tag.slice(1))
}

// Campaign content generation orchestrator
async function generateCampaignContent(
    config: CampaignConfig,
    writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<GeneratedContent[]> {
    const encoder = new TextEncoder()
    const contents: GeneratedContent[] = []

    const sendEvent = async (data: any) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    }

    // Build context for generation
    const brandContext = `
Brand: ${config.brandName}
Description: ${config.brandDescription}
Voice: ${config.brandVoice}
Target Audience: ${config.targetAudience}
${config.personas?.length ? `Personas: ${config.personas.join(', ')}` : ''}
${config.influencers?.length ? `Reference Style: ${config.influencers.join(', ')}` : ''}
Tone: ${config.tonality}
Campaign: ${config.campaignName}
Goal: ${config.campaignGoal}
Key Messages: ${config.keyMessages?.join('; ') || 'None specified'}
Call to Action: ${config.callToAction}
`

    const systemPrompt = `You are an expert social media marketing copywriter and content strategist. 
You create engaging, platform-optimized content that drives ${config.campaignGoal}.
Your tone is ${config.tonality}.
Always tailor content to the specific platform's best practices and character limits.
Include relevant hashtags where appropriate.
Never use placeholder text or [brackets] - always write complete, ready-to-publish content.`

    let totalItems = 0
    config.platforms.forEach(platform => {
        const spec = platformSpecs[platform]
        if (spec) {
            totalItems += spec.outputs.length
        }
    })

    let completedItems = 0

    // Generate content for each platform
    for (const platform of config.platforms) {
        const spec = platformSpecs[platform]
        if (!spec) continue

        // 1. Generate text content
        await sendEvent({
            type: 'progress',
            progress: Math.round((completedItems / totalItems) * 100),
            message: `Generating ${platform} text content...`
        })

        try {
            const textPrompt = `Create a compelling ${platform} post for the following campaign:
${brandContext}

Requirements:
- Maximum ${spec.textLimit} characters
- ${platform === 'twitter' ? 'Create a thread of 3-5 tweets' : 'Single engaging post'}
- Include 3-5 relevant hashtags
- End with a clear call to action: "${config.callToAction}"
- Make it ${config.tonality} in tone

Write the complete post now:`

            const textContent = await generateText(textPrompt, systemPrompt)
            const hashtags = extractHashtags(textContent)

            const textItem: GeneratedContent = {
                platform,
                type: 'text',
                content: textContent,
                hashtags,
                status: 'complete'
            }
            contents.push(textItem)
            completedItems++

            await sendEvent({
                type: 'content',
                content: textItem,
                progress: Math.round((completedItems / totalItems) * 100)
            })
        } catch (error) {
            console.error(`Text generation error for ${platform}:`, error)
            contents.push({
                platform,
                type: 'text',
                content: 'Failed to generate content',
                status: 'error'
            })
            completedItems++
        }

        // 2. Generate image content
        if (spec.outputs.includes('image')) {
            await sendEvent({
                type: 'progress',
                progress: Math.round((completedItems / totalItems) * 100),
                message: `Generating ${platform} image...`
            })

            try {
                // First generate the image prompt using AI
                const imagePromptRequest = `Create a detailed image generation prompt for a ${platform} marketing image.
${brandContext}

The image should:
- Be visually striking and professional
- Use brand colors: ${config.brandColors?.join(', ') || 'modern gradients'}
- Be suitable for ${config.campaignGoal}
- Match the ${config.tonality} tone

Output ONLY the image prompt, nothing else. Be specific about visual elements, composition, and style.`

                const imagePrompt = await generateText(imagePromptRequest,
                    'You are an expert at writing prompts for AI image generation. Write detailed, visual prompts that result in stunning marketing images. Never include text in images.')

                const imageUrl = await generateImage(imagePrompt.slice(0, 500))

                // Generate caption
                const captionPrompt = `Write a short, engaging caption for an image being posted on ${platform}.
${brandContext}
Keep it under 150 characters and include a call to action.`

                const caption = await generateText(captionPrompt, systemPrompt)

                const imageItem: GeneratedContent = {
                    platform,
                    type: 'image',
                    content: imagePrompt.slice(0, 500),
                    mediaUrl: imageUrl,
                    caption: caption.slice(0, 200),
                    status: 'complete'
                }
                contents.push(imageItem)
                completedItems++

                await sendEvent({
                    type: 'content',
                    content: imageItem,
                    progress: Math.round((completedItems / totalItems) * 100)
                })
            } catch (error) {
                console.error(`Image generation error for ${platform}:`, error)
                contents.push({
                    platform,
                    type: 'image',
                    content: 'Failed to generate image',
                    status: 'error'
                })
                completedItems++
            }
        }

        // 3. Generate video content (if supported and FAL is configured)
        if (spec.outputs.includes('video') && process.env.FAL_API_KEY) {
            await sendEvent({
                type: 'progress',
                progress: Math.round((completedItems / totalItems) * 100),
                message: `Generating ${platform} video...`
            })

            try {
                // Generate video prompt
                const videoPromptRequest = `Create a detailed prompt for a 5-second marketing video for ${platform}.
${brandContext}

The video should:
- Be eye-catching and dynamic
- Suitable for ${config.campaignGoal}
- Match the ${config.tonality} tone
- Work without sound (auto-play)

Output ONLY the video prompt, nothing else. Describe the motion, transitions, and visual elements.`

                const videoPrompt = await generateText(videoPromptRequest,
                    'You are an expert at writing prompts for AI video generation. Write prompts that result in dynamic, engaging short-form marketing videos.')

                const videoUrl = await generateVideo(videoPrompt.slice(0, 300))

                // Generate caption
                const captionPrompt = `Write a short, engaging caption for a video being posted on ${platform}.
${brandContext}
Keep it under 100 characters and include a call to action.`

                const caption = await generateText(captionPrompt, systemPrompt)

                if (videoUrl) {
                    const videoItem: GeneratedContent = {
                        platform,
                        type: 'video',
                        content: videoPrompt.slice(0, 300),
                        mediaUrl: videoUrl,
                        caption: caption.slice(0, 150),
                        status: 'complete'
                    }
                    contents.push(videoItem)
                    completedItems++

                    await sendEvent({
                        type: 'content',
                        content: videoItem,
                        progress: Math.round((completedItems / totalItems) * 100)
                    })
                } else {
                    completedItems++
                }
            } catch (error) {
                console.error(`Video generation error for ${platform}:`, error)
                completedItems++
            }
        } else if (spec.outputs.includes('video')) {
            // Skip video silently if FAL not configured
            completedItems++
        }
    }

    // Final complete event
    await sendEvent({
        type: 'complete',
        contents,
        progress: 100
    })

    return contents
}

export async function POST(request: NextRequest) {
    try {
        const config = await request.json() as CampaignConfig

        // Validate required fields
        if (!config.brandName || !config.platforms?.length) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Create streaming response
        const stream = new TransformStream()
        const writer = stream.writable.getWriter()

        // Start generation in background
        generateCampaignContent(config, writer).finally(() => {
            writer.close()
        })

        // Return streaming response
        return new NextResponse(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })
    } catch (error) {
        console.error('Campaign generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate campaign' },
            { status: 500 }
        )
    }
}
