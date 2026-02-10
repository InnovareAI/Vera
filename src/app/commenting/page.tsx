'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ── Types ──────────────────────────────────────────────────────
interface CommentingStats {
  active_monitors: number
  pending_approval: number
  posted_today: number
  posted_this_week: number
}

interface PendingComment {
  id: string
  post_author: string
  post_snippet: string
  generated_comment: string
  confidence_score: number
  monitor_name: string
  created_at: string
}

interface PostedComment {
  id: string
  post_author: string
  comment_snippet: string
  posted_at: string
}

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function confidenceBadge(score: number) {
  if (score >= 0.8) {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        {Math.round(score * 100)}% match
      </Badge>
    )
  }
  if (score >= 0.6) {
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
        {Math.round(score * 100)}% match
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-700/50 text-gray-400 border border-gray-600">
      {Math.round(score * 100)}% match
    </Badge>
  )
}

// ── Component ──────────────────────────────────────────────────
export default function CommentingDashboard() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [stats, setStats] = useState<CommentingStats | null>(null)
  const [pending, setPending] = useState<PendingComment[]>([])
  const [posted, setPosted] = useState<PostedComment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [generateLoading, setGenerateLoading] = useState(false)

  useEffect(() => {
    if (currentWorkspace) {
      fetchAllData()
    }
  }, [currentWorkspace])

  const fetchAllData = async () => {
    if (!currentWorkspace) return
    setLoading(true)

    try {
      const [statsRes, pendingRes, postedRes] = await Promise.all([
        fetch(`/api/commenting/stats?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/commenting/pending?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/commenting/posted?workspace_id=${currentWorkspace.id}&limit=10`),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json()
        setPending(Array.isArray(data) ? data : [])
      }

      if (postedRes.ok) {
        const data = await postedRes.json()
        setPosted(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch commenting data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (commentId: string) => {
    setActionLoading((prev) => ({ ...prev, [commentId]: true }))
    try {
      const res = await fetch('/api/commenting/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      })
      if (res.ok) {
        setPending((prev) => prev.filter((c) => c.id !== commentId))
        fetchAllData()
      }
    } catch (err) {
      console.error('Failed to approve comment:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  const handleReject = async (commentId: string) => {
    setActionLoading((prev) => ({ ...prev, [commentId]: true }))
    try {
      const res = await fetch('/api/commenting/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      })
      if (res.ok) {
        setPending((prev) => prev.filter((c) => c.id !== commentId))
        fetchAllData()
      }
    } catch (err) {
      console.error('Failed to reject comment:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  const handleEdit = (commentId: string) => {
    router.push(`/commenting/edit/${commentId}`)
  }

  const handleDiscoverPosts = async () => {
    if (!currentWorkspace) return
    setDiscoverLoading(true)
    try {
      await fetch('/api/commenting/discover-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id }),
      })
      fetchAllData()
    } catch (err) {
      console.error('Failed to discover posts:', err)
    } finally {
      setDiscoverLoading(false)
    }
  }

  const handleAutoGenerate = async () => {
    if (!currentWorkspace) return
    setGenerateLoading(true)
    try {
      await fetch('/api/commenting/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id }),
      })
      fetchAllData()
    } catch (err) {
      console.error('Failed to auto-generate comments:', err)
    } finally {
      setGenerateLoading(false)
    }
  }

  // ── Auth Guard ─────────────────────────────────────────────
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4 font-medium">Loading Commenting Agent...</p>
        </div>
      </div>
    )
  }

  if (!user || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">&#x1f512;</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-6">Please log in and select a workspace to continue.</p>
          <Link href="/login">
            <Button variant="gradient" className="px-8 py-3 font-bold rounded-xl">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
      {/* Navigation Overlay */}
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

      {/* Header */}
      <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-white italic">V</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">Vera.AI</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Dashboard
              </Link>
              <Link href="/projects" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Projects
              </Link>
              <Link href="/settings" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Settings
              </Link>
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

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Breadcrumb + Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
                Dashboard
              </Link>
              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                Commenting Agent
              </span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white mb-4">
              Commenting Agent
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
              Discover relevant posts, generate on-brand comments, and build authentic engagement at scale.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/commenting/settings">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bold rounded-xl">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Brand Settings
              </Button>
            </Link>
            <Link href="/commenting/monitors">
              <Button variant="gradient" className="px-8 py-3 text-base font-bold rounded-xl">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Manage Monitors
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Active Monitors',
              value: stats?.active_monitors?.toString() || '0',
              trend: 'Tracking posts',
              color: 'violet',
            },
            {
              label: 'Pending Approval',
              value: stats?.pending_approval?.toString() || '0',
              trend: pending.length > 0 ? 'Ready to review' : 'All clear',
              color: 'fuchsia',
            },
            {
              label: 'Posted Today',
              value: stats?.posted_today?.toString() || '0',
              trend: 'Comments posted',
              color: 'blue',
            },
            {
              label: 'Posted This Week',
              value: stats?.posted_this_week?.toString() || '0',
              trend: 'Weekly total',
              color: 'emerald',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl hover:bg-gray-900/60 transition-all group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 transition-all ${
                stat.color === 'violet' ? 'bg-violet-500/5 group-hover:bg-violet-500/10' :
                stat.color === 'fuchsia' ? 'bg-fuchsia-500/5 group-hover:bg-fuchsia-500/10' :
                stat.color === 'blue' ? 'bg-blue-500/5 group-hover:bg-blue-500/10' :
                'bg-emerald-500/5 group-hover:bg-emerald-500/10'
              }`} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">{stat.label}</p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-white">{loading ? '--' : stat.value}</span>
                <span className={`text-sm font-bold mb-2 ${
                  stat.color === 'violet' ? 'text-violet-400' :
                  stat.color === 'fuchsia' ? 'text-fuchsia-400' :
                  stat.color === 'blue' ? 'text-blue-400' :
                  'text-emerald-400'
                }`}>{loading ? '' : stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Pending Comments */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white">Pending Comments</h3>
                <span className="text-gray-500 text-sm font-bold">
                  {pending.length} awaiting review
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-black text-white mb-2">No pending comments</h4>
                  <p className="text-gray-500 max-w-md mb-8">
                    Discover posts first, then generate comments for review and approval.
                  </p>
                  <Button
                    variant="gradient"
                    className="px-8 py-3 font-bold rounded-xl"
                    onClick={handleDiscoverPosts}
                    disabled={discoverLoading}
                  >
                    {discoverLoading ? 'Discovering...' : 'Discover Posts'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pending.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:bg-gray-900/60 transition-all"
                    >
                      {/* Post context */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {comment.post_author[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white">{comment.post_author}</span>
                          {comment.monitor_name && (
                            <span className="text-xs text-gray-600 ml-2">via {comment.monitor_name}</span>
                          )}
                        </div>
                        <div className="ml-auto">
                          {confidenceBadge(comment.confidence_score)}
                        </div>
                      </div>

                      {/* Original post snippet */}
                      <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {comment.post_snippet.length > 150
                            ? comment.post_snippet.substring(0, 150) + '...'
                            : comment.post_snippet}
                        </p>
                      </div>

                      {/* Generated comment */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Generated Reply</p>
                        <p className="text-sm text-gray-200 leading-relaxed">{comment.generated_comment}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-800/50">
                        <Button
                          variant="gradient"
                          size="sm"
                          className="font-bold rounded-lg"
                          onClick={() => handleApprove(comment.id)}
                          disabled={actionLoading[comment.id]}
                        >
                          {actionLoading[comment.id] ? 'Posting...' : 'Approve'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bold rounded-lg"
                          onClick={() => handleEdit(comment.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-red-400 font-bold rounded-lg"
                          onClick={() => handleReject(comment.id)}
                          disabled={actionLoading[comment.id]}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-3xl p-8">
              <h3 className="text-lg font-black text-white mb-6">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="gradient"
                  className="w-full justify-start px-5 py-3 font-bold rounded-xl"
                  onClick={handleDiscoverPosts}
                  disabled={discoverLoading}
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {discoverLoading ? 'Discovering...' : 'Discover Posts'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start px-5 py-3 border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bold rounded-xl"
                  onClick={handleAutoGenerate}
                  disabled={generateLoading}
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {generateLoading ? 'Generating...' : 'Auto-Generate'}
                </Button>
                <Link href="/commenting/analytics" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start px-5 py-3 border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bold rounded-xl"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Analytics
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-3xl p-8">
              <h3 className="text-lg font-black text-white mb-6">Recent Activity</h3>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : posted.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="w-10 h-10 mx-auto text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium">No activity yet</p>
                  <p className="text-gray-600 text-xs mt-1">Posted comments will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posted.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-600/30 to-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{item.post_author}</p>
                        <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">
                          {item.comment_snippet}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{timeAgo(item.posted_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by Vera.AI Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
