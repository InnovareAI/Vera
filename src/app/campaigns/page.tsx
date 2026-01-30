'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWorkspace } from '@/contexts/AuthContext'
import { CampaignSetup } from '@/components/campaigns/CampaignSetup'
import { CampaignOutput } from '@/components/campaigns/CampaignOutput'
import { CampaignSidebar } from '@/components/campaigns/CampaignSidebar'
import { ContentReview } from '@/components/content-engine/ContentReview'

export interface CampaignConfig {
    // Brand Info
    brandName: string
    brandDescription: string
    brandVoice: string
    brandColors: string[]
    logoUrl?: string

    // People/Personas
    targetAudience: string
    personas: string[]
    influencers: string[]

    // Tonality
    tonality: 'professional' | 'casual' | 'bold' | 'inspirational' | 'educational' | 'humorous'

    // Campaign Goals
    campaignName: string
    campaignGoal: 'awareness' | 'engagement' | 'leads' | 'sales' | 'thought_leadership'
    keyMessages: string[]
    callToAction: string

    // Platforms
    platforms: ('linkedin' | 'twitter' | 'medium' | 'instagram')[]
    selectedStyles?: Record<string, string>

    // Content format per platform (story vs feed post)
    contentFormats?: Record<string, 'story' | 'post'>

    // Multi-model generation settings
    enableMultiModel?: boolean
    selectedModels?: string[]

    // Voice Profile (from ToV analysis)
    voiceProfile?: {
        personality: string[]
        doList: string[]
        dontList: string[]
        keyPhrases: string[]
        avoidPhrases: string[]
        writingStyle: {
            sentenceLength: 'short' | 'medium' | 'long' | 'varied'
            formality: 'casual' | 'professional' | 'conversational' | 'formal'
            useOfEmoji: boolean
            useOfHashtags: boolean
            perspective: 'first_person' | 'second_person' | 'third_person' | 'mixed'
        }
        summary: string
    }
}

export interface ContentVariation {
    modelId: string
    modelName: string
    provider: string
    content: string
    generatedAt: string
}

export interface ImageVariation {
    modelId: string
    modelName: string
    imageUrl: string
    prompt: string
    generatedAt: string
}

export interface VideoVariation {
    modelId: string
    modelName: string
    videoUrl: string
    prompt: string
    generatedAt: string
}

export interface GeneratedContent {
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

export interface CampaignGeneration {
    id: string
    config: CampaignConfig
    contents: GeneratedContent[]
    status: 'idle' | 'generating' | 'complete' | 'error'
    progress: number
    error?: string
}

export default function CampaignsPage() {
    const { currentWorkspace, currentOrganization } = useWorkspace()
    const [activeView, setActiveView] = useState<'setup' | 'output' | 'review'>('review')
    const [generation, setGeneration] = useState<CampaignGeneration | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleStartGeneration = async (config: CampaignConfig) => {
        setIsGenerating(true)
        setActiveView('output')

        // Initialize generation state
        const newGeneration: CampaignGeneration = {
            id: `campaign-${Date.now()}`,
            config,
            contents: [],
            status: 'generating',
            progress: 0
        }
        setGeneration(newGeneration)

        try {
            const response = await fetch('/api/campaigns/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            if (!response.ok) {
                throw new Error('Generation failed')
            }

            // Handle streaming response
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
                throw new Error('No response body')
            }

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6))

                        if (data.type === 'progress') {
                            setGeneration(prev => prev ? {
                                ...prev,
                                progress: data.progress,
                                contents: data.contents || prev.contents
                            } : null)
                        } else if (data.type === 'content') {
                            setGeneration(prev => prev ? {
                                ...prev,
                                contents: [...prev.contents, data.content]
                            } : null)
                        } else if (data.type === 'complete') {
                            setGeneration(prev => prev ? {
                                ...prev,
                                status: 'complete',
                                progress: 100,
                                contents: data.contents
                            } : null)
                        } else if (data.type === 'error') {
                            throw new Error(data.message)
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        } catch (error) {
            setGeneration(prev => prev ? {
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            } : null)
        } finally {
            setIsGenerating(false)
        }
    }

    const getViewTitle = () => {
        switch (activeView) {
            case 'setup': return '🎯 Campaign Setup'
            case 'output': return '✨ Generated Campaign'
            case 'review': return '📋 Content Review'
        }
    }

    const getViewDescription = () => {
        switch (activeView) {
            case 'setup': return 'Define your brand, audience, and campaign goals'
            case 'output': return 'Review and export your generated content'
            case 'review': return 'Review, edit, approve or dismiss your generated posts'
        }
    }

    return (
        <div className="min-h-screen flex bg-[#0a0a0f]">
            <CampaignSidebar
                activeView={activeView}
                onViewChange={(view) => setActiveView(view as 'setup' | 'output' | 'review')}
                hasGeneration={!!generation}
            />

            <main className="flex-1 overflow-hidden flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-800/50 px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">
                                    ← Dashboard
                                </Link>
                                {currentWorkspace && (
                                    <span className="text-gray-600">|</span>
                                )}
                                {currentWorkspace && (
                                    <span className="text-violet-400 text-sm font-medium">
                                        {currentWorkspace.name}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold text-white">
                                {getViewTitle()}
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {getViewDescription()}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {/* View Tabs */}
                            <div className="flex bg-gray-900 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveView('review')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'review'
                                        ? 'bg-violet-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    📋 Review Posts
                                </button>
                                <button
                                    onClick={() => setActiveView('setup')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'setup'
                                        ? 'bg-violet-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    🎯 New Campaign
                                </button>
                                {generation && (
                                    <button
                                        onClick={() => setActiveView('output')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'output'
                                            ? 'bg-violet-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        ✨ Output
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden">
                    {activeView === 'setup' && (
                        <div className="p-8 overflow-auto h-full">
                            <CampaignSetup
                                onGenerate={handleStartGeneration}
                                isGenerating={isGenerating}
                            />
                        </div>
                    )}
                    {activeView === 'output' && (
                        <div className="p-8 overflow-auto h-full">
                            <CampaignOutput
                                generation={generation}
                                isGenerating={isGenerating}
                            />
                        </div>
                    )}
                    {activeView === 'review' && (
                        <ContentReview workspaceId={currentWorkspace?.id} />
                    )}
                </div>
            </main>
        </div>
    )
}
