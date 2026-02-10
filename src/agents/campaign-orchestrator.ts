import Anthropic from '@anthropic-ai/sdk'

// Campaign configuration type
export interface CampaignConfig {
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

export interface GeneratedContent {
    platform: string
    type: 'text' | 'image' | 'video'
    content: string
    mediaUrl?: string
    caption?: string
    hashtags?: string[]
    status: 'generating' | 'complete' | 'error'
}

// Tool definitions for Claude
const campaignTools: Anthropic.Tool[] = [
    {
        name: 'generate_social_post',
        description: 'Generate a social media post for a specific platform with appropriate length and formatting',
        input_schema: {
            type: 'object',
            properties: {
                platform: {
                    type: 'string',
                    enum: ['linkedin', 'twitter', 'medium', 'instagram'],
                    description: 'The social media platform to generate content for'
                },
                content_type: {
                    type: 'string',
                    enum: ['post', 'thread', 'article', 'caption'],
                    description: 'Type of content to generate'
                },
                key_message: {
                    type: 'string',
                    description: 'The main message or theme for this post'
                },
                include_hashtags: {
                    type: 'boolean',
                    description: 'Whether to include hashtags'
                }
            },
            required: ['platform', 'content_type', 'key_message']
        }
    },
    {
        name: 'generate_image_prompt',
        description: 'Create a detailed image generation prompt for marketing visuals',
        input_schema: {
            type: 'object',
            properties: {
                platform: {
                    type: 'string',
                    enum: ['linkedin', 'twitter', 'medium', 'instagram'],
                    description: 'The platform this image will be used on'
                },
                style: {
                    type: 'string',
                    description: 'Visual style (e.g., professional, vibrant, minimalist)'
                },
                subject: {
                    type: 'string',
                    description: 'What the image should depict'
                },
                brand_colors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Brand colors to incorporate'
                }
            },
            required: ['platform', 'style', 'subject']
        }
    },
    {
        name: 'generate_video_prompt',
        description: 'Create a detailed video generation prompt for short-form marketing videos',
        input_schema: {
            type: 'object',
            properties: {
                platform: {
                    type: 'string',
                    enum: ['linkedin', 'twitter', 'instagram'],
                    description: 'The platform this video will be used on'
                },
                duration: {
                    type: 'number',
                    description: 'Video duration in seconds (5-15)'
                },
                motion_type: {
                    type: 'string',
                    description: 'Type of motion (e.g., zoom, pan, dynamic transitions)'
                },
                subject: {
                    type: 'string',
                    description: 'What the video should show'
                }
            },
            required: ['platform', 'duration', 'subject']
        }
    },
    {
        name: 'finalize_campaign',
        description: 'Mark the campaign generation as complete and summarize results',
        input_schema: {
            type: 'object',
            properties: {
                summary: {
                    type: 'string',
                    description: 'Brief summary of what was generated'
                },
                recommendations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Posting recommendations for best engagement'
                }
            },
            required: ['summary']
        }
    }
]

// FAL.AI image generation
async function generateFalImage(prompt: string): Promise<string> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    if (!FAL_API_KEY) {
        console.warn('FAL_API_KEY not configured')
        return `https://placehold.co/1200x630/6366f1/ffffff?text=${encodeURIComponent('Image Placeholder')}`
    }

    try {
        const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                image_size: 'landscape_16_9',
                num_images: 1,
                enable_safety_checker: true
            })
        })

        if (!response.ok) {
            throw new Error(`FAL API error: ${response.statusText}`)
        }

        const data = await response.json()
        return data.images?.[0]?.url || `https://placehold.co/1200x630/6366f1/ffffff?text=${encodeURIComponent('Generated')}`
    } catch (error) {
        console.error('FAL image error:', error)
        return `https://placehold.co/1200x630/6366f1/ffffff?text=${encodeURIComponent('Error')}`
    }
}

// FAL.AI video generation
async function generateFalVideo(prompt: string, duration: number = 5): Promise<string> {
    const FAL_API_KEY = process.env.FAL_API_KEY

    if (!FAL_API_KEY) {
        console.warn('FAL_API_KEY not configured, skipping video')
        return ''
    }

    try {
        const response = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                duration: String(Math.min(duration, 10)),
                aspect_ratio: '16:9'
            })
        })

        if (!response.ok) {
            throw new Error(`FAL Video API error: ${response.statusText}`)
        }

        const data = await response.json()

        // Handle async queue
        if (data.request_id) {
            // Poll for completion (simplified - in production use webhooks)
            const statusUrl = `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${data.request_id}`
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 3000))
                const statusResp = await fetch(statusUrl, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` }
                })
                const status = await statusResp.json()
                if (status.status === 'COMPLETED') {
                    return status.video?.url || ''
                }
                if (status.status === 'FAILED') {
                    throw new Error('Video generation failed')
                }
            }
        }

        return data.video?.url || ''
    } catch (error) {
        console.error('FAL video error:', error)
        return ''
    }
}

// OpenRouter text generation (fallback/supplementary)
async function generateWithOpenRouter(prompt: string, systemPrompt: string): Promise<string> {
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
            'X-Title': 'Vera.AI Campaign Generator'
        },
        body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        })
    })

    if (!response.ok) {
        throw new Error(`OpenRouter error: ${await response.text()}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
}

export class CampaignOrchestrator {
    private client: Anthropic
    private config: CampaignConfig
    private contents: GeneratedContent[] = []
    private onProgress?: (progress: number, message: string, content?: GeneratedContent) => void

    constructor(config: CampaignConfig, onProgress?: (progress: number, message: string, content?: GeneratedContent) => void) {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured')
        }
        this.client = new Anthropic({ apiKey })
        this.config = config
        this.onProgress = onProgress
    }

    private buildSystemPrompt(): string {
        return `You are an expert marketing campaign generator. Your job is to create comprehensive, multi-platform marketing campaigns.

BRAND CONTEXT:
- Brand: ${this.config.brandName}
- Description: ${this.config.brandDescription}
- Voice: ${this.config.brandVoice}
- Colors: ${this.config.brandColors?.join(', ') || 'Use professional colors'}

AUDIENCE:
- Target: ${this.config.targetAudience}
- Personas: ${this.config.personas?.join(', ') || 'General B2B audience'}
- Influencer Style Reference: ${this.config.influencers?.join(', ') || 'Professional thought leaders'}

CAMPAIGN:
- Name: ${this.config.campaignName}
- Goal: ${this.config.campaignGoal}
- Tone: ${this.config.tonality}
- Key Messages: ${this.config.keyMessages?.join('; ') || 'Core brand value proposition'}
- Call to Action: ${this.config.callToAction}

PLATFORMS TO GENERATE FOR: ${this.config.platforms.join(', ')}

Generate content for EACH platform including:
1. Text post (with hashtags)
2. Image (generate a detailed prompt)
3. Video (for platforms that support it: generate a prompt for a 5-second motion video)

Use the tools provided to generate each piece of content. Be thorough and creative.
Always match the brand voice and tone. Make content feel authentic, not generic.`
    }

    async orchestrate(): Promise<GeneratedContent[]> {
        const systemPrompt = this.buildSystemPrompt()

        let messages: Anthropic.MessageParam[] = [
            {
                role: 'user',
                content: `Generate a complete marketing campaign for ${this.config.brandName}. 
        
Target platforms: ${this.config.platforms.join(', ')}

For EACH platform, create:
1. A compelling text post (use generate_social_post tool)
2. An image prompt (use generate_image_prompt tool)
3. A video prompt for platforms that support short videos (use generate_video_prompt tool)

Start generating now. Use one tool at a time and I'll provide results.`
            }
        ]

        let totalExpectedItems = this.config.platforms.length * 3 // text + image + video per platform
        let completedItems = 0

        // Agentic loop
        while (true) {
            this.onProgress?.(
                Math.round((completedItems / totalExpectedItems) * 100),
                'Thinking about next content piece...'
            )

            const response = await this.client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                tools: campaignTools,
                messages
            })

            // Check for tool use
            const toolUseBlocks = response.content.filter(
                (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
            )

            if (toolUseBlocks.length === 0) {
                // No more tool calls - check if we're done
                if (response.stop_reason === 'end_turn') {
                    break
                }
                // Add response and continue
                messages.push({ role: 'assistant', content: response.content })
                messages.push({
                    role: 'user',
                    content: 'Continue generating content for the remaining platforms and content types.'
                })
                continue
            }

            // Process tool calls
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const toolUse of toolUseBlocks) {
                const input = toolUse.input as Record<string, unknown>
                let result: string
                let content: GeneratedContent | undefined

                try {
                    switch (toolUse.name) {
                        case 'generate_social_post': {
                            const platform = input.platform as string
                            const contentType = input.content_type as string
                            const keyMessage = input.key_message as string

                            this.onProgress?.(
                                Math.round((completedItems / totalExpectedItems) * 100),
                                `Generating ${platform} ${contentType}...`
                            )

                            // Use OpenRouter for actual text generation
                            const postPrompt = `Write a ${this.config.tonality} ${platform} ${contentType} about: ${keyMessage}
              
Requirements:
- Platform: ${platform}
- Type: ${contentType}
- Tone: ${this.config.tonality}
- Include call to action: ${this.config.callToAction}
- ${input.include_hashtags ? 'Include 3-5 relevant hashtags' : 'No hashtags'}
- Character limit: ${platform === 'twitter' ? '280 per tweet' : platform === 'linkedin' ? '3000' : '2200'}

Write the complete, ready-to-publish content now.`

                            const postContent = await generateWithOpenRouter(
                                postPrompt,
                                `You are a ${this.config.tonality} social media copywriter for ${this.config.brandName}.`
                            )

                            content = {
                                platform,
                                type: 'text',
                                content: postContent,
                                hashtags: postContent.match(/#\w+/g)?.map(t => t.slice(1)) || [],
                                status: 'complete'
                            }
                            this.contents.push(content)
                            completedItems++
                            result = `Generated ${platform} ${contentType} successfully.`
                            break
                        }

                        case 'generate_image_prompt': {
                            const platform = input.platform as string
                            const style = input.style as string
                            const subject = input.subject as string

                            this.onProgress?.(
                                Math.round((completedItems / totalExpectedItems) * 100),
                                `Generating ${platform} image...`
                            )

                            const imagePrompt = `${style} marketing image: ${subject}. 
Brand colors: ${this.config.brandColors?.join(', ')}.
Professional, high-quality, suitable for ${platform}.
Modern design, no text overlays.`

                            const imageUrl = await generateFalImage(imagePrompt)

                            content = {
                                platform,
                                type: 'image',
                                content: imagePrompt,
                                mediaUrl: imageUrl,
                                caption: subject,
                                status: 'complete'
                            }
                            this.contents.push(content)
                            completedItems++
                            result = `Generated ${platform} image successfully.`
                            break
                        }

                        case 'generate_video_prompt': {
                            const platform = input.platform as string
                            const duration = (input.duration as number) || 5
                            const subject = input.subject as string
                            const motionType = input.motion_type as string || 'dynamic'

                            this.onProgress?.(
                                Math.round((completedItems / totalExpectedItems) * 100),
                                `Generating ${platform} video (this may take a minute)...`
                            )

                            const videoPrompt = `${motionType} ${duration}-second marketing video: ${subject}. 
Professional, modern, eye-catching motion graphics suitable for ${platform} ads.
Brand colors: ${this.config.brandColors?.join(', ')}.`

                            const videoUrl = await generateFalVideo(videoPrompt, duration)

                            if (videoUrl) {
                                content = {
                                    platform,
                                    type: 'video',
                                    content: videoPrompt,
                                    mediaUrl: videoUrl,
                                    caption: subject,
                                    status: 'complete'
                                }
                                this.contents.push(content)
                            }
                            completedItems++
                            result = videoUrl
                                ? `Generated ${platform} video successfully.`
                                : `Video generation skipped (FAL.AI not configured or failed).`
                            break
                        }

                        case 'finalize_campaign': {
                            const summary = input.summary as string
                            result = `Campaign finalized: ${summary}`
                            break
                        }

                        default:
                            result = 'Unknown tool'
                    }
                } catch (error) {
                    console.error(`Tool ${toolUse.name} error:`, error)
                    result = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }

                // Report progress with content
                if (content) {
                    this.onProgress?.(
                        Math.round((completedItems / totalExpectedItems) * 100),
                        `Completed ${content.platform} ${content.type}`,
                        content
                    )
                }

                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: result
                })
            }

            // Add assistant response and tool results to messages
            messages.push({ role: 'assistant', content: response.content })
            messages.push({ role: 'user', content: toolResults })

            // Check if we should stop
            if (response.stop_reason === 'end_turn') {
                break
            }
        }

        this.onProgress?.(100, 'Campaign generation complete!')
        return this.contents
    }
}
