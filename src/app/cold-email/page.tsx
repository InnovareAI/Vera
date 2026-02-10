'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

// ── Types ──────────────────────────────────────────────
interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'sending'
  subject: string
  sent_count: number
  open_count: number
  click_count: number
  bounce_count: number
  reply_count: number
  created_at: string
}

interface AnalyticsOverview {
  total_campaigns: number
  sent: number
  opens: number
  clicks: number
  replies: number
  bounces: number
  open_rate: string
  click_rate: string
}

// ── Status badge mapping ──────────────────────────────
const statusConfig: Record<string, { variant: 'outline' | 'default' | 'secondary' | 'destructive'; label: string; className?: string }> = {
  draft: { variant: 'outline', label: 'Draft', className: 'border-gray-600 text-gray-400' },
  active: { variant: 'default', label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  sending: { variant: 'default', label: 'Sending', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  paused: { variant: 'secondary', label: 'Paused', className: 'bg-gray-700/50 text-gray-400 border-gray-600' },
  completed: { variant: 'secondary', label: 'Completed', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
}

export default function ColdEmailDashboard() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentWorkspace) {
      fetchData()
    }
  }, [currentWorkspace])

  const fetchData = async () => {
    if (!currentWorkspace) return
    setLoading(true)

    try {
      const [campaignsRes, analyticsRes] = await Promise.all([
        fetch(`/api/cold-email/campaigns?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/cold-email/analytics?workspace_id=${currentWorkspace.id}`),
      ])

      if (campaignsRes.ok) {
        const data = await campaignsRes.json()
        setCampaigns(data)
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error('Failed to fetch cold email data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4 font-medium">Loading Cold Email...</p>
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
              <span className="text-2xl font-black tracking-tighter text-white">VERA</span>
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
        {/* Page Header */}
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
                Cold Email
              </span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white mb-4">
              Cold Email
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
              Build, send, and track cold email campaigns with AI-powered personalization.
            </p>
          </div>

          <Link href="/cold-email/new">
            <Button variant="gradient" className="px-8 py-3 text-base font-bold rounded-xl">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Campaign
            </Button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Total Campaigns',
              value: analytics?.total_campaigns?.toString() || '0',
              trend: campaigns.filter(c => c.status === 'active').length + ' active',
              color: 'violet',
            },
            {
              label: 'Emails Sent',
              value: analytics?.sent?.toLocaleString() || '0',
              trend: analytics?.bounces ? `${analytics.bounces} bounced` : 'No bounces',
              color: 'fuchsia',
            },
            {
              label: 'Open Rate',
              value: analytics?.open_rate ? `${analytics.open_rate}%` : '0%',
              trend: `${analytics?.opens?.toLocaleString() || 0} total opens`,
              color: 'blue',
            },
            {
              label: 'Click Rate',
              value: analytics?.click_rate ? `${analytics.click_rate}%` : '0%',
              trend: `${analytics?.clicks?.toLocaleString() || 0} total clicks`,
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

        {/* Campaign Table */}
        <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white">Campaigns</h3>
            <span className="text-gray-500 text-sm font-bold">
              {campaigns.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : campaigns.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-black text-white mb-2">No campaigns yet</h4>
              <p className="text-gray-500 max-w-md mb-8">
                Create your first cold email campaign to start reaching prospects with AI-powered personalization.
              </p>
              <Link href="/cold-email/new">
                <Button variant="gradient" className="px-8 py-3 font-bold rounded-xl">
                  Create Your First Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-800/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800/50 hover:bg-transparent">
                    <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-6">Name</TableHead>
                    <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4">Status</TableHead>
                    <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4 text-right">Sent</TableHead>
                    <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4 text-right">Opens</TableHead>
                    <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4 text-right">Clicks</TableHead>
                    <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4 text-right">Bounces</TableHead>
                    <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4 text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const cfg = statusConfig[campaign.status] || statusConfig.draft
                    return (
                      <TableRow
                        key={campaign.id}
                        className="border-gray-800/50 cursor-pointer hover:bg-gray-800/30 transition-colors"
                        onClick={() => router.push(`/cold-email/${campaign.id}`)}
                      >
                        <TableCell className="py-4 px-6">
                          <div>
                            <span className="font-bold text-white">{campaign.name}</span>
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{campaign.subject}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge variant={cfg.variant} className={cfg.className}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono text-sm text-gray-300">
                          {campaign.sent_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono text-sm text-gray-300">
                          {campaign.open_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono text-sm text-gray-300">
                          {campaign.click_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono text-sm text-gray-300">
                          {campaign.bounce_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right text-sm text-gray-500">
                          {new Date(campaign.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by VERA Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
