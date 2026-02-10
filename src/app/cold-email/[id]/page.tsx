'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ── Types ──────────────────────────────────────────────
interface Campaign {
  id: string
  workspace_id: string
  name: string
  subject: string
  subject_b: string | null
  body_template: string
  body_template_b: string | null
  from_name: string | null
  from_email: string | null
  reply_to: string | null
  variables: string[]
  status: 'draft' | 'active' | 'paused' | 'completed' | 'sending'
  send_at: string | null
  sent_count: number
  open_count: number
  click_count: number
  reply_count: number
  bounce_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

interface Recipient {
  id: string
  campaign_id: string
  email: string
  first_name: string | null
  last_name: string | null
  company: string | null
  variables: Record<string, unknown>
  status: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  replied_at: string | null
  bounced_at: string | null
  unsubscribed_at: string | null
  message_id: string | null
  created_at: string
}

interface ColdEmailEvent {
  id: string
  message_id: string | null
  recipient_id: string | null
  event_type: string
  metadata: Record<string, unknown>
  created_at: string
}

// ── Status badge mapping ──────────────────────────────
const statusConfig: Record<string, { variant: 'outline' | 'default' | 'secondary' | 'destructive'; label: string; className?: string }> = {
  draft: { variant: 'outline', label: 'Draft', className: 'border-gray-600 text-gray-400' },
  active: { variant: 'default', label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  sending: { variant: 'default', label: 'Sending', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' },
  paused: { variant: 'secondary', label: 'Paused', className: 'bg-gray-700/50 text-gray-400 border-gray-600' },
  completed: { variant: 'secondary', label: 'Completed', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
}

const eventTypeIcons: Record<string, { icon: string; color: string; label: string }> = {
  sent: { icon: '📤', color: 'text-blue-400', label: 'Email Sent' },
  delivered: { icon: '✅', color: 'text-emerald-400', label: 'Delivered' },
  opened: { icon: '👀', color: 'text-violet-400', label: 'Opened' },
  clicked: { icon: '🔗', color: 'text-fuchsia-400', label: 'Clicked' },
  replied: { icon: '💬', color: 'text-amber-400', label: 'Replied' },
  bounced: { icon: '❌', color: 'text-red-400', label: 'Bounced' },
  unsubscribed: { icon: '🚫', color: 'text-gray-400', label: 'Unsubscribed' },
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [events, setEvents] = useState<ColdEmailEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    setLoading(true)
    try {
      const [campaignRes, recipientsRes] = await Promise.all([
        fetch(`/api/cold-email/campaigns/${id}`),
        fetch(`/api/cold-email/campaigns/${id}/recipients`),
      ])

      if (campaignRes.ok) {
        const data = await campaignRes.json()
        setCampaign(data)
      } else {
        setError('Campaign not found')
      }

      if (recipientsRes.ok) {
        const data = await recipientsRes.json()
        setRecipients(data)
      }

      // Events are loaded from recipients data (opened_at, clicked_at, etc.)
      // Build a pseudo-event timeline from recipients
    } catch (err) {
      console.error('Failed to fetch campaign:', err)
      setError('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  // Build event timeline from recipient data
  const buildEventTimeline = (): ColdEmailEvent[] => {
    const timeline: ColdEmailEvent[] = []
    recipients.forEach((r) => {
      if (r.sent_at) {
        timeline.push({
          id: `${r.id}-sent`,
          message_id: r.message_id,
          recipient_id: r.id,
          event_type: 'sent',
          metadata: { email: r.email, first_name: r.first_name },
          created_at: r.sent_at,
        })
      }
      if (r.opened_at) {
        timeline.push({
          id: `${r.id}-opened`,
          message_id: r.message_id,
          recipient_id: r.id,
          event_type: 'opened',
          metadata: { email: r.email, first_name: r.first_name },
          created_at: r.opened_at,
        })
      }
      if (r.clicked_at) {
        timeline.push({
          id: `${r.id}-clicked`,
          message_id: r.message_id,
          recipient_id: r.id,
          event_type: 'clicked',
          metadata: { email: r.email, first_name: r.first_name },
          created_at: r.clicked_at,
        })
      }
      if (r.replied_at) {
        timeline.push({
          id: `${r.id}-replied`,
          message_id: r.message_id,
          recipient_id: r.id,
          event_type: 'replied',
          metadata: { email: r.email, first_name: r.first_name },
          created_at: r.replied_at,
        })
      }
      if (r.bounced_at) {
        timeline.push({
          id: `${r.id}-bounced`,
          message_id: r.message_id,
          recipient_id: r.id,
          event_type: 'bounced',
          metadata: { email: r.email, first_name: r.first_name },
          created_at: r.bounced_at,
        })
      }
      if (r.unsubscribed_at) {
        timeline.push({
          id: `${r.id}-unsubscribed`,
          message_id: r.message_id,
          recipient_id: r.id,
          event_type: 'unsubscribed',
          metadata: { email: r.email, first_name: r.first_name },
          created_at: r.unsubscribed_at,
        })
      }
    })
    return timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // ── Actions ─────────────────────────────────────────
  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/cold-email/campaigns/${id}/send`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }
      await fetchCampaign()
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (newStatus: 'active' | 'paused') => {
    try {
      const res = await fetch(`/api/cold-email/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await fetchCampaign()
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/cold-email/campaigns/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/cold-email')
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // ── Computed stats ──────────────────────────────────
  const sentCount = campaign?.sent_count || 0
  const openRate = sentCount > 0 ? ((campaign?.open_count || 0) / sentCount * 100).toFixed(1) : '0'
  const clickRate = sentCount > 0 ? ((campaign?.click_count || 0) / sentCount * 100).toFixed(1) : '0'
  const bounceRate = sentCount > 0 ? ((campaign?.bounce_count || 0) / sentCount * 100).toFixed(1) : '0'
  const replyRate = sentCount > 0 ? ((campaign?.reply_count || 0) / sentCount * 100).toFixed(1) : '0'
  const deliveredCount = sentCount - (campaign?.bounce_count || 0)
  const sendProgress = recipients.length > 0 ? Math.round((sentCount / recipients.length) * 100) : 0

  const eventTimeline = buildEventTimeline()

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4 font-medium">Loading campaign...</p>
        </div>
      </div>
    )
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-white font-bold text-lg mb-2">Campaign Not Found</p>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/cold-email">
            <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800 font-bold rounded-xl">
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!campaign) return null

  const cfg = statusConfig[campaign.status] || statusConfig.draft

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
              <Link href="/cold-email" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Cold Email
              </Link>
              <span className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg truncate max-w-[200px]">
                {campaign.name}
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link href="/cold-email" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
            Cold Email
          </Link>
          <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-violet-400 text-xs font-bold uppercase tracking-widest truncate max-w-[200px]">
            {campaign.name}
          </span>
        </div>

        {/* Campaign Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-4xl font-black tracking-tight text-white">{campaign.name}</h1>
              <Badge variant={cfg.variant} className={cfg.className}>
                {cfg.label}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">
              Created {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {campaign.from_email && ` · From: ${campaign.from_name || campaign.from_email}`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {campaign.status === 'draft' && (
              <Button
                variant="gradient"
                className="px-6 py-3 font-bold rounded-xl"
                onClick={handleSend}
                disabled={sending || recipients.length === 0}
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Campaign
                  </>
                )}
              </Button>
            )}

            {campaign.status === 'active' && (
              <Button
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800 font-bold rounded-xl"
                onClick={() => handleStatusChange('paused')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause
              </Button>
            )}

            {campaign.status === 'paused' && (
              <Button
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-xl"
                onClick={() => handleStatusChange('active')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume
              </Button>
            )}

            <Link href={`/cold-email/new?edit=${id}`}>
              <Button
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800 font-bold rounded-xl"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            </Link>

            <Button
              variant="ghost"
              className="text-gray-500 hover:text-red-400 font-bold rounded-xl"
              onClick={() => setShowDeleteDialog(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Send Progress Bar */}
        {(campaign.status === 'sending' || campaign.status === 'active') && recipients.length > 0 && (
          <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 font-bold">Send Progress</span>
              <span className="text-white font-black">{sendProgress}%</span>
            </div>
            <Progress
              value={sendProgress}
              className="h-3 bg-gray-800 rounded-full"
              indicatorClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
            />
            <p className="text-xs text-gray-500">
              {sentCount} of {recipients.length} emails sent
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Sent', value: sentCount.toLocaleString(), color: 'blue' },
            { label: 'Delivered', value: deliveredCount.toLocaleString(), color: 'emerald' },
            { label: 'Opened', value: `${campaign.open_count || 0}`, sub: `${openRate}%`, color: 'violet' },
            { label: 'Clicked', value: `${campaign.click_count || 0}`, sub: `${clickRate}%`, color: 'fuchsia' },
            { label: 'Bounced', value: `${campaign.bounce_count || 0}`, sub: `${bounceRate}%`, color: 'red' },
            { label: 'Replied', value: `${campaign.reply_count || 0}`, sub: `${replyRate}%`, color: 'amber' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl hover:bg-gray-900/60 transition-all"
            >
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">{stat.label}</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{stat.value}</span>
                {stat.sub && (
                  <span className={`text-xs font-bold mb-1 ${
                    stat.color === 'blue' ? 'text-blue-400' :
                    stat.color === 'emerald' ? 'text-emerald-400' :
                    stat.color === 'violet' ? 'text-violet-400' :
                    stat.color === 'fuchsia' ? 'text-fuchsia-400' :
                    stat.color === 'red' ? 'text-red-400' :
                    'text-amber-400'
                  }`}>{stat.sub}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-gray-900/50 border border-gray-800 rounded-xl p-1 h-auto">
            <TabsTrigger
              value="overview"
              className="px-6 py-2.5 rounded-lg text-sm font-bold data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 text-gray-500 transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="recipients"
              className="px-6 py-2.5 rounded-lg text-sm font-bold data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 text-gray-500 transition-all"
            >
              Recipients ({recipients.length})
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="px-6 py-2.5 rounded-lg text-sm font-bold data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 text-gray-500 transition-all"
            >
              Events ({eventTimeline.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ─────────────────────────── */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Email Preview */}
              <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
                <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white">Email Preview</h2>
                    <Badge variant="outline" className="border-gray-600 text-gray-400">
                      Variant A
                    </Badge>
                  </div>

                  <div className="bg-white rounded-xl p-6 text-gray-900 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">From: {campaign.from_name || 'Sender'} &lt;{campaign.from_email || 'sender@example.com'}&gt;</p>
                      <p className="text-xs text-gray-500">To: recipient@example.com</p>
                      {campaign.reply_to && <p className="text-xs text-gray-500">Reply-To: {campaign.reply_to}</p>}
                    </div>
                    <Separator className="bg-gray-200" />
                    <h3 className="font-bold text-lg text-gray-900">{campaign.subject}</h3>
                    <Separator className="bg-gray-200" />
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {campaign.body_template}
                    </div>
                  </div>
                </div>
              </div>

              {/* B variant or campaign details */}
              {campaign.subject_b ? (
                <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
                  <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black text-white">Email Preview</h2>
                      <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-400">
                        Variant B
                      </Badge>
                    </div>

                    <div className="bg-white rounded-xl p-6 text-gray-900 space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">From: {campaign.from_name || 'Sender'} &lt;{campaign.from_email || 'sender@example.com'}&gt;</p>
                        <p className="text-xs text-gray-500">To: recipient@example.com</p>
                      </div>
                      <Separator className="bg-gray-200" />
                      <h3 className="font-bold text-lg text-gray-900">{campaign.subject_b}</h3>
                      <Separator className="bg-gray-200" />
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {campaign.body_template_b || campaign.body_template}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
                  <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                    <h2 className="text-xl font-black text-white">Campaign Details</h2>

                    <div className="space-y-4">
                      <div className="flex justify-between py-3 border-b border-gray-700/50">
                        <span className="text-gray-500 text-sm font-bold">Status</span>
                        <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-700/50">
                        <span className="text-gray-500 text-sm font-bold">Recipients</span>
                        <span className="text-white font-bold">{recipients.length}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-700/50">
                        <span className="text-gray-500 text-sm font-bold">From</span>
                        <span className="text-white text-sm">{campaign.from_name || '-'} &lt;{campaign.from_email || '-'}&gt;</span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-700/50">
                        <span className="text-gray-500 text-sm font-bold">Reply To</span>
                        <span className="text-white text-sm">{campaign.reply_to || 'Same as sender'}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-700/50">
                        <span className="text-gray-500 text-sm font-bold">A/B Test</span>
                        <span className="text-gray-400 text-sm">Disabled</span>
                      </div>
                      {campaign.send_at && (
                        <div className="flex justify-between py-3 border-b border-gray-700/50">
                          <span className="text-gray-500 text-sm font-bold">Scheduled</span>
                          <span className="text-white text-sm">
                            {new Date(campaign.send_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-3">
                        <span className="text-gray-500 text-sm font-bold">Created</span>
                        <span className="text-white text-sm">
                          {new Date(campaign.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Recipients Tab ───────────────────────── */}
          <TabsContent value="recipients">
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
              {recipients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-lg mb-2">No recipients</p>
                  <p className="text-gray-500 text-sm">Add recipients to this campaign to start sending.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-800/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800/50 hover:bg-transparent">
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4">Email</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4">Name</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4">Company</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4">Status</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4">Sent At</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4 text-center">Opened</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-4 text-center">Clicked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((r) => (
                        <TableRow key={r.id} className="border-gray-800/50 hover:bg-gray-800/20">
                          <TableCell className="py-4 px-4 text-sm text-white font-mono">{r.email}</TableCell>
                          <TableCell className="py-4 px-4 text-sm text-gray-300">
                            {[r.first_name, r.last_name].filter(Boolean).join(' ') || '-'}
                          </TableCell>
                          <TableCell className="py-4 px-4 text-sm text-gray-300">{r.company || '-'}</TableCell>
                          <TableCell className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className={
                                r.status === 'sent' ? 'border-blue-500/30 text-blue-400' :
                                r.status === 'pending' ? 'border-gray-600 text-gray-400' :
                                r.status === 'bounced' ? 'border-red-500/30 text-red-400' :
                                'border-gray-600 text-gray-400'
                              }
                            >
                              {r.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-sm text-gray-500">
                            {r.sent_at
                              ? new Date(r.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            {r.opened_at ? (
                              <span className="text-violet-400 font-bold text-sm">Yes</span>
                            ) : (
                              <span className="text-gray-600 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            {r.clicked_at ? (
                              <span className="text-fuchsia-400 font-bold text-sm">Yes</span>
                            ) : (
                              <span className="text-gray-600 text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Events Tab ───────────────────────────── */}
          <TabsContent value="events">
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
              {eventTimeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-lg mb-2">No events yet</p>
                  <p className="text-gray-500 text-sm">Events will appear here once the campaign starts sending.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-white mb-6">Event Timeline</h3>
                  {eventTimeline.slice(0, 100).map((event) => {
                    const config = eventTypeIcons[event.event_type] || { icon: '📧', color: 'text-gray-400', label: event.event_type }
                    const email = (event.metadata as { email?: string })?.email || 'Unknown'
                    const firstName = (event.metadata as { first_name?: string })?.first_name || ''

                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 bg-gray-900/40 rounded-2xl border border-gray-800/50 hover:bg-gray-900/60 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-xl">
                            {config.icon}
                          </div>
                          <div className="text-sm">
                            <span className={`font-bold ${config.color}`}>{config.label}</span>
                            <span className="text-gray-500"> — </span>
                            <span className="text-white font-medium">{firstName ? `${firstName} ` : ''}</span>
                            <span className="text-gray-400 font-mono text-xs">{email}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 font-mono whitespace-nowrap">
                          {new Date(event.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border border-gray-800 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-black text-xl">Delete Campaign</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete &quot;{campaign.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white font-bold rounded-xl"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="font-bold rounded-xl"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Campaign'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by VERA Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
