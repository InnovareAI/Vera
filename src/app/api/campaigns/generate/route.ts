import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildPrompt, getModelForContentType, getPlatformConfig, getParallelModels, ContentVariation, ModelConfig, PARALLEL_IMAGE_MODELS, ImageModelConfig, ImageVariation, PARALLEL_VIDEO_MODELS, VideoModelConfig, VideoVariation, getParallelVideoModels } from '@/lib/platform-prompts'

export const dynamic = 'force-dynamic'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

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
    selectedStyles?: Record<string, string>
    // Content format per platform (story vs feed post)
    contentFormats?: Record<string, 'story' | 'post'>
    // Multi-model generation settings
    enableMultiModel?: boolean
    selectedModels?: string[]  // Model IDs to use for parallel generation
    // Voice profile from ToV analysis
    voiceProfile?: {
        personality: string[]
        doList: string[]
        dontList: string[]
        keyPhrases: string[]
        avoidPhrases: string[]
        writingStyle: {
            sentenceLength: string
            formality: string
            useOfEmoji: boolean
            useOfHashtags: boolean
            perspective: string
        }
        summary: string
    }
}

interface GeneratedContent {
    platform: string
    type: 'text' | 'image' | 'video'
    content: string
    mediaUrl?: string
    caption?: string
    hashtags?: string[]
    status: 'generating' | 'complete' | 'error'
    // Multi-model variations (text)
    variations?: ContentVariation[]
    selectedVariationIndex?: number
    // Multi-model variations (images)
    imageVariations?: ImageVariation[]
    selectedImageIndex?: number
    // Multi-model variations (videos)
    videoVariations?: VideoVariation[]
    selectedVideoIndex?: number
}

// Platform content specifications
const platformSpecs: Record<string, { textLimit: number; outputs: string[] }> = {
    linkedin: { textLimit: 3000, outputs: ['text', 'image', 'video'] },
    twitter: { textLimit: 280, outputs: ['text', 'image', 'video'] },
    medium: { textLimit: 5000, outputs: ['text', 'image'] },
    instagram: { textLimit: 2200, outputs: ['text', 'image', 'video'] }
}

// OpenRouter API call for text generation
async function generateText(prompt: string, systemPrompt: string, model: string = 'anthropic/claude-3.5-haiku'): Promise<string> {
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
            model: model,
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

// Multi-model parallel generation - calls multiple models simultaneously
async function generateTextMultiModel(
    prompt: string,
    systemPrompt: string,
    models: ModelConfig[]
): Promise<ContentVariation[]> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY not configured')
    }

    // Call all models in parallel
    const promises = models.map(async (model): Promise<ContentVariation> => {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://vera.innovare.ai',
                    'X-Title': 'VERA Campaign Generator'
                },
                body: JSON.stringify({
                    model: model.id,
                    max_tokens: 2048,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ]
                })
            })

            if (!response.ok) {
                const error = await response.text()
                console.error(`Model ${model.id} failed:`, error)
                return {
                    modelId: model.id,
                    modelName: model.name,
                    provider: model.provider,
                    content: `[Generation failed for ${model.name}]`,
                    generatedAt: new Date().toISOString()
                }
            }

            const data = await response.json()
            return {
                modelId: model.id,
                modelName: model.name,
                provider: model.provider,
                content: data.choices?.[0]?.message?.content || '',
                generatedAt: new Date().toISOString()
            }
        } catch (error) {
            console.error(`Model ${model.id} error:`, error)
            return {
                modelId: model.id,
                modelName: model.name,
                provider: model.provider,
                content: `[Generation failed for ${model.name}]`,
                generatedAt: new Date().toISOString()
            }
        }
    })

    return Promise.all(promises)
}

// FAL.AI API call for image generation
async function generateImage(prompt: string, format: 'story' | 'post' = 'post'): Promise<string> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    // Determine image size based on format
    const imageSize = format === 'story' ? 'portrait_9_16' : 'landscape_16_9'
    const placeholderSize = format === 'story' ? '630x1120' : '1200x630'

    if (!FAL_API_KEY) {
        // Return a placeholder if FAL is not configured
        console.warn('FAL_API_KEY not configured, using placeholder')
        return `https://placehold.co/${placeholderSize}/6366f1/ffffff?text=${encodeURIComponent('Generated Image')}`
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
                image_size: imageSize,
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

// Multi-model image generation - calls multiple FAL.AI models in parallel
async function generateImageMultiModel(
    prompt: string,
    models: ImageModelConfig[],
    format: 'story' | 'post' = 'post'
): Promise<ImageVariation[]> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    // Determine image size based on format
    const imageSize = format === 'story' ? 'portrait_9_16' : 'landscape_16_9'

    if (!FAL_API_KEY) {
        console.warn('FAL_API_KEY not configured')
        return []
    }

    const generateWithModel = async (model: ImageModelConfig): Promise<ImageVariation> => {
        try {
            const response = await fetch(`https://queue.fal.run/${model.endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Key ${FAL_API_KEY}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    image_size: imageSize,
                    num_images: 1,
                    enable_safety_checker: true,
                    safety_tolerance: '2'
                })
            })

            if (!response.ok) {
                console.error(`Image model ${model.id} failed`)
                return {
                    modelId: model.id,
                    modelName: model.name,
                    imageUrl: `https://placehold.co/1200x630/ef4444/ffffff?text=${encodeURIComponent(`${model.name} Failed`)}`,
                    prompt,
                    generatedAt: new Date().toISOString()
                }
            }

            const data = await response.json()

            // Handle queue response
            if (data.request_id) {
                const resultUrl = `https://queue.fal.run/${model.endpoint}/requests/${data.request_id}`
                let attempts = 0
                while (attempts < 30) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    const statusResponse = await fetch(resultUrl, {
                        headers: { 'Authorization': `Key ${FAL_API_KEY}` }
                    })
                    const statusData = await statusResponse.json()

                    if (statusData.status === 'COMPLETED' && statusData.images?.[0]?.url) {
                        return {
                            modelId: model.id,
                            modelName: model.name,
                            imageUrl: statusData.images[0].url,
                            prompt,
                            generatedAt: new Date().toISOString()
                        }
                    }
                    if (statusData.status === 'FAILED') {
                        throw new Error('Generation failed')
                    }
                    attempts++
                }
            }

            // Direct response
            if (data.images?.[0]?.url) {
                return {
                    modelId: model.id,
                    modelName: model.name,
                    imageUrl: data.images[0].url,
                    prompt,
                    generatedAt: new Date().toISOString()
                }
            }

            throw new Error('No image URL in response')
        } catch (error) {
            console.error(`Image model ${model.id} error:`, error)
            return {
                modelId: model.id,
                modelName: model.name,
                imageUrl: `https://placehold.co/1200x630/ef4444/ffffff?text=${encodeURIComponent(`${model.name} Error`)}`,
                prompt,
                generatedAt: new Date().toISOString()
            }
        }
    }

    // Call all models in parallel
    return Promise.all(models.map(generateWithModel))
}

// FAL.AI API call for video generation
async function generateVideo(prompt: string, format: 'story' | 'post' = 'post'): Promise<string> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    // Determine aspect ratio based on format
    const aspectRatio = format === 'story' ? '9:16' : '16:9'

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
                aspect_ratio: aspectRatio
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

// Multi-model video generation - calls multiple FAL.AI video models in parallel
async function generateVideoMultiModel(
    prompt: string,
    models: VideoModelConfig[],
    format: 'story' | 'post' = 'post'
): Promise<VideoVariation[]> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    // Determine aspect ratio based on format
    const aspectRatio = format === 'story' ? '9:16' : '16:9'

    if (!FAL_API_KEY) {
        console.warn('FAL_API_KEY not configured')
        return []
    }

    const generateWithModel = async (model: VideoModelConfig): Promise<VideoVariation> => {
        try {
            // Determine duration based on model
            const duration = model.duration?.replace('s', '') || '5'

            const response = await fetch(`https://queue.fal.run/${model.endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Key ${FAL_API_KEY}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    duration: duration,
                    aspect_ratio: aspectRatio
                })
            })

            if (!response.ok) {
                console.error(`Video model ${model.id} failed`)
                return {
                    modelId: model.id,
                    modelName: model.name,
                    videoUrl: '',
                    prompt,
                    generatedAt: new Date().toISOString()
                }
            }

            const data = await response.json()

            // Handle queue response
            if (data.request_id) {
                const resultUrl = `https://queue.fal.run/${model.endpoint}/requests/${data.request_id}`
                let attempts = 0
                while (attempts < 60) { // Videos take longer
                    await new Promise(resolve => setTimeout(resolve, 3000))
                    const statusResponse = await fetch(resultUrl, {
                        headers: { 'Authorization': `Key ${FAL_API_KEY}` }
                    })
                    const statusData = await statusResponse.json()

                    if (statusData.status === 'COMPLETED' && statusData.video?.url) {
                        return {
                            modelId: model.id,
                            modelName: model.name,
                            videoUrl: statusData.video.url,
                            prompt,
                            generatedAt: new Date().toISOString()
                        }
                    }
                    if (statusData.status === 'FAILED') {
                        throw new Error('Generation failed')
                    }
                    attempts++
                }
            }

            // Direct response
            if (data.video?.url) {
                return {
                    modelId: model.id,
                    modelName: model.name,
                    videoUrl: data.video.url,
                    prompt,
                    generatedAt: new Date().toISOString()
                }
            }

            throw new Error('No video URL in response')
        } catch (error) {
            console.error(`Video model ${model.id} error:`, error)
            return {
                modelId: model.id,
                modelName: model.name,
                videoUrl: '',
                prompt,
                generatedAt: new Date().toISOString()
            }
        }
    }

    // Call all models in parallel
    return Promise.all(models.map(generateWithModel))
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

    // Voice profile for injection into platform prompts
    const voiceProfile = config.voiceProfile ? {
        personality: config.voiceProfile.personality,
        doList: config.voiceProfile.doList,
        dontList: config.voiceProfile.dontList,
        keyPhrases: config.voiceProfile.keyPhrases,
        avoidPhrases: config.voiceProfile.avoidPhrases,
        writingStyle: {
            sentenceLength: config.voiceProfile.writingStyle.sentenceLength,
            formality: config.voiceProfile.writingStyle.formality,
            useOfEmoji: config.voiceProfile.writingStyle.useOfEmoji,
            useOfHashtags: config.voiceProfile.writingStyle.useOfHashtags,
            perspective: config.voiceProfile.writingStyle.perspective
        },
        summary: config.voiceProfile.summary
    } : undefined

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

        // Get platform config
        const platformConfig = getPlatformConfig(platform)

        // Check for custom prompt override from database
        const styleId = config.selectedStyles?.[platform]
        let customPromptOverride: string | null = null
        let customModel: string | null = null

        if (styleId) {
            try {
                const { data: customPrompt } = await getSupabase()
                    .from('prompts')
                    .select('system_prompt, preferred_model_id')
                    .eq('id', styleId)
                    .single()

                if (customPrompt) {
                    customPromptOverride = customPrompt.system_prompt
                    customModel = customPrompt.preferred_model_id
                }
            } catch (error) {
                console.error('Error fetching custom prompt:', error)
            }
        }

        // Get content format for this platform (story vs post)
        const contentFormat = config.contentFormats?.[platform] || 'post'

        // 1. Generate text content (with optional multi-model)
        await sendEvent({
            type: 'progress',
            progress: Math.round((completedItems / totalItems) * 100),
            message: config.enableMultiModel
                ? `Generating ${platform} text from multiple models...`
                : `Generating ${platform} text content...`
        })

        try {
            // Build the unified prompt with voice profile and brand context
            const fullPrompt = customPromptOverride || buildPrompt(platform, brandContext, voiceProfile)

            // Select model based on content type (longform for blog/newsletter, text for others)
            const contentType = ['medium', 'newsletter'].includes(platform) ? 'longform' : 'text'

            // Minimal system prompt - the full instructions are in the user prompt
            const systemPrompt = 'You are an expert content creator. Follow all instructions precisely. Output only the requested content - no explanations, no meta-commentary.'

            let textContent: string
            let variations: ContentVariation[] | undefined

            // Multi-model generation if enabled
            if (config.enableMultiModel) {
                // Get models to use - either user-selected or defaults
                let modelsToUse = getParallelModels(contentType)

                // Filter to user-selected models if specified
                if (config.selectedModels && config.selectedModels.length > 0) {
                    modelsToUse = modelsToUse.filter(m => config.selectedModels!.includes(m.id))
                    // If none match, fall back to defaults
                    if (modelsToUse.length === 0) {
                        modelsToUse = getParallelModels(contentType)
                    }
                }

                // Generate from all models in parallel
                variations = await generateTextMultiModel(fullPrompt, systemPrompt, modelsToUse)

                // Use first successful variation as default content
                const firstSuccess = variations.find(v => !v.content.startsWith('[Generation failed'))
                textContent = firstSuccess?.content || variations[0]?.content || ''
            } else {
                // Single model generation (original behavior)
                const model = customModel || getModelForContentType(contentType)
                textContent = await generateText(fullPrompt, systemPrompt, model)
            }

            const hashtags = extractHashtags(textContent)

            const textItem: GeneratedContent = {
                platform,
                type: 'text',
                content: textContent,
                hashtags,
                status: 'complete',
                variations,
                selectedVariationIndex: variations ? 0 : undefined
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

        // 2. Generate image content (with optional multi-model)
        if (spec.outputs.includes('image')) {
            await sendEvent({
                type: 'progress',
                progress: Math.round((completedItems / totalItems) * 100),
                message: config.enableMultiModel
                    ? `Generating ${platform} images from multiple models...`
                    : `Generating ${platform} image...`
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

                const imagePrompt = await generateText(
                    imagePromptRequest,
                    'You are an expert at writing prompts for AI image generation. Write detailed, visual prompts that result in stunning marketing images. Never include text in images.',
                    getModelForContentType('image_prompt')
                )

                let imageUrl: string
                let imageVariations: ImageVariation[] | undefined

                // Multi-model image generation if enabled
                if (config.enableMultiModel) {
                    // Generate from multiple image models in parallel
                    imageVariations = await generateImageMultiModel(imagePrompt.slice(0, 500), PARALLEL_IMAGE_MODELS, contentFormat)

                    // Use first successful image as default
                    const firstSuccess = imageVariations.find(v => !v.imageUrl.includes('placehold.co'))
                    imageUrl = firstSuccess?.imageUrl || imageVariations[0]?.imageUrl || ''
                } else {
                    imageUrl = await generateImage(imagePrompt.slice(0, 500), contentFormat)
                }

                // Generate caption using platform voice
                const captionPrompt = `Write a short, engaging caption for an image being posted on ${platform}.
${brandContext}
Keep it under 150 characters. Match the platform's tone and include a call to action.`

                const caption = await generateText(
                    captionPrompt,
                    buildPrompt(platform, '', voiceProfile),
                    getModelForContentType('caption')
                )

                const imageItem: GeneratedContent = {
                    platform,
                    type: 'image',
                    content: imagePrompt.slice(0, 500),
                    mediaUrl: imageUrl,
                    caption: caption.slice(0, 200),
                    status: 'complete',
                    imageVariations,
                    selectedImageIndex: imageVariations ? 0 : undefined
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
                message: config.enableMultiModel
                    ? `Generating ${platform} videos from multiple models...`
                    : `Generating ${platform} video...`
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

                const videoPrompt = await generateText(
                    videoPromptRequest,
                    'You are an expert at writing prompts for AI video generation. Write prompts that result in dynamic, engaging short-form marketing videos.',
                    getModelForContentType('video_prompt')
                )

                let videoUrl: string
                let videoVariations: VideoVariation[] | undefined

                // Multi-model video generation if enabled
                if (config.enableMultiModel) {
                    // Generate from multiple video models in parallel (limited to 2)
                    videoVariations = await generateVideoMultiModel(videoPrompt.slice(0, 300), getParallelVideoModels(), contentFormat)

                    // Use first successful video as default
                    const firstSuccess = videoVariations.find(v => v.videoUrl && v.videoUrl !== '')
                    videoUrl = firstSuccess?.videoUrl || ''
                } else {
                    videoUrl = await generateVideo(videoPrompt.slice(0, 300), contentFormat)
                }

                // Generate caption using platform voice
                const captionPrompt = `Write a short, engaging caption for a video being posted on ${platform}.
${brandContext}
Keep it under 100 characters. Match the platform's tone and include a call to action.`

                const caption = await generateText(
                    captionPrompt,
                    buildPrompt(platform, '', voiceProfile),
                    getModelForContentType('caption')
                )

                // Check if we have at least one video (either single or from variations)
                const hasVideo = videoUrl || (videoVariations && videoVariations.some(v => v.videoUrl))

                if (hasVideo) {
                    const videoItem: GeneratedContent = {
                        platform,
                        type: 'video',
                        content: videoPrompt.slice(0, 300),
                        mediaUrl: videoUrl,
                        caption: caption.slice(0, 150),
                        status: 'complete',
                        videoVariations,
                        selectedVideoIndex: videoVariations ? 0 : undefined
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
