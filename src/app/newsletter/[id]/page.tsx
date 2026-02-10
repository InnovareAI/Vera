'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface NewsletterIssue {
  id: string
  newsletter_id: string
  workspace_id: string
  subject: string
  preview_text: string | null
  body_html: string | null
  body_markdown: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  scheduled_for: string | null
  sent_at: string | null
  recipient_count: number | null
  open_count: number | null
  click_count: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  vera_newsletter_config?: {
    id: string
    name: string
    from_name: string | null
    from_email: string | null
  }
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function statusBadge(status: NewsletterIssue['status']) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="border-gray-600 text-gray-400 text-sm">Draft</Badge>
    case 'scheduled':
      return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm">Scheduled</Badge>
    case 'sending':
      return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm">Sending</Badge>
    case 'sent':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm">Sent</Badge>
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function pct(count: number | null, total: number | null) {
  if (!count || !total || total === 0) return '0'
  return ((count / total) * 100).toFixed(1)
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()

  const [issue, setIssue] = useState<NewsletterIssue | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showMarkdown, setShowMarkdown] = useState(false)

  // -------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------

  useEffect(() => {
    if (id) {
      fetchIssue()
    }
  }, [id])

  const fetchIssue = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/newsletter/issues/${id}`)
      if (!res.ok) throw new Error('Failed to fetch issue')
      const data = await res.json()
      setIssue(data)
    } catch (err) {
      console.error('Failed to load issue', err)
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------

  const handleSend = async () => {
    if (!issue) return
    setSending(true)
    try {
      const res = await fetch(`/api/newsletter/issues/${id}/send`, { method: 'POST' })
      if (res.ok) {
        fetchIssue()
      }
    } catch (err) {
      console.error('Send failed', err)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/newsletter/issues/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/newsletter')
      }
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleting(false)
    }
  }

  // -------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4 font-medium">Powering up Vera.AI...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
          <Skeleton className="h-10 w-96" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </main>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          <h2 className="text-2xl font-black mb-2">Issue Not Found</h2>
          <p className="text-gray-500 mb-6">This newsletter issue could not be found.</p>
          <Link href="/newsletter">
            <Button variant="gradient">Back to Newsletter</Button>
          </Link>
        </div>
      </div>
    )
  }

  const config = issue.vera_newsletter_config

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

      {/* Header */}
      <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-white italic">V</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">Vera.AI</span>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/newsletter" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
              Newsletter
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-medium text-sm truncate max-w-[200px]">{issue.subject}</h1>
          </div>

          <div className="flex items-center gap-3">
            {issue.status === 'draft' && (
              <Link href={`/newsletter/new?edit=${issue.id}`}>
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                  Edit
                </Button>
              </Link>
            )}

            {/* Delete dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-red-800/50 text-red-400 hover:bg-red-500/10 hover:border-red-500/50">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Delete Issue</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Are you sure you want to delete &quot;{issue.subject}&quot;? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 justify-end mt-4">
                  <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete Issue'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {issue.status === 'draft' && (
              <Button variant="gradient" onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                    Send Issue
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">Dashboard</Link>
          <span className="text-gray-700 text-xs">/</span>
          <Link href="/newsletter" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">Newsletter</Link>
          <span className="text-gray-700 text-xs">/</span>
          <span className="text-violet-400 text-xs font-bold uppercase tracking-widest truncate max-w-[200px]">{issue.subject}</span>
        </div>

        {/* Issue header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {statusBadge(issue.status)}
              {config && (
                <span className="text-gray-500 text-sm">{config.name}</span>
              )}
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white mb-1">{issue.subject}</h2>
            {issue.preview_text && (
              <p className="text-gray-400 text-lg">{issue.preview_text}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <span>Created: {formatDate(issue.created_at)}</span>
              {issue.sent_at && <span>Sent: {formatDate(issue.sent_at)}</span>}
              {issue.scheduled_for && issue.status === 'scheduled' && (
                <span>Scheduled: {formatDate(issue.scheduled_for)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl relative overflow-hidden group hover:bg-gray-900/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/10 transition-all" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Recipients</p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-white">{issue.recipient_count ?? '--'}</span>
            </div>
          </div>
          <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl relative overflow-hidden group hover:bg-gray-900/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Opens</p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-white">{issue.open_count ?? '--'}</span>
              <span className="text-blue-400 text-sm font-bold mb-2">{pct(issue.open_count, issue.recipient_count)}%</span>
            </div>
          </div>
          <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl relative overflow-hidden group hover:bg-gray-900/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Clicks</p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-white">{issue.click_count ?? '--'}</span>
              <span className="text-emerald-400 text-sm font-bold mb-2">{pct(issue.click_count, issue.recipient_count)}%</span>
            </div>
          </div>
        </div>

        {/* Tabs: Preview | Analytics */}
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800 p-1 rounded-xl">
            <TabsTrigger value="preview" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white rounded-lg px-6">
              Preview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white rounded-lg px-6">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Preview tab */}
          <TabsContent value="preview" className="mt-6">
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] overflow-hidden">
              {/* Markdown source toggle */}
              <div className="flex items-center justify-between px-8 py-4 border-b border-gray-800/50">
                <span className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                  {showMarkdown ? 'Markdown Source' : 'HTML Preview'}
                </span>
                <button
                  onClick={() => setShowMarkdown(!showMarkdown)}
                  className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {showMarkdown ? 'Show HTML Preview' : 'Show Markdown'}
                </button>
              </div>

              {showMarkdown ? (
                <div className="p-8">
                  <pre className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-gray-300 text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-[600px] overflow-y-auto">
                    {issue.body_markdown || '(No markdown content)'}
                  </pre>
                </div>
              ) : issue.body_html ? (
                <div className="bg-white rounded-b-[2.5rem]">
                  <iframe
                    srcDoc={issue.body_html}
                    title="Newsletter Preview"
                    className="w-full min-h-[600px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : issue.body_markdown ? (
                <div className="p-8 bg-white rounded-b-[2.5rem]">
                  <div className="prose prose-sm max-w-none" style={{ color: '#1f2937' }}>
                    <pre className="whitespace-pre-wrap text-sm font-sans" style={{ color: '#1f2937' }}>
                      {issue.body_markdown}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-600">
                  <p>No content available for preview.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Analytics tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
              {issue.status === 'sent' ? (
                <div className="space-y-8">
                  {/* Open/Click metrics */}
                  <div>
                    <h3 className="text-xl font-black text-white mb-6">Performance Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Open Rate Bar */}
                      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-gray-400 font-bold text-sm">Open Rate</span>
                          <span className="text-blue-400 font-black text-2xl">
                            {pct(issue.open_count, issue.recipient_count)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct(issue.open_count, issue.recipient_count)}%` }}
                          />
                        </div>
                        <p className="text-gray-600 text-xs mt-2">
                          {issue.open_count || 0} of {issue.recipient_count || 0} recipients opened
                        </p>
                      </div>

                      {/* Click Rate Bar */}
                      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-gray-400 font-bold text-sm">Click Rate</span>
                          <span className="text-emerald-400 font-black text-2xl">
                            {pct(issue.click_count, issue.recipient_count)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct(issue.click_count, issue.recipient_count)}%` }}
                          />
                        </div>
                        <p className="text-gray-600 text-xs mt-2">
                          {issue.click_count || 0} of {issue.recipient_count || 0} recipients clicked
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-800" />

                  {/* Timeline chart placeholder */}
                  <div>
                    <h3 className="text-xl font-black text-white mb-6">Engagement Timeline</h3>
                    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 flex items-center justify-center h-64">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                        <p className="text-gray-500 font-medium">Timeline chart coming soon</p>
                        <p className="text-gray-600 text-sm mt-1">Detailed engagement analytics over time will appear here.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <svg className="w-12 h-12 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  <p className="text-gray-500 font-medium">Analytics available after sending</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Send this issue to start tracking opens and clicks.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by Vera.AI Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
