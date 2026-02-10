'use client'

import { useState } from 'react'

// Types
interface LinkedInProfile {
    id: string
    name?: string
    headline?: string
    company?: string
    title?: string
    summary?: string
    profile_picture_url?: string
}

interface WritingStyle {
    avgWordCount: number
    avgSentenceLength: number
    usesEmoji: boolean
    emojiFrequency: 'none' | 'occasional' | 'frequent'
    usesHashtags: boolean
    hashtagFrequency: 'none' | 'few' | 'many'
    commonOpenings: string[]
    writingPatterns: string[]
}

interface ResearchResult {
    profile: LinkedInProfile
    posts: { id: string; text: string; reactions_count: number; comments_count: number }[]
    writingSamples: string[]
    stats: {
        totalPosts: number
        avgLikes: number
        avgComments: number
        avgLength: number
    }
    writingStyle: WritingStyle
}

interface VoiceProfile {
    type: 'product' | 'brand' | 'personal'
    name: string
    tone: string
    formality: string
    writingPatterns: string[]
    examplePosts: string[]
    vocabulary: string[]
    guidelines: string
    linkedInProfile?: string
    websiteUrl?: string
    blogUrl?: string
}

type ProfileTab = 'product' | 'brand' | 'personal'

export function VoiceResearch() {
    const [activeTab, setActiveTab] = useState<ProfileTab>('product')

    // Product profile state
    const [productName, setProductName] = useState('')
    const [productDescription, setProductDescription] = useState('')
    const [productFeatures, setProductFeatures] = useState('')
    const [productBenefits, setProductBenefits] = useState('')
    const [productTone, setProductTone] = useState('professional')
    const [productMessaging, setProductMessaging] = useState('')
    const [productExamples, setProductExamples] = useState('')

    // Brand profile state
    const [brandName, setBrandName] = useState('')
    const [brandDescription, setBrandDescription] = useState('')
    const [brandWebsite, setBrandWebsite] = useState('')
    const [brandBlog, setBrandBlog] = useState('')
    const [brandTone, setBrandTone] = useState('professional')
    const [brandValues, setBrandValues] = useState('')
    const [brandGuidelines, setBrandGuidelines] = useState('')
    const [brandExamples, setBrandExamples] = useState('')

    // Personal profile state
    const [profileUrl, setProfileUrl] = useState('')
    const [isResearching, setIsResearching] = useState(false)
    const [research, setResearch] = useState<ResearchResult | null>(null)
    const [error, setError] = useState('')
    const [selectedSamples, setSelectedSamples] = useState<Set<number>>(new Set())

    // Combined state
    const [savedProfiles, setSavedProfiles] = useState<VoiceProfile[]>([])

    const handleResearch = async () => {
        if (!profileUrl.trim()) return

        setIsResearching(true)
        setError('')
        setResearch(null)

        try {
            const response = await fetch('/api/linkedin/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileUrl: profileUrl.trim() })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to research profile')
            }

            setResearch(data)
            const topPosts = data.posts
                .map((p: any, i: number) => ({ index: i, engagement: (p.reactions_count || 0) + (p.comments_count || 0) }))
                .sort((a: any, b: any) => b.engagement - a.engagement)
                .slice(0, 5)
                .map((p: any) => p.index)
            setSelectedSamples(new Set(topPosts))
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsResearching(false)
        }
    }

    const toggleSample = (index: number) => {
        const newSelected = new Set(selectedSamples)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelectedSamples(newSelected)
    }

    const generatePersonalGuidelines = (r: ResearchResult): string => {
        const s = r.writingStyle
        let guidelines = `# Personal Voice: ${r.profile.name}\n\n`

        guidelines += `## About\n`
        guidelines += `- ${r.profile.headline}\n`
        if (r.profile.company) {
            guidelines += `- ${r.profile.title} at ${r.profile.company}\n`
        }

        guidelines += `\n## Post Length\n`
        guidelines += `- Average word count: ${s.avgWordCount} words\n`
        guidelines += `- Average sentence length: ${s.avgSentenceLength} words\n`

        guidelines += `\n## Style\n`
        if (s.usesEmoji) {
            guidelines += `- Uses emoji ${s.emojiFrequency === 'frequent' ? 'frequently' : 'occasionally'}\n`
        } else {
            guidelines += `- Does not use emoji\n`
        }
        if (s.usesHashtags) {
            guidelines += `- Uses ${s.hashtagFrequency === 'many' ? 'many' : 'a few'} hashtags\n`
        } else {
            guidelines += `- Rarely uses hashtags\n`
        }

        if (s.writingPatterns.length > 0) {
            guidelines += `\n## Writing Patterns\n`
            s.writingPatterns.forEach(p => {
                guidelines += `- ${p}\n`
            })
        }

        if (s.commonOpenings.length > 0) {
            guidelines += `\n## Common Openings\n`
            s.commonOpenings.forEach(o => {
                guidelines += `- "${o}..."\n`
            })
        }

        return guidelines
    }

    const savePersonalProfile = () => {
        if (!research) return

        const samples = research.writingSamples.filter((_, i) => selectedSamples.has(i))
        const style = research.writingStyle

        const profile: VoiceProfile = {
            type: 'personal',
            name: research.profile.name || 'Unknown',
            tone: style.usesEmoji ? 'friendly' : 'professional',
            formality: style.avgSentenceLength > 20 ? 'formal' : 'semi-formal',
            writingPatterns: style.writingPatterns,
            examplePosts: samples.slice(0, 5),
            vocabulary: [],
            guidelines: generatePersonalGuidelines(research),
            linkedInProfile: profileUrl
        }

        setSavedProfiles([...savedProfiles.filter(p => p.type !== 'personal' || p.name !== profile.name), profile])
        alert(`✅ Personal profile for ${profile.name} saved!`)
    }

    const saveProductProfile = () => {
        if (!productName.trim()) {
            alert('Please enter a product name')
            return
        }

        let guidelines = `# Product: ${productName}\n\n`

        if (productDescription) {
            guidelines += `## Description\n${productDescription}\n\n`
        }

        if (productFeatures) {
            guidelines += `## Key Features\n${productFeatures}\n\n`
        }

        if (productBenefits) {
            guidelines += `## Benefits\n${productBenefits}\n\n`
        }

        guidelines += `## Tone\n${productTone}\n\n`

        if (productMessaging) {
            guidelines += `## Messaging Guidelines\n${productMessaging}\n\n`
        }

        const profile: VoiceProfile = {
            type: 'product',
            name: productName,
            tone: productTone,
            formality: 'professional',
            writingPatterns: [],
            examplePosts: productExamples ? productExamples.split('\n\n').filter(Boolean) : [],
            vocabulary: [],
            guidelines
        }

        setSavedProfiles([...savedProfiles.filter(p => p.type !== 'product' || p.name !== profile.name), profile])
        alert(`✅ Product profile for ${productName} saved!`)
    }

    const saveBrandProfile = () => {
        if (!brandName.trim()) {
            alert('Please enter a brand name')
            return
        }

        let guidelines = `# Brand: ${brandName}\n\n`

        if (brandDescription) {
            guidelines += `## Description\n${brandDescription}\n\n`
        }

        if (brandWebsite) {
            guidelines += `## Website\n${brandWebsite}\n\n`
        }

        if (brandBlog) {
            guidelines += `## Blog\n${brandBlog}\n\n`
        }

        guidelines += `## Tone\n${brandTone}\n\n`

        if (brandValues) {
            guidelines += `## Core Values\n${brandValues}\n\n`
        }

        if (brandGuidelines) {
            guidelines += `## Messaging Guidelines\n${brandGuidelines}\n\n`
        }

        const profile: VoiceProfile = {
            type: 'brand',
            name: brandName,
            tone: brandTone,
            formality: 'professional',
            writingPatterns: [],
            examplePosts: brandExamples ? brandExamples.split('\n\n').filter(Boolean) : [],
            vocabulary: [],
            guidelines,
            websiteUrl: brandWebsite || undefined,
            blogUrl: brandBlog || undefined
        }

        setSavedProfiles([...savedProfiles.filter(p => p.type !== 'brand' || p.name !== profile.name), profile])
        alert(`✅ Brand profile for ${brandName} saved!`)
    }

    const removeProfile = (type: 'product' | 'brand' | 'personal', name: string) => {
        setSavedProfiles(savedProfiles.filter(p => !(p.type === type && p.name === name)))
    }

    const getProfileIcon = (type: 'product' | 'brand' | 'personal') => {
        switch (type) {
            case 'product': return '📦'
            case 'brand': return '🏢'
            case 'personal': return '👤'
        }
    }

    const getProfileColor = (type: 'product' | 'brand' | 'personal') => {
        switch (type) {
            case 'product': return 'from-green-600 to-emerald-600'
            case 'brand': return 'from-blue-600 to-cyan-600'
            case 'personal': return 'from-purple-600 to-pink-600'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Voice & Profile Training</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Define product, brand, and personal profiles for AI content generation
                    </p>
                </div>
            </div>

            {/* Saved Profiles Summary */}
            {savedProfiles.length > 0 && (
                <div className="bg-gradient-to-r from-green-900/20 via-blue-900/20 to-purple-900/20 border border-gray-700 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <span>✨</span>
                        Active Profiles ({savedProfiles.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {savedProfiles.map((p, i) => (
                            <div
                                key={i}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 ${p.type === 'product' ? 'bg-green-900/50 border border-green-700' :
                                        p.type === 'brand' ? 'bg-blue-900/50 border border-blue-700' :
                                            'bg-purple-900/50 border border-purple-700'
                                    }`}
                            >
                                <span>{getProfileIcon(p.type)}</span>
                                <span className="text-white text-sm">{p.name}</span>
                                <span className="text-gray-500 text-xs capitalize">({p.type})</span>
                                <button
                                    onClick={() => removeProfile(p.type, p.name)}
                                    className="text-gray-500 hover:text-red-400 ml-1"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('product')}
                    className={`px-4 py-3 font-medium transition-colors ${activeTab === 'product'
                            ? 'text-white border-b-2 border-green-500'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <span className="mr-2">📦</span>
                    Product
                </button>
                <button
                    onClick={() => setActiveTab('brand')}
                    className={`px-4 py-3 font-medium transition-colors ${activeTab === 'brand'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <span className="mr-2">🏢</span>
                    Brand
                </button>
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-4 py-3 font-medium transition-colors ${activeTab === 'personal'
                            ? 'text-white border-b-2 border-purple-500'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <span className="mr-2">👤</span>
                    Personal (LinkedIn)
                </button>
            </div>

            {/* Product Tab */}
            {activeTab === 'product' && (
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">📦</span>
                            Define Product Profile
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Product profiles define what you're selling - features, benefits, and product-specific messaging.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Product Name *</label>
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    placeholder="e.g., SAM AI, Vera.AI"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Product Description</label>
                                <textarea
                                    value={productDescription}
                                    onChange={(e) => setProductDescription(e.target.value)}
                                    placeholder="What is this product? What problem does it solve?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Key Features</label>
                                    <textarea
                                        value={productFeatures}
                                        onChange={(e) => setProductFeatures(e.target.value)}
                                        placeholder="List the key features..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Benefits & Value Props</label>
                                    <textarea
                                        value={productBenefits}
                                        onChange={(e) => setProductBenefits(e.target.value)}
                                        placeholder="List the benefits for customers..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Tone</label>
                                <select
                                    value={productTone}
                                    onChange={(e) => setProductTone(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                                >
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="technical">Technical</option>
                                    <option value="innovative">Innovative</option>
                                    <option value="bold">Bold</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Messaging Guidelines</label>
                                <textarea
                                    value={productMessaging}
                                    onChange={(e) => setProductMessaging(e.target.value)}
                                    placeholder="Do's and Don'ts. Key messages to emphasize..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Example Posts (separate with blank lines)</label>
                                <textarea
                                    value={productExamples}
                                    onChange={(e) => setProductExamples(e.target.value)}
                                    placeholder="Paste example product posts..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none font-mono text-sm"
                                />
                            </div>

                            <button
                                onClick={saveProductProfile}
                                disabled={!productName.trim()}
                                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span>💾</span>
                                Save Product Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Brand Tab */}
            {activeTab === 'brand' && (
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">🏢</span>
                            Define Brand Profile
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Brand profiles define your company identity - values, voice, and overall messaging.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Brand/Company Name *</label>
                                <input
                                    type="text"
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                    placeholder="e.g., InnovareAI"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Brand Description</label>
                                <textarea
                                    value={brandDescription}
                                    onChange={(e) => setBrandDescription(e.target.value)}
                                    placeholder="What does the company do? Who is the target audience?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Website URL</label>
                                    <input
                                        type="url"
                                        value={brandWebsite}
                                        onChange={(e) => setBrandWebsite(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Blog URL</label>
                                    <input
                                        type="url"
                                        value={brandBlog}
                                        onChange={(e) => setBrandBlog(e.target.value)}
                                        placeholder="https://example.com/blog"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Tone</label>
                                <select
                                    value={brandTone}
                                    onChange={(e) => setBrandTone(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="casual">Casual</option>
                                    <option value="authoritative">Authoritative</option>
                                    <option value="inspirational">Inspirational</option>
                                    <option value="playful">Playful</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Core Values & Messaging Pillars</label>
                                <textarea
                                    value={brandValues}
                                    onChange={(e) => setBrandValues(e.target.value)}
                                    placeholder="e.g., Innovation, Customer Success, AI-Powered Growth..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Messaging Guidelines</label>
                                <textarea
                                    value={brandGuidelines}
                                    onChange={(e) => setBrandGuidelines(e.target.value)}
                                    placeholder="Do's and Don'ts for content. What to emphasize, what to avoid..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Example Posts (separate with blank lines)</label>
                                <textarea
                                    value={brandExamples}
                                    onChange={(e) => setBrandExamples(e.target.value)}
                                    placeholder="Paste example social posts that represent the brand voice..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
                                />
                            </div>

                            <button
                                onClick={saveBrandProfile}
                                disabled={!brandName.trim()}
                                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span>💾</span>
                                Save Brand Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Personal Tab */}
            {activeTab === 'personal' && (
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">🔍</span>
                            Research LinkedIn Profile
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Personal profiles capture individual writing styles - the "how" of content creation.
                        </p>

                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={profileUrl}
                                onChange={(e) => setProfileUrl(e.target.value)}
                                placeholder="Enter LinkedIn profile URL (e.g., linkedin.com/in/username)"
                                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                            />
                            <button
                                onClick={handleResearch}
                                disabled={isResearching || !profileUrl.trim()}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isResearching ? (
                                    <>
                                        <span className="animate-spin">⚙️</span>
                                        Researching...
                                    </>
                                ) : (
                                    <>
                                        <span>🔎</span>
                                        Research
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300">
                                {error}
                            </div>
                        )}
                    </div>

                    {research && (
                        <>
                            {/* Profile Card */}
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-2xl">
                                        {research.profile.name?.charAt(0) || '👤'}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-white">{research.profile.name}</h3>
                                        <p className="text-gray-400">{research.profile.headline}</p>
                                        {research.profile.company && (
                                            <p className="text-gray-500 text-sm mt-1">{research.profile.title} at {research.profile.company}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 mt-6">
                                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{research.stats.totalPosts}</p>
                                        <p className="text-gray-500 text-sm">Posts</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{research.stats.avgLikes}</p>
                                        <p className="text-gray-500 text-sm">Avg Likes</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{research.stats.avgComments}</p>
                                        <p className="text-gray-500 text-sm">Avg Comments</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{research.writingStyle.avgWordCount}</p>
                                        <p className="text-gray-500 text-sm">Avg Words</p>
                                    </div>
                                </div>
                            </div>

                            {/* Writing Style */}
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4">📊 Writing Style Analysis</h3>
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="bg-gray-800 rounded-lg p-3">
                                        <p className="text-gray-500 text-xs uppercase">Emoji</p>
                                        <p className="text-white font-medium capitalize">{research.writingStyle.emojiFrequency}</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-3">
                                        <p className="text-gray-500 text-xs uppercase">Hashtags</p>
                                        <p className="text-white font-medium capitalize">{research.writingStyle.hashtagFrequency}</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-3">
                                        <p className="text-gray-500 text-xs uppercase">Avg Words</p>
                                        <p className="text-white font-medium">{research.writingStyle.avgWordCount}</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-3">
                                        <p className="text-gray-500 text-xs uppercase">Sentences</p>
                                        <p className="text-white font-medium">{research.writingStyle.avgSentenceLength} words</p>
                                    </div>
                                </div>

                                {research.writingStyle.writingPatterns.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {research.writingStyle.writingPatterns.map((p, i) => (
                                            <span key={i} className="px-3 py-1 bg-purple-900/40 border border-purple-700 rounded-full text-purple-300 text-sm">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sample Selection */}
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-white">📝 Select Sample Posts</h3>
                                    <span className="text-gray-500 text-sm">{selectedSamples.size} selected</span>
                                </div>

                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {research.writingSamples.map((sample, i) => (
                                        <div
                                            key={i}
                                            onClick={() => toggleSample(i)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedSamples.has(i)
                                                    ? 'bg-purple-900/30 border-purple-600'
                                                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedSamples.has(i) ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
                                                    }`}>
                                                    {selectedSamples.has(i) && <span className="text-white text-xs">✓</span>}
                                                </div>
                                                <p className="text-gray-300 text-sm flex-1 line-clamp-3">{sample}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={savePersonalProfile}
                                    disabled={selectedSamples.size === 0}
                                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <span>💾</span>
                                    Save Personal Profile for {research.profile.name}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Combined Profile Guide */}
            {savedProfiles.length >= 2 && (
                <div className="bg-gradient-to-r from-green-900/20 via-blue-900/20 to-purple-900/20 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">🎯</span>
                        Content Generation Guide
                    </h3>
                    <p className="text-gray-400 mb-4">
                        With multiple profiles configured, the AI will combine them intelligently:
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span>📦</span>
                                <span className="font-medium text-green-400">Product</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Defines <strong>what</strong> to talk about - features, benefits, value props
                            </p>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span>🏢</span>
                                <span className="font-medium text-blue-400">Brand</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Defines <strong>who</strong> is speaking - company values, positioning
                            </p>
                        </div>
                        <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span>👤</span>
                                <span className="font-medium text-purple-400">Personal</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Defines <strong>how</strong> to say it - writing style, patterns
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
