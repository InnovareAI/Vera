'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/contexts/AuthContext'

interface Prompt {
    id: string
    prompt_name: string
    platform: string
    content_type: string
    system_prompt: string
    user_prompt: string
    preferred_model_id?: string
    is_active: boolean
}

interface Model {
    model_id: string
    provider: string
}

export default function PromptsPage() {
    const { currentWorkspace } = useWorkspace()
    const supabase = getSupabase()

    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [models, setModels] = useState<Model[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [promptsRes, modelsRes] = await Promise.all([
                    supabase.from('prompts').select('*').order('created_at', { ascending: false }),
                    supabase.from('models').select('model_id, provider').eq('is_active', true)
                ])

                if (promptsRes.error) throw promptsRes.error
                if (modelsRes.error) throw modelsRes.error

                setPrompts(promptsRes.data || [])
                setModels(modelsRes.data || [])
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [supabase])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingPrompt) return

        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('prompts')
                .upsert({
                    ...editingPrompt,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            // Refresh list
            const { data } = await supabase
                .from('prompts')
                .select('*')
                .order('created_at', { ascending: false })
            setPrompts(data || [])
            setEditingPrompt(null)
        } catch (error) {
            console.error('Error saving prompt:', error)
            alert('Failed to save prompt')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                                ← Back
                            </Link>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">⚙️</span>
                                Prompt Machine
                            </h1>
                        </div>
                        <button
                            onClick={() => setEditingPrompt({
                                id: crypto.randomUUID(),
                                prompt_name: '',
                                platform: 'linkedin',
                                content_type: 'post',
                                system_prompt: '',
                                user_prompt: '',
                                is_active: true
                            })}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-600/20"
                        >
                            + Create New Style
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {prompts.map((prompt) => (
                            <div
                                key={prompt.id}
                                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all group"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-white">{prompt.prompt_name}</h3>
                                                <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs uppercase font-bold tracking-wider">
                                                    {prompt.platform}
                                                </span>
                                                <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-xs font-medium">
                                                    {prompt.content_type}
                                                </span>
                                                {prompt.preferred_model_id && (
                                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-medium flex items-center gap-1">
                                                        🤖 {prompt.preferred_model_id}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            onClick={() => setEditingPrompt(prompt)}
                                            className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-all"
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Voice</label>
                                            <div className="p-3 bg-gray-800/50 rounded-xl text-gray-300 text-xs line-clamp-3 border border-gray-800/50 italic">
                                                "{prompt.system_prompt}"
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">User Instructions</label>
                                            <div className="p-3 bg-gray-800/50 rounded-xl text-gray-300 text-xs line-clamp-3 border border-gray-800/50 italic">
                                                "{prompt.user_prompt}"
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Edit Modal */}
            {editingPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPrompt(null)} />
                    <div className="relative bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <form onSubmit={handleSave}>
                            <div className="p-8 border-b border-gray-800">
                                <h2 className="text-2xl font-bold text-white mb-1">
                                    {editingPrompt.prompt_name ? 'Edit Style' : 'New Content Style'}
                                </h2>
                                <p className="text-gray-400 text-sm">Define how the AI should write for this style.</p>
                            </div>

                            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Style Name</label>
                                        <input
                                            type="text"
                                            value={editingPrompt.prompt_name}
                                            onChange={e => setEditingPrompt({ ...editingPrompt, prompt_name: e.target.value })}
                                            placeholder="e.g. LinkedIn Post (Naval Style)"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Platform</label>
                                        <select
                                            value={editingPrompt.platform}
                                            onChange={e => setEditingPrompt({ ...editingPrompt, platform: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                                        >
                                            <option value="linkedin">LinkedIn</option>
                                            <option value="twitter">X (Twitter)</option>
                                            <option value="medium">Medium</option>
                                            <option value="instagram">Instagram</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Content Category</label>
                                        <input
                                            type="text"
                                            value={editingPrompt.content_type}
                                            onChange={e => setEditingPrompt({ ...editingPrompt, content_type: e.target.value })}
                                            placeholder="e.g. post, headline, newsletter"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Preferred AI Model</label>
                                        <select
                                            value={editingPrompt.preferred_model_id || ''}
                                            onChange={e => setEditingPrompt({ ...editingPrompt, preferred_model_id: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                        >
                                            <option value="">Default Campaign Model</option>
                                            {models.map(m => (
                                                <option key={m.model_id} value={m.model_id}>
                                                    {m.provider}: {m.model_id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase italic text-violet-400">System Prompt (The "Voice")</label>
                                    <textarea
                                        value={editingPrompt.system_prompt}
                                        onChange={e => setEditingPrompt({ ...editingPrompt, system_prompt: e.target.value })}
                                        rows={4}
                                        placeholder="You are a master copywriter... Channel the style of..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-sm"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase italic text-fuchsia-400">User Prompt (The "Structure")</label>
                                    <textarea
                                        value={editingPrompt.user_prompt}
                                        onChange={e => setEditingPrompt({ ...editingPrompt, user_prompt: e.target.value })}
                                        rows={4}
                                        placeholder="Use the following structure: 1. Hook, 2. Body..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 resize-none text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-gray-900/50 border-t border-gray-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingPrompt(null)}
                                    className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
