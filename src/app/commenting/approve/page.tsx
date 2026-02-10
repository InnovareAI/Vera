'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ── Types ──────────────────────────────────────────────
interface DiscoveredPost {
  id: string
  social_id: string
  share_url: string
  post_content: string
  author_name: string
  author_profile_id: string
  author_headline: string
  hashtags: string[]
  post_date: string
  engagement_metrics: {
    reactions: number
    comments: number
    shares: number
  }
  monitor_id: string
  vera_linkedin_post_monitors?: {
    id: string
    name: string
    hashtags: string[]
    monitor_type: string
  }
}

interface PendingComment {
  id: string
  workspace_id: string
  post_id: string
  comment_text: string
  comment_length: number
  confidence_score: number | null
  tone: string | null
  approach: string | null
  extracted_facts: string[] | null
  suggested_approaches: string[] | null
  status: string
  created_at: string
  updated_at: string
  vera_linkedin_posts_discovered: DiscoveredPost | null
}

// ── Component ──────────────────────────────────────────
export default function CommentApprovalPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [comments, setComments] = useState<PendingComment[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const currentComment = comments[currentIndex] || null

  // ── Fetch pending comments ────────────────────────────
  useEffect(() => {
    if (currentWorkspace) {
      fetchPending()
    }
  }, [currentWorkspace])

  const fetchPending = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const res = await fetch(`/api/commenting/pending?workspace_id=${currentWorkspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setComments(Array.isArray(data) ? data : [])
        setCurrentIndex(0)
        if (data.length > 0) {
          setEditedText(data[0].comment_text || '')
        }
      }
    } catch (err) {
      console.error('Failed to fetch pending comments:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Sync edited text when navigating ──────────────────
  useEffect(() => {
    if (currentComment) {
      setEditedText(currentComment.comment_text || '')
      setIsEditing(false)
    }
  }, [currentIndex, currentComment?.id])

  // ── Show feedback briefly ─────────────────────────────
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message })
    setTimeout(() => setActionFeedback(null), 2500)
  }

  // ── Move to next comment ──────────────────────────────
  const moveToNext = () => {
    const remaining = comments.filter((_, i) => i !== currentIndex)
    setComments(remaining)
    if (currentIndex >= remaining.length) {
      setCurrentIndex(Math.max(0, remaining.length - 1))
    }
  }

  // ── Approve ───────────────────────────────────────────
  const handleApprove = async () => {
    if (!currentComment || !currentWorkspace) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/commenting/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: currentComment.id,
          workspace_id: currentWorkspace.id,
        }),
      })
      if (res.ok) {
        showFeedback('success', 'Comment approved and scheduled')
        moveToNext()
      } else {
        const err = await res.json()
        showFeedback('error', err.error || 'Failed to approve')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Reject ────────────────────────────────────────────
  const handleReject = async () => {
    if (!currentComment) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/commenting/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: currentComment.id,
        }),
      })
      if (res.ok) {
        showFeedback('success', 'Comment rejected')
        moveToNext()
      } else {
        const err = await res.json()
        showFeedback('error', err.error || 'Failed to reject')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Edit & Approve ────────────────────────────────────
  const handleEditAndApprove = async () => {
    if (!currentComment || !currentWorkspace) return
    setActionLoading(true)
    try {
      // First, update comment text
      const patchRes = await fetch(`/api/commenting/comments/${currentComment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: editedText }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json()
        showFeedback('error', err.error || 'Failed to update comment')
        return
      }

      // Then approve
      const approveRes = await fetch('/api/commenting/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: currentComment.id,
          workspace_id: currentWorkspace.id,
        }),
      })
      if (approveRes.ok) {
        showFeedback('success', 'Comment edited and approved')
        moveToNext()
        setIsEditing(false)
      } else {
        const err = await approveRes.json()
        showFeedback('error', err.error || 'Failed to approve after edit')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Skip ──────────────────────────────────────────────
  const handleSkip = () => {
    if (currentIndex < comments.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (comments.length > 1) {
      setCurrentIndex(0)
    }
  }

  // ── Bulk Approve ──────────────────────────────────────
  const handleBulkApprove = async () => {
    if (!currentWorkspace || comments.length === 0) return
    setBulkApproving(true)
    try {
      const res = await fetch('/api/commenting/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_ids: comments.map(c => c.id),
          workspace_id: currentWorkspace.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        showFeedback('success', `${data.approved} comments approved`)
        setComments([])
        setCurrentIndex(0)
      } else {
        const err = await res.json()
        showFeedback('error', err.error || 'Bulk approve failed')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setBulkApproving(false)
    }
  }

  // ── Keyboard shortcuts ────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts while typing in textarea
    if (e.target instanceof HTMLTextAreaElement) return
    if (actionLoading) return

    switch (e.key.toLowerCase()) {
      case 'a':
        handleApprove()
        break
      case 'r':
        handleReject()
        break
      case 'n':
        handleSkip()
        break
    }
  }, [currentComment, currentWorkspace, actionLoading, currentIndex, comments])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // ── Confidence badge color ────────────────────────────
  const confidenceBadge = (score: number | null) => {
    if (score === null || score === undefined) {
      return <Badge variant="outline" className="border-gray-600 text-gray-400">N/A</Badge>
    }
    if (score > 0.8) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{(score * 100).toFixed(0)}%</Badge>
    }
    if (score >= 0.6) {
      return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">{(score * 100).toFixed(0)}%</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">{(score * 100).toFixed(0)}%</Badge>
  }

  // ── Loading state ─────────────────────────────────────
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4 font-medium">Loading Comment Review...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
      {/* Gradient overlay */}
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

      {/* Header */}
      <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-white italic">V</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">VERA</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Dashboard
              </Link>
              <Link href="/commenting/monitors" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Monitors
              </Link>
              <span className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg">
                Approve Comments
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center gap-1">
              <select
                value={currentWorkspace?.id || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="bg-transparent text-sm font-bold px-3 py-1.5 focus:outline-none cursor-pointer text-white"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-gray-900">
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center border-2 border-white/10 shadow-xl overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold">{(profile?.full_name || user?.email || 'V')[0].toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Breadcrumb + Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
                Dashboard
              </Link>
              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <Link href="/commenting/monitors" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
                Commenting
              </Link>
              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                Approve
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">
              Comment Review
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
              Review, edit, and approve AI-generated comments before they go live.
            </p>
          </div>

          {comments.length > 0 && (
            <Button
              variant="gradient"
              className="px-6 py-2.5 font-bold rounded-xl shrink-0"
              onClick={handleBulkApprove}
              disabled={bulkApproving}
            >
              {bulkApproving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bulk Approve All ({comments.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Feedback Toast */}
        {actionFeedback && (
          <div className={`fixed top-24 right-6 z-50 px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl transition-all animate-in slide-in-from-right ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {actionFeedback.message}
          </div>
        )}

        {/* Progress Indicator */}
        {!loading && comments.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 font-bold text-sm">
              Reviewing <span className="text-white">{currentIndex + 1}</span> of{' '}
              <span className="text-white">{comments.length}</span> pending
            </p>
            <div className="flex items-center gap-2 text-gray-600 text-xs font-medium">
              <span className="inline-flex items-center gap-1 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-1.5">
                <kbd className="bg-gray-800 rounded px-1.5 py-0.5 text-gray-400 font-mono text-[10px]">A</kbd>
                <span>Approve</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-1.5">
                <kbd className="bg-gray-800 rounded px-1.5 py-0.5 text-gray-400 font-mono text-[10px]">R</kbd>
                <span>Reject</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-1.5">
                <kbd className="bg-gray-800 rounded px-1.5 py-0.5 text-gray-400 font-mono text-[10px]">N</kbd>
                <span>Next</span>
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          /* Empty State */
          <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-16 text-center">
            <div className="w-24 h-24 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">All caught up!</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              No pending comments to review. New comments will appear here once the AI generates them from discovered posts.
            </p>
            <Link href="/commenting/monitors">
              <Button variant="gradient" className="px-8 py-3 font-bold rounded-xl">
                Manage Monitors
              </Button>
            </Link>
          </div>
        ) : currentComment ? (
          /* Comment Review Card */
          <div className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
            {/* Post Header: Author Info */}
            <div className="px-8 pt-8 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-lg font-black text-white">
                    {(currentComment.vera_linkedin_posts_discovered?.author_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-black text-lg truncate">
                    {currentComment.vera_linkedin_posts_discovered?.author_name || 'Unknown Author'}
                  </h4>
                  <p className="text-gray-500 text-sm truncate">
                    {currentComment.vera_linkedin_posts_discovered?.author_headline || 'LinkedIn User'}
                  </p>
                  {currentComment.vera_linkedin_posts_discovered?.share_url && (
                    <a
                      href={currentComment.vera_linkedin_posts_discovered.share_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 text-xs hover:text-violet-300 transition-colors mt-1 inline-block"
                    >
                      View original post
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {confidenceBadge(currentComment.confidence_score)}
                  {currentComment.tone && (
                    <Badge variant="outline" className="border-gray-700 text-gray-400 capitalize">
                      {currentComment.tone}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="px-8 pb-4">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 max-h-64 overflow-y-auto">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {currentComment.vera_linkedin_posts_discovered?.post_content || 'Post content not available'}
                </p>
              </div>
              {/* Post hashtags */}
              {currentComment.vera_linkedin_posts_discovered?.hashtags && currentComment.vera_linkedin_posts_discovered.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {currentComment.vera_linkedin_posts_discovered.hashtags.map((tag, i) => (
                    <span key={i} className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-8">
              <div className="border-t border-gray-800" />
            </div>

            {/* Generated Comment */}
            <div className="px-8 py-6">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Generated Comment</p>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-violet-400 hover:text-violet-300 text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-600 rounded-xl min-h-[120px] focus:border-violet-500 focus:ring-violet-500/20 resize-y"
                  placeholder="Edit the generated comment..."
                />
              ) : (
                <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4">
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {currentComment.comment_text}
                  </p>
                </div>
              )}

              {/* Extracted Facts */}
              {currentComment.extracted_facts && currentComment.extracted_facts.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-2">Extracted Facts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentComment.extracted_facts.map((fact, i) => (
                      <span key={i} className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                        {fact}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Approaches */}
              {currentComment.suggested_approaches && currentComment.suggested_approaches.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-2">Suggested Approaches</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentComment.suggested_approaches.map((approach, i) => (
                      <span key={i} className="text-xs text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full px-3 py-1">
                        {approach}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-8 pb-8 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-600/20"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Approve
                </Button>

                <Button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="bg-red-600/80 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-red-600/20"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </Button>

                {isEditing && editedText !== currentComment.comment_text && (
                  <Button
                    onClick={handleEditAndApprove}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-blue-600/20"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit &amp; Approve
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={comments.length <= 1}
                  className="text-gray-400 hover:text-white font-bold px-6 py-2.5 rounded-xl hover:bg-gray-800/50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Skip
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by VERA Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
