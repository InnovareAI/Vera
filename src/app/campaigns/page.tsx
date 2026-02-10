'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWorkspace } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import { CampaignSetup } from '@/components/campaigns/CampaignSetup'
import { CampaignOutput } from '@/components/campaigns/CampaignOutput'
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
    const { currentWorkspace, currentOrganization, currentProject } = useWorkspace()
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

    const { profile } = useAuth()

    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
            {/* Top Navigation - matches dashboard */}
            <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                                <span className="text-xl font-black text-white italic">V</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-white">VERA</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {[
                                { label: 'Dashboard', href: '/dashboard' },
                                { label: 'Projects', href: '/projects' },
                                { label: 'Settings', href: '/settings' },
                            ].map((item) => (
                                <Link key={item.label} href={item.href} className="px-4 py-2 text-sm font-medium rounded-lg transition-all text-gray-400 hover:text-white hover:bg-white/5">
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {currentProject && (
                            <Link href={`/projects/${currentProject.id}`} className="px-3 py-1.5 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full border border-violet-500/20 hover:bg-violet-500/20 transition-colors">
                                {currentProject.name}
                            </Link>
                        )}
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center border-2 border-white/10">
                            <span className="font-bold">{(profile?.full_name || 'V')[0].toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Header with View Tabs */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">{getViewTitle()}</h1>
                        <p className="text-gray-500 text-sm mt-1">{getViewDescription()}</p>
                    </div>
                    <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-800">
                        <button
                            onClick={() => setActiveView('review')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'review'
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            📋 Review
                        </button>
                        <button
                            onClick={() => setActiveView('setup')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'setup'
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            🎯 New Campaign
                        </button>
                        {generation && (
                            <button
                                onClick={() => setActiveView('output')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'output'
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                ✨ Output
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div>
                    {activeView === 'setup' && (
                        <CampaignSetup
                            onGenerate={handleStartGeneration}
                            isGenerating={isGenerating}
                        />
                    )}
                    {activeView === 'output' && (
                        <CampaignOutput
                            generation={generation}
                            isGenerating={isGenerating}
                        />
                    )}
                    {activeView === 'review' && (
                        <ContentReview workspaceId={currentWorkspace?.id} />
                    )}
                </div>
            </main>
        </div>
    )
}
