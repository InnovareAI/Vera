'use client'

import { useState, useEffect } from 'react'

interface BrandExample {
    id: string
    platform: string
    content: string
    type: 'post' | 'article' | 'caption'
    performance?: 'top' | 'good' | 'average'
    notes?: string
}

interface VoiceSample {
    id: string
    content: string
    source: string // e.g., "Website", "Newsletter", "CEO LinkedIn"
}

interface BrandTrainingData {
    examples: BrandExample[]
    voiceSamples: VoiceSample[]
    doList: string[]    // Things the brand DOES in their content
    dontList: string[]  // Things the brand DOESN'T do
    writingRules: string[]
    keyPhrases: string[]
    avoidPhrases: string[]
    brandGuidelines?: string // Tone of voice document
    // Platform-specific guidelines
    linkedinGuidelines?: string
    twitterGuidelines?: string
    mediumGuidelines?: string
    instagramGuidelines?: string
    // Post structures
    postStructures?: string
}

interface BrandTrainingProps {
    onSave: (data: BrandTrainingData) => void
    initialData?: BrandTrainingData
}

// Import status for data sources
interface ImportStatus {
    linkedin: { loading: boolean; count: number; error?: string }
    sam: { loading: boolean; loaded: boolean; error?: string }
    posts: { loading: boolean; count: number; error?: string }
}

export function BrandTraining({ onSave, initialData }: BrandTrainingProps) {
    const [activeTab, setActiveTab] = useState<'examples' | 'voice' | 'tone' | 'rules'>('examples')
    const [data, setData] = useState<BrandTrainingData>(initialData || {
        examples: [],
        voiceSamples: [],
        doList: [],
        dontList: [],
        writingRules: [],
        keyPhrases: [],
        avoidPhrases: []
    })

    // Import status tracking
    const [importStatus, setImportStatus] = useState<ImportStatus>({
        linkedin: { loading: false, count: 0 },
        sam: { loading: false, loaded: false },
        posts: { loading: false, count: 0 }
    })

    // Example posts state
    const [newExample, setNewExample] = useState({
        platform: 'linkedin',
        content: '',
        type: 'post' as const,
        performance: 'good' as const,
        notes: ''
    })

    // Voice sample state
    const [newVoiceSample, setNewVoiceSample] = useState({
        content: '',
        source: ''
    })

    // Rules state
    const [newDoItem, setNewDoItem] = useState('')
    const [newDontItem, setNewDontItem] = useState('')
    const [newRule, setNewRule] = useState('')
    const [newKeyPhrase, setNewKeyPhrase] = useState('')
    const [newAvoidPhrase, setNewAvoidPhrase] = useState('')

    const platforms = [
        { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
        { id: 'twitter', label: 'X/Twitter', icon: '𝕏' },
        { id: 'medium', label: 'Medium', icon: '📝' },
        { id: 'instagram', label: 'Instagram', icon: '📸' }
    ]

    // Import previous posts from VERA database
    const importPreviousPosts = async () => {
        setImportStatus(prev => ({ ...prev, posts: { loading: true, count: 0 } }))
        try {
            const response = await fetch('/api/brand/posts?limit=50')
            if (!response.ok) throw new Error('Failed to fetch posts')

            const { examples: fetchedExamples } = await response.json()

            // Filter out duplicates
            const existingIds = new Set(data.examples.map(e => e.id))
            const newExamples = fetchedExamples.filter((e: BrandExample) => !existingIds.has(e.id))

            if (newExamples.length > 0) {
                setData(prev => ({
                    ...prev,
                    examples: [...prev.examples, ...newExamples]
                }))
            }

            setImportStatus(prev => ({
                ...prev,
                posts: { loading: false, count: newExamples.length }
            }))
        } catch (error) {
            console.error('Failed to import posts:', error)
            setImportStatus(prev => ({
                ...prev,
                posts: { loading: false, count: 0, error: 'Failed to import' }
            }))
        }
    }

    // Placeholder for SAM integration
    const importFromSAM = async () => {
        setImportStatus(prev => ({ ...prev, sam: { loading: true, loaded: false } }))

        // Simulate loading - will be replaced with actual SAM API call
        setTimeout(() => {
            setImportStatus(prev => ({
                ...prev,
                sam: {
                    loading: false,
                    loaded: false,
                    error: 'SAM integration not configured yet. Set SAM_API_URL in environment.'
                }
            }))
        }, 1000)
    }

    const addExample = () => {
        if (newExample.content.trim()) {
            setData(prev => ({
                ...prev,
                examples: [...prev.examples, { id: `ex-${Date.now()}`, ...newExample }]
            }))
            setNewExample({ platform: 'linkedin', content: '', type: 'post', performance: 'good', notes: '' })
        }
    }

    const removeExample = (id: string) => {
        setData(prev => ({
            ...prev,
            examples: prev.examples.filter(e => e.id !== id)
        }))
    }

    const addVoiceSample = () => {
        if (newVoiceSample.content.trim()) {
            setData(prev => ({
                ...prev,
                voiceSamples: [...prev.voiceSamples, { id: `vs-${Date.now()}`, ...newVoiceSample }]
            }))
            setNewVoiceSample({ content: '', source: '' })
        }
    }

    const removeVoiceSample = (id: string) => {
        setData(prev => ({
            ...prev,
            voiceSamples: prev.voiceSamples.filter(s => s.id !== id)
        }))
    }

    const addToList = (listKey: keyof BrandTrainingData, value: string, setValue: (v: string) => void) => {
        if (value.trim()) {
            setData(prev => ({
                ...prev,
                [listKey]: [...(prev[listKey] as string[]), value.trim()]
            }))
            setValue('')
        }
    }

    const removeFromList = (listKey: keyof BrandTrainingData, index: number) => {
        setData(prev => ({
            ...prev,
            [listKey]: (prev[listKey] as string[]).filter((_, i) => i !== index)
        }))
    }

    const handleSave = () => {
        onSave(data)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">🎓</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Train Your Brand Voice</h2>
                        <p className="text-gray-400 text-sm">Teach the AI to write like you by providing examples</p>
                    </div>
                </div>
                <p className="text-gray-300 text-sm">
                    The more examples you provide, the better the AI will match your unique voice and style.
                    Include your best-performing posts and content samples.
                </p>
            </div>

            {/* Import Data Sources */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium text-sm">📥 Import Training Data</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                    {/* Import from VERA Posts */}
                    <button
                        onClick={importPreviousPosts}
                        disabled={importStatus.posts.loading}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {importStatus.posts.loading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <span>📊</span>
                        )}
                        Pull Previous Posts
                        {importStatus.posts.count > 0 && (
                            <span className="px-2 py-0.5 bg-blue-500/30 rounded-full text-xs">
                                +{importStatus.posts.count}
                            </span>
                        )}
                    </button>

                    {/* Import from SAM (placeholder) */}
                    <button
                        onClick={importFromSAM}
                        disabled={importStatus.sam.loading}
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {importStatus.sam.loading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <span>🤖</span>
                        )}
                        Import from SAM
                        {importStatus.sam.loaded && (
                            <span className="px-2 py-0.5 bg-green-500/30 text-green-400 rounded-full text-xs">✓</span>
                        )}
                    </button>
                </div>
                {importStatus.sam.error && (
                    <p className="text-orange-400 text-xs mt-2">{importStatus.sam.error}</p>
                )}
                {importStatus.posts.error && (
                    <p className="text-red-400 text-xs mt-2">{importStatus.posts.error}</p>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('examples')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'examples'
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    📄 Example Posts ({data.examples.length})
                </button>
                <button
                    onClick={() => setActiveTab('voice')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'voice'
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    🎤 Voice Samples ({data.voiceSamples.length})
                </button>
                <button
                    onClick={() => setActiveTab('tone')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'tone'
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    🎨 Tone & Guidelines
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'rules'
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    📋 Style Rules ({data.doList.length + data.dontList.length + data.writingRules.length})
                </button>
            </div>

            {/* Tone of Voice & Social Guidelines Tab */}
            {activeTab === 'tone' && (
                <div className="space-y-6">
                    {/* Tone of Voice Document */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            📝 Tone of Voice Document
                            <span className="text-xs text-gray-500 font-normal">Paste or write your brand's tone of voice guidelines</span>
                        </h3>
                        <textarea
                            value={data.brandGuidelines || ''}
                            onChange={e => setData(prev => ({ ...prev, brandGuidelines: e.target.value }))}
                            placeholder={`Describe your brand's tone of voice here. For example:

Our voice is confident but not arrogant. We speak directly to busy professionals who value their time.

Key characteristics:
• Conversational but professional
• Data-driven with specific examples
• Empathetic to pain points
• Action-oriented with clear next steps

We sound like a knowledgeable peer, not a salesy vendor...`}
                            rows={10}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-sm"
                        />
                    </div>

                    {/* Platform-Specific Guidelines */}
                    <div className="grid grid-cols-2 gap-4">
                        {platforms.map(platform => (
                            <div key={platform.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                    <span>{platform.icon}</span>
                                    {platform.label} Guidelines
                                </h4>
                                <textarea
                                    value={(data as any)[`${platform.id}Guidelines`] || ''}
                                    onChange={e => setData(prev => ({ ...prev, [`${platform.id}Guidelines`]: e.target.value }))}
                                    placeholder={`${platform.label}-specific guidelines...
e.g., Post structure, hashtag usage, optimal length, tone adjustments`}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-xs"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Preferred Post Structures */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-4">📐 Preferred Post Structures</h3>
                        <p className="text-gray-400 text-sm mb-4">Define common structures your posts should follow</p>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                <h5 className="text-violet-400 text-sm font-medium mb-2">Hook → Story → CTA</h5>
                                <p className="text-gray-500 text-xs">Open with attention-grabber, tell a story, end with call-to-action</p>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                <h5 className="text-violet-400 text-sm font-medium mb-2">Problem → Solution</h5>
                                <p className="text-gray-500 text-xs">State a pain point, present your solution</p>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                <h5 className="text-violet-400 text-sm font-medium mb-2">Listicle Format</h5>
                                <p className="text-gray-500 text-xs">Numbered or bulleted tips, easy to scan</p>
                            </div>
                        </div>

                        <textarea
                            value={(data as any).postStructures || ''}
                            onChange={e => setData(prev => ({ ...prev, postStructures: e.target.value }))}
                            placeholder="Add your own preferred structures or detailed notes on how posts should be formatted..."
                            rows={3}
                            className="w-full mt-4 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-sm"
                        />
                    </div>
                </div>
            )}

            {/* Example Posts Tab */}
            {activeTab === 'examples' && (
                <div className="space-y-6">
                    {/* Add new example */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-4">Add Example Post</h3>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Platform</label>
                                <select
                                    value={newExample.platform}
                                    onChange={e => setNewExample(prev => ({ ...prev, platform: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                >
                                    {platforms.map(p => (
                                        <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Type</label>
                                <select
                                    value={newExample.type}
                                    onChange={e => setNewExample(prev => ({ ...prev, type: e.target.value as any }))}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                >
                                    <option value="post">Post</option>
                                    <option value="article">Article</option>
                                    <option value="caption">Caption</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Performance</label>
                                <select
                                    value={newExample.performance}
                                    onChange={e => setNewExample(prev => ({ ...prev, performance: e.target.value as any }))}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                >
                                    <option value="top">🔥 Top Performer</option>
                                    <option value="good">✓ Good</option>
                                    <option value="average">◯ Average</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Content</label>
                            <textarea
                                value={newExample.content}
                                onChange={e => setNewExample(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Paste your example post here..."
                                rows={6}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-sm"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Notes (optional)</label>
                            <input
                                type="text"
                                value={newExample.notes}
                                onChange={e => setNewExample(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Why did this post perform well? What makes it good?"
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                            />
                        </div>

                        <button
                            onClick={addExample}
                            disabled={!newExample.content.trim()}
                            className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            + Add Example
                        </button>
                    </div>

                    {/* Example list */}
                    {data.examples.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-white font-semibold">Saved Examples ({data.examples.length})</h3>
                            {data.examples.map(example => (
                                <div key={example.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span>{platforms.find(p => p.id === example.platform)?.icon}</span>
                                            <span className="text-white font-medium capitalize">{example.platform}</span>
                                            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">{example.type}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${example.performance === 'top' ? 'bg-orange-500/20 text-orange-400' :
                                                example.performance === 'good' ? 'bg-green-500/20 text-green-400' :
                                                    'bg-gray-700 text-gray-400'
                                                }`}>
                                                {example.performance === 'top' ? '🔥 Top' : example.performance === 'good' ? '✓ Good' : '◯ Avg'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeExample(example.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-4">{example.content}</p>
                                    {example.notes && (
                                        <p className="text-gray-500 text-xs mt-2 italic">Note: {example.notes}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Voice Samples Tab */}
            {activeTab === 'voice' && (
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-4">Add Voice Sample</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Paste text that represents your brand voice. This could be from your website, emails,
                            previous content, or how your CEO/founder writes.
                        </p>

                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Source</label>
                            <input
                                type="text"
                                value={newVoiceSample.source}
                                onChange={e => setNewVoiceSample(prev => ({ ...prev, source: e.target.value }))}
                                placeholder="e.g., Website homepage, CEO LinkedIn, Newsletter intro"
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Content</label>
                            <textarea
                                value={newVoiceSample.content}
                                onChange={e => setNewVoiceSample(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Paste a sample of your brand's writing..."
                                rows={5}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-sm"
                            />
                        </div>

                        <button
                            onClick={addVoiceSample}
                            disabled={!newVoiceSample.content.trim()}
                            className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            + Add Sample
                        </button>
                    </div>

                    {/* Voice samples list */}
                    {data.voiceSamples.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-white font-semibold">Saved Samples ({data.voiceSamples.length})</h3>
                            {data.voiceSamples.map(sample => (
                                <div key={sample.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-violet-400 text-sm font-medium">{sample.source || 'Unnamed source'}</span>
                                        <button
                                            onClick={() => removeVoiceSample(sample.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-3">{sample.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Style Rules Tab */}
            {activeTab === 'rules' && (
                <div className="grid grid-cols-2 gap-6">
                    {/* DO list */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-green-400 font-semibold mb-3">✓ DO</h3>
                        <p className="text-gray-400 text-xs mb-4">Things your brand ALWAYS does in content</p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newDoItem}
                                onChange={e => setNewDoItem(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addToList('doList', newDoItem, setNewDoItem)}
                                placeholder="e.g., Use data to back up claims"
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 text-sm"
                            />
                            <button
                                onClick={() => addToList('doList', newDoItem, setNewDoItem)}
                                className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                            >
                                +
                            </button>
                        </div>

                        <div className="space-y-2">
                            {data.doList.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <span className="text-green-400 text-sm">✓</span>
                                    <span className="text-gray-300 text-sm flex-1">{item}</span>
                                    <button onClick={() => removeFromList('doList', i)} className="text-gray-500 hover:text-red-400">×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DON'T list */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-red-400 font-semibold mb-3">✗ DON'T</h3>
                        <p className="text-gray-400 text-xs mb-4">Things your brand NEVER does in content</p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newDontItem}
                                onChange={e => setNewDontItem(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addToList('dontList', newDontItem, setNewDontItem)}
                                placeholder="e.g., Use buzzwords like 'synergy'"
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                            />
                            <button
                                onClick={() => addToList('dontList', newDontItem, setNewDontItem)}
                                className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                            >
                                +
                            </button>
                        </div>

                        <div className="space-y-2">
                            {data.dontList.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <span className="text-red-400 text-sm">✗</span>
                                    <span className="text-gray-300 text-sm flex-1">{item}</span>
                                    <button onClick={() => removeFromList('dontList', i)} className="text-gray-500 hover:text-red-400">×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Writing Rules */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-blue-400 font-semibold mb-3">📝 Writing Rules</h3>
                        <p className="text-gray-400 text-xs mb-4">Specific guidelines for writing style</p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newRule}
                                onChange={e => setNewRule(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addToList('writingRules', newRule, setNewRule)}
                                placeholder="e.g., Always start with a hook question"
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                            />
                            <button
                                onClick={() => addToList('writingRules', newRule, setNewRule)}
                                className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
                            >
                                +
                            </button>
                        </div>

                        <div className="space-y-2">
                            {data.writingRules.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <span className="text-blue-400 text-sm">📝</span>
                                    <span className="text-gray-300 text-sm flex-1">{item}</span>
                                    <button onClick={() => removeFromList('writingRules', i)} className="text-gray-500 hover:text-red-400">×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Phrases */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-6">
                        <div>
                            <h3 className="text-violet-400 font-semibold mb-3">🔑 Key Phrases to Use</h3>

                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newKeyPhrase}
                                    onChange={e => setNewKeyPhrase(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addToList('keyPhrases', newKeyPhrase, setNewKeyPhrase)}
                                    placeholder="e.g., 'AI-powered', 'automate your...'"
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                                />
                                <button
                                    onClick={() => addToList('keyPhrases', newKeyPhrase, setNewKeyPhrase)}
                                    className="px-3 py-2 bg-violet-500/20 text-violet-400 rounded-lg text-sm hover:bg-violet-500/30"
                                >
                                    +
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {data.keyPhrases.map((phrase, i) => (
                                    <span key={i} className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full text-xs flex items-center gap-1">
                                        {phrase}
                                        <button onClick={() => removeFromList('keyPhrases', i)} className="hover:text-red-400">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-orange-400 font-semibold mb-3">⚠️ Phrases to Avoid</h3>

                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newAvoidPhrase}
                                    onChange={e => setNewAvoidPhrase(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addToList('avoidPhrases', newAvoidPhrase, setNewAvoidPhrase)}
                                    placeholder="e.g., 'game-changer', 'leverage'"
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                                />
                                <button
                                    onClick={() => addToList('avoidPhrases', newAvoidPhrase, setNewAvoidPhrase)}
                                    className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30"
                                >
                                    +
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {data.avoidPhrases.map((phrase, i) => (
                                    <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs flex items-center gap-1 line-through">
                                        {phrase}
                                        <button onClick={() => removeFromList('avoidPhrases', i)} className="hover:text-red-400 no-underline">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-800">
                <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 transition-all"
                >
                    💾 Save Training Data
                </button>
            </div>
        </div>
    )
}

// Export the type for use in other components
export type { BrandTrainingData, BrandExample, VoiceSample }
