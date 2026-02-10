'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useWorkspace, useAuth } from '@/contexts/AuthContext'

interface PersonaBuilderProps {
    type?: 'brand' | 'audience' | 'product'
}

export function PersonaBuilder({ type: initialType = 'brand' }: PersonaBuilderProps) {
    const router = useRouter()
    const { currentWorkspace } = useWorkspace()
    const { user } = useAuth()
    const supabase = getSupabase()

    const [type, setType] = useState(initialType)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [attributes, setAttributes] = useState<Record<string, any>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [aiInput, setAiInput] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)

    const handleAIGenerate = async () => {
        if (!aiInput) return
        setIsGenerating(true)
        try {
            const response = await fetch('/api/ai/persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, context: aiInput })
            })
            const result = await response.json()
            if (result.success) {
                const { name, description: desc, ...attrs } = result.data
                setName(name || '')
                setDescription(desc || '')
                setAttributes(attrs)
            }
        } catch (error) {
            console.error('AI Generation error:', error)
            alert('AI generation failed. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleAttributeChange = (key: string, value: string) => {
        setAttributes(prev => ({ ...prev, [key]: value }))
    }

    const savePersona = async () => {
        if (!name) {
            alert('Please give your persona a name.')
            return
        }

        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('personas')
                .insert({
                    workspace_id: currentWorkspace?.id,
                    name,
                    type,
                    description,
                    attributes,
                    created_by: user?.id
                })

            if (error) throw error
            router.push('/personas')
        } catch (error) {
            console.error('Error saving persona:', error)
            alert('Failed to save persona.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {/* Type Selection */}
                <div className="flex border-b border-gray-800">
                    {['brand', 'audience', 'product'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setType(t as any)}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 capitalize ${type === t
                                ? 'border-violet-500 text-white bg-violet-500/5'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {t} Persona
                        </button>
                    ))}
                </div>

                <div className="p-8 space-y-8">
                    {/* AI Magic Section */}
                    <div className="bg-violet-600/5 border border-violet-500/20 rounded-2xl p-6 mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">✨</span>
                            <h3 className="text-lg font-bold text-white">AI Magic Generate</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            {type === 'brand'
                                ? "Paste your website URL or a short company bio to automatically build this persona."
                                : type === 'audience'
                                    ? "Describe your ideal customer or paste a LinkedIn profile URL."
                                    : "Tell us what you're selling and who it's for."}
                        </p>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder={type === 'brand' ? "e.g. https://innovare.ai" : "e.g. B2B SaaS Founders in New York"}
                                className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            />
                            <button
                                onClick={handleAIGenerate}
                                disabled={isGenerating || !aiInput}
                                className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${isGenerating
                                    ? 'bg-gray-800 text-gray-500'
                                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20'
                                    }`}
                            >
                                {isGenerating ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : 'Generate'}
                            </button>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Persona Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={type === 'brand' ? 'e.g. Innovare Main Brand' : type === 'audience' ? 'e.g. CMO Kelly' : 'e.g. Vera.AI Scout'}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Short Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the purpose of this persona..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Dynamic Attributes based on Type */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white">Persona Attributes</h3>

                        {type === 'brand' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://example.com"
                                        value={attributes.url || ''}
                                        onChange={(e) => handleAttributeChange('url', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SaaS, Fintech, Healthcare"
                                        value={attributes.industry || ''}
                                        onChange={(e) => handleAttributeChange('industry', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tone Tags</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Professional, Sassy, Visionary, Direct (comma separated)"
                                        value={attributes.tone_tags || ''}
                                        onChange={(e) => handleAttributeChange('tone_tags', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Value Proposition</label>
                                    <textarea
                                        placeholder="What is your unfair advantage? Why do customers choose you over competitors?"
                                        value={attributes.uvp || ''}
                                        onChange={(e) => handleAttributeChange('uvp', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm h-20 resize-none"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Dictionary (Terminology)</label>
                                    <textarea
                                        placeholder="Key words to use or avoid (e.g., 'Always use client, never customer')"
                                        value={attributes.dictionary || ''}
                                        onChange={(e) => handleAttributeChange('dictionary', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm h-20 resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {type === 'audience' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Age Range & Demographics</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 25-45, Tech-savvy professionals"
                                        value={attributes.demographics || ''}
                                        onChange={(e) => handleAttributeChange('demographics', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. North America, Remote, APAC"
                                        value={attributes.location || ''}
                                        onChange={(e) => handleAttributeChange('location', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Key Problems / Pain Points</label>
                                    <textarea
                                        placeholder="What are their biggest frustrations right now?"
                                        value={attributes.pain_points || ''}
                                        onChange={(e) => handleAttributeChange('pain_points', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm h-24 resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Psychographic Barriers</label>
                                    <textarea
                                        placeholder="What stops them from buying? (e.g. budget, skepticism, status quo)"
                                        value={attributes.barriers || ''}
                                        onChange={(e) => handleAttributeChange('barriers', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm h-24 resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {type === 'product' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Solution</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Content Automation Platform"
                                        value={attributes.solution || ''}
                                        onChange={(e) => handleAttributeChange('solution', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Context</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. High-ticket, B2B Subscription, Freemium"
                                        value={attributes.pricing || ''}
                                        onChange={(e) => handleAttributeChange('pricing', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Key Features & Competitive Edge</label>
                                    <textarea
                                        placeholder="What distinguishes this product from others in the market?"
                                        value={attributes.competitive_edge || ''}
                                        onChange={(e) => handleAttributeChange('competitive_edge', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm h-32 resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={savePersona}
                            disabled={isSaving || !name}
                            className={`px-8 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${isSaving || !name
                                ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/20'
                                }`}
                        >
                            {isSaving ? 'Creating...' : 'Create Persona'}
                        </button>
                    </div>
                </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
                Tip: These personas will be available directly in the <span className="text-violet-400">Content Engine</span> to help tailor your AI-generated posts.
            </p>
        </div>
    )
}
