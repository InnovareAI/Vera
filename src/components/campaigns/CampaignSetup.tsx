'use client'

import { useState, useEffect } from 'react'
import { CampaignConfig } from '@/app/campaigns/page'
import { getSupabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/contexts/AuthContext'
import { Persona } from '@/types/database'
import { ToneOfVoice } from './ToneOfVoice'
import { PARALLEL_GENERATION_MODELS, ModelConfig } from '@/lib/platform-prompts'

interface VoiceProfile {
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

interface CampaignSetupProps {
    onGenerate: (config: CampaignConfig) => void
    isGenerating: boolean
}

export function CampaignSetup({ onGenerate, isGenerating }: CampaignSetupProps) {
    const { currentWorkspace, currentProject } = useWorkspace()
    const supabase = getSupabase()
    const [step, setStep] = useState(1)
    const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([])
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

    // Auto-populate from current project
    useEffect(() => {
        if (currentProject) {
            setConfig(prev => ({
                ...prev,
                brandName: prev.brandName || currentProject.name,
                brandDescription: prev.brandDescription || currentProject.description || '',
                brandVoice: prev.brandVoice || currentProject.tone_of_voice?.style || '',
                brandColors: [currentProject.brand_colors?.primary || '#6366f1', currentProject.brand_colors?.secondary || '#8b5cf6'],
                targetAudience: prev.targetAudience || [
                    ...(currentProject.icp?.target_roles || []),
                    ...(currentProject.icp?.target_industries || [])
                ].join(', '),
                tonality: (currentProject.tone_of_voice?.style as any) || prev.tonality,
                platforms: currentProject.enabled_platforms?.filter(p => ['linkedin', 'twitter', 'medium', 'instagram'].includes(p)) as any[] || prev.platforms,
            }))
        }
    }, [currentProject?.id])

    useEffect(() => {
        if (currentWorkspace?.id) {
            fetchPersonas()
        }
    }, [currentWorkspace?.id])

    const fetchPersonas = async () => {
        const { data, error } = await supabase
            .from('personas')
            .select('*')
            .eq('workspace_id', currentWorkspace?.id)
            .eq('is_active', true)

        if (!error && data) {
            setAvailablePersonas(data)
        }
    }

    const applyPersona = (persona: Persona) => {
        if (persona.type === 'brand') {
            setConfig(prev => ({
                ...prev,
                brandName: persona.name,
                brandDescription: persona.description || '',
                brandVoice: persona.attributes.tone_tags || persona.attributes.voice || ''
            }))
        } else if (persona.type === 'audience') {
            setConfig(prev => ({
                ...prev,
                targetAudience: `${persona.name}: ${persona.description || ''}. Roles: ${persona.attributes.demographics || ''}. Pain points: ${persona.attributes.pain_points || ''}`
            }))
        }
    }

    const [isBrainstorming, setIsBrainstorming] = useState(false)

    const handleBrainstorm = async () => {
        if (!config.brandName || !config.targetAudience) {
            alert('Please fill in Brand and Audience details first.')
            return
        }
        setIsBrainstorming(true)
        try {
            const response = await fetch('/api/ai/campaign-brainstorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand: `${config.brandName}: ${config.brandDescription}`,
                    audience: config.targetAudience
                })
            })
            const result = await response.json()
            if (result.success) {
                setConfig(prev => ({
                    ...prev,
                    campaignName: result.data.campaignName,
                    campaignGoal: result.data.campaignGoal,
                    keyMessages: result.data.keyMessages,
                    callToAction: result.data.callToAction
                }))
            }
        } catch (error) {
            console.error('Brainstorm error:', error)
        } finally {
            setIsBrainstorming(false)
        }
    }

    const [isGeneratingAudience, setIsGeneratingAudience] = useState(false)

    const handleSuggestAudience = async () => {
        if (!config.brandName || !config.brandDescription) {
            alert('Please fill in Brand details first.')
            return
        }
        setIsGeneratingAudience(true)
        try {
            const response = await fetch('/api/ai/persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'audience',
                    context: `Brand: ${config.brandName}\nDescription: ${config.brandDescription}`
                })
            })
            const result = await response.json()
            if (result.success) {
                const { name, description: desc, infographics, pain_points, ...attrs } = result.data
                const audienceText = `${name}: ${desc}. Pain points: ${pain_points}.`
                setConfig(prev => ({ ...prev, targetAudience: audienceText }))
            }
        } catch (error) {
            console.error('Suggest Audience error:', error)
        } finally {
            setIsGeneratingAudience(false)
        }
    }

    const [magicInput, setMagicInput] = useState('')
    const [isMagicLoading, setIsMagicLoading] = useState(false)

    const handleMagicSetup = async () => {
        if (!magicInput) return
        setIsMagicLoading(true)
        try {
            // Step 1: Brainstorm the campaign structure
            const response = await fetch('/api/ai/campaign-brainstorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand: magicInput,
                    audience: 'Based on the context in the mission'
                })
            })
            const result = await response.json()
            if (result.success) {
                // Step 2: Auto-select or suggest brand/audience details
                setConfig(prev => ({
                    ...prev,
                    campaignName: result.data.campaignName,
                    campaignGoal: result.data.campaignGoal,
                    keyMessages: result.data.keyMessages,
                    callToAction: result.data.callToAction,
                    brandDescription: magicInput.length > 50 ? magicInput : prev.brandDescription
                }))
                setStep(3) // Jump to goals to show the result
            }
        } catch (error) {
            console.error('Magic Setup error:', error)
        } finally {
            setIsMagicLoading(false)
        }
    }

    const [prompts, setPrompts] = useState<any[]>([])
    const [selectedStyles, setSelectedStyles] = useState<Record<string, string>>({})
    const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null)

    // Multi-model generation settings
    const [enableMultiModel, setEnableMultiModel] = useState(false)
    const [selectedModels, setSelectedModels] = useState<string[]>(PARALLEL_GENERATION_MODELS.map(m => m.id))

    // Content format per platform (story vs post)
    const [contentFormats, setContentFormats] = useState<Record<string, 'story' | 'post'>>({})

    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const response = await fetch('/api/prompts')
                const data = await response.json()
                setPrompts(data)
            } catch (error) {
                console.error('Error fetching prompts:', error)
            }
        }
        fetchPrompts()
    }, [])

    const handleVoiceSave = (profile: VoiceProfile) => {
        setVoiceProfile(profile)
        // Update config with voice info
        setConfig(prev => ({
            ...prev,
            brandVoice: profile.summary,
            tonality: profile.writingStyle.formality === 'casual' ? 'casual'
                : profile.writingStyle.formality === 'formal' ? 'professional'
                : 'professional' as any
        }))
        setStep(3) // Move to next step
    }

    const steps = [
        { id: 1, title: 'Brand', icon: '🏢' },
        { id: 2, title: 'Voice', icon: '🎤' },
        { id: 3, title: 'Audience', icon: '👥' },
        { id: 4, title: 'Goals', icon: '🎯' },
        { id: 5, title: 'Generate', icon: '🚀' }
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
            onGenerate({
                ...config,
                selectedStyles,
                voiceProfile: voiceProfile || undefined,
                enableMultiModel,
                selectedModels: enableMultiModel ? selectedModels : undefined,
                contentFormats: Object.keys(contentFormats).length > 0 ? contentFormats : undefined
            } as CampaignConfig)
        }
    }

    const toggleModel = (modelId: string) => {
        setSelectedModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        )
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

            {/* Magic Setup Header */}
            <div className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-indigo-500/30 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <h3 className="text-white font-bold">Magic Multi-Step Setup</h3>
                        <p className="text-gray-400 text-sm">Tell Vera.AI what you want to achieve, and we'll handle the rest.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={magicInput}
                        onChange={(e) => setMagicInput(e.target.value)}
                        placeholder="e.g. Promote our new AI SDR features to B2B founders on LinkedIn"
                        className="flex-1 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                        onClick={handleMagicSetup}
                        disabled={isMagicLoading || !magicInput}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-lg shadow-violet-600/20 flex items-center gap-2 whitespace-nowrap"
                    >
                        {isMagicLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : '⚡ Magic Auto-Fill'}
                    </button>
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-2xl p-8">

                {/* Step 1: Brand Identity */}
                {step === 1 && currentWorkspace && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">🏢 Brand Identity</h2>
                            <p className="text-gray-400 text-sm">Tell us about your brand to ensure consistent messaging</p>
                        </div>

                        <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-4 mb-6">
                            <label className="block text-violet-300 text-xs font-bold uppercase mb-2">Select From Saved Brand Personas</label>
                            <select
                                onChange={(e) => {
                                    const p = availablePersonas.find(p => p.id === e.target.value)
                                    if (p) applyPersona(p)
                                }}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                            >
                                <option value="">-- Choose a Brand Persona --</option>
                                {availablePersonas.filter(p => p.type === 'brand').map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
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

                {/* Step 2: Tone of Voice */}
                {step === 2 && currentWorkspace && (
                    <div className="space-y-6">
                        <ToneOfVoice
                            workspaceId={currentWorkspace.id}
                            initialProfile={voiceProfile}
                            onSave={handleVoiceSave}
                            onSkip={() => setStep(3)}
                        />
                        {voiceProfile && (
                            <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 mt-4">
                                <div className="flex items-center gap-2 text-green-400">
                                    <span>✓</span>
                                    <span className="font-medium">Voice Profile Saved</span>
                                </div>
                                <p className="text-green-300/80 text-sm mt-1">{voiceProfile.summary}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Target Audience */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">👥 Target Audience</h2>
                                <p className="text-gray-400 text-sm">Define who you're trying to reach with this campaign</p>
                            </div>
                            <button
                                onClick={handleSuggestAudience}
                                disabled={isGeneratingAudience}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isGeneratingAudience
                                    ? 'bg-gray-800 text-gray-500'
                                    : 'bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/30'
                                    }`}
                            >
                                {isGeneratingAudience ? '✨ Suggesting...' : '✨ AI Suggest'}
                            </button>
                        </div>

                        <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-4 mb-6">
                            <label className="block text-violet-300 text-xs font-bold uppercase mb-2">Select From Saved Audience Personas</label>
                            <select
                                onChange={(e) => {
                                    const p = availablePersonas.find(p => p.id === e.target.value)
                                    if (p) applyPersona(p)
                                }}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                            >
                                <option value="">-- Choose an Audience Persona --</option>
                                {availablePersonas.filter(p => p.type === 'audience').map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
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

                {/* Step 4: Campaign Goals */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">🎯 Campaign Goals</h2>
                                <p className="text-gray-400 text-sm">Define your campaign objectives and key messages</p>
                            </div>
                            <button
                                onClick={handleBrainstorm}
                                disabled={isBrainstorming}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isBrainstorming
                                    ? 'bg-gray-800 text-gray-500'
                                    : 'bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/30'
                                    }`}
                            >
                                {isBrainstorming ? '✨ Brainstorming...' : '✨ AI Brainstorm'}
                            </button>
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

                {/* Step 5: Platforms & Generate */}
                {step === 5 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">🚀 Platforms & Generate</h2>
                            <p className="text-gray-400 text-sm">Select platforms and generate your campaign content</p>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-3">Select Platforms & Specific Styles *</label>
                            <div className="grid grid-cols-2 gap-4">
                                {platforms.map(p => {
                                    const isSelected = config.platforms?.includes(p.id as any)
                                    const platformPrompts = prompts.filter(pr => pr.platform === p.id)

                                    return (
                                        <div key={p.id} className="space-y-2">
                                            <button
                                                onClick={() => togglePlatform(p.id)}
                                                className={`w-full p-5 rounded-xl border transition-all text-left ${isSelected
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
                                                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                        {p.label}
                                                    </span>
                                                    {isSelected && (
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

                                            {isSelected && platformPrompts.length > 0 && (
                                                <div className="px-2">
                                                    <select
                                                        value={selectedStyles[p.id] || ''}
                                                        onChange={(e) => setSelectedStyles(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                        className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-xs text-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                                                    >
                                                        <option value="">Default AI Style</option>
                                                        {platformPrompts.map(pr => (
                                                            <option key={pr.id} value={pr.id}>✨ {pr.prompt_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Content Format Selector for video platforms */}
                                            {isSelected && p.outputs.some(o => o.toLowerCase().includes('video') || o.toLowerCase().includes('reel')) && (
                                                <div className="px-2 mt-2">
                                                    <label className="block text-gray-500 text-xs mb-1.5">Content Format</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setContentFormats(prev => ({ ...prev, [p.id]: 'post' }))
                                                            }}
                                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${contentFormats[p.id] === 'post' || !contentFormats[p.id]
                                                                ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300'
                                                                : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:border-gray-600'
                                                                }`}
                                                        >
                                                            <span className="block text-base mb-0.5">📱</span>
                                                            Feed Post
                                                            <span className="block text-[10px] text-gray-500 mt-0.5">16:9 landscape</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setContentFormats(prev => ({ ...prev, [p.id]: 'story' }))
                                                            }}
                                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${contentFormats[p.id] === 'story'
                                                                ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300'
                                                                : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:border-gray-600'
                                                                }`}
                                                        >
                                                            <span className="block text-base mb-0.5">📲</span>
                                                            Story/Reel
                                                            <span className="block text-[10px] text-gray-500 mt-0.5">9:16 vertical</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Multi-Model Generation */}
                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-5 border border-indigo-500/30">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🤖</span>
                                    <div>
                                        <h3 className="text-white font-semibold">Multi-Model Generation</h3>
                                        <p className="text-gray-400 text-sm">Generate from multiple AI models and pick your favorite</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEnableMultiModel(!enableMultiModel)}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${enableMultiModel ? 'bg-violet-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${enableMultiModel ? 'translate-x-8' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {enableMultiModel && (
                                <div className="space-y-3 pt-4 border-t border-gray-700/50">
                                    <p className="text-gray-400 text-xs">Select which AI models to use (at least 2 recommended):</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {PARALLEL_GENERATION_MODELS.map(model => {
                                            const isSelected = selectedModels.includes(model.id)
                                            return (
                                                <button
                                                    key={model.id}
                                                    onClick={() => toggleModel(model.id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isSelected
                                                        ? 'bg-violet-500/20 border-violet-500/50'
                                                        : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center ${isSelected ? 'bg-violet-500 text-white' : 'bg-gray-700 text-gray-500'}`}>
                                                            {isSelected && '✓'}
                                                        </div>
                                                        <div className="text-left">
                                                            <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{model.name}</span>
                                                            <span className="text-gray-500 text-xs ml-2">({model.provider})</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${model.speed === 'fast' ? 'bg-green-500/20 text-green-400' : model.speed === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                            {model.speed}
                                                        </span>
                                                        <span className="text-gray-500 text-xs">{model.description}</span>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {selectedModels.length < 2 && (
                                        <p className="text-amber-400 text-xs">⚠️ Select at least 2 models to compare variations</p>
                                    )}
                                </div>
                            )}
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
                {step !== 2 && ( // Hide nav on ToV step - it has its own buttons
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800/50">
                        <button
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={step === 1}
                            className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            ← Previous
                        </button>

                        {step < 5 ? (
                            <button
                                onClick={() => setStep(s => Math.min(5, s + 1))}
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
                )}
            </div>
        </div>
    )
}
