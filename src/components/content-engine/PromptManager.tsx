'use client'

import { useState, useEffect } from 'react'

interface Prompt {
    id: string
    prompt_code: string
    prompt_name: string
    platform: string
    content_type: string
    system_prompt: string
    user_prompt: string
    preferred_model_id?: string
    include_tone_of_voice: boolean
    default_word_count?: number
    include_hashtags: boolean
    include_emoji: boolean
    include_cta: boolean
    is_active: boolean
    is_template: boolean
}

interface AIModel {
    id: string
    model_id: string
    display_name: string
    provider: string
    best_for: string[]
}

const PLATFORMS = [
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'blue' },
    { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: 'gray' },
    { id: 'facebook', name: 'Facebook', icon: '👤', color: 'blue' },
    { id: 'instagram', name: 'Instagram', icon: '📸', color: 'pink' },
    { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'red' },
    { id: 'blog', name: 'Blog', icon: '📝', color: 'green' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'purple' },
    { id: 'medium', name: 'Medium', icon: '📖', color: 'gray' },
]

const CONTENT_TYPES = [
    'post', 'thread', 'comment', 'headline', 'newsletter',
    'article', 'short', 'reel', 'carousel', 'story'
]

export function PromptManager() {
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [models, setModels] = useState<AIModel[]>([])
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [filter, setFilter] = useState<string>('all')
    const [loading, setLoading] = useState(true)

    // Form state
    const [formData, setFormData] = useState<Partial<Prompt>>({
        prompt_name: '',
        platform: 'linkedin',
        content_type: 'post',
        system_prompt: '',
        user_prompt: '',
        include_tone_of_voice: true,
        default_word_count: 300,
        include_hashtags: true,
        include_emoji: true,
        include_cta: true,
        is_active: true,
    })

    useEffect(() => {
        fetchPrompts()
        fetchModels()
    }, [])

    const fetchPrompts = async () => {
        try {
            const res = await fetch('/api/prompts')
            if (res.ok) {
                const data = await res.json()
                setPrompts(data)
            }
        } catch (error) {
            console.error('Failed to fetch prompts:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchModels = async () => {
        try {
            const res = await fetch('/api/models')
            if (res.ok) {
                const data = await res.json()
                setModels(data)
            }
        } catch (error) {
            console.error('Failed to fetch models:', error)
        }
    }

    const handleSave = async () => {
        try {
            const method = selectedPrompt ? 'PUT' : 'POST'
            const url = selectedPrompt ? `/api/prompts/${selectedPrompt.id}` : '/api/prompts'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                await fetchPrompts()
                setIsEditing(false)
                setSelectedPrompt(null)
                resetForm()
            }
        } catch (error) {
            console.error('Failed to save prompt:', error)
        }
    }

    const resetForm = () => {
        setFormData({
            prompt_name: '',
            platform: 'linkedin',
            content_type: 'post',
            system_prompt: '',
            user_prompt: '',
            include_tone_of_voice: true,
            default_word_count: 300,
            include_hashtags: true,
            include_emoji: true,
            include_cta: true,
            is_active: true,
        })
    }

    const filteredPrompts = filter === 'all'
        ? prompts
        : prompts.filter(p => p.platform === filter)

    const getPlatformIcon = (platform: string) => {
        return PLATFORMS.find(p => p.id === platform)?.icon || '📄'
    }

    return (
        <div className="flex h-full bg-gray-950">
            {/* Sidebar - Prompt List */}
            <div className="w-80 border-r border-gray-800 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Prompt Library</h2>
                        <button
                            onClick={() => {
                                resetForm()
                                setSelectedPrompt(null)
                                setIsEditing(true)
                            }}
                            className="px-3 py-1.5 bg-violet-500 text-white text-sm rounded-lg hover:bg-violet-600"
                        >
                            + New
                        </button>
                    </div>

                    {/* Platform Filter */}
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-2 py-1 text-xs rounded ${filter === 'all'
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            All
                        </button>
                        {PLATFORMS.slice(0, 5).map(platform => (
                            <button
                                key={platform.id}
                                onClick={() => setFilter(platform.id)}
                                className={`px-2 py-1 text-xs rounded ${filter === platform.id
                                        ? 'bg-violet-500 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                {platform.icon}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Prompt List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500 text-center">Loading...</div>
                    ) : filteredPrompts.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">
                            No prompts yet. Create your first one!
                        </div>
                    ) : (
                        filteredPrompts.map(prompt => (
                            <button
                                key={prompt.id}
                                onClick={() => {
                                    setSelectedPrompt(prompt)
                                    setFormData(prompt)
                                    setIsEditing(false)
                                }}
                                className={`w-full p-3 text-left border-b border-gray-800 hover:bg-gray-900 transition-colors ${selectedPrompt?.id === prompt.id ? 'bg-gray-900 border-l-2 border-l-violet-500' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{getPlatformIcon(prompt.platform)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{prompt.prompt_name}</p>
                                        <p className="text-gray-500 text-xs">
                                            {prompt.prompt_code} • {prompt.content_type}
                                        </p>
                                    </div>
                                    {prompt.is_template && (
                                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                            Template
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content - Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedPrompt && !isEditing ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <p className="text-xl mb-2">📝</p>
                            <p>Select a prompt to view or edit</p>
                            <p className="text-sm">or create a new one</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Editor Header */}
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-medium">
                                    {isEditing ? (selectedPrompt ? 'Edit Prompt' : 'New Prompt') : formData.prompt_name}
                                </h3>
                                {formData.prompt_code && (
                                    <p className="text-gray-500 text-sm">ID: {formData.prompt_code}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false)
                                                if (!selectedPrompt) {
                                                    resetForm()
                                                } else {
                                                    setFormData(selectedPrompt)
                                                }
                                            }}
                                            className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
                                        >
                                            Save Prompt
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Editor Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Prompt Name</label>
                                    <input
                                        type="text"
                                        value={formData.prompt_name || ''}
                                        onChange={e => setFormData({ ...formData, prompt_name: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white disabled:opacity-60"
                                        placeholder="e.g., LinkedIn Post"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Platform</label>
                                    <select
                                        value={formData.platform || 'linkedin'}
                                        onChange={e => setFormData({ ...formData, platform: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white disabled:opacity-60"
                                    >
                                        {PLATFORMS.map(p => (
                                            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Content Type</label>
                                    <select
                                        value={formData.content_type || 'post'}
                                        onChange={e => setFormData({ ...formData, content_type: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white disabled:opacity-60"
                                    >
                                        {CONTENT_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* System Prompt */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">
                                    System Prompt
                                    <span className="text-gray-600 ml-2">(Voice, style, persona)</span>
                                </label>
                                <textarea
                                    value={formData.system_prompt || ''}
                                    onChange={e => setFormData({ ...formData, system_prompt: e.target.value })}
                                    disabled={!isEditing}
                                    rows={6}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white font-mono text-sm disabled:opacity-60 resize-y"
                                    placeholder="You are an expert LinkedIn content writer..."
                                />
                            </div>

                            {/* User Prompt */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">
                                    User Prompt
                                    <span className="text-gray-600 ml-2">(Structure, format, output requirements)</span>
                                </label>
                                <textarea
                                    value={formData.user_prompt || ''}
                                    onChange={e => setFormData({ ...formData, user_prompt: e.target.value })}
                                    disabled={!isEditing}
                                    rows={8}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white font-mono text-sm disabled:opacity-60 resize-y"
                                    placeholder="Write a LinkedIn post about {{topic}}. Structure:&#10;- Hook (first line)&#10;- 2-3 paragraphs&#10;- Question to drive engagement"
                                />
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Word Count</label>
                                    <input
                                        type="number"
                                        value={formData.default_word_count || ''}
                                        onChange={e => setFormData({ ...formData, default_word_count: parseInt(e.target.value) })}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Preferred Model</label>
                                    <select
                                        value={formData.preferred_model_id || ''}
                                        onChange={e => setFormData({ ...formData, preferred_model_id: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white disabled:opacity-60"
                                    >
                                        <option value="">Auto-select</option>
                                        {models.map(m => (
                                            <option key={m.id} value={m.id}>{m.display_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="flex flex-wrap gap-4">
                                {[
                                    { key: 'include_tone_of_voice', label: 'Use Tone of Voice' },
                                    { key: 'include_hashtags', label: 'Include Hashtags' },
                                    { key: 'include_emoji', label: 'Include Emoji' },
                                    { key: 'include_cta', label: 'Include CTA' },
                                    { key: 'is_active', label: 'Active' },
                                ].map(toggle => (
                                    <label key={toggle.key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData[toggle.key as keyof Prompt] as boolean || false}
                                            onChange={e => setFormData({ ...formData, [toggle.key]: e.target.checked })}
                                            disabled={!isEditing}
                                            className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-violet-500 focus:ring-violet-500"
                                        />
                                        <span className="text-gray-400 text-sm">{toggle.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
