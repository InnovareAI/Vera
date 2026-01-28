'use client'

import { useState } from 'react'
import { CampaignConfig } from '@/app/campaigns/page'

interface CampaignSetupProps {
    onGenerate: (config: CampaignConfig) => void
    isGenerating: boolean
}

export function CampaignSetup({ onGenerate, isGenerating }: CampaignSetupProps) {
    const [step, setStep] = useState(1)
    const [config, setConfig] = useState<Partial<CampaignConfig>>({
        brandName: '',
        brandDescription: '',
        brandVoice: '',
        brandColors: ['#6366f1', '#8b5cf6'],
        targetAudience: '',
        personas: [],
        influencers: [],
        tonality: 'professional',
        campaignName: '',
        campaignGoal: 'awareness',
        keyMessages: [],
        callToAction: '',
        platforms: ['linkedin', 'twitter']
    })

    const [personaInput, setPersonaInput] = useState('')
    const [influencerInput, setInfluencerInput] = useState('')
    const [messageInput, setMessageInput] = useState('')

    const steps = [
        { id: 1, title: 'Brand Identity', icon: '🏢' },
        { id: 2, title: 'Target Audience', icon: '👥' },
        { id: 3, title: 'Campaign Goals', icon: '🎯' },
        { id: 4, title: 'Platforms & Generate', icon: '🚀' }
    ]

    const tonalities = [
        { id: 'professional', label: 'Professional', icon: '💼', desc: 'Formal, authoritative, trustworthy' },
        { id: 'casual', label: 'Casual', icon: '😊', desc: 'Friendly, approachable, conversational' },
        { id: 'bold', label: 'Bold', icon: '🔥', desc: 'Provocative, attention-grabbing, edgy' },
        { id: 'inspirational', label: 'Inspirational', icon: '✨', desc: 'Motivating, uplifting, visionary' },
        { id: 'educational', label: 'Educational', icon: '📚', desc: 'Informative, helpful, expert' },
        { id: 'humorous', label: 'Humorous', icon: '😄', desc: 'Witty, playful, entertaining' }
    ]

    const goals = [
        { id: 'awareness', label: 'Brand Awareness', icon: '📢', desc: 'Increase visibility and reach' },
        { id: 'engagement', label: 'Engagement', icon: '💬', desc: 'Drive likes, comments, shares' },
        { id: 'leads', label: 'Lead Generation', icon: '📧', desc: 'Capture leads and contacts' },
        { id: 'sales', label: 'Sales/Conversion', icon: '💰', desc: 'Drive purchases or signups' },
        { id: 'thought_leadership', label: 'Thought Leadership', icon: '🎓', desc: 'Establish industry expertise' }
    ]

    const platforms = [
        { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0077B5', outputs: ['Text Post', 'Carousel Image', 'Short Video'] },
        { id: 'twitter', label: 'X (Twitter)', icon: '𝕏', color: '#000000', outputs: ['Tweet Thread', 'Image', 'Short Video'] },
        { id: 'medium', label: 'Medium', icon: '📝', color: '#00A86B', outputs: ['Article', 'Header Image'] },
        { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E4405F', outputs: ['Post', 'Carousel', 'Reel'] }
    ]

    const addToList = (field: 'personas' | 'influencers' | 'keyMessages', value: string, setInput: (v: string) => void) => {
        if (value.trim()) {
            setConfig(prev => ({
                ...prev,
                [field]: [...(prev[field] || []), value.trim()]
            }))
            setInput('')
        }
    }

    const removeFromList = (field: 'personas' | 'influencers' | 'keyMessages', index: number) => {
        setConfig(prev => ({
            ...prev,
            [field]: (prev[field] || []).filter((_, i) => i !== index)
        }))
    }

    const togglePlatform = (platformId: string) => {
        setConfig(prev => ({
            ...prev,
            platforms: prev.platforms?.includes(platformId as any)
                ? prev.platforms.filter(p => p !== platformId)
                : [...(prev.platforms || []), platformId as any]
        }))
    }

    const handleGenerate = () => {
        if (isConfigValid()) {
            onGenerate(config as CampaignConfig)
        }
    }

    const isConfigValid = () => {
        return config.brandName &&
            config.brandDescription &&
            config.targetAudience &&
            config.campaignName &&
            config.callToAction &&
            (config.platforms?.length || 0) > 0
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-10">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex items-center">
                        <button
                            onClick={() => setStep(s.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === s.id
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                                    : step > s.id
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                                }`}
                        >
                            <span className="text-lg">{s.icon}</span>
                            <span className="font-medium text-sm hidden sm:inline">{s.title}</span>
                        </button>
                        {i < steps.length - 1 && (
                            <div className={`w-12 h-0.5 mx-2 ${step > s.id ? 'bg-green-500/50' : 'bg-gray-800'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-2xl p-8">

                {/* Step 1: Brand Identity */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">🏢 Brand Identity</h2>
                            <p className="text-gray-400 text-sm">Tell us about your brand to ensure consistent messaging</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Brand Name *</label>
                                <input
                                    type="text"
                                    value={config.brandName}
                                    onChange={e => setConfig(prev => ({ ...prev, brandName: e.target.value }))}
                                    placeholder="e.g., InnovareAI"
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Brand Voice</label>
                                <input
                                    type="text"
                                    value={config.brandVoice}
                                    onChange={e => setConfig(prev => ({ ...prev, brandVoice: e.target.value }))}
                                    placeholder="e.g., Innovative, trustworthy, expert"
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Brand Description *</label>
                            <textarea
                                value={config.brandDescription}
                                onChange={e => setConfig(prev => ({ ...prev, brandDescription: e.target.value }))}
                                placeholder="Describe what your brand does, its unique value proposition, and key differentiators..."
                                rows={4}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Brand Colors</label>
                            <div className="flex gap-3">
                                {config.brandColors?.map((color, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={e => {
                                                const newColors = [...(config.brandColors || [])]
                                                newColors[i] = e.target.value
                                                setConfig(prev => ({ ...prev, brandColors: newColors }))
                                            }}
                                            className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-700"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, brandColors: [...(prev.brandColors || []), '#000000'] }))}
                                    className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Target Audience */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">👥 Target Audience</h2>
                            <p className="text-gray-400 text-sm">Define who you're trying to reach with this campaign</p>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Target Audience Description *</label>
                            <textarea
                                value={config.targetAudience}
                                onChange={e => setConfig(prev => ({ ...prev, targetAudience: e.target.value }))}
                                placeholder="Describe your ideal customer: their role, industry, pain points, goals..."
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Buyer Personas</label>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={personaInput}
                                    onChange={e => setPersonaInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addToList('personas', personaInput, setPersonaInput)}
                                    placeholder="e.g., VP of Sales at B2B SaaS company"
                                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                />
                                <button
                                    onClick={() => addToList('personas', personaInput, setPersonaInput)}
                                    className="px-4 py-3 bg-violet-500/20 text-violet-400 rounded-xl hover:bg-violet-500/30 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {config.personas?.map((persona, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-full text-sm flex items-center gap-2">
                                        {persona}
                                        <button onClick={() => removeFromList('personas', i)} className="hover:text-red-400">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Influencers/Thought Leaders to Reference</label>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={influencerInput}
                                    onChange={e => setInfluencerInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addToList('influencers', influencerInput, setInfluencerInput)}
                                    placeholder="e.g., @naval, Gary Vee, Simon Sinek"
                                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                />
                                <button
                                    onClick={() => addToList('influencers', influencerInput, setInfluencerInput)}
                                    className="px-4 py-3 bg-violet-500/20 text-violet-400 rounded-xl hover:bg-violet-500/30 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {config.influencers?.map((inf, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-sm flex items-center gap-2">
                                        {inf}
                                        <button onClick={() => removeFromList('influencers', i)} className="hover:text-red-400">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-3">Tonality *</label>
                            <div className="grid grid-cols-3 gap-3">
                                {tonalities.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setConfig(prev => ({ ...prev, tonality: t.id as any }))}
                                        className={`p-4 rounded-xl border transition-all text-left ${config.tonality === t.id
                                                ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/50 shadow-lg shadow-violet-500/10'
                                                : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl">{t.icon}</span>
                                            <span className={`font-medium ${config.tonality === t.id ? 'text-white' : 'text-gray-300'}`}>{t.label}</span>
                                        </div>
                                        <p className="text-gray-500 text-xs">{t.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Campaign Goals */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">🎯 Campaign Goals</h2>
                            <p className="text-gray-400 text-sm">Define your campaign objectives and key messages</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Campaign Name *</label>
                                <input
                                    type="text"
                                    value={config.campaignName}
                                    onChange={e => setConfig(prev => ({ ...prev, campaignName: e.target.value }))}
                                    placeholder="e.g., Q1 Product Launch"
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Call to Action *</label>
                                <input
                                    type="text"
                                    value={config.callToAction}
                                    onChange={e => setConfig(prev => ({ ...prev, callToAction: e.target.value }))}
                                    placeholder="e.g., Book a demo, Try free, Learn more"
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-3">Campaign Goal *</label>
                            <div className="grid grid-cols-5 gap-3">
                                {goals.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setConfig(prev => ({ ...prev, campaignGoal: g.id as any }))}
                                        className={`p-4 rounded-xl border transition-all text-center ${config.campaignGoal === g.id
                                                ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/50 shadow-lg shadow-violet-500/10'
                                                : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600'
                                            }`}
                                    >
                                        <span className="text-2xl block mb-2">{g.icon}</span>
                                        <span className={`font-medium text-sm ${config.campaignGoal === g.id ? 'text-white' : 'text-gray-300'}`}>
                                            {g.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Key Messages</label>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addToList('keyMessages', messageInput, setMessageInput)}
                                    placeholder="e.g., Save 10 hours per week with AI automation"
                                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                />
                                <button
                                    onClick={() => addToList('keyMessages', messageInput, setMessageInput)}
                                    className="px-4 py-3 bg-violet-500/20 text-violet-400 rounded-xl hover:bg-violet-500/30 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {config.keyMessages?.map((msg, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-gray-800/30 rounded-xl">
                                        <span className="text-violet-400">💡</span>
                                        <span className="text-gray-300 text-sm flex-1">{msg}</span>
                                        <button onClick={() => removeFromList('keyMessages', i)} className="text-gray-500 hover:text-red-400">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Platforms & Generate */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">🚀 Platforms & Generate</h2>
                            <p className="text-gray-400 text-sm">Select platforms and generate your campaign content</p>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-3">Select Platforms *</label>
                            <div className="grid grid-cols-2 gap-4">
                                {platforms.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => togglePlatform(p.id)}
                                        className={`p-5 rounded-xl border transition-all text-left ${config.platforms?.includes(p.id as any)
                                                ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/50'
                                                : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                                style={{ backgroundColor: `${p.color}20` }}
                                            >
                                                {p.icon}
                                            </div>
                                            <span className={`font-semibold ${config.platforms?.includes(p.id as any) ? 'text-white' : 'text-gray-300'}`}>
                                                {p.label}
                                            </span>
                                            {config.platforms?.includes(p.id as any) && (
                                                <span className="ml-auto text-green-400">✓</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {p.outputs.map((output, i) => (
                                                <span key={i} className="px-2 py-1 bg-gray-800/50 text-gray-400 rounded text-xs">
                                                    {output}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
                            <h3 className="text-white font-semibold mb-4">📋 Campaign Summary</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Brand:</span>
                                    <span className="text-white ml-2">{config.brandName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Campaign:</span>
                                    <span className="text-white ml-2">{config.campaignName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Goal:</span>
                                    <span className="text-white ml-2">{goals.find(g => g.id === config.campaignGoal)?.label || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Tone:</span>
                                    <span className="text-white ml-2">{tonalities.find(t => t.id === config.tonality)?.label || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Platforms:</span>
                                    <span className="text-white ml-2">{config.platforms?.length || 0} selected</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Outputs:</span>
                                    <span className="text-white ml-2">
                                        {config.platforms?.reduce((acc, p) => acc + (platforms.find(pl => pl.id === p)?.outputs.length || 0), 0) || 0} items
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* What will be generated */}
                        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl p-5 border border-violet-500/20">
                            <h3 className="text-white font-semibold mb-3">✨ What will be generated:</h3>
                            <div className="space-y-2">
                                {config.platforms?.map(p => {
                                    const platform = platforms.find(pl => pl.id === p)
                                    return platform ? (
                                        <div key={p} className="flex items-center gap-3">
                                            <span className="text-xl">{platform.icon}</span>
                                            <span className="text-gray-300">{platform.label}:</span>
                                            <span className="text-violet-300">
                                                {platform.outputs.join(', ')}
                                            </span>
                                        </div>
                                    ) : null
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800/50">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        ← Previous
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(s => Math.min(4, s + 1))}
                            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-purple-500/30 transition-all"
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={!isConfigValid() || isGenerating}
                            className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    🚀 Generate Campaign
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
