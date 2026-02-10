'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface NewsletterConfig {
  id: string
  workspace_id: string
  name: string
  from_name: string | null
  from_email: string | null
  reply_to: string | null
  cadence: string
  is_active: boolean
  created_at: string
}

interface ContentQueueItem {
  id: string
  topic: string
  generated_content: string | null
  status: string
  created_at: string
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function NewIssuePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()

  // Newsletter configs
  const [configs, setConfigs] = useState<NewsletterConfig[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [loadingConfigs, setLoadingConfigs] = useState(true)

  // Issue fields
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')

  // Preview & Mode
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Scheduling
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // AI Generate
  const [aiTopic, setAiTopic] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  // Content Queue
  const [contentQueueItems, setContentQueueItems] = useState<ContentQueueItem[]>([])
  const [loadingContentQueue, setLoadingContentQueue] = useState(false)
  const [contentQueueDialogOpen, setContentQueueDialogOpen] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)

  // -------------------------------------------------------------------
  // Fetch configs on mount
  // -------------------------------------------------------------------

  useEffect(() => {
    if (currentWorkspace) {
      fetchConfigs()
    }
  }, [currentWorkspace])

  const fetchConfigs = async () => {
    if (!currentWorkspace) return
    setLoadingConfigs(true)
    try {
      const res = await fetch(`/api/newsletter/config?workspace_id=${currentWorkspace.id}`)
      const data = await res.json()
      const cfgs = Array.isArray(data) ? data : []
      setConfigs(cfgs)
      if (cfgs.length > 0 && !selectedConfigId) {
        setSelectedConfigId(cfgs[0].id)
      }
    } catch (err) {
      console.error('Failed to load configs', err)
    } finally {
      setLoadingConfigs(false)
    }
  }

  // -------------------------------------------------------------------
  // AI Generate
  // -------------------------------------------------------------------

  const handleAiGenerate = async () => {
    if (!currentWorkspace) return
    setAiGenerating(true)
    try {
      const res = await fetch('/api/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          newsletter_id: selectedConfigId || undefined,
          topic: aiTopic || undefined,
        }),
      })
      const data = await res.json()
      if (data.generated) {
        if (data.generated.subject) setSubject(data.generated.subject)
        if (data.generated.preview_text) setPreviewText(data.generated.preview_text)
        if (data.generated.body_markdown) setBodyMarkdown(data.generated.body_markdown)
        if (data.generated.body_html) setBodyHtml(data.generated.body_html)
      }
      setAiDialogOpen(false)
      setAiTopic('')
    } catch (err) {
      console.error('AI generation failed', err)
    } finally {
      setAiGenerating(false)
    }
  }

  // -------------------------------------------------------------------
  // Content Queue
  // -------------------------------------------------------------------

  const handleFetchContentQueue = async () => {
    if (!currentWorkspace) return
    setLoadingContentQueue(true)
    try {
      const res = await fetch(`/api/content-queue?workspace_id=${currentWorkspace.id}&status=approved`)
      const data = await res.json()
      setContentQueueItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load content queue', err)
    } finally {
      setLoadingContentQueue(false)
    }
  }

  const handleInsertFromQueue = (item: ContentQueueItem) => {
    const insertion = `\n\n## ${item.topic}\n\n${item.generated_content || ''}\n\n---\n`
    setBodyMarkdown((prev) => prev + insertion)
    setContentQueueDialogOpen(false)
  }

  // -------------------------------------------------------------------
  // Save / Send
  // -------------------------------------------------------------------

  const handleSave = async (status: 'draft' | 'scheduled' | 'sending') => {
    if (!currentWorkspace || !selectedConfigId || !subject.trim()) return
    setSaving(true)
    try {
      let scheduledFor: string | null = null
      if (status === 'scheduled' && scheduledDate && scheduledTime) {
        scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const res = await fetch('/api/newsletter/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletter_id: selectedConfigId,
          workspace_id: currentWorkspace.id,
          subject: subject.trim(),
          preview_text: previewText.trim() || null,
          body_html: bodyHtml || null,
          body_markdown: bodyMarkdown || null,
          scheduled_for: scheduledFor,
          created_by: user?.id || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to save issue')
      const issue = await res.json()

      // If "send now", also trigger send
      if (status === 'sending' && issue.id) {
        await fetch(`/api/newsletter/issues/${issue.id}/send`, { method: 'POST' })
      }

      router.push(`/newsletter/${issue.id}`)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
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
          <p className="text-gray-400 mt-4 font-medium">Powering up VERA...</p>
        </div>
      </div>
    )
  }

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
              <span className="text-2xl font-black tracking-tighter text-white">VERA</span>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/newsletter" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
              Newsletter
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-medium text-sm">New Issue</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saving || !subject.trim() || !selectedConfigId}
              className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            {sendMode === 'schedule' ? (
              <Button
                variant="gradient"
                onClick={() => handleSave('scheduled')}
                disabled={saving || !subject.trim() || !selectedConfigId || !scheduledDate}
              >
                Schedule
              </Button>
            ) : (
              <Button
                variant="gradient"
                onClick={() => handleSave('sending')}
                disabled={saving || !subject.trim() || !selectedConfigId}
              >
                Send Now
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
          <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">New Issue</span>
        </div>

        {/* Newsletter selector */}
        {loadingConfigs ? (
          <Skeleton className="h-10 w-64 rounded-lg" />
        ) : configs.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
            <p className="text-amber-400 font-bold mb-1">No newsletter configured</p>
            <p className="text-gray-400 text-sm">
              Go to the{' '}
              <Link href="/newsletter" className="text-violet-400 underline">Newsletter Hub</Link>{' '}
              to set up your first newsletter before creating an issue.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Label className="text-gray-400 font-bold text-xs uppercase tracking-widest whitespace-nowrap">Newsletter</Label>
            <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
              <SelectTrigger className="w-72 bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select newsletter" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {configs.map((cfg) => (
                  <SelectItem key={cfg.id} value={cfg.id} className="text-white hover:bg-gray-800">
                    {cfg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator className="bg-gray-800" />

        {/* Subject + Preview Text */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-gray-400 font-bold text-xs uppercase tracking-widest">Subject Line</Label>
              <span className={`text-xs font-mono ${subject.length > 60 ? 'text-amber-400' : 'text-gray-600'}`}>
                {subject.length}/60
              </span>
            </div>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your attention-grabbing subject line"
              className="bg-gray-900 border-gray-700 text-white text-lg font-bold placeholder:text-gray-600 focus:border-violet-500 h-14"
            />
            {subject.length > 60 && (
              <p className="text-amber-400 text-xs mt-1">Subject lines under 60 characters tend to perform better.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-gray-400 font-bold text-xs uppercase tracking-widest">Preview Text</Label>
              <span className={`text-xs font-mono ${previewText.length > 100 ? 'text-amber-400' : 'text-gray-600'}`}>
                {previewText.length}/100
              </span>
            </div>
            <Input
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Short preview shown in inbox (optional)"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-violet-500"
            />
            {previewText.length > 100 && (
              <p className="text-amber-400 text-xs mt-1">Preview text under 100 characters is recommended.</p>
            )}
          </div>
        </div>

        <Separator className="bg-gray-800" />

        {/* Body Editor with Actions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-gray-400 font-bold text-xs uppercase tracking-widest">Body (Markdown)</Label>
            <div className="flex items-center gap-3">
              {/* Content Queue */}
              <Dialog open={contentQueueDialogOpen} onOpenChange={(v) => { setContentQueueDialogOpen(v); if (v) handleFetchContentQueue() }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    Pull from Queue
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Content Queue</DialogTitle>
                    <DialogDescription className="text-gray-400">Select approved content to insert into the newsletter body.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-80 overflow-y-auto space-y-3 mt-4">
                    {loadingContentQueue ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                      </div>
                    ) : contentQueueItems.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No approved content found.</p>
                    ) : (
                      contentQueueItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleInsertFromQueue(item)}
                          className="w-full text-left bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 hover:border-violet-500/50 transition-all"
                        >
                          <p className="font-bold text-white text-sm">{item.topic}</p>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.generated_content?.slice(0, 120)}...</p>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* AI Generate */}
              <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="gradient" size="sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                    AI Generate
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">AI Newsletter Generator</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Generate newsletter content from your approved content queue using AI.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2 block">Topic / Theme (optional)</Label>
                      <Input
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Weekly AI Roundup, Product Updates"
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600"
                      />
                    </div>
                    <Button
                      variant="gradient"
                      className="w-full"
                      onClick={handleAiGenerate}
                      disabled={aiGenerating}
                    >
                      {aiGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        'Generate Newsletter'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Preview Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Preview</span>
                <Switch
                  checked={showPreview}
                  onCheckedChange={setShowPreview}
                />
              </div>
            </div>
          </div>

          {showPreview ? (
            <div className="bg-white rounded-2xl p-0 min-h-[500px] overflow-hidden">
              {bodyHtml ? (
                <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              ) : bodyMarkdown ? (
                <div className="p-8 prose prose-sm max-w-none" style={{ color: '#1f2937' }}>
                  <pre className="whitespace-pre-wrap text-sm font-sans" style={{ color: '#1f2937' }}>{bodyMarkdown}</pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  <p>No content to preview. Write some markdown first.</p>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              placeholder="Write your newsletter content in Markdown...&#10;&#10;# Welcome to this week's digest&#10;&#10;Here's what happened this week...&#10;&#10;## Section 1&#10;Content goes here..."
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-violet-500 min-h-[500px] font-mono text-sm leading-relaxed resize-y"
            />
          )}
        </div>

        <Separator className="bg-gray-800" />

        {/* Schedule Section */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-black text-white mb-4">Delivery</h3>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={sendMode === 'now'}
                onChange={() => setSendMode('now')}
                className="accent-violet-500"
              />
              <span className="text-white font-medium">Send immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={sendMode === 'schedule'}
                onChange={() => setSendMode('schedule')}
                className="accent-violet-500"
              />
              <span className="text-white font-medium">Schedule for later</span>
            </label>
          </div>

          {sendMode === 'schedule' && (
            <div className="flex items-center gap-4 mt-4">
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1 block">Date</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white w-48"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1 block">Time</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white w-36"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4">
          <Link href="/newsletter">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              Cancel
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saving || !subject.trim() || !selectedConfigId}
              className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
            >
              Save Draft
            </Button>
            {sendMode === 'schedule' ? (
              <Button
                variant="gradient"
                onClick={() => handleSave('scheduled')}
                disabled={saving || !subject.trim() || !selectedConfigId || !scheduledDate}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Schedule Send
              </Button>
            ) : (
              <Button
                variant="gradient"
                onClick={() => handleSave('sending')}
                disabled={saving || !subject.trim() || !selectedConfigId}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                Send Now
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
