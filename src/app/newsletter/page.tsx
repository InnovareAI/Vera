'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface NewsletterConfig {
  id: string
  workspace_id: string
  name: string
  from_name: string | null
  from_email: string | null
  reply_to: string | null
  cadence: 'weekly' | 'biweekly' | 'monthly'
  default_template: string | null
  footer_html: string | null
  unsubscribe_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

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
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function statusBadge(status: NewsletterIssue['status']) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="border-gray-600 text-gray-400">Draft</Badge>
    case 'scheduled':
      return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Scheduled</Badge>
    case 'sending':
      return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Sending</Badge>
    case 'sent':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Sent</Badge>
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function NewsletterDashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()

  const [configs, setConfigs] = useState<NewsletterConfig[]>([])
  const [issues, setIssues] = useState<NewsletterIssue[]>([])
  const [loading, setLoading] = useState(true)

  // Derived stats
  const sentIssues = issues.filter((i) => i.status === 'sent')
  const totalRecipients = sentIssues.reduce((sum, i) => sum + (i.recipient_count || 0), 0)
  const totalOpens = sentIssues.reduce((sum, i) => sum + (i.open_count || 0), 0)
  const totalClicks = sentIssues.reduce((sum, i) => sum + (i.click_count || 0), 0)
  const avgOpenRate = totalRecipients > 0 ? ((totalOpens / totalRecipients) * 100).toFixed(1) : '0'
  const avgClickRate = totalRecipients > 0 ? ((totalClicks / totalRecipients) * 100).toFixed(1) : '0'

  useEffect(() => {
    if (currentWorkspace) {
      fetchData()
    }
  }, [currentWorkspace])

  const fetchData = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const [cfgRes, issuesRes] = await Promise.all([
        fetch(`/api/newsletter/config?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/newsletter/issues?workspace_id=${currentWorkspace.id}`),
      ])
      const cfgData = await cfgRes.json()
      const issuesData = await issuesRes.json()
      setConfigs(Array.isArray(cfgData) ? cfgData : [])
      setIssues(Array.isArray(issuesData) ? issuesData : [])
    } catch (err) {
      console.error('Failed to load newsletter data', err)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4 font-medium">Powering up VERA...</p>
        </div>
      </div>
    )
  }

  const hasConfig = configs.length > 0

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
      {/* Gradient overlay */}
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

      {/* Header */}
      <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-white italic">V</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">VERA</span>
            </Link>
            <span className="text-gray-600">|</span>
            <h1 className="text-white font-medium">Newsletter</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/newsletter/subscribers">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V5.228A2 2 0 015.228 3h13.544A2 2 0 0121 5.228v5.018M12 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Subscribers
              </Button>
            </Link>
            <Link href="/newsletter/new">
              <Button variant="gradient">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                New Issue
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Breadcrumb + Hero */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-700 text-xs">/</span>
            <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Newsletter</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">Newsletter Hub</h2>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
            Create, manage, and send newsletters to your audience. Track engagement and grow your subscriber list.
          </p>
        </div>

        {/* Onboarding CTA if no config */}
        {!loading && !hasConfig && (
          <div className="bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-transparent border border-violet-500/20 rounded-3xl p-10 text-center">
            <div className="text-5xl mb-6">
              <svg className="w-16 h-16 mx-auto text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Set up your first newsletter</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Configure your newsletter with a name, sender details, and cadence. Then start building your subscriber list and creating issues.
            </p>
            <SetupNewsletterInline
              workspaceId={currentWorkspace?.id || ''}
              onCreated={fetchData}
            />
          </div>
        )}

        {/* Stats Bento */}
        {hasConfig && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Subscribers', value: '--', color: 'violet', note: 'Total active' },
              { label: 'Issues Sent', value: String(sentIssues.length), color: 'fuchsia', note: `${issues.length} total` },
              { label: 'Avg Open Rate', value: `${avgOpenRate}%`, color: 'blue', note: `${totalOpens} opens` },
              { label: 'Avg Click Rate', value: `${avgClickRate}%`, color: 'emerald', note: `${totalClicks} clicks` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl hover:bg-gray-900/60 transition-all group relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-${stat.color}-500/10 transition-all`} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">{stat.label}</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-white">{loading ? <Skeleton className="h-12 w-20" /> : stat.value}</span>
                  <span className={`text-${stat.color}-400 text-sm font-bold mb-2`}>{stat.note}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Newsletter Configs */}
        {hasConfig && (
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-white">Your Newsletters</h3>
              <SetupNewsletterInline
                workspaceId={currentWorkspace?.id || ''}
                onCreated={fetchData}
                compact
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.map((cfg) => (
                <div
                  key={cfg.id}
                  className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:bg-gray-900/60 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-black text-white text-lg">{cfg.name}</h4>
                    <Badge className={cfg.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-700/30 text-gray-500 border border-gray-700'}>
                      {cfg.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    {cfg.from_name && <p>From: {cfg.from_name}{cfg.from_email ? ` <${cfg.from_email}>` : ''}</p>}
                    <p>Cadence: <span className="text-gray-300 capitalize">{cfg.cadence}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Issues */}
        {hasConfig && (
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-white">Recent Issues</h3>
              <Link href="/newsletter/new">
                <Button variant="gradient" size="sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  New Issue
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-12 h-12 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                <p className="text-gray-500 font-medium">No issues yet</p>
                <p className="text-gray-600 text-sm mt-1">Create your first newsletter issue to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs">Subject</TableHead>
                      <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs">Status</TableHead>
                      <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sent</TableHead>
                      <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs text-right">Opens</TableHead>
                      <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.id} className="border-gray-800/50 hover:bg-gray-900/40 cursor-pointer transition-colors">
                        <TableCell className="font-bold text-white">
                          <Link href={`/newsletter/${issue.id}`} className="hover:text-violet-400 transition-colors">
                            {issue.subject}
                          </Link>
                        </TableCell>
                        <TableCell>{statusBadge(issue.status)}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{formatDate(issue.sent_at || issue.scheduled_for)}</TableCell>
                        <TableCell className="text-right text-gray-300 font-mono text-sm">{issue.open_count ?? '--'}</TableCell>
                        <TableCell className="text-right text-gray-300 font-mono text-sm">{issue.click_count ?? '--'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by VERA Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}

// -------------------------------------------------------------------
// Inline Newsletter Setup Form
// -------------------------------------------------------------------

function SetupNewsletterInline({
  workspaceId,
  onCreated,
  compact = false,
}: {
  workspaceId: string
  onCreated: () => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    from_name: '',
    from_email: '',
    reply_to: '',
    cadence: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
  })

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/newsletter/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, ...form }),
      })
      if (res.ok) {
        setOpen(false)
        setForm({ name: '', from_name: '', from_email: '', reply_to: '', cadence: 'weekly' })
        onCreated()
      }
    } catch (err) {
      console.error('Failed to create newsletter config', err)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button
        variant={compact ? 'outline' : 'gradient'}
        size={compact ? 'sm' : 'default'}
        onClick={() => setOpen(true)}
        className={compact ? 'border-gray-700 text-gray-300 hover:text-white' : ''}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        {compact ? 'Add Newsletter' : 'Set Up Newsletter'}
      </Button>
    )
  }

  return (
    <div className={compact ? 'mt-4' : ''}>
      <Card className="bg-gray-900/60 border-gray-800 text-white max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Create Newsletter</CardTitle>
          <CardDescription className="text-gray-400">Configure your newsletter settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Newsletter Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Weekly AI Digest"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">From Name</label>
              <input
                type="text"
                value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                placeholder="Your Name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">From Email</label>
              <input
                type="email"
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="you@company.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Reply-To</label>
              <input
                type="email"
                value={form.reply_to}
                onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
                placeholder="reply@company.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Cadence</label>
              <select
                value={form.cadence}
                onChange={(e) => setForm({ ...form, cadence: e.target.value as 'weekly' | 'biweekly' | 'monthly' })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <Separator className="bg-gray-800" />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
              {saving ? 'Creating...' : 'Create Newsletter'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
