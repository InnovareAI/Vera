'use client'

import { useState, useEffect } from 'react'

interface ContentPost {
    id: number
    theme: string
    hook: string
    content: string
    characterCount: number
    suggestedHashtags: string[]
    status: 'pending' | 'editing' | 'approved' | 'dismissed'
    editedContent?: string
}

interface CampaignData {
    campaign: string
    source: string
    generatedAt: string
    cta: string
    ctaUrl: string
    posts: ContentPost[]
}

const STATUS_STYLES = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '📝 Pending Review' },
    editing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '✏️ Editing' },
    approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Approved' },
    dismissed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '❌ Dismissed' },
}

export function ContentReview() {
    const [campaignData, setCampaignData] = useState<CampaignData | null>(null)
    const [posts, setPosts] = useState<ContentPost[]>([])
    const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'dismissed'>('all')
    const [copyFeedback, setCopyFeedback] = useState<number | null>(null)

    useEffect(() => {
        loadPosts()
    }, [])

    const loadPosts = async () => {
        try {
            // Load the generated posts from the JSON file
            const postsData = await import('@/data/content/findabl-linkedin-posts.json')
            setCampaignData({
                campaign: postsData.campaign,
                source: postsData.source,
                generatedAt: postsData.generatedAt,
                cta: postsData.cta,
                ctaUrl: postsData.ctaUrl,
                posts: postsData.posts.map((post: any) => ({
                    ...post,
                    status: 'pending' as const
                }))
            })
            setPosts(postsData.posts.map((post: any) => ({
                ...post,
                status: 'pending' as const
            })))
        } catch (error) {
            console.error('Failed to load posts:', error)
        }
    }

    const updatePostStatus = (postId: number, newStatus: ContentPost['status']) => {
        setPosts(prev => prev.map(post =>
            post.id === postId ? { ...post, status: newStatus } : post
        ))
        if (selectedPost?.id === postId) {
            setSelectedPost(prev => prev ? { ...prev, status: newStatus } : null)
        }
    }

    const saveEdit = (postId: number) => {
        setPosts(prev => prev.map(post =>
            post.id === postId ? {
                ...post,
                editedContent: editContent,
                content: editContent,
                characterCount: editContent.length,
                status: 'pending' as const
            } : post
        ))
        if (selectedPost?.id === postId) {
            setSelectedPost(prev => prev ? {
                ...prev,
                editedContent: editContent,
                content: editContent,
                characterCount: editContent.length,
                status: 'pending'
            } : null)
        }
        setIsEditing(false)
    }

    const copyContent = (post: ContentPost) => {
        const fullContent = `${post.editedContent || post.content}\n\n${post.suggestedHashtags.join(' ')}`
        navigator.clipboard.writeText(fullContent)
        setCopyFeedback(post.id)
        setTimeout(() => setCopyFeedback(null), 2000)
    }

    const approveAll = () => {
        setPosts(prev => prev.map(post =>
            post.status === 'pending' ? { ...post, status: 'approved' as const } : post
        ))
    }

    const getFilteredPosts = () => {
        if (filter === 'all') return posts
        return posts.filter(p => p.status === filter)
    }

    const stats = {
        total: posts.length,
        pending: posts.filter(p => p.status === 'pending').length,
        approved: posts.filter(p => p.status === 'approved').length,
        dismissed: posts.filter(p => p.status === 'dismissed').length,
    }

    return (
        <div className="flex h-full bg-gray-950">
            {/* Main Content List */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                📋 Content Review Queue
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {campaignData?.campaign || 'Loading...'} • {campaignData?.source}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {stats.pending > 0 && (
                                <button
                                    onClick={approveAll}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    ✅ Approve All ({stats.pending})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-900 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-white">{stats.total}</div>
                            <div className="text-gray-500 text-xs">Total Posts</div>
                        </div>
                        <div className="bg-yellow-900/20 rounded-lg p-3 text-center border border-yellow-800/30">
                            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                            <div className="text-yellow-600 text-xs">Pending</div>
                        </div>
                        <div className="bg-green-900/20 rounded-lg p-3 text-center border border-green-800/30">
                            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
                            <div className="text-green-600 text-xs">Approved</div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800">
                            <div className="text-2xl font-bold text-gray-400">{stats.dismissed}</div>
                            <div className="text-gray-600 text-xs">Dismissed</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        {(['all', 'pending', 'approved', 'dismissed'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                                {f !== 'all' && ` (${stats[f as keyof typeof stats] || 0})`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Posts List */}
                <div className="flex-1 overflow-y-auto">
                    {getFilteredPosts().length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-4xl mb-4">✨</p>
                            <p>No posts with this filter</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {getFilteredPosts().map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => {
                                        setSelectedPost(post)
                                        setIsEditing(false)
                                        setEditContent(post.editedContent || post.content)
                                    }}
                                    className={`p-4 hover:bg-gray-900/50 cursor-pointer transition-colors ${selectedPost?.id === post.id ? 'bg-gray-900 border-l-2 border-l-violet-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Post Number */}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${post.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                                                post.status === 'dismissed' ? 'bg-gray-800 text-gray-500' :
                                                    'bg-violet-900/30 text-violet-400'
                                            }`}>
                                            {post.id}
                                        </div>

                                        {/* Content Preview */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-medium">{post.theme}</h3>
                                                <span className={`px-2 py-0.5 text-xs rounded ${STATUS_STYLES[post.status].bg} ${STATUS_STYLES[post.status].text}`}>
                                                    {STATUS_STYLES[post.status].label}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm line-clamp-2">
                                                {(post.editedContent || post.content).substring(0, 150)}...
                                            </p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-gray-600 text-xs">
                                                    {post.characterCount} chars
                                                </span>
                                                <span className="text-gray-600 text-xs">
                                                    💼 LinkedIn
                                                </span>
                                                <div className="flex gap-1">
                                                    {post.suggestedHashtags.slice(0, 2).map((tag, i) => (
                                                        <span key={i} className="text-blue-400 text-xs">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-2">
                                            {post.status !== 'approved' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        updatePostStatus(post.id, 'approved')
                                                    }}
                                                    className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm"
                                                >
                                                    ✓ Approve
                                                </button>
                                            )}
                                            {post.status === 'approved' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        copyContent(post)
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-sm ${copyFeedback === post.id
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                                                        }`}
                                                >
                                                    {copyFeedback === post.id ? '✓ Copied!' : '📋 Copy'}
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
            {selectedPost && (
                <div className="w-[550px] border-l border-gray-800 flex flex-col bg-gray-950">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-medium">Post #{selectedPost.id}</h3>
                            <p className="text-gray-500 text-sm">{selectedPost.theme}</p>
                        </div>
                        <button
                            onClick={() => setSelectedPost(null)}
                            className="text-gray-500 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${STATUS_STYLES[selectedPost.status].bg}`}>
                            <span className={STATUS_STYLES[selectedPost.status].text}>
                                {STATUS_STYLES[selectedPost.status].label}
                            </span>
                        </div>

                        {/* Content */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-gray-500 text-xs uppercase tracking-wide">Content</label>
                                {!isEditing && (
                                    <button
                                        onClick={() => {
                                            setIsEditing(true)
                                            setEditContent(selectedPost.editedContent || selectedPost.content)
                                        }}
                                        className="text-xs text-violet-400 hover:text-violet-300"
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows={16}
                                        className="w-full px-4 py-3 bg-gray-900 border border-violet-500/50 rounded-xl text-gray-200 text-sm font-sans resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="Edit your content..."
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 text-xs">{editContent.length} characters</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => saveEdit(selectedPost.id)}
                                                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                                    <pre className="text-gray-200 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                        {selectedPost.editedContent || selectedPost.content}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Hashtags */}
                        <div>
                            <label className="block text-gray-500 text-xs uppercase tracking-wide mb-2">Suggested Hashtags</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedPost.suggestedHashtags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-900/30 text-blue-400 text-sm rounded-full border border-blue-800/30">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Meta Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                                <div className="text-gray-500 text-xs mb-1">Character Count</div>
                                <div className="text-white font-medium">{selectedPost.characterCount}</div>
                            </div>
                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                                <div className="text-gray-500 text-xs mb-1">Platform</div>
                                <div className="text-white font-medium">💼 LinkedIn</div>
                            </div>
                        </div>

                        {/* CTA Info */}
                        {campaignData && (
                            <div className="bg-violet-900/20 rounded-lg p-4 border border-violet-800/30">
                                <div className="text-violet-400 text-xs mb-1">Call to Action</div>
                                <div className="text-white font-medium">{campaignData.cta}</div>
                                <a
                                    href={campaignData.ctaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-violet-400 text-sm hover:underline mt-1 inline-block"
                                >
                                    {campaignData.ctaUrl} →
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-800">
                        <div className="grid grid-cols-3 gap-2">
                            {selectedPost.status !== 'dismissed' && (
                                <button
                                    onClick={() => updatePostStatus(selectedPost.id, 'dismissed')}
                                    className="px-4 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                                >
                                    ❌ Dismiss
                                </button>
                            )}
                            {selectedPost.status === 'dismissed' && (
                                <button
                                    onClick={() => updatePostStatus(selectedPost.id, 'pending')}
                                    className="px-4 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                                >
                                    ↩️ Restore
                                </button>
                            )}

                            {selectedPost.status !== 'approved' && (
                                <button
                                    onClick={() => updatePostStatus(selectedPost.id, 'approved')}
                                    className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    ✅ Approve
                                </button>
                            )}

                            <button
                                onClick={() => copyContent(selectedPost)}
                                className={`px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 ${copyFeedback === selectedPost.id
                                        ? 'bg-green-600 text-white'
                                        : 'bg-violet-600 text-white hover:bg-violet-700'
                                    }`}
                            >
                                {copyFeedback === selectedPost.id ? '✓ Copied!' : '📋 Copy'}
                            </button>
                        </div>

                        {selectedPost.status === 'approved' && (
                            <button
                                className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-700 hover:to-violet-700 flex items-center justify-center gap-2 font-medium"
                            >
                                🚀 Schedule to Publish
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
