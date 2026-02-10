'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// ── Types ──────────────────────────────────────────────
interface Monitor {
  id: string
  workspace_id: string
  name: string
  hashtags: string[]
  keywords: string[]
  monitor_type: 'hashtag' | 'keyword' | 'profile'
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  posts_discovered_count: number
}

// ── Component ──────────────────────────────────────────
export default function MonitorsPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [discoveringId, setDiscoveringId] = useState<string | null>(null)
  const [discoverResult, setDiscoverResult] = useState<{ id: string; message: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formHashtags, setFormHashtags] = useState('')
  const [formKeywords, setFormKeywords] = useState('')
  const [formType, setFormType] = useState<'hashtag' | 'keyword' | 'profile'>('hashtag')

  // ── Fetch monitors ────────────────────────────────────
  useEffect(() => {
    if (currentWorkspace) {
      fetchMonitors()
    }
  }, [currentWorkspace])

  const fetchMonitors = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const res = await fetch(`/api/commenting/monitors?workspace_id=${currentWorkspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setMonitors(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch monitors:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Show feedback briefly ─────────────────────────────
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message })
    setTimeout(() => setActionFeedback(null), 3000)
  }

  // ── Create monitor ────────────────────────────────────
  const handleCreate = async () => {
    if (!currentWorkspace || !formHashtags.trim()) return
    setSaving(true)
    try {
      const hashtags = formHashtags.split(',').map(h => h.trim()).filter(Boolean)
      const keywords = formKeywords.split(',').map(k => k.trim()).filter(Boolean)

      const res = await fetch('/api/commenting/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          name: formName.trim() || hashtags.join(', '),
          hashtags,
          keywords,
          monitor_type: formType,
        }),
      })

      if (res.ok) {
        showFeedback('success', 'Monitor created successfully')
        setDialogOpen(false)
        resetForm()
        fetchMonitors()
      } else {
        const err = await res.json()
        showFeedback('error', err.error || 'Failed to create monitor')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormHashtags('')
    setFormKeywords('')
    setFormType('hashtag')
  }

  // ── Toggle status ─────────────────────────────────────
  const handleToggleStatus = async (monitor: Monitor) => {
    setTogglingId(monitor.id)
    const newStatus = monitor.status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch(`/api/commenting/monitors/${monitor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setMonitors(prev => prev.map(m => m.id === monitor.id ? { ...m, status: newStatus } : m))
        showFeedback('success', `Monitor ${newStatus === 'active' ? 'activated' : 'paused'}`)
      } else {
        showFeedback('error', 'Failed to update status')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete monitor ────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/commenting/monitors/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showFeedback('success', 'Monitor deleted')
        setMonitors(prev => prev.filter(m => m.id !== id))
        setDeleteConfirmId(null)
      } else {
        showFeedback('error', 'Failed to delete monitor')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Discover posts ────────────────────────────────────
  const handleDiscover = async (monitorId: string) => {
    if (!currentWorkspace) return
    setDiscoveringId(monitorId)
    setDiscoverResult(null)
    try {
      const res = await fetch('/api/commenting/discover-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          monitor_id: monitorId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const message = data.message || `Discovered ${data.discovered} new posts`
        setDiscoverResult({ id: monitorId, message })
        showFeedback('success', message)
        // Refresh monitors to update post counts
        fetchMonitors()
      } else {
        const err = await res.json()
        showFeedback('error', err.error || 'Discovery failed')
      }
    } catch (err) {
      showFeedback('error', 'Network error')
    } finally {
      setDiscoveringId(null)
    }
  }

  // ── Status badge ──────────────────────────────────────
  const statusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</Badge>
    }
    return <Badge variant="outline" className="border-gray-600 text-gray-400">Paused</Badge>
  }

  // ── Monitor type label ────────────────────────────────
  const typeLabel = (type: string) => {
    switch (type) {
      case 'hashtag': return 'Hashtag'
      case 'keyword': return 'Keyword'
      case 'profile': return 'Profile'
      default: return type
    }
  }

  // ── Loading state ─────────────────────────────────────
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4 font-medium">Loading Monitors...</p>
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

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-10">
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
              <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                Commenting Monitors
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">
              Post Monitors
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
              Track hashtags, keywords, and profiles to discover relevant posts for commenting.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="px-8 py-3 text-base font-bold rounded-xl shrink-0">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Monitor
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-gray-900 border-gray-800 text-white sm:rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white text-xl font-black">Create Monitor</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                    Monitor Name
                  </label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. AI Leadership Posts"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 rounded-xl focus:border-violet-500 focus:ring-violet-500/20"
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                    Hashtags <span className="text-violet-400">*</span>
                  </label>
                  <Input
                    value={formHashtags}
                    onChange={(e) => setFormHashtags(e.target.value)}
                    placeholder="e.g. #AI, #Leadership, #SaaS"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 rounded-xl focus:border-violet-500 focus:ring-violet-500/20"
                  />
                  <p className="text-gray-600 text-xs mt-1">Comma-separated. Include # prefix or not.</p>
                </div>

                {/* Keywords */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                    Keywords
                  </label>
                  <Input
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    placeholder="e.g. artificial intelligence, machine learning"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 rounded-xl focus:border-violet-500 focus:ring-violet-500/20"
                  />
                  <p className="text-gray-600 text-xs mt-1">Comma-separated. Used for additional filtering.</p>
                </div>

                {/* Monitor Type */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                    Monitor Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'hashtag' | 'keyword' | 'profile')}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    <option value="hashtag" className="bg-gray-900">Hashtag</option>
                    <option value="keyword" className="bg-gray-900">Keyword</option>
                    <option value="profile" className="bg-gray-900">Profile</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => { setDialogOpen(false); resetForm() }}
                    className="text-gray-400 hover:text-white rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="gradient"
                    onClick={handleCreate}
                    disabled={saving || !formHashtags.trim()}
                    className="px-6 font-bold rounded-xl"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Monitor'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Monitors Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : monitors.length === 0 ? (
          /* Empty State */
          <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-16 text-center">
            <div className="w-24 h-24 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">No monitors yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Create your first monitor to start tracking hashtags, keywords, or profiles and discovering relevant posts to comment on.
            </p>
            <Button
              variant="gradient"
              className="px-8 py-3 font-bold rounded-xl"
              onClick={() => setDialogOpen(true)}
            >
              Create Your First Monitor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitors.map((monitor) => (
              <div
                key={monitor.id}
                className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 hover:bg-gray-900/60 transition-all group relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/10 transition-all" />

                {/* Card Header */}
                <div className="flex items-start justify-between mb-4 relative">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-black text-lg truncate mb-1">{monitor.name}</h3>
                    <div className="flex items-center gap-2">
                      {statusBadge(monitor.status)}
                      <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">
                        {typeLabel(monitor.monitor_type)}
                      </Badge>
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <button
                    onClick={() => handleToggleStatus(monitor)}
                    disabled={togglingId === monitor.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-3 ${
                      monitor.status === 'active' ? 'bg-violet-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        monitor.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Hashtags */}
                {monitor.hashtags && monitor.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {monitor.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-2.5 py-0.5">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Keywords */}
                {monitor.keywords && monitor.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {monitor.keywords.map((kw, i) => (
                      <span key={i} className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-0.5">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Post count */}
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="font-bold">{monitor.posts_discovered_count}</span> posts discovered
                </div>

                {/* Discover result */}
                {discoverResult?.id === monitor.id && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mb-3">
                    <p className="text-emerald-400 text-xs font-bold">{discoverResult.message}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDiscover(monitor.id)}
                    disabled={discoveringId === monitor.id}
                    className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs font-bold rounded-lg flex-1"
                  >
                    {discoveringId === monitor.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mr-1.5" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        Discover Posts
                      </>
                    )}
                  </Button>

                  {deleteConfirmId === monitor.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(monitor.id)}
                        disabled={deleting}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold rounded-lg px-3"
                      >
                        {deleting ? 'Deleting...' : 'Confirm'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-gray-500 hover:text-gray-300 text-xs rounded-lg px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(monitor.id)}
                      className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-xs rounded-lg px-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by Vera.AI Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
