'use client'

import { useState } from 'react'
import { CampaignSetup } from '@/components/campaigns/CampaignSetup'
import { CampaignOutput } from '@/components/campaigns/CampaignOutput'
import { CampaignSidebar } from '@/components/campaigns/CampaignSidebar'

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

export interface CampaignGeneration {
    id: string
    config: CampaignConfig
    contents: GeneratedContent[]
    status: 'idle' | 'generating' | 'complete' | 'error'
    progress: number
    error?: string
}

export default function CampaignsPage() {
    const [activeView, setActiveView] = useState<'setup' | 'output'>('setup')
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

    return (
        <div className="min-h-screen flex bg-[#0a0a0f]">
            <CampaignSidebar
                activeView={activeView}
                onViewChange={setActiveView}
                hasGeneration={!!generation}
            />

            <main className="flex-1 overflow-auto">
                {/* Header */}
                <header className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-800/50 px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {activeView === 'setup' ? '🎯 Campaign Setup' : '✨ Generated Campaign'}
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {activeView === 'setup'
                                    ? 'Define your brand, audience, and campaign goals'
                                    : 'Review and export your generated content'
                                }
                            </p>
                        </div>
                        {generation && activeView === 'output' && (
                            <button
                                onClick={() => setActiveView('setup')}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                            >
                                ← Back to Setup
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-8">
                    {activeView === 'setup' ? (
                        <CampaignSetup
                            onGenerate={handleStartGeneration}
                            isGenerating={isGenerating}
                        />
                    ) : (
                        <CampaignOutput
                            generation={generation}
                            isGenerating={isGenerating}
                        />
                    )}
                </div>
            </main>
        </div>
    )
}
