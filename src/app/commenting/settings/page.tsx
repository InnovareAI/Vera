'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface CommentingSettings {
  // Quick settings
  tone: 'professional' | 'friendly' | 'casual' | 'passionate'
  formality: 'formal' | 'semi_formal' | 'informal'
  comment_length: 'short' | 'medium' | 'long'
  question_frequency: 'frequently' | 'sometimes' | 'rarely' | 'never'
  perspective_style: 'supportive' | 'additive' | 'thought_provoking'
  confidence_level: 'assertive' | 'balanced' | 'humble'

  // Expertise
  what_you_do: string
  what_youve_learned: string
  pov_on_future: string
  industry_talking_points: string

  // Brand voice
  voice_reference: string
  tone_of_voice: string
  writing_style: string
  dos_and_donts: string

  // Vibe check
  okay_with_humor: boolean
  okay_being_blunt: boolean
  casual_openers: boolean
  personal_experience: boolean
  strictly_professional: boolean

  // Comment framework
  framework_preset: 'aca_i' | 'var' | 'hook_value_bridge' | 'custom'
  custom_framework: string
  max_characters: number
  example_comments: string

  // Guardrails
  competitors_never_mention: string
  cta_frequency: 'never' | 'occasionally' | 'when_relevant'
  cta_style: 'question_only' | 'soft_invitation' | 'direct_ask'

  // Scheduling
  timezone: string
  daily_comment_limit: number
  skip_weekends: boolean
  skip_holidays: boolean
}

const defaultSettings: CommentingSettings = {
  tone: 'professional',
  formality: 'semi_formal',
  comment_length: 'medium',
  question_frequency: 'sometimes',
  perspective_style: 'additive',
  confidence_level: 'balanced',
  what_you_do: '',
  what_youve_learned: '',
  pov_on_future: '',
  industry_talking_points: '',
  voice_reference: '',
  tone_of_voice: '',
  writing_style: '',
  dos_and_donts: '',
  okay_with_humor: false,
  okay_being_blunt: false,
  casual_openers: false,
  personal_experience: true,
  strictly_professional: false,
  framework_preset: 'aca_i',
  custom_framework: '',
  max_characters: 300,
  example_comments: '',
  competitors_never_mention: '',
  cta_frequency: 'never',
  cta_style: 'question_only',
  timezone: 'America/New_York',
  daily_comment_limit: 20,
  skip_weekends: true,
  skip_holidays: true,
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function CommentingSettingsPage() {
  const { isLoading: authLoading } = useAuth()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()

  const [settings, setSettings] = useState<CommentingSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (currentWorkspace) {
      fetchSettings()
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchSettings = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const res = await fetch(`/api/commenting/settings?workspace_id=${currentWorkspace.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object' && !data.error) {
          setSettings({ ...defaultSettings, ...data })
        }
      }
    } catch (err) {
      console.error('Failed to load commenting settings', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!currentWorkspace) return
    setSaving(true)
    try {
      const res = await fetch('/api/commenting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id, ...settings }),
      })
      if (res.ok) {
        setToast('Settings saved successfully')
      } else {
        setToast('Failed to save settings')
      }
    } catch (err) {
      console.error('Failed to save commenting settings', err)
      setToast('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof CommentingSettings>(key: K, value: CommentingSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Loading state
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 mt-4 font-medium">Powering up Vera.AI...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-violet-500/30">
      {/* Gradient overlay */}
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-2 fade-in">
          <div className={`px-6 py-3 rounded-2xl font-bold text-sm shadow-lg border ${
            toast.includes('success')
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-50 border-b border-neutral-800/50 bg-neutral-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-semibold text-neutral-100 italic">V</span>
              </div>
              <span className="text-2xl font-semibold tracking-tighter text-neutral-100">Vera.AI</span>
            </Link>
            <span className="text-neutral-600">|</span>
            <h1 className="text-neutral-100 font-medium">Commenting Agent</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/commenting">
              <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:border-neutral-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                Back to Monitors
              </Button>
            </Link>
            <Button
              variant="gradient"
              onClick={saveSettings}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Breadcrumb + Hero */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-300 text-xs font-bold uppercase tracking-widest transition-colors">
              Dashboard
            </Link>
            <span className="text-neutral-700 text-xs">/</span>
            <Link href="/commenting" className="text-neutral-500 hover:text-neutral-300 text-xs font-bold uppercase tracking-widest transition-colors">
              Commenting
            </Link>
            <span className="text-neutral-700 text-xs">/</span>
            <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Settings</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-neutral-100 mb-2">Brand Guidelines</h2>
          <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">
            Control how the AI generates comments on your behalf. Define your voice, expertise, and guardrails.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* ───────────────── Quick Settings ───────────────── */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-100">Quick Settings</h3>
                  <p className="text-sm text-neutral-500">High-level controls for comment generation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tone</Label>
                  <Select value={settings.tone} onValueChange={(v) => updateField('tone', v as CommentingSettings['tone'])}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="passionate">Passionate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Formality</Label>
                  <Select value={settings.formality} onValueChange={(v) => updateField('formality', v as CommentingSettings['formality'])}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="semi_formal">Semi-Formal</SelectItem>
                      <SelectItem value="informal">Informal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Comment Length</Label>
                  <Select value={settings.comment_length} onValueChange={(v) => updateField('comment_length', v as CommentingSettings['comment_length'])}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Question Frequency</Label>
                  <Select value={settings.question_frequency} onValueChange={(v) => updateField('question_frequency', v as CommentingSettings['question_frequency'])}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="frequently">Frequently</SelectItem>
                      <SelectItem value="sometimes">Sometimes</SelectItem>
                      <SelectItem value="rarely">Rarely</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Perspective Style</Label>
                  <Select value={settings.perspective_style} onValueChange={(v) => updateField('perspective_style', v as CommentingSettings['perspective_style'])}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="supportive">Supportive</SelectItem>
                      <SelectItem value="additive">Additive</SelectItem>
                      <SelectItem value="thought_provoking">Thought Provoking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Confidence Level</Label>
                  <Select value={settings.confidence_level} onValueChange={(v) => updateField('confidence_level', v as CommentingSettings['confidence_level'])}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="assertive">Assertive</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="humble">Humble</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ───────────────── Your Expertise ───────────────── */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-100">Your Expertise</h3>
                  <p className="text-sm text-neutral-500">Help the AI understand your background and perspective</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">What You Do</Label>
                  <Textarea
                    value={settings.what_you_do}
                    onChange={(e) => updateField('what_you_do', e.target.value)}
                    placeholder="e.g., I run a B2B SaaS company helping teams automate their outbound sales..."
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">What You've Learned</Label>
                  <Textarea
                    value={settings.what_youve_learned}
                    onChange={(e) => updateField('what_youve_learned', e.target.value)}
                    placeholder="e.g., After 10 years in sales tech, I've learned that personalization beats volume every time..."
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">POV on Future</Label>
                  <Textarea
                    value={settings.pov_on_future}
                    onChange={(e) => updateField('pov_on_future', e.target.value)}
                    placeholder="e.g., I believe AI will transform how we think about customer relationships..."
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Industry Talking Points</Label>
                  <Textarea
                    value={settings.industry_talking_points}
                    onChange={(e) => updateField('industry_talking_points', e.target.value)}
                    placeholder="e.g., Outbound is not dead. Cold email works when done right. AI should augment, not replace."
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ───────────────── Brand Voice ───────────────── */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-100">Brand Voice</h3>
                  <p className="text-sm text-neutral-500">Define how your comments should sound</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Voice Reference</Label>
                  <Input
                    value={settings.voice_reference}
                    onChange={(e) => updateField('voice_reference', e.target.value)}
                    placeholder='e.g., "Write like Jason Lemkin" or "Sound like Naval Ravikant"'
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tone of Voice</Label>
                    <Textarea
                      value={settings.tone_of_voice}
                      onChange={(e) => updateField('tone_of_voice', e.target.value)}
                      placeholder="e.g., Warm but authoritative. Speak from experience, not theory. Avoid corporate jargon."
                      className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Writing Style</Label>
                    <Textarea
                      value={settings.writing_style}
                      onChange={(e) => updateField('writing_style', e.target.value)}
                      placeholder="e.g., Short sentences. Use line breaks. No emojis. Occasionally use bold for emphasis."
                      className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Dos and Don'ts</Label>
                  <Textarea
                    value={settings.dos_and_donts}
                    onChange={(e) => updateField('dos_and_donts', e.target.value)}
                    placeholder="e.g., DO: share personal anecdotes, ask open-ended questions. DON'T: use hashtags, tag people, be generic."
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ───────────────── Vibe Check ───────────────── */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-100">Vibe Check</h3>
                  <p className="text-sm text-neutral-500">Fine-tune the personality of your comments</p>
                </div>
              </div>

              <div className="space-y-5">
                {[
                  { key: 'okay_with_humor' as const, label: 'Okay with humor', description: 'Allow light humor and wit in comments' },
                  { key: 'okay_being_blunt' as const, label: 'Okay being blunt', description: 'Allow direct, candid opinions when appropriate' },
                  { key: 'casual_openers' as const, label: 'Casual openers', description: 'Use relaxed conversation starters like "Love this" or "Great take"' },
                  { key: 'personal_experience' as const, label: 'Personal experience', description: 'Reference personal stories and lessons learned' },
                  { key: 'strictly_professional' as const, label: 'Strictly professional', description: 'Keep all comments buttoned-up and corporate-safe' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-neutral-800/50 last:border-0">
                    <div>
                      <p className="text-neutral-100 font-bold text-sm">{item.label}</p>
                      <p className="text-neutral-500 text-xs mt-0.5">{item.description}</p>
                    </div>
                    <Switch
                      checked={settings[item.key]}
                      onCheckedChange={(checked) => updateField(item.key, checked)}
                      className="data-[state=checked]:bg-violet-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ───────────────── Comment Framework ───────────────── */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-100">Comment Framework</h3>
                  <p className="text-sm text-neutral-500">Structure how comments are composed</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Framework Preset</Label>
                    <Select value={settings.framework_preset} onValueChange={(v) => updateField('framework_preset', v as CommentingSettings['framework_preset'])}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-neutral-700">
                        <SelectItem value="aca_i">ACA-I (Acknowledge, Complement, Add, Invite)</SelectItem>
                        <SelectItem value="var">VAR (Validate, Add, Redirect)</SelectItem>
                        <SelectItem value="hook_value_bridge">Hook-Value-Bridge</SelectItem>
                        <SelectItem value="custom">Custom Framework</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="mt-1">
                      {settings.framework_preset === 'aca_i' && (
                        <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs">Acknowledge the post, Complement the author, Add your insight, Invite discussion</Badge>
                      )}
                      {settings.framework_preset === 'var' && (
                        <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">Validate the point, Add perspective, Redirect with a question</Badge>
                      )}
                      {settings.framework_preset === 'hook_value_bridge' && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">Hook with agreement, Deliver value, Bridge to your expertise</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Max Characters</Label>
                    <Input
                      type="number"
                      value={settings.max_characters}
                      onChange={(e) => updateField('max_characters', parseInt(e.target.value) || 300)}
                      min={50}
                      max={3000}
                      className="bg-neutral-800 border-neutral-700 text-neutral-100"
                    />
                    <p className="text-neutral-600 text-xs">Recommended: 200-500 characters for LinkedIn</p>
                  </div>
                </div>

                {settings.framework_preset === 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Custom Framework</Label>
                    <Textarea
                      value={settings.custom_framework}
                      onChange={(e) => updateField('custom_framework', e.target.value)}
                      placeholder="Describe your custom commenting framework step by step..."
                      className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[120px] resize-none"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Example Comments</Label>
                  <Textarea
                    value={settings.example_comments}
                    onChange={(e) => updateField('example_comments', e.target.value)}
                    placeholder={"Paste example comments you'd want the AI to emulate (one per line):\n\nGreat insight on the shift toward AI-native workflows. We saw a 3x improvement in reply rates when we moved from templates to dynamic personalization.\n\nThis is exactly right. The companies winning at outbound right now aren't sending more emails - they're sending better ones."}
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[140px] resize-none"
                  />
                  <p className="text-neutral-600 text-xs">One example per line. These help the AI match your natural commenting style.</p>
                </div>
              </div>
            </div>

            {/* ───────────────── Guardrails ───────────────── */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-100">Guardrails</h3>
                  <p className="text-sm text-neutral-500">Set boundaries the AI should never cross</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Competitors to Never Mention</Label>
                  <Input
                    value={settings.competitors_never_mention}
                    onChange={(e) => updateField('competitors_never_mention', e.target.value)}
                    placeholder="e.g., Competitor A, Competitor B, Competitor C"
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600"
                  />
                  <p className="text-neutral-600 text-xs">Comma-separated list of names or brands to avoid</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">CTA Frequency</Label>
                    <Select value={settings.cta_frequency} onValueChange={(v) => updateField('cta_frequency', v as CommentingSettings['cta_frequency'])}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-neutral-700">
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="occasionally">Occasionally</SelectItem>
                        <SelectItem value="when_relevant">When Relevant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">CTA Style</Label>
                    <Select value={settings.cta_style} onValueChange={(v) => updateField('cta_style', v as CommentingSettings['cta_style'])}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-neutral-700">
                        <SelectItem value="question_only">Question Only</SelectItem>
                        <SelectItem value="soft_invitation">Soft Invitation</SelectItem>
                        <SelectItem value="direct_ask">Direct Ask</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* ───────────────── Scheduling ───────────────── */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-100">Scheduling</h3>
                  <p className="text-sm text-neutral-500">Control when and how often comments are posted</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Timezone</Label>
                  <Input
                    value={settings.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    placeholder="e.g., America/New_York"
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Daily Comment Limit</Label>
                  <Input
                    type="number"
                    value={settings.daily_comment_limit}
                    onChange={(e) => updateField('daily_comment_limit', parseInt(e.target.value) || 20)}
                    min={1}
                    max={100}
                    className="bg-neutral-800 border-neutral-700 text-neutral-100"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-neutral-800/50">
                  <div>
                    <p className="text-neutral-100 font-bold text-sm">Skip weekends</p>
                    <p className="text-neutral-500 text-xs mt-0.5">Pause commenting on Saturday and Sunday</p>
                  </div>
                  <Switch
                    checked={settings.skip_weekends}
                    onCheckedChange={(checked) => updateField('skip_weekends', checked)}
                    className="data-[state=checked]:bg-violet-600"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-neutral-100 font-bold text-sm">Skip holidays</p>
                    <p className="text-neutral-500 text-xs mt-0.5">Pause commenting on major US holidays</p>
                  </div>
                  <Switch
                    checked={settings.skip_holidays}
                    onCheckedChange={(checked) => updateField('skip_holidays', checked)}
                    className="data-[state=checked]:bg-violet-600"
                  />
                </div>
              </div>
            </div>

            {/* Save Button (bottom) */}
            <div className="flex justify-end pt-4">
              <Button
                variant="gradient"
                onClick={saveSettings}
                disabled={saving || loading}
                className="px-10 py-3 text-base font-bold rounded-xl"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Save All Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-neutral-800/50 text-center">
        <p className="text-neutral-600 text-sm">Powered by Vera.AI Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
