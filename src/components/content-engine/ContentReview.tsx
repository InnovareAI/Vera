'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'

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

type ViewMode = 'kanban' | 'cards' | 'list' | 'timeline' | 'gantt'

const VIEWS: { id: ViewMode; icon: string; label: string }[] = [
    { id: 'kanban', icon: '▦', label: 'Kanban' },
    { id: 'cards', icon: '▣', label: 'Cards' },
    { id: 'list', icon: '☰', label: 'List' },
    { id: 'timeline', icon: '⟿', label: 'Timeline' },
    { id: 'gantt', icon: '▤', label: 'Gantt' },
]

interface ContentReviewProps {
    workspaceId?: string
}

export function ContentReview({ workspaceId }: ContentReviewProps) {
    const supabase = getSupabase()
    const [campaignData, setCampaignData] = useState<CampaignData | null>(null)
    const [posts, setPosts] = useState<ContentPost[]>([])
    const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [copyFeedback, setCopyFeedback] = useState<number | null>(null)
    const [draggedPost, setDraggedPost] = useState<ContentPost | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>('kanban')
    const [postingId, setPostingId] = useState<number | null>(null)
    const [postingError, setPostingError] = useState<string | null>(null)
    const [postingSuccess, setPostingSuccess] = useState<number | null>(null)

    useEffect(() => {
        loadPosts()
    }, [workspaceId])

    const loadPosts = async () => {
        try {
            // If workspaceId provided, try to load from database first
            if (workspaceId) {
                const { data: contentItems, error } = await supabase
                    .from('content_items')
                    .select('*, campaign:campaigns(*)')
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: false })

                if (!error && contentItems && contentItems.length > 0) {
                    // Map database items to our ContentPost format
                    const dbPosts: ContentPost[] = contentItems.map((item: any, index: number) => ({
                        id: index + 1,
                        theme: item.theme || 'Content',
                        hook: item.hook || '',
                        content: item.content,
                        characterCount: item.character_count || item.content.length,
                        suggestedHashtags: item.hashtags || [],
                        status: item.status as ContentPost['status'],
                        imageUrl: item.image_url,
                        editedContent: item.content
                    }))

                    // Get campaign info from first item if available
                    const firstCampaign = contentItems[0]?.campaign
                    setCampaignData({
                        campaign: firstCampaign?.name || 'Workspace Content',
                        source: firstCampaign?.source_url || 'Generated',
                        generatedAt: contentItems[0]?.created_at || new Date().toISOString(),
                        cta: 'Learn more',
                        ctaUrl: firstCampaign?.source_url || '#',
                        posts: dbPosts
                    })
                    setPosts(dbPosts)
                    return
                }
            }

            // Fall back to demo data from JSON file
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

    const postToLinkedIn = async (post: ContentPost) => {
        setPostingId(post.id)
        setPostingError(null)
        setPostingSuccess(null)

        try {
            // Build the full post content with hashtags
            const fullContent = `${post.editedContent || post.content}\n\n${post.suggestedHashtags.join(' ')}`

            const response = await fetch('/api/linkedin/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: fullContent,
                    imageUrl: post.imageUrl,
                    workspaceId
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to post to LinkedIn')
            }

            // Mark as success
            setPostingSuccess(post.id)
            setTimeout(() => setPostingSuccess(null), 3000)

            // Update post status to indicate it was published
            updatePostStatus(post.id, 'scheduled')
        } catch (error: any) {
            console.error('LinkedIn post error:', error)
            setPostingError(error.message)
            setTimeout(() => setPostingError(null), 5000)
        } finally {
            setPostingId(null)
        }
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

    const exportApprovedPosts = async () => {
        const approvedPosts = posts.filter(p => p.status === 'approved' || p.status === 'scheduled')
        if (approvedPosts.length === 0) {
            alert('No approved or scheduled posts to export')
            return
        }

        // Convert images to base64 for fully self-contained document
        const imageToBase64 = async (url: string): Promise<string> => {
            try {
                const response = await fetch(url)
                const blob = await response.blob()
                return new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(blob)
                })
            } catch {
                return ''
            }
        }

        // Pre-load all images as base64
        const postsWithImages = await Promise.all(
            approvedPosts.map(async (post) => {
                if (post.imageUrl) {
                    const base64Image = await imageToBase64(post.imageUrl)
                    return { ...post, base64Image }
                }
                return { ...post, base64Image: '' }
            })
        )

        // Generate HTML document - fully anonymous, no URLs
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkedIn Content Series - Ready for Publishing</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 40px; border-radius: 16px; margin-bottom: 30px; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { opacity: 0.9; }
        .post { background: white; border-radius: 16px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); page-break-inside: avoid; }
        .post-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
        .post-number { width: 40px; height: 40px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .post-theme { font-size: 18px; font-weight: 600; color: #1a1a1a; }
        .post-platform { font-size: 12px; color: #666; }
        .post-image { width: 100%; border-radius: 12px; margin-bottom: 20px; }
        .post-content { white-space: pre-wrap; color: #333; font-size: 15px; margin-bottom: 20px; }
        .hashtags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .hashtag { background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 13px; }
        .cta { background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 10px; }
        .cta-label { font-size: 11px; color: #16a34a; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
        .cta-text { color: #166534; font-weight: 500; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 40px; }
        @media print { body { padding: 20px; background: white; } .post { box-shadow: none; border: 1px solid #ddd; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LinkedIn Content Series</h1>
            <p>${postsWithImages.length} posts ready for publishing</p>
        </div>
        ${postsWithImages.map(post => `
        <div class="post">
            <div class="post-header">
                <div class="post-number">${post.id}</div>
                <div>
                    <div class="post-theme">${post.theme}</div>
                    <div class="post-platform">💼 LinkedIn • ${post.characterCount} characters</div>
                </div>
            </div>
            ${post.base64Image ? `<img class="post-image" src="${post.base64Image}" alt="${post.theme}">` : ''}
            <div class="post-content">${(post.editedContent || post.content).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <div class="hashtags">
                ${post.suggestedHashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('')}
            </div>
            <div class="cta">
                <div class="cta-label">Call to Action</div>
                <div class="cta-text">${campaignData?.cta || 'Learn more'}</div>
            </div>
        </div>
        `).join('')}
        <div class="footer">
            Content Export • ${new Date().toLocaleDateString()} • Ready for LinkedIn publishing
        </div>
    </div>
</body>
</html>`

        // Download the file
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `linkedin-content-${new Date().toISOString().split('T')[0]}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const exportAsPDF = async () => {
        const approvedPosts = posts.filter(p => p.status === 'approved' || p.status === 'scheduled')
        if (approvedPosts.length === 0) {
            alert('No approved or scheduled posts to export')
            return
        }

        // Convert images to base64 for fully self-contained document
        const imageToBase64 = async (url: string): Promise<string> => {
            try {
                const response = await fetch(url)
                const blob = await response.blob()
                return new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(blob)
                })
            } catch {
                return ''
            }
        }

        // Pre-load all images as base64
        const postsWithImages = await Promise.all(
            approvedPosts.map(async (post) => {
                if (post.imageUrl) {
                    const base64Image = await imageToBase64(post.imageUrl)
                    return { ...post, base64Image }
                }
                return { ...post, base64Image: '' }
            })
        )

        // Generate print-optimized HTML
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>LinkedIn Content - Ready for Publishing</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; padding: 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header h1 { font-size: 24px; margin-bottom: 6px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .post { background: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e5e5; page-break-inside: avoid; }
        .post-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5; }
        .post-number { width: 32px; height: 32px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .post-theme { font-size: 16px; font-weight: 600; color: #1a1a1a; }
        .post-platform { font-size: 11px; color: #666; }
        .post-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 16px; }
        .post-content { white-space: pre-wrap; color: #333; font-size: 14px; margin-bottom: 16px; line-height: 1.7; }
        .hashtags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .hashtag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 16px; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .cta { background: #f0fdf4; border: 1px solid #86efac; padding: 12px; border-radius: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .cta-label { font-size: 10px; color: #16a34a; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
        .cta-text { color: #166534; font-weight: 500; font-size: 13px; }
        .footer { text-align: center; color: #888; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
        @media print { 
            body { padding: 0; } 
            .post { break-inside: avoid; }
            .header, .post-number, .hashtag, .cta { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LinkedIn Content Series</h1>
            <p>${postsWithImages.length} posts ready for publishing</p>
        </div>
        ${postsWithImages.map(post => `
        <div class="post">
            <div class="post-header">
                <div class="post-number">${post.id}</div>
                <div>
                    <div class="post-theme">${post.theme}</div>
                    <div class="post-platform">💼 LinkedIn • ${post.characterCount} characters</div>
                </div>
            </div>
            ${post.base64Image ? `<img class="post-image" src="${post.base64Image}" alt="${post.theme}">` : ''}
            <div class="post-content">${(post.editedContent || post.content).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <div class="hashtags">
                ${post.suggestedHashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('')}
            </div>
            <div class="cta">
                <div class="cta-label">Call to Action</div>
                <div class="cta-text">${campaignData?.cta || 'Learn more'}</div>
            </div>
        </div>
        `).join('')}
        <div class="footer">
            Content Export • ${new Date().toLocaleDateString()} • Ready for LinkedIn publishing
        </div>
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        }
    </script>
</body>
</html>`

        // Open in new window and trigger print
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(htmlContent)
            printWindow.document.close()
        }
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
                            {/* View Switcher */}
                            <div className="flex bg-gray-800 rounded-lg p-1">
                                {VIEWS.map(view => (
                                    <button
                                        key={view.id}
                                        onClick={() => setViewMode(view.id)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${viewMode === view.id
                                            ? 'bg-violet-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                            }`}
                                        title={view.label}
                                    >
                                        <span className="text-base">{view.icon}</span>
                                        <span className="hidden lg:inline">{view.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 text-sm">
                                <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full">{stats.pending} pending</span>
                                <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full">{stats.approved} approved</span>
                                <span className="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full">{stats.scheduled} scheduled</span>
                            </div>
                            {(stats.approved > 0 || stats.scheduled > 0) && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={exportAsPDF}
                                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 text-sm font-medium flex items-center gap-2 shadow-lg shadow-red-500/20"
                                    >
                                        📄 Export PDF
                                    </button>
                                    <button
                                        onClick={exportApprovedPosts}
                                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm font-medium flex items-center gap-2"
                                    >
                                        📥 HTML
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* View Content */}
                <div className="flex-1 overflow-auto p-6">
                    {/* Kanban View */}
                    {viewMode === 'kanban' && (
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
                                                {/* Image Thumbnail */}
                                                {post.imageUrl && (
                                                    <div className="mb-3 rounded-lg overflow-hidden">
                                                        <img
                                                            src={post.imageUrl}
                                                            alt={post.theme}
                                                            className="w-full h-32 object-cover"
                                                        />
                                                    </div>
                                                )}

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
                                                <p className="text-gray-400 text-xs line-clamp-2 mb-3">
                                                    {(post.editedContent || post.content).substring(0, 100)}...
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
                                                                    postToLinkedIn(post)
                                                                }}
                                                                disabled={postingId === post.id}
                                                                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium ${postingId === post.id
                                                                    ? 'bg-blue-600/50 text-blue-300 cursor-wait'
                                                                    : postingSuccess === post.id
                                                                        ? 'bg-green-600 text-white'
                                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                                    }`}
                                                            >
                                                                {postingId === post.id ? '⏳ Posting...' : postingSuccess === post.id ? '✓ Posted!' : '💼 Post'}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    copyContent(post)
                                                                }}
                                                                className={`px-2 py-1.5 rounded-lg text-xs ${copyFeedback === post.id
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30'
                                                                    }`}
                                                            >
                                                                {copyFeedback === post.id ? '✓' : '📋'}
                                                            </button>
                                                        </>
                                                    )}
                                                    {column.id === 'scheduled' && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    postToLinkedIn(post)
                                                                }}
                                                                disabled={postingId === post.id}
                                                                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium ${postingId === post.id
                                                                    ? 'bg-blue-600/50 text-blue-300 cursor-wait'
                                                                    : postingSuccess === post.id
                                                                        ? 'bg-green-600 text-white'
                                                                        : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700'
                                                                    }`}
                                                            >
                                                                {postingId === post.id ? '⏳ Posting...' : postingSuccess === post.id ? '✓ Posted!' : '🚀 Post Now'}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    copyContent(post)
                                                                }}
                                                                className={`px-2 py-1.5 rounded-lg text-xs ${copyFeedback === post.id
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                                    }`}
                                                            >
                                                                📋
                                                            </button>
                                                        </>
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
                    )}

                    {/* Cards View - Grid of all posts */}
                    {viewMode === 'cards' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {posts.map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => {
                                        setSelectedPost(post)
                                        setIsEditing(false)
                                        setEditContent(post.editedContent || post.content)
                                    }}
                                    className={`bg-gray-900 rounded-xl overflow-hidden cursor-pointer border border-gray-700/50 hover:border-violet-500/50 transition-all hover:shadow-xl ${selectedPost?.id === post.id ? 'ring-2 ring-violet-500' : ''
                                        }`}
                                >
                                    {post.imageUrl && (
                                        <img src={post.imageUrl} alt={post.theme} className="w-full h-48 object-cover" />
                                    )}
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                                                post.status === 'scheduled' ? 'bg-blue-600/20 text-blue-400' :
                                                    post.status === 'dismissed' ? 'bg-gray-600/20 text-gray-400' :
                                                        'bg-yellow-600/20 text-yellow-400'
                                                }`}>
                                                {post.status}
                                            </span>
                                            <span className="text-gray-500 text-xs">#{post.id}</span>
                                        </div>
                                        <h4 className="text-white font-medium mb-2">{post.theme}</h4>
                                        <p className="text-gray-400 text-sm line-clamp-3">{(post.editedContent || post.content).substring(0, 120)}...</p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updatePostStatus(post.id, 'approved') }}
                                                className="flex-1 px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-xs hover:bg-green-600/30"
                                            >✓ Approve</button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updatePostStatus(post.id, 'dismissed') }}
                                                className="px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600"
                                            >✕</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List View - Compact table-like view */}
                    {viewMode === 'list' && (
                        <div className="bg-gray-900 rounded-xl border border-gray-700/50 overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-800/50 text-gray-400 text-sm font-medium border-b border-gray-700">
                                <div className="col-span-1">#</div>
                                <div className="col-span-3">Theme</div>
                                <div className="col-span-4">Content Preview</div>
                                <div className="col-span-1">Chars</div>
                                <div className="col-span-1">Status</div>
                                <div className="col-span-2">Actions</div>
                            </div>
                            {posts.map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => {
                                        setSelectedPost(post)
                                        setIsEditing(false)
                                        setEditContent(post.editedContent || post.content)
                                    }}
                                    className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-700/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${selectedPost?.id === post.id ? 'bg-violet-900/20' : ''
                                        }`}
                                >
                                    <div className="col-span-1 text-violet-400 font-medium">{post.id}</div>
                                    <div className="col-span-3 text-white font-medium truncate">{post.theme}</div>
                                    <div className="col-span-4 text-gray-400 text-sm truncate">{(post.editedContent || post.content).substring(0, 80)}...</div>
                                    <div className="col-span-1 text-gray-500 text-sm">{post.characterCount}</div>
                                    <div className="col-span-1">
                                        <span className={`px-2 py-1 rounded-full text-xs ${post.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                                            post.status === 'scheduled' ? 'bg-blue-600/20 text-blue-400' :
                                                post.status === 'dismissed' ? 'bg-gray-600/20 text-gray-400' :
                                                    'bg-yellow-600/20 text-yellow-400'
                                            }`}>{post.status}</span>
                                    </div>
                                    <div className="col-span-2 flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updatePostStatus(post.id, 'approved') }}
                                            className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30"
                                        >✓</button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updatePostStatus(post.id, 'scheduled') }}
                                            className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30"
                                        >📅</button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyContent(post) }}
                                            className="px-2 py-1 bg-violet-600/20 text-violet-400 rounded text-xs hover:bg-violet-600/30"
                                        >📋</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Timeline View */}
                    {viewMode === 'timeline' && (
                        <div className="space-y-0 relative">
                            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                            {posts.map((post, index) => (
                                <div
                                    key={post.id}
                                    onClick={() => {
                                        setSelectedPost(post)
                                        setIsEditing(false)
                                        setEditContent(post.editedContent || post.content)
                                    }}
                                    className={`relative flex gap-6 p-4 cursor-pointer hover:bg-gray-800/30 rounded-lg transition-colors ${selectedPost?.id === post.id ? 'bg-violet-900/20' : ''
                                        }`}
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg z-10 ${post.status === 'approved' ? 'bg-green-600 text-white' :
                                        post.status === 'scheduled' ? 'bg-blue-600 text-white' :
                                            post.status === 'dismissed' ? 'bg-gray-600 text-white' :
                                                'bg-yellow-600 text-black'
                                        }`}>
                                        {post.id}
                                    </div>
                                    <div className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-700/50">
                                        <div className="flex items-start gap-4">
                                            {post.imageUrl && (
                                                <img src={post.imageUrl} alt={post.theme} className="w-24 h-24 rounded-lg object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="text-white font-medium">{post.theme}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${post.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                                                        post.status === 'scheduled' ? 'bg-blue-600/20 text-blue-400' :
                                                            post.status === 'dismissed' ? 'bg-gray-600/20 text-gray-400' :
                                                                'bg-yellow-600/20 text-yellow-400'
                                                        }`}>{post.status}</span>
                                                </div>
                                                <p className="text-gray-400 text-sm line-clamp-2">{(post.editedContent || post.content).substring(0, 150)}...</p>
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={(e) => { e.stopPropagation(); updatePostStatus(post.id, 'approved') }} className="px-3 py-1 bg-green-600/20 text-green-400 rounded text-xs">✓ Approve</button>
                                                    <button onClick={(e) => { e.stopPropagation(); updatePostStatus(post.id, 'scheduled') }} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">📅 Schedule</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Gantt View */}
                    {viewMode === 'gantt' && (
                        <div className="bg-gray-900 rounded-xl border border-gray-700/50 overflow-hidden">
                            <div className="p-4 bg-gray-800/50 border-b border-gray-700">
                                <h3 className="text-white font-medium">Content Publishing Schedule</h3>
                                <p className="text-gray-500 text-sm">Visual timeline of your content pipeline</p>
                            </div>
                            <div className="p-4">
                                {/* Gantt Header */}
                                <div className="flex border-b border-gray-700 pb-2 mb-4">
                                    <div className="w-48 text-gray-400 text-sm font-medium">Post</div>
                                    <div className="flex-1 flex">
                                        {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, i) => (
                                            <div key={i} className="flex-1 text-center text-gray-400 text-sm font-medium">{week}</div>
                                        ))}
                                    </div>
                                </div>
                                {/* Gantt Rows */}
                                {posts.map((post, index) => (
                                    <div
                                        key={post.id}
                                        onClick={() => {
                                            setSelectedPost(post)
                                            setIsEditing(false)
                                            setEditContent(post.editedContent || post.content)
                                        }}
                                        className={`flex items-center py-2 hover:bg-gray-800/30 cursor-pointer rounded ${selectedPost?.id === post.id ? 'bg-violet-900/20' : ''
                                            }`}
                                    >
                                        <div className="w-48 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-violet-600/30 rounded flex items-center justify-center text-violet-400 text-xs font-bold">{post.id}</span>
                                            <span className="text-white text-sm truncate">{post.theme.substring(0, 20)}</span>
                                        </div>
                                        <div className="flex-1 flex relative h-8">
                                            {/* Bar representing post status */}
                                            <div
                                                className={`absolute h-6 rounded-full top-1 ${post.status === 'approved' ? 'bg-gradient-to-r from-green-600 to-green-500' :
                                                    post.status === 'scheduled' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' :
                                                        post.status === 'dismissed' ? 'bg-gray-600' :
                                                            'bg-gradient-to-r from-yellow-600 to-orange-500'
                                                    }`}
                                                style={{
                                                    left: `${(index % 4) * 25}%`,
                                                    width: `${Math.min(25 + (index % 2) * 12.5, 50)}%`
                                                }}
                                            >
                                                <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium truncate px-2">
                                                    {post.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
                        {/* Image Preview */}
                        {selectedPost.imageUrl && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-gray-500 text-xs uppercase tracking-wide">Post Image</label>
                                    <a
                                        href={selectedPost.imageUrl}
                                        download={`${selectedPost.theme.replace(/\s+/g, '-').toLowerCase()}.png`}
                                        className="text-xs text-violet-400 hover:text-violet-300"
                                    >
                                        ⬇️ Download
                                    </a>
                                </div>
                                <div className="rounded-xl overflow-hidden border border-gray-800">
                                    <img
                                        src={selectedPost.imageUrl}
                                        alt={selectedPost.theme}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        )}

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
                        {(selectedPost.status === 'approved' || selectedPost.status === 'scheduled') && (
                            <button
                                onClick={() => postToLinkedIn(selectedPost)}
                                disabled={postingId === selectedPost.id}
                                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${postingId === selectedPost.id
                                    ? 'bg-blue-600/50 text-blue-300 cursor-wait'
                                    : postingSuccess === selectedPost.id
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700'
                                    }`}
                            >
                                {postingId === selectedPost.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                                        Posting to LinkedIn...
                                    </span>
                                ) : postingSuccess === selectedPost.id ? (
                                    '✅ Posted to LinkedIn!'
                                ) : (
                                    '💼 Post to LinkedIn Now'
                                )}
                            </button>
                        )}

                        {/* Error message */}
                        {postingError && (
                            <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-red-400 text-sm">
                                ⚠️ {postingError}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
