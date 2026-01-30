'use client'

import { useState } from 'react'
import { CampaignGeneration, GeneratedContent, ContentVariation, ImageVariation, VideoVariation } from '@/app/campaigns/page'
import { VariationPicker } from './VariationPicker'
import { ImageVariationPicker } from './ImageVariationPicker'
import { VideoVariationPicker } from './VideoVariationPicker'

interface CampaignOutputProps {
    generation: CampaignGeneration | null
    isGenerating: boolean
}

const platformIcons: Record<string, string> = {
    linkedin: '💼',
    twitter: '𝕏',
    medium: '📝',
    instagram: '📸'
}

const platformColors: Record<string, string> = {
    linkedin: '#0077B5',
    twitter: '#000000',
    medium: '#00A86B',
    instagram: '#E4405F'
}

const contentTypeIcons: Record<string, string> = {
    text: '📄',
    image: '🖼️',
    video: '🎬'
}

// n8n Webhook configuration component
function N8nWebhookConfig() {
    const [webhookUrl, setWebhookUrl] = useState('')
    const [saved, setSaved] = useState(false)

    // Load saved webhook URL on mount
    if (typeof window !== 'undefined' && !webhookUrl) {
        const savedUrl = localStorage.getItem('n8n_webhook_url')
        if (savedUrl && !webhookUrl) {
            setWebhookUrl(savedUrl)
            setSaved(true)
        }
    }

    const saveWebhook = () => {
        localStorage.setItem('n8n_webhook_url', webhookUrl)
        setSaved(true)
    }

    return (
        <div className="mt-4 pt-4 border-t border-violet-500/20">
            <div className="flex items-center gap-3">
                <span className="text-orange-400 text-sm">🔗 n8n Webhook:</span>
                <input
                    type="url"
                    value={webhookUrl}
                    onChange={e => { setWebhookUrl(e.target.value); setSaved(false) }}
                    placeholder="https://your-n8n.com/webhook/..."
                    className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <button
                    onClick={saveWebhook}
                    disabled={saved}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400'
                        }`}
                >
                    {saved ? '✓ Saved' : 'Save'}
                </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">
                Configure your n8n webhook URL to send generated content directly to your automation workflow
            </p>
        </div>
    )
}

// Export to JSON file
function exportToJSON(generation: CampaignGeneration) {
    const data = {
        exportedAt: new Date().toISOString(),
        campaignId: generation.id,
        status: generation.status,
        contents: generation.contents.map(c => ({
            platform: c.platform,
            type: c.type,
            content: c.content,
            mediaUrl: c.mediaUrl,
            caption: c.caption,
            hashtags: c.hashtags
        }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-${generation.id}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
}

// Send to n8n webhook
async function sendToN8n(generation: CampaignGeneration) {
    const webhookUrl = localStorage.getItem('n8n_webhook_url')

    if (!webhookUrl) {
        alert('Please configure your n8n webhook URL first')
        return
    }

    try {
        const payload = {
            source: 'vera-campaign-generator',
            timestamp: new Date().toISOString(),
            campaignId: generation.id,
            contents: generation.contents.filter(c => c.status === 'complete').map(c => ({
                platform: c.platform,
                type: c.type,
                content: c.content,
                mediaUrl: c.mediaUrl,
                caption: c.caption,
                hashtags: c.hashtags
            }))
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (response.ok) {
            alert(`✅ Successfully sent ${payload.contents.length} items to n8n!`)
        } else {
            alert(`⚠️ Failed to send to n8n: ${response.statusText}`)
        }
    } catch (error) {
        console.error('n8n webhook error:', error)
        alert('❌ Failed to connect to n8n webhook. Check the URL and try again.')
    }
}

interface ContentCardProps {
    content: GeneratedContent
    index: number
    onSelectVariation?: (contentIndex: number, variationIndex: number) => void
    onSelectImageVariation?: (contentIndex: number, imageIndex: number) => void
    onSelectVideoVariation?: (contentIndex: number, videoIndex: number) => void
}

function ContentCard({ content, index, onSelectVariation, onSelectImageVariation, onSelectVideoVariation }: ContentCardProps) {
    const [copied, setCopied] = useState(false)
    const [showVariationPicker, setShowVariationPicker] = useState(false)
    const [showImagePicker, setShowImagePicker] = useState(false)
    const [showVideoPicker, setShowVideoPicker] = useState(false)

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const downloadMedia = (url: string, filename: string) => {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
    }

    const hasVariations = content.variations && content.variations.length > 1
    const hasImageVariations = content.imageVariations && content.imageVariations.length > 1
    const hasVideoVariations = content.videoVariations && content.videoVariations.length > 1

    return (
        <>
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ backgroundColor: `${platformColors[content.platform] || '#6366f1'}20` }}
                        >
                            {platformIcons[content.platform] || '📱'}
                        </div>
                        <div>
                            <p className="text-white font-medium capitalize">{content.platform}</p>
                            <p className="text-gray-500 text-xs flex items-center gap-1">
                                {contentTypeIcons[content.type]} {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                                {hasVariations && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                                        {content.variations!.length} text variations
                                    </span>
                                )}
                                {hasImageVariations && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                        {content.imageVariations!.length} image styles
                                    </span>
                                )}
                                {hasVideoVariations && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                        {content.videoVariations!.length} video styles
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasVariations && (
                            <button
                                onClick={() => setShowVariationPicker(true)}
                                className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition-colors"
                            >
                                🤖 Compare Text
                            </button>
                        )}
                        {hasImageVariations && (
                            <button
                                onClick={() => setShowImagePicker(true)}
                                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors"
                            >
                                🖼️ Compare Images
                            </button>
                        )}
                        {hasVideoVariations && (
                            <button
                                onClick={() => setShowVideoPicker(true)}
                                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors"
                            >
                                🎬 Compare Videos
                            </button>
                        )}
                        {content.status === 'generating' && (
                            <div className="flex items-center gap-2 text-violet-400 text-sm">
                                <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                                Generating...
                            </div>
                        )}
                        {content.status === 'complete' && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                ✓ Complete
                            </span>
                        )}
                        {content.status === 'error' && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                                Error
                            </span>
                        )}
                    </div>
                </div>

            {/* Content */}
            <div className="p-4">
                {content.type === 'text' && (
                    <div className="space-y-3">
                        <div className="bg-gray-800/50 rounded-xl p-4 max-h-60 overflow-y-auto">
                            <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{content.content}</p>
                        </div>
                        {content.hashtags && content.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {content.hashtags.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {content.type === 'image' && content.mediaUrl && (
                    <div className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden bg-gray-800">
                            <img
                                src={content.mediaUrl}
                                alt="Generated content"
                                className="w-full h-auto max-h-80 object-contain"
                            />
                        </div>
                        {content.caption && (
                            <div className="bg-gray-800/50 rounded-xl p-3">
                                <p className="text-gray-300 text-sm">{content.caption}</p>
                            </div>
                        )}
                    </div>
                )}

                {content.type === 'video' && content.mediaUrl && (
                    <div className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden bg-gray-800">
                            <video
                                src={content.mediaUrl}
                                controls
                                className="w-full h-auto max-h-80"
                            />
                        </div>
                        {content.caption && (
                            <div className="bg-gray-800/50 rounded-xl p-3">
                                <p className="text-gray-300 text-sm">{content.caption}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

                {/* Actions */}
                <div className="flex items-center gap-2 p-4 border-t border-gray-800/50 bg-gray-900/50">
                    {content.type === 'text' && (
                        <button
                            onClick={() => copyToClipboard(content.content)}
                            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {copied ? '✓ Copied!' : '📋 Copy Text'}
                        </button>
                    )}
                    {(content.type === 'image' || content.type === 'video') && content.mediaUrl && (
                        <button
                            onClick={() => downloadMedia(content.mediaUrl!, `${content.platform}-${content.type}-${Date.now()}.${content.type === 'image' ? 'png' : 'mp4'}`)}
                            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            ⬇️ Download
                        </button>
                    )}
                    <button className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm font-medium transition-colors">
                        🔄 Regenerate
                    </button>
                </div>
            </div>

            {/* Variation Picker Modal (Text) */}
            {showVariationPicker && content.variations && (
                <VariationPicker
                    platform={content.platform}
                    variations={content.variations}
                    selectedIndex={content.selectedVariationIndex || 0}
                    onSelect={(variationIndex) => {
                        onSelectVariation?.(index, variationIndex)
                    }}
                    onClose={() => setShowVariationPicker(false)}
                />
            )}

            {/* Image Variation Picker Modal */}
            {showImagePicker && content.imageVariations && (
                <ImageVariationPicker
                    platform={content.platform}
                    variations={content.imageVariations}
                    selectedIndex={content.selectedImageIndex || 0}
                    onSelect={(imageIndex) => {
                        onSelectImageVariation?.(index, imageIndex)
                    }}
                    onClose={() => setShowImagePicker(false)}
                />
            )}

            {/* Video Variation Picker Modal */}
            {showVideoPicker && content.videoVariations && (
                <VideoVariationPicker
                    platform={content.platform}
                    variations={content.videoVariations}
                    selectedIndex={content.selectedVideoIndex || 0}
                    onSelect={(videoIndex) => {
                        onSelectVideoVariation?.(index, videoIndex)
                    }}
                    onClose={() => setShowVideoPicker(false)}
                />
            )}
        </>
    )
}

export function CampaignOutput({ generation, isGenerating }: CampaignOutputProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
    const [localContents, setLocalContents] = useState<GeneratedContent[]>([])

    // Sync localContents with generation.contents
    if (generation && localContents.length === 0 && generation.contents.length > 0) {
        setLocalContents([...generation.contents])
    }

    const handleSelectVariation = (contentIndex: number, variationIndex: number) => {
        setLocalContents(prev => {
            const updated = [...prev]
            const content = updated[contentIndex]
            if (content.variations && content.variations[variationIndex]) {
                // Update the main content with the selected variation
                content.content = content.variations[variationIndex].content
                content.selectedVariationIndex = variationIndex
            }
            return updated
        })
    }

    const handleSelectImageVariation = (contentIndex: number, imageIndex: number) => {
        setLocalContents(prev => {
            const updated = [...prev]
            const content = updated[contentIndex]
            if (content.imageVariations && content.imageVariations[imageIndex]) {
                // Update the main mediaUrl with the selected image
                content.mediaUrl = content.imageVariations[imageIndex].imageUrl
                content.selectedImageIndex = imageIndex
            }
            return updated
        })
    }

    const handleSelectVideoVariation = (contentIndex: number, videoIndex: number) => {
        setLocalContents(prev => {
            const updated = [...prev]
            const content = updated[contentIndex]
            if (content.videoVariations && content.videoVariations[videoIndex]) {
                // Update the main mediaUrl with the selected video
                content.mediaUrl = content.videoVariations[videoIndex].videoUrl
                content.selectedVideoIndex = videoIndex
            }
            return updated
        })
    }

    // Use localContents if available, otherwise fall back to generation.contents
    const contents = localContents.length > 0 ? localContents : generation?.contents || []

    if (!generation) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <span className="text-6xl mb-4">🎨</span>
                <h3 className="text-white font-semibold text-xl mb-2">No Campaign Generated Yet</h3>
                <p className="text-gray-400 text-center max-w-md">
                    Go back to setup to configure and generate your campaign content.
                </p>
            </div>
        )
    }

    const platforms = Array.from(new Set(contents.map(c => c.platform)))
    const filteredContents = selectedPlatform
        ? contents.filter(c => c.platform === selectedPlatform)
        : contents

    const getStats = () => {
        const total = contents.length
        const complete = contents.filter(c => c.status === 'complete').length
        const textCount = contents.filter(c => c.type === 'text').length
        const imageCount = contents.filter(c => c.type === 'image').length
        const videoCount = contents.filter(c => c.type === 'video').length
        const variationCount = contents.filter(c =>
            (c.variations && c.variations.length > 1) ||
            (c.imageVariations && c.imageVariations.length > 1) ||
            (c.videoVariations && c.videoVariations.length > 1)
        ).length
        return { total, complete, textCount, imageCount, videoCount, variationCount }
    }

    const stats = getStats()

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            {isGenerating && (
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Generating Campaign Content</h3>
                                <p className="text-gray-400 text-sm">Creating text, images, and videos...</p>
                            </div>
                        </div>
                        <span className="text-violet-400 font-semibold text-lg">{generation.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${generation.progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Items</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Completed</p>
                    <p className="text-2xl font-bold text-green-400">{stats.complete}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">📄 Text Posts</p>
                    <p className="text-2xl font-bold text-white">{stats.textCount}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">🖼️ Images</p>
                    <p className="text-2xl font-bold text-white">{stats.imageCount}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">🎬 Videos</p>
                    <p className="text-2xl font-bold text-white">{stats.videoCount}</p>
                </div>
                {stats.variationCount > 0 && (
                    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-4">
                        <p className="text-indigo-400 text-sm">🤖 Multi-Model</p>
                        <p className="text-2xl font-bold text-indigo-300">{stats.variationCount}</p>
                    </div>
                )}
            </div>

            {/* Platform Filter */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSelectedPlatform(null)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedPlatform === null
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                        }`}
                >
                    All Platforms
                </button>
                {platforms.map(platform => (
                    <button
                        key={platform}
                        onClick={() => setSelectedPlatform(platform)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedPlatform === platform
                            ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <span>{platformIcons[platform]}</span>
                        <span className="capitalize">{platform}</span>
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-6">
                {filteredContents.map((content, filteredIndex) => {
                    // Find the actual index in the full contents array
                    const actualIndex = contents.findIndex(c =>
                        c.platform === content.platform && c.type === content.type && c.content === content.content
                    )
                    return (
                        <ContentCard
                            key={`${content.platform}-${content.type}-${filteredIndex}`}
                            content={content}
                            index={actualIndex}
                            onSelectVariation={handleSelectVariation}
                            onSelectImageVariation={handleSelectImageVariation}
                            onSelectVideoVariation={handleSelectVideoVariation}
                        />
                    )
                })}
            </div>

            {/* Export Actions */}
            {generation.status === 'complete' && (
                <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-semibold text-lg">🎉 Campaign Ready!</h3>
                            <p className="text-gray-400 text-sm">Export or schedule your content for publishing</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => exportToJSON(generation)}
                                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors"
                            >
                                📦 Export JSON
                            </button>
                            <button
                                onClick={() => sendToN8n(generation)}
                                className="px-6 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl font-medium transition-colors flex items-center gap-2"
                            >
                                <span>🔗</span> Send to n8n
                            </button>
                            <button className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/30">
                                🗓️ Schedule Posts
                            </button>
                        </div>
                    </div>
                    <N8nWebhookConfig />
                </div>
            )}

            {/* Error State */}
            {generation.status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <h3 className="text-red-400 font-semibold">Generation Failed</h3>
                            <p className="text-red-300/70 text-sm">{generation.error || 'An unknown error occurred'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
