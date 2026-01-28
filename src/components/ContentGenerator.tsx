'use client'

import { useState } from 'react'

interface ContentGeneratorProps {
    topic: {
        title: string
        source: string
        content?: string
    }
    onClose: () => void
}

export function ContentGenerator({ topic, onClose }: ContentGeneratorProps) {
    const [platform, setPlatform] = useState('linkedin')
    const [generating, setGenerating] = useState(false)
    const [generatedContent, setGeneratedContent] = useState('')
    const [tone, setTone] = useState('professional')

    const platforms = [
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', maxLength: 3000 },
        { id: 'twitter', name: 'Twitter/X', icon: '🐦', maxLength: 280 },
        { id: 'blog', name: 'Blog Post', icon: '📝', maxLength: 5000 },
        { id: 'email', name: 'Email', icon: '📧', maxLength: 1000 },
        { id: 'instagram', name: 'Instagram', icon: '📸', maxLength: 2200 },
    ]

    const tones = [
        { id: 'professional', name: 'Professional' },
        { id: 'casual', name: 'Casual' },
        { id: 'educational', name: 'Educational' },
        { id: 'provocative', name: 'Provocative' },
        { id: 'storytelling', name: 'Storytelling' },
    ]

    async function handleGenerate() {
        setGenerating(true)
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic.title,
                    platform,
                    tone,
                    context: topic.content || '',
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setGeneratedContent(data.content || 'Failed to generate content.')
            } else {
                setGeneratedContent('Error generating content. Please try again.')
            }
        } catch (error) {
            setGeneratedContent('Error generating content. Please try again.')
        } finally {
            setGenerating(false)
        }
    }

    function copyToClipboard() {
        navigator.clipboard.writeText(generatedContent)
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <div>
                        <h3 className="text-white font-semibold text-lg">Generate Content</h3>
                        <p className="text-gray-400 text-sm truncate max-w-md mt-1">{topic.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Options */}
                <div className="p-5 space-y-4 border-b border-gray-800">
                    {/* Platform Selection */}
                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">Platform</label>
                        <div className="flex flex-wrap gap-2">
                            {platforms.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPlatform(p.id)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${platform === p.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    <span>{p.icon}</span>
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tone Selection */}
                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">Tone</label>
                        <div className="flex flex-wrap gap-2">
                            {tones.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTone(t.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tone === t.id
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Generating...
                            </>
                        ) : (
                            <>✨ Generate Content</>
                        )}
                    </button>
                </div>

                {/* Generated Content */}
                <div className="p-5 max-h-[40vh] overflow-y-auto">
                    {generatedContent ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Generated Content</span>
                                <button
                                    onClick={copyToClipboard}
                                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                                >
                                    📋 Copy
                                </button>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <p className="text-white whitespace-pre-wrap text-sm leading-relaxed">
                                    {generatedContent}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerate}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                                >
                                    🔄 Regenerate
                                </button>
                                <button
                                    onClick={copyToClipboard}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                                >
                                    ✓ Use This
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <span className="text-4xl block mb-3">✍️</span>
                            <p>Select options and click Generate to create content</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
