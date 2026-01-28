'use client'

import { useState, useEffect } from 'react'

interface ContentPost {
    id: number
    theme: string
    hook: string
    content: string
    characterCount: number
    suggestedHashtags: string[]
    status: 'pending' | 'approved' | 'dismissed' | 'scheduled'
    editedContent?: string
    imageUrl?: string
}

interface CampaignData {
    campaign: string
    source: string
    generatedAt: string
    cta: string
    ctaUrl: string
    posts: ContentPost[]
}

const COLUMNS = [
    { id: 'pending', title: '📝 Pending Review', color: 'from-yellow-600/20 to-orange-600/20', border: 'border-yellow-500/30' },
    { id: 'approved', title: '✅ Approved', color: 'from-green-600/20 to-emerald-600/20', border: 'border-green-500/30' },
    { id: 'scheduled', title: '📅 Scheduled', color: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/30' },
    { id: 'dismissed', title: '❌ Dismissed', color: 'from-gray-600/20 to-gray-700/20', border: 'border-gray-500/30' },
]

export function ContentReview() {
    const [campaignData, setCampaignData] = useState<CampaignData | null>(null)
    const [posts, setPosts] = useState<ContentPost[]>([])
    const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [copyFeedback, setCopyFeedback] = useState<number | null>(null)
    const [draggedPost, setDraggedPost] = useState<ContentPost | null>(null)

    useEffect(() => {
        loadPosts()
    }, [])

    const loadPosts = async () => {
        try {
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

    const handleDragStart = (post: ContentPost) => {
        setDraggedPost(post)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (status: ContentPost['status']) => {
        if (draggedPost) {
            updatePostStatus(draggedPost.id, status)
            setDraggedPost(null)
        }
    }

    const getPostsByStatus = (status: string) => {
        return posts.filter(p => p.status === status)
    }

    const stats = {
        total: posts.length,
        pending: posts.filter(p => p.status === 'pending').length,
        approved: posts.filter(p => p.status === 'approved').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        dismissed: posts.filter(p => p.status === 'dismissed').length,
    }

    return (
        <div className="flex h-full bg-gray-950">
            {/* Kanban Board */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                📋 Content Review Board
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {campaignData?.campaign || 'Loading...'} • Drag cards between columns
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2 text-sm">
                                <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full">{stats.pending} pending</span>
                                <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full">{stats.approved} approved</span>
                                <span className="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full">{stats.scheduled} scheduled</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kanban Columns */}
                <div className="flex-1 overflow-x-auto p-6">
                    <div className="flex gap-4 h-full min-w-max">
                        {COLUMNS.map(column => (
                            <div
                                key={column.id}
                                className={`w-80 flex flex-col bg-gradient-to-b ${column.color} rounded-xl border ${column.border} flex-shrink-0`}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(column.id as ContentPost['status'])}
                            >
                                {/* Column Header */}
                                <div className="p-4 border-b border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-white">{column.title}</h3>
                                        <span className="text-gray-400 text-sm bg-gray-800/50 px-2 py-0.5 rounded">
                                            {getPostsByStatus(column.id).length}
                                        </span>
                                    </div>
                                </div>

                                {/* Cards */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {getPostsByStatus(column.id).map(post => (
                                        <div
                                            key={post.id}
                                            draggable
                                            onDragStart={() => handleDragStart(post)}
                                            onClick={() => {
                                                setSelectedPost(post)
                                                setIsEditing(false)
                                                setEditContent(post.editedContent || post.content)
                                            }}
                                            className={`bg-gray-900/80 backdrop-blur rounded-xl p-4 cursor-pointer border border-gray-700/50 hover:border-violet-500/50 transition-all hover:shadow-lg hover:shadow-violet-500/10 ${selectedPost?.id === post.id ? 'ring-2 ring-violet-500 border-violet-500' : ''
                                                } ${draggedPost?.id === post.id ? 'opacity-50' : ''}`}
                                        >
                                            {/* Card Header */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-8 h-8 bg-violet-600/30 rounded-lg flex items-center justify-center text-violet-400 font-bold text-sm flex-shrink-0">
                                                    {post.id}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-medium text-sm truncate">{post.theme}</h4>
                                                    <p className="text-gray-500 text-xs">💼 LinkedIn</p>
                                                </div>
                                            </div>

                                            {/* Content Preview */}
                                            <p className="text-gray-400 text-xs line-clamp-3 mb-3">
                                                {(post.editedContent || post.content).substring(0, 120)}...
                                            </p>

                                            {/* Card Footer */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-1">
                                                    {post.suggestedHashtags.slice(0, 2).map((tag, i) => (
                                                        <span key={i} className="text-blue-400 text-xs bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="text-gray-600 text-xs">{post.characterCount} chars</span>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/50">
                                                {column.id === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                updatePostStatus(post.id, 'approved')
                                                            }}
                                                            className="flex-1 px-2 py-1.5 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 text-xs font-medium"
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                updatePostStatus(post.id, 'dismissed')
                                                            }}
                                                            className="px-2 py-1.5 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-700 text-xs"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                )}
                                                {column.id === 'approved' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                copyContent(post)
                                                            }}
                                                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium ${copyFeedback === post.id
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30'
                                                                }`}
                                                        >
                                                            {copyFeedback === post.id ? '✓ Copied!' : '📋 Copy'}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                updatePostStatus(post.id, 'scheduled')
                                                            }}
                                                            className="px-2 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-xs"
                                                        >
                                                            📅
                                                        </button>
                                                    </>
                                                )}
                                                {column.id === 'scheduled' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            copyContent(post)
                                                        }}
                                                        className="flex-1 px-2 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-xs font-medium"
                                                    >
                                                        🚀 Ready to Post
                                                    </button>
                                                )}
                                                {column.id === 'dismissed' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            updatePostStatus(post.id, 'pending')
                                                        }}
                                                        className="flex-1 px-2 py-1.5 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-700 text-xs font-medium"
                                                    >
                                                        ↩️ Restore
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {getPostsByStatus(column.id).length === 0 && (
                                        <div className="flex items-center justify-center h-32 text-gray-600 text-sm border-2 border-dashed border-gray-700/50 rounded-xl">
                                            Drop cards here
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detail Panel */}
            {selectedPost && (
                <div className="w-[480px] border-l border-gray-800 flex flex-col bg-gray-950 flex-shrink-0">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-medium">Post #{selectedPost.id}</h3>
                            <p className="text-gray-500 text-sm">{selectedPost.theme}</p>
                        </div>
                        <button
                            onClick={() => setSelectedPost(null)}
                            className="text-gray-500 hover:text-white w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                        rows={14}
                                        className="w-full px-4 py-3 bg-gray-900 border border-violet-500/50 rounded-xl text-gray-200 text-sm font-sans resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 max-h-80 overflow-y-auto">
                                    <pre className="text-gray-200 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                        {selectedPost.editedContent || selectedPost.content}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Hashtags */}
                        <div>
                            <label className="block text-gray-500 text-xs uppercase tracking-wide mb-2">Hashtags</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedPost.suggestedHashtags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-900/30 text-blue-400 text-sm rounded-full border border-blue-800/30">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                                <div className="text-gray-500 text-xs mb-1">Characters</div>
                                <div className="text-white font-medium">{selectedPost.characterCount}</div>
                            </div>
                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                                <div className="text-gray-500 text-xs mb-1">Platform</div>
                                <div className="text-white font-medium">💼 LinkedIn</div>
                            </div>
                        </div>

                        {/* CTA */}
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
                    <div className="p-4 border-t border-gray-800 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => updatePostStatus(selectedPost.id, 'dismissed')}
                                className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm"
                            >
                                ❌ Dismiss
                            </button>
                            <button
                                onClick={() => updatePostStatus(selectedPost.id, 'approved')}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                                ✅ Approve
                            </button>
                            <button
                                onClick={() => copyContent(selectedPost)}
                                className={`px-3 py-2 rounded-lg text-sm ${copyFeedback === selectedPost.id
                                        ? 'bg-green-600 text-white'
                                        : 'bg-violet-600 text-white hover:bg-violet-700'
                                    }`}
                            >
                                {copyFeedback === selectedPost.id ? '✓ Copied!' : '📋 Copy'}
                            </button>
                        </div>
                        {selectedPost.status === 'approved' && (
                            <button
                                onClick={() => updatePostStatus(selectedPost.id, 'scheduled')}
                                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-700 hover:to-violet-700 text-sm font-medium"
                            >
                                📅 Schedule for Publishing
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
