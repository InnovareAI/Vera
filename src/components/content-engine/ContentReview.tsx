'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useWorkspace, useAuth } from '@/contexts/AuthContext'
import { ApprovalPanel, RoleBadge, StatusBadge } from './ApprovalPanel'
import { useApproval, getStatusConfig } from '@/hooks/useApproval'

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
    { id: 'pending', title: '📝 Pending Review', color: 'bg-amber-50', border: 'border-amber-200', headerBg: 'bg-amber-100', accent: 'text-amber-700' },
    { id: 'approved', title: '✅ Approved', color: 'bg-emerald-50', border: 'border-emerald-200', headerBg: 'bg-emerald-100', accent: 'text-emerald-700' },
    { id: 'scheduled', title: '📅 Scheduled', color: 'bg-sky-50', border: 'border-sky-200', headerBg: 'bg-sky-100', accent: 'text-sky-700' },
    { id: 'dismissed', title: '❌ Dismissed', color: 'bg-gray-50', border: 'border-gray-200', headerBg: 'bg-gray-100', accent: 'text-gray-500' },
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
    const { user } = useAuth()
    const { currentWorkspace } = useWorkspace()

    // Use provided workspaceId or fall back to current workspace
    const activeWorkspaceId = workspaceId || currentWorkspace?.id || ''
    const userId = user?.id || ''

    // HITL Approval System
    const approval = useApproval({
        workspaceId: activeWorkspaceId,
        userId
    })

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
    const [approvalFeedback, setApprovalFeedback] = useState<{ id: number; type: 'success' | 'error'; message: string } | null>(null)

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

    // HITL Approval Actions with role-based permissions
    const handleApprovalAction = async (
        postId: number,
        action: 'approve' | 'reject' | 'request_changes' | 'submit',
        notes?: string
    ) => {
        // For now, map the numeric local ID - in production this would be the UUID
        const contentId = String(postId) // This should be the actual UUID from the database

        let result
        switch (action) {
            case 'approve':
                if (!approval.canPerform('approve')) {
                    setApprovalFeedback({
                        id: postId,
                        type: 'error',
                        message: 'Only admins and owners can approve content'
                    })
                    setTimeout(() => setApprovalFeedback(null), 5000)
                    return
                }
                result = await approval.approve(contentId, notes)
                if (result.success) {
                    updatePostStatus(postId, 'approved')
                    setApprovalFeedback({ id: postId, type: 'success', message: 'Content approved!' })
                }
                break
            case 'reject':
                if (!approval.canPerform('reject')) {
                    setApprovalFeedback({
                        id: postId,
                        type: 'error',
                        message: 'You do not have permission to reject content'
                    })
                    setTimeout(() => setApprovalFeedback(null), 5000)
                    return
                }
                result = await approval.reject(contentId, notes)
                if (result.success) {
                    updatePostStatus(postId, 'dismissed')
                    setApprovalFeedback({ id: postId, type: 'success', message: 'Content rejected' })
                }
                break
            case 'request_changes':
                if (!approval.canPerform('request_changes')) {
                    setApprovalFeedback({
                        id: postId,
                        type: 'error',
                        message: 'You do not have permission to request changes'
                    })
                    setTimeout(() => setApprovalFeedback(null), 5000)
                    return
                }
                result = await approval.requestChanges(contentId, notes || 'Changes needed')
                if (result.success) {
                    updatePostStatus(postId, 'pending')
                    setApprovalFeedback({ id: postId, type: 'success', message: 'Changes requested' })
                }
                break
            case 'submit':
                if (!approval.canPerform('submit')) {
                    setApprovalFeedback({
                        id: postId,
                        type: 'error',
                        message: 'You do not have permission to submit content'
                    })
                    setTimeout(() => setApprovalFeedback(null), 5000)
                    return
                }
                result = await approval.submitForReview(contentId, notes)
                if (result.success) {
                    updatePostStatus(postId, 'pending')
                    setApprovalFeedback({ id: postId, type: 'success', message: 'Submitted for review' })
                }
                break
        }

        if (result && !result.success) {
            setApprovalFeedback({
                id: postId,
                type: 'error',
                message: result.error || 'Action failed'
            })
        }

        setTimeout(() => setApprovalFeedback(null), 3000)
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
        <div className="flex h-full bg-gradient-to-br from-slate-50 to-white">
            {/* Kanban Board */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                📋 Content Review Board
                                {approval.userInfo && (
                                    <span className={`ml-3 px-3 py-1 text-xs font-medium rounded-full ${approval.userInfo.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                        approval.userInfo.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                            approval.userInfo.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {approval.userInfo.role.charAt(0).toUpperCase() + approval.userInfo.role.slice(1)}
                                    </span>
                                )}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {campaignData?.campaign || 'Loading...'} • Drag cards between columns
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* View Switcher */}
                            <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                                {VIEWS.map(view => (
                                    <button
                                        key={view.id}
                                        onClick={() => setViewMode(view.id)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${viewMode === view.id
                                            ? 'bg-white text-violet-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        title={view.label}
                                    >
                                        <span className="text-base">{view.icon}</span>
                                        <span className="hidden lg:inline">{view.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 text-sm">
                                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full font-medium">{stats.pending} pending</span>
                                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">{stats.approved} approved</span>
                                <span className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full font-medium">{stats.scheduled} scheduled</span>
                            </div>
                            {(stats.approved > 0 || stats.scheduled > 0) && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={exportAsPDF}
                                        className="px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl hover:from-rose-600 hover:to-orange-600 text-sm font-medium flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all hover:shadow-rose-500/30"
                                    >
                                        📄 Export PDF
                                    </button>
                                    <button
                                        onClick={exportApprovedPosts}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium flex items-center gap-2 border border-gray-200"
                                    >
                                        📥 HTML
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* View Content */}
                <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-slate-50/50 to-white">
                    {/* Kanban View */}
                    {viewMode === 'kanban' && (
                        <div className="flex gap-5 h-full min-w-max">
                            {COLUMNS.map(column => (
                                <div
                                    key={column.id}
                                    className={`w-80 flex flex-col ${column.color} rounded-2xl border-2 ${column.border} flex-shrink-0 shadow-sm`}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(column.id as ContentPost['status'])}
                                >
                                    {/* Column Header */}
                                    <div className={`p-4 border-b ${column.border} ${column.headerBg} rounded-t-2xl`}>
                                        <div className="flex items-center justify-between">
                                            <h3 className={`font-semibold ${column.accent}`}>{column.title}</h3>
                                            <span className={`${column.accent} text-sm bg-white/60 px-2.5 py-0.5 rounded-full font-medium`}>
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
                                                className={`bg-white rounded-xl p-4 cursor-pointer border border-gray-100 hover:border-violet-300 transition-all hover:shadow-lg hover:shadow-violet-100 ${selectedPost?.id === post.id ? 'ring-2 ring-violet-400 border-violet-400' : ''
                                                    } ${draggedPost?.id === post.id ? 'opacity-50' : ''}`}
                                            >
                                                {/* Image Thumbnail */}
                                                {post.imageUrl && (
                                                    <div className="mb-3 rounded-lg overflow-hidden shadow-sm">
                                                        <img
                                                            src={post.imageUrl}
                                                            alt={post.theme}
                                                            className="w-full h-32 object-cover"
                                                        />
                                                    </div>
                                                )}

                                                {/* Card Header */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                                        {post.id}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-gray-900 font-medium text-sm truncate">{post.theme}</h4>
                                                        <p className="text-gray-400 text-xs">💼 LinkedIn</p>
                                                    </div>
                                                </div>

                                                {/* Content Preview */}
                                                <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                                                    {(post.editedContent || post.content).substring(0, 100)}...
                                                </p>

                                                {/* Card Footer */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-1">
                                                        {post.suggestedHashtags.slice(0, 2).map((tag, i) => (
                                                            <span key={i} className="text-blue-600 text-xs bg-blue-50 px-1.5 py-0.5 rounded">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-gray-400 text-xs">{post.characterCount} chars</span>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                                    {column.id === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleApprovalAction(post.id, 'approve')
                                                                }}
                                                                disabled={!approval.canPerform('approve')}
                                                                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${approval.canPerform('approve')
                                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    }`}
                                                                title={!approval.canPerform('approve') ? 'Only admins/owners can approve' : ''}
                                                            >
                                                                ✓ Approve
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleApprovalAction(post.id, 'reject')
                                                                }}
                                                                disabled={!approval.canPerform('reject')}
                                                                className={`px-2 py-1.5 rounded-lg text-xs transition-all ${approval.canPerform('reject')
                                                                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                                    }`}
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
                <div className="w-[480px] border-l border-gray-200 flex flex-col bg-white flex-shrink-0 shadow-xl">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50">
                        <div>
                            <h3 className="text-gray-900 font-medium">Post #{selectedPost.id}</h3>
                            <p className="text-gray-500 text-sm">{selectedPost.theme}</p>
                        </div>
                        <button
                            onClick={() => setSelectedPost(null)}
                            className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Image Preview */}
                        {selectedPost.imageUrl && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-gray-500 text-xs uppercase tracking-wide font-medium">Post Image</label>
                                    <a
                                        href={selectedPost.imageUrl}
                                        download={`${selectedPost.theme.replace(/\s+/g, '-').toLowerCase()}.png`}
                                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                                    >
                                        ⬇️ Download
                                    </a>
                                </div>
                                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
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
                                <label className="block text-gray-500 text-xs uppercase tracking-wide font-medium">Content</label>
                                {!isEditing && (
                                    <button
                                        onClick={() => {
                                            setIsEditing(true)
                                            setEditContent(selectedPost.editedContent || selectedPost.content)
                                        }}
                                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
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
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-violet-200 rounded-xl text-gray-800 text-sm font-sans resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 text-xs">{editContent.length} characters</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => saveEdit(selectedPost.id)}
                                                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm transition-all shadow-sm"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-80 overflow-y-auto">
                                    <pre className="text-gray-700 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                        {selectedPost.editedContent || selectedPost.content}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Hashtags */}
                        <div>
                            <label className="block text-gray-500 text-xs uppercase tracking-wide mb-2 font-medium">Hashtags</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedPost.suggestedHashtags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full border border-blue-100 font-medium">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                <div className="text-gray-400 text-xs mb-1 font-medium">Characters</div>
                                <div className="text-gray-900 font-semibold">{selectedPost.characterCount}</div>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                <div className="text-gray-400 text-xs mb-1 font-medium">Platform</div>
                                <div className="text-gray-900 font-semibold">💼 LinkedIn</div>
                            </div>
                        </div>

                        {/* CTA */}
                        {campaignData && (
                            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 shadow-sm">
                                <div className="text-violet-600 text-xs mb-1 font-medium">Call to Action</div>
                                <div className="text-gray-900 font-semibold">{campaignData.cta}</div>
                                <a
                                    href={campaignData.ctaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-violet-600 text-sm hover:underline mt-1 inline-block font-medium"
                                >
                                    {campaignData.ctaUrl} →
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-200 space-y-3 bg-gray-50/50">
                        {/* Role Badge & Status */}
                        <div className="flex items-center justify-between mb-2">
                            {approval.userInfo && (
                                <RoleBadge role={approval.userInfo.role} />
                            )}
                            <StatusBadge status={selectedPost.status} />
                        </div>

                        {/* Approval Feedback */}
                        {approvalFeedback && approvalFeedback.id === selectedPost.id && (
                            <div className={`p-3 rounded-xl text-sm font-medium ${approvalFeedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {approvalFeedback.message}
                            </div>
                        )}

                        {/* Permission Notice for Viewers */}
                        {approval.userInfo?.role === 'viewer' && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium">
                                ⚠️ As a viewer, you can only view content. Contact an admin to gain edit permissions.
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleApprovalAction(selectedPost.id, 'reject')}
                                disabled={!approval.canPerform('reject') || approval.actionLoading === String(selectedPost.id)}
                                className={`px-3 py-2 rounded-xl text-sm transition-all ${approval.canPerform('reject')
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                    }`}
                                title={!approval.canPerform('reject') ? 'Only admins and owners can reject' : 'Reject content'}
                            >
                                ❌ Reject
                            </button>
                            <button
                                onClick={() => handleApprovalAction(selectedPost.id, 'approve')}
                                disabled={!approval.canPerform('approve') || approval.actionLoading === String(selectedPost.id)}
                                className={`px-3 py-2 rounded-xl text-sm transition-all ${approval.canPerform('approve')
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-sm'
                                    : 'bg-emerald-50 text-emerald-300 cursor-not-allowed'
                                    }`}
                                title={!approval.canPerform('approve') ? 'Only admins and owners can approve' : 'Approve content'}
                            >
                                {approval.actionLoading === String(selectedPost.id) ? '...' : '✅ Approve'}
                            </button>
                            <button
                                onClick={() => copyContent(selectedPost)}
                                className={`px-3 py-2 rounded-xl text-sm transition-all ${copyFeedback === selectedPost.id
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-sm'
                                    }`}
                            >
                                {copyFeedback === selectedPost.id ? '✓ Copied!' : '📋 Copy'}
                            </button>
                        </div>

                        {/* Request Changes (for editors) */}
                        {approval.canPerform('request_changes') && selectedPost.status === 'pending' && (
                            <button
                                onClick={() => {
                                    const notes = prompt('What changes are needed?')
                                    if (notes) handleApprovalAction(selectedPost.id, 'request_changes', notes)
                                }}
                                className="w-full px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 text-sm font-medium transition-all"
                            >
                                ✏️ Request Changes
                            </button>
                        )}

                        {(selectedPost.status === 'approved' || selectedPost.status === 'scheduled') && (
                            <button
                                onClick={() => postToLinkedIn(selectedPost)}
                                disabled={postingId === selectedPost.id || !approval.canPerform('publish')}
                                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${!approval.canPerform('publish')
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : postingId === selectedPost.id
                                        ? 'bg-blue-100 text-blue-400 cursor-wait'
                                        : postingSuccess === selectedPost.id
                                            ? 'bg-emerald-500 text-white shadow-lg'
                                            : 'bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600 shadow-lg shadow-blue-500/20'
                                    }`}
                                title={!approval.canPerform('publish') ? 'Only admins and owners can publish' : 'Post to LinkedIn'}
                            >
                                {postingId === selectedPost.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-400 rounded-full animate-spin" />
                                        Posting to LinkedIn...
                                    </span>
                                ) : postingSuccess === selectedPost.id ? (
                                    '✅ Posted to LinkedIn!'
                                ) : !approval.canPerform('publish') ? (
                                    '🔒 Publishing Restricted'
                                ) : (
                                    '💼 Post to LinkedIn Now'
                                )}
                            </button>
                        )}

                        {/* Error message */}
                        {postingError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-medium">
                                ⚠️ {postingError}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
