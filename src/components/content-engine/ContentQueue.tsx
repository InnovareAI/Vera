'use client'

import { useState, useEffect } from 'react'

interface ContentItem {
    id: string
    topic: string
    viewpoint?: string
    context?: string
    prompt_id?: string
    platform?: string
    content_type?: string
    finished_content?: string
    hashtags?: string[]
    status: 'pending' | 'processing' | 'complete' | 'error' | 'scheduled'
    error_message?: string
    scheduled_for?: string
    processed_at?: string
    created_at: string
}

interface Prompt {
    id: string
    prompt_code: string
    prompt_name: string
    platform: string
    content_type: string
}

const PLATFORMS = [
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'twitter', name: 'Twitter/X', icon: '𝕏' },
    { id: 'blog', name: 'Blog', icon: '📝' },
    { id: 'instagram', name: 'Instagram', icon: '📸' },
    { id: 'facebook', name: 'Facebook', icon: '👤' },
]

const STATUS_STYLES = {
    pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Pending' },
    processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Processing' },
    complete: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Complete' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Error' },
    scheduled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Scheduled' },
}

export function ContentQueue() {
    const [items, setItems] = useState<ContentItem[]>([])
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)

    // New item form
    const [showNewForm, setShowNewForm] = useState(false)
    const [newItem, setNewItem] = useState({
        topic: '',
        viewpoint: '',
        prompt_id: '',
    })

    useEffect(() => {
        fetchQueue()
        fetchPrompts()
    }, [])

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/content-queue')
            if (res.ok) {
                const data = await res.json()
                setItems(data)
            }
        } catch (error) {
            console.error('Failed to fetch queue:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchPrompts = async () => {
        try {
            const res = await fetch('/api/prompts')
            if (res.ok) {
                const data = await res.json()
                setPrompts(data)
            }
        } catch (error) {
            console.error('Failed to fetch prompts:', error)
        }
    }

    const addToQueue = async () => {
        if (!newItem.topic || !newItem.prompt_id) return

        try {
            const res = await fetch('/api/content-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            })

            if (res.ok) {
                await fetchQueue()
                setNewItem({ topic: '', viewpoint: '', prompt_id: '' })
                setShowNewForm(false)
            }
        } catch (error) {
            console.error('Failed to add to queue:', error)
        }
    }

    const processItem = async (itemId: string) => {
        setProcessing(true)
        try {
            const res = await fetch(`/api/content-queue/${itemId}/generate`, {
                method: 'POST'
            })

            if (res.ok) {
                await fetchQueue()
            }
        } catch (error) {
            console.error('Failed to process item:', error)
        } finally {
            setProcessing(false)
        }
    }

    const processAllPending = async () => {
        const pendingItems = items.filter(i => i.status === 'pending')
        setProcessing(true)

        for (const item of pendingItems) {
            try {
                await fetch(`/api/content-queue/${item.id}/generate`, {
                    method: 'POST'
                })
            } catch (error) {
                console.error(`Failed to process ${item.id}:`, error)
            }
        }

        await fetchQueue()
        setProcessing(false)
    }

    const copyContent = (content: string) => {
        navigator.clipboard.writeText(content)
    }

    const getPlatformIcon = (platform?: string) => {
        return PLATFORMS.find(p => p.id === platform)?.icon || '📄'
    }

    const getPromptName = (promptId?: string) => {
        return prompts.find(p => p.id === promptId)?.prompt_name || 'Unknown'
    }

    const pendingCount = items.filter(i => i.status === 'pending').length
    const completeCount = items.filter(i => i.status === 'complete').length

    return (
        <div className="flex h-full bg-gray-950">
            {/* Main Queue List */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">Content Machine</h2>
                            <p className="text-gray-500 text-sm">
                                {pendingCount} pending • {completeCount} complete
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {pendingCount > 0 && (
                                <button
                                    onClick={processAllPending}
                                    disabled={processing}
                                    className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <span className="animate-spin">⚡</span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            ⚡ Generate All ({pendingCount})
                                        </>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => setShowNewForm(true)}
                                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                            >
                                + Add Content
                            </button>
                        </div>
                    </div>

                    {/* New Item Form */}
                    {showNewForm && (
                        <div className="bg-gray-900 rounded-xl p-4 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-gray-400 text-sm mb-1">Topic</label>
                                    <input
                                        type="text"
                                        value={newItem.topic}
                                        onChange={e => setNewItem({ ...newItem, topic: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                        placeholder="e.g., Benefits of AI in sales automation"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Prompt</label>
                                    <select
                                        value={newItem.prompt_id}
                                        onChange={e => setNewItem({ ...newItem, prompt_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                    >
                                        <option value="">Select prompt...</option>
                                        {prompts.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.prompt_name} ({p.platform})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">
                                    My Viewpoint
                                    <span className="text-gray-600 ml-1">(optional personal perspective)</span>
                                </label>
                                <textarea
                                    value={newItem.viewpoint}
                                    onChange={e => setNewItem({ ...newItem, viewpoint: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                                    placeholder="e.g., I believe AI is transforming how we approach sales..."
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setShowNewForm(false)
                                        setNewItem({ topic: '', viewpoint: '', prompt_id: '' })
                                    }}
                                    className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addToQueue}
                                    disabled={!newItem.topic || !newItem.prompt_id}
                                    className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50"
                                >
                                    Add to Queue
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading queue...</div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-4xl mb-4">📭</p>
                            <p>Your content queue is empty</p>
                            <p className="text-sm">Add topics to start generating content</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`p-4 hover:bg-gray-900/50 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-gray-900 border-l-2 border-l-violet-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Platform Icon */}
                                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-xl">
                                            {getPlatformIcon(item.platform)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-medium truncate">{item.topic}</h3>
                                                <span className={`px-2 py-0.5 text-xs rounded ${STATUS_STYLES[item.status].bg} ${STATUS_STYLES[item.status].text}`}>
                                                    {STATUS_STYLES[item.status].label}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm">
                                                {getPromptName(item.prompt_id)}
                                                {item.viewpoint && ' • Has viewpoint'}
                                            </p>
                                            {item.finished_content && (
                                                <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                                                    {item.finished_content.substring(0, 150)}...
                                                </p>
                                            )}
                                            {item.error_message && (
                                                <p className="text-red-400 text-sm mt-1">
                                                    ⚠ {item.error_message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {item.status === 'pending' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        processItem(item.id)
                                                    }}
                                                    disabled={processing}
                                                    className="px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 disabled:opacity-50"
                                                >
                                                    Generate
                                                </button>
                                            )}
                                            {item.status === 'complete' && item.finished_content && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        copyContent(item.finished_content!)
                                                    }}
                                                    className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                                >
                                                    Copy
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Panel */}
            {selectedItem && (
                <div className="w-[500px] border-l border-gray-800 flex flex-col">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-white font-medium">Content Details</h3>
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="text-gray-500 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Topic */}
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">TOPIC</label>
                            <p className="text-white">{selectedItem.topic}</p>
                        </div>

                        {/* Viewpoint */}
                        {selectedItem.viewpoint && (
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">MY VIEWPOINT</label>
                                <p className="text-gray-300">{selectedItem.viewpoint}</p>
                            </div>
                        )}

                        {/* Prompt */}
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">PROMPT</label>
                            <p className="text-gray-300">{getPromptName(selectedItem.prompt_id)}</p>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">STATUS</label>
                            <span className={`inline-block px-2 py-1 text-sm rounded ${STATUS_STYLES[selectedItem.status].bg} ${STATUS_STYLES[selectedItem.status].text}`}>
                                {STATUS_STYLES[selectedItem.status].label}
                            </span>
                        </div>

                        {/* Finished Content */}
                        {selectedItem.finished_content && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-gray-500 text-xs">GENERATED CONTENT</label>
                                    <button
                                        onClick={() => copyContent(selectedItem.finished_content!)}
                                        className="text-xs text-violet-400 hover:text-violet-300"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">
                                        {selectedItem.finished_content}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Hashtags */}
                        {selectedItem.hashtags && selectedItem.hashtags.length > 0 && (
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">HASHTAGS</label>
                                <div className="flex flex-wrap gap-1">
                                    {selectedItem.hashtags.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-sm rounded">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {selectedItem.error_message && (
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">ERROR</label>
                                <p className="text-red-400 text-sm">{selectedItem.error_message}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-800 flex gap-2">
                        {selectedItem.status === 'pending' && (
                            <button
                                onClick={() => processItem(selectedItem.id)}
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50"
                            >
                                Generate Now
                            </button>
                        )}
                        {selectedItem.status === 'complete' && (
                            <>
                                <button
                                    onClick={() => copyContent(selectedItem.finished_content!)}
                                    className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                >
                                    Copy Content
                                </button>
                                <button
                                    className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                >
                                    Send to n8n
                                </button>
                            </>
                        )}
                        {selectedItem.status === 'error' && (
                            <button
                                onClick={() => processItem(selectedItem.id)}
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
