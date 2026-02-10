'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

// ── Types ──────────────────────────────────────────────
interface Recipient {
  email: string
  first_name: string
  last_name: string
  company: string
}

interface CampaignForm {
  name: string
  from_name: string
  from_email: string
  reply_to: string
  subject: string
  subject_b: string
  body_template: string
  body_template_b: string
  send_at: string
}

const STEPS = ['Basics', 'Content', 'Recipients', 'Review & Send']

const AVAILABLE_VARIABLES = [
  { key: '{{first_name}}', label: 'First Name' },
  { key: '{{last_name}}', label: 'Last Name' },
  { key: '{{company}}', label: 'Company' },
  { key: '{{email}}', label: 'Email' },
]

export default function NewCampaignPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CampaignForm>({
    name: '',
    from_name: '',
    from_email: '',
    reply_to: '',
    subject: '',
    subject_b: '',
    body_template: '',
    body_template_b: '',
    send_at: '',
  })

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [csvText, setCsvText] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualFirstName, setManualFirstName] = useState('')
  const [manualLastName, setManualLastName] = useState('')
  const [manualCompany, setManualCompany] = useState('')

  // AI generation fields
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState('professional')
  const [aiAudience, setAiAudience] = useState('')

  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const bodyBRef = useRef<HTMLTextAreaElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)

  const updateForm = (field: keyof CampaignForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── Insert variable into currently focused field ────
  const insertVariable = (variable: string) => {
    // Try to insert at the body textarea cursor
    const el = bodyRef.current
    if (el && document.activeElement === el) {
      const start = el.selectionStart || 0
      const end = el.selectionEnd || 0
      const current = form.body_template
      updateForm('body_template', current.substring(0, start) + variable + current.substring(end))
      return
    }
    // Fallback: append to body
    updateForm('body_template', form.body_template + variable)
  }

  // ── AI Generate ─────────────────────────────────────
  const handleAIGenerate = async () => {
    if (!currentWorkspace || !aiTopic) return
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/cold-email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          tone: aiTone,
          target_audience: aiAudience,
          workspace_id: currentWorkspace.id,
        }),
      })

      if (!res.ok) throw new Error('AI generation failed')

      const data = await res.json()

      if (data.subject) updateForm('subject', data.subject)
      if (data.subject_b) updateForm('subject_b', data.subject_b)
      if (data.body) updateForm('body_template', data.body)
      if (data.body_b) updateForm('body_template_b', data.body_b)

      // Auto-advance to content step
      setStep(1)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  // ── Add manual recipient ────────────────────────────
  const addManualRecipient = () => {
    if (!manualEmail.includes('@')) return
    setRecipients((prev) => [
      ...prev,
      {
        email: manualEmail,
        first_name: manualFirstName,
        last_name: manualLastName,
        company: manualCompany,
      },
    ])
    setManualEmail('')
    setManualFirstName('')
    setManualLastName('')
    setManualCompany('')
  }

  // ── Parse CSV ───────────────────────────────────────
  const parseCSV = () => {
    if (!csvText.trim()) return
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const emailIdx = headers.indexOf('email')
    if (emailIdx === -1) {
      setError('CSV must include an "email" column')
      return
    }

    const firstNameIdx = headers.indexOf('first_name')
    const lastNameIdx = headers.indexOf('last_name')
    const companyIdx = headers.indexOf('company')

    const parsed: Recipient[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim())
      const email = cols[emailIdx]
      if (!email || !email.includes('@')) continue
      parsed.push({
        email,
        first_name: firstNameIdx >= 0 ? cols[firstNameIdx] || '' : '',
        last_name: lastNameIdx >= 0 ? cols[lastNameIdx] || '' : '',
        company: companyIdx >= 0 ? cols[companyIdx] || '' : '',
      })
    }

    setRecipients((prev) => [...prev, ...parsed])
    setCsvText('')
    setError(null)
  }

  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Submit campaign ─────────────────────────────────
  const handleSubmit = async () => {
    if (!currentWorkspace) return
    setSubmitting(true)
    setError(null)

    try {
      // 1. Create campaign
      const campaignRes = await fetch('/api/cold-email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          name: form.name,
          subject: form.subject,
          subject_b: form.subject_b || null,
          body_template: form.body_template,
          body_template_b: form.body_template_b || null,
          from_name: form.from_name || null,
          from_email: form.from_email || null,
          reply_to: form.reply_to || null,
          variables: AVAILABLE_VARIABLES.filter((v) =>
            form.body_template.includes(v.key) || form.subject.includes(v.key)
          ).map((v) => v.key.replace(/\{\{|\}\}/g, '')),
          created_by: user?.id || null,
          send_at: form.send_at || null,
        }),
      })

      if (!campaignRes.ok) {
        const errData = await campaignRes.json()
        throw new Error(errData.error || 'Failed to create campaign')
      }

      const campaign = await campaignRes.json()

      // 2. Add recipients if any
      if (recipients.length > 0) {
        const recipientsRes = await fetch(`/api/cold-email/campaigns/${campaign.id}/recipients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipients }),
        })
        if (!recipientsRes.ok) {
          console.error('Failed to add recipients')
        }
      }

      // 3. Redirect to campaign detail
      router.push(`/cold-email/${campaign.id}`)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Preview email with substituted variables ────────
  const previewBody = () => {
    let preview = form.body_template
    preview = preview.replace(/\{\{first_name\}\}/g, 'John')
    preview = preview.replace(/\{\{last_name\}\}/g, 'Smith')
    preview = preview.replace(/\{\{company\}\}/g, 'Acme Corp')
    preview = preview.replace(/\{\{email\}\}/g, 'john@acme.com')
    return preview
  }

  const previewSubject = () => {
    let preview = form.subject
    preview = preview.replace(/\{\{first_name\}\}/g, 'John')
    preview = preview.replace(/\{\{last_name\}\}/g, 'Smith')
    preview = preview.replace(/\{\{company\}\}/g, 'Acme Corp')
    preview = preview.replace(/\{\{email\}\}/g, 'john@acme.com')
    return preview
  }

  // ── Validation ──────────────────────────────────────
  const canAdvance = (s: number): boolean => {
    if (s === 0) return !!form.name
    if (s === 1) return !!form.subject && !!form.body_template
    if (s === 2) return true // recipients optional at creation
    return true
  }

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
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link href="/cold-email" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
            Cold Email
          </Link>
          <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
            New Campaign
          </span>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white">Create Campaign</h1>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Allow going back, or forward if valid
                  if (i <= step || canAdvance(step)) setStep(i)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  i === step
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : i < step
                    ? 'bg-gray-800/50 text-white border border-gray-700'
                    : 'bg-gray-900/30 text-gray-600 border border-gray-800/50'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  i === step
                    ? 'bg-violet-500 text-white'
                    : i < step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-500'
                }`}>
                  {i < step ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < step ? 'bg-emerald-500/50' : 'bg-gray-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* ── STEP 1: Basics ─────────────────────────── */}
        {step === 0 && (
          <div className="space-y-8">
            <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
              <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                <h2 className="text-xl font-black text-white">Campaign Basics</h2>
                <p className="text-gray-500 text-sm">Set up the sender identity and campaign name.</p>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-bold text-sm">Campaign Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="e.g. Q1 Outreach - Series A Founders"
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">From Name</Label>
                      <Input
                        value={form.from_name}
                        onChange={(e) => updateForm('from_name', e.target.value)}
                        placeholder="e.g. Thorsten Linz"
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">From Email</Label>
                      <Input
                        type="email"
                        value={form.from_email}
                        onChange={(e) => updateForm('from_email', e.target.value)}
                        placeholder="e.g. thorsten@innovare.ai"
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 font-bold text-sm">Reply-To Email</Label>
                    <Input
                      type="email"
                      value={form.reply_to}
                      onChange={(e) => updateForm('reply_to', e.target.value)}
                      placeholder="e.g. hello@innovare.ai (optional)"
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Generate Card */}
            <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
              <div className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 rounded-[1.8rem] p-8 space-y-6 border border-violet-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">AI Generate</h2>
                    <p className="text-gray-500 text-xs">Let AI write your cold email for you</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-bold text-sm">Topic / Offer *</Label>
                    <Input
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g. AI-powered content platform for B2B SaaS companies"
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Tone</Label>
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                        className="w-full h-12 bg-gray-900 border border-gray-700 text-white rounded-xl px-4 focus:outline-none focus:border-violet-500"
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="bold">Bold</option>
                        <option value="friendly">Friendly</option>
                        <option value="provocative">Provocative</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Target Audience</Label>
                      <Input
                        value={aiAudience}
                        onChange={(e) => setAiAudience(e.target.value)}
                        placeholder="e.g. VP Marketing at Series B startups"
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <Button
                    variant="gradient"
                    className="px-8 py-3 font-bold rounded-xl"
                    onClick={handleAIGenerate}
                    disabled={generating || !aiTopic}
                  >
                    {generating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Content ────────────────────────── */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Variable chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Variables:</span>
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="px-3 py-1.5 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-lg border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                >
                  {v.key}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Email Editor */}
              <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
                <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                  <h2 className="text-xl font-black text-white">Email Content</h2>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Subject Line *</Label>
                      <Input
                        ref={subjectRef}
                        value={form.subject}
                        onChange={(e) => updateForm('subject', e.target.value)}
                        placeholder="e.g. Quick question about {{company}}'s growth"
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Subject Line B (A/B Test)</Label>
                      <Input
                        value={form.subject_b}
                        onChange={(e) => updateForm('subject_b', e.target.value)}
                        placeholder="Optional second subject for A/B testing"
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                      />
                    </div>

                    <Separator className="bg-gray-800" />

                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Email Body *</Label>
                      <Textarea
                        ref={bodyRef}
                        value={form.body_template}
                        onChange={(e) => updateForm('body_template', e.target.value)}
                        placeholder={`Hi {{first_name}},\n\nI noticed {{company}} is...\n\nBest,\n${profile?.full_name || 'Your Name'}`}
                        rows={10}
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 rounded-xl focus:border-violet-500 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Body B (A/B Test)</Label>
                      <Textarea
                        ref={bodyBRef}
                        value={form.body_template_b}
                        onChange={(e) => updateForm('body_template_b', e.target.value)}
                        placeholder="Optional second body variant for A/B testing"
                        rows={6}
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 rounded-xl focus:border-violet-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
                <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white">Preview</h2>
                    <Badge variant="outline" className="border-gray-600 text-gray-400">
                      Live
                    </Badge>
                  </div>

                  <div className="bg-white rounded-xl p-6 text-gray-900 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">From: {form.from_name || 'Sender'} &lt;{form.from_email || 'sender@example.com'}&gt;</p>
                      <p className="text-xs text-gray-500">To: john@acme.com</p>
                    </div>
                    <Separator className="bg-gray-200" />
                    <h3 className="font-bold text-lg text-gray-900">
                      {previewSubject() || 'Subject line preview...'}
                    </h3>
                    <Separator className="bg-gray-200" />
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {previewBody() || 'Email body preview will appear here as you type...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Recipients ─────────────────────── */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Manual Add */}
              <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
                <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                  <h2 className="text-xl font-black text-white">Add Manually</h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Email *</Label>
                      <Input
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="john@acme.com"
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                        onKeyDown={(e) => e.key === 'Enter' && addManualRecipient()}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300 font-bold text-sm">First Name</Label>
                        <Input
                          value={manualFirstName}
                          onChange={(e) => setManualFirstName(e.target.value)}
                          placeholder="John"
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300 font-bold text-sm">Last Name</Label>
                        <Input
                          value={manualLastName}
                          onChange={(e) => setManualLastName(e.target.value)}
                          placeholder="Smith"
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 font-bold text-sm">Company</Label>
                      <Input
                        value={manualCompany}
                        onChange={(e) => setManualCompany(e.target.value)}
                        placeholder="Acme Corp"
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-violet-500"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl font-bold border-gray-700 text-white hover:bg-gray-800"
                      onClick={addManualRecipient}
                      disabled={!manualEmail.includes('@')}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Recipient
                    </Button>
                  </div>
                </div>
              </div>

              {/* CSV Import */}
              <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
                <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                  <h2 className="text-xl font-black text-white">Import CSV</h2>
                  <p className="text-gray-500 text-sm">
                    Paste CSV data with columns: email, first_name, last_name, company
                  </p>

                  <Textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={`email,first_name,last_name,company\njohn@acme.com,John,Smith,Acme Corp\njane@startup.io,Jane,Doe,Startup Inc`}
                    rows={8}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 rounded-xl focus:border-violet-500 resize-none font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl font-bold border-gray-700 text-white hover:bg-gray-800"
                    onClick={parseCSV}
                    disabled={!csvText.trim()}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Parse &amp; Import
                  </Button>
                </div>
              </div>
            </div>

            {/* Recipient list */}
            <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white">Recipients</h3>
                <Badge variant="outline" className="border-violet-500/30 text-violet-400 font-bold">
                  {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
                </Badge>
              </div>

              {recipients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No recipients added yet. Add manually or import a CSV above.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-800/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800/50 hover:bg-transparent">
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-3 px-4">Email</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-3 px-4">First Name</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-3 px-4">Last Name</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-3 px-4">Company</TableHead>
                        <TableHead className="text-gray-500 font-bold uppercase tracking-widest text-xs py-3 px-4 w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((r, i) => (
                        <TableRow key={i} className="border-gray-800/50">
                          <TableCell className="py-3 px-4 text-sm text-white font-mono">{r.email}</TableCell>
                          <TableCell className="py-3 px-4 text-sm text-gray-300">{r.first_name || '-'}</TableCell>
                          <TableCell className="py-3 px-4 text-sm text-gray-300">{r.last_name || '-'}</TableCell>
                          <TableCell className="py-3 px-4 text-sm text-gray-300">{r.company || '-'}</TableCell>
                          <TableCell className="py-3 px-4">
                            <button
                              onClick={() => removeRecipient(i)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Send ──────────────────── */}
        {step === 3 && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Campaign</p>
                <p className="text-2xl font-black text-white">{form.name}</p>
                <p className="text-sm text-gray-500 mt-1">From: {form.from_name || 'Not set'}</p>
              </div>
              <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Recipients</p>
                <p className="text-5xl font-black text-white">{recipients.length}</p>
                <p className="text-sm text-gray-500 mt-1">contacts to reach</p>
              </div>
              <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">A/B Testing</p>
                <p className="text-2xl font-black text-white">{form.subject_b ? 'Enabled' : 'Off'}</p>
                <p className="text-sm text-gray-500 mt-1">{form.subject_b ? '2 variants' : 'Single variant'}</p>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
              <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                <h2 className="text-xl font-black text-white">Schedule</h2>
                <p className="text-gray-500 text-sm">Choose when to send your campaign, or leave blank to send manually later.</p>

                <div className="space-y-2">
                  <Label className="text-gray-300 font-bold text-sm">Send At (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.send_at}
                    onChange={(e) => updateForm('send_at', e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white h-12 rounded-xl focus:border-violet-500 max-w-sm"
                  />
                </div>

                {!form.send_at && (
                  <p className="text-xs text-gray-600">
                    No schedule set. The campaign will be saved as a draft. You can send it from the campaign detail page.
                  </p>
                )}
              </div>
            </div>

            {/* Email Preview */}
            <div className="bg-gray-900 border border-gray-800 p-1 rounded-[2rem]">
              <div className="bg-gray-800/50 rounded-[1.8rem] p-8 space-y-6">
                <h2 className="text-xl font-black text-white">Email Preview</h2>

                <div className="bg-white rounded-xl p-6 text-gray-900 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">From: {form.from_name || 'Sender'} &lt;{form.from_email || 'sender@example.com'}&gt;</p>
                    <p className="text-xs text-gray-500">To: john@acme.com</p>
                    {form.reply_to && <p className="text-xs text-gray-500">Reply-To: {form.reply_to}</p>}
                  </div>
                  <Separator className="bg-gray-200" />
                  <h3 className="font-bold text-lg text-gray-900">{previewSubject()}</h3>
                  <Separator className="bg-gray-200" />
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {previewBody()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white font-bold"
            onClick={() => step > 0 ? setStep(step - 1) : router.push('/cold-email')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {step > 0 ? 'Back' : 'Cancel'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              variant="gradient"
              className="px-8 py-3 font-bold rounded-xl"
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance(step)}
            >
              Continue
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          ) : (
            <Button
              variant="gradient"
              className="px-10 py-3 font-bold rounded-xl text-base"
              onClick={handleSubmit}
              disabled={submitting || !form.name || !form.subject || !form.body_template}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating Campaign...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Create Campaign
                </>
              )}
            </Button>
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
