'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/types/project'

const CHANNELS = [
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
  { id: 'twitter', label: 'X (Twitter)', color: '#1da1f2' },
  { id: 'medium', label: 'Medium', color: '#00ab6c' },
  { id: 'blog', label: 'Blog', color: '#f59e0b' },
]

const TIMEBOXES = [
  { id: '1-week', label: '1 Week', desc: '~3 posts per channel' },
  { id: '2-weeks', label: '2 Weeks', desc: '~5 posts per channel' },
  { id: '1-month', label: '1 Month', desc: '~8 posts per channel' },
]

const TYPE_COLORS: Record<string, string> = {
  'hot-take': 'bg-red-500/15 text-red-400',
  'how-to': 'bg-blue-500/15 text-blue-400',
  'story': 'bg-purple-500/15 text-purple-400',
  'listicle': 'bg-amber-500/15 text-amber-400',
  'case-study': 'bg-emerald-500/15 text-emerald-400',
  'news-react': 'bg-cyan-500/15 text-cyan-400',
}

interface PlanItem {
  day: string
  platform: string
  type: string
  title: string
  brief: string
}

export default function PlanningPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // Plan inputs
  const [topic, setTopic] = useState('')
  const [timebox, setTimebox] = useState('1-week')
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['linkedin'])

  // Plan output
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => { setProject(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [projectId])

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    if (!topic.trim() || selectedChannels.length === 0) return
    setGenerating(true)
    setError('')
    setPlan([])
    setSaved(false)

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          timebox,
          channels: selectedChannels,
          projectContext: project ? {
            name: project.name,
            industry: project.industry,
            tone: project.tone_of_voice?.style,
            icp: project.icp,
            products: project.products,
          } : undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate plan')
      const data = await res.json()
      setPlan(data.plan || [])
    } catch (err) {
      setError((err as Error).message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveAll = async () => {
    if (!plan.length || !project) return
    setSaving(true)

    try {
      const saves = plan.map((item) =>
        fetch('/api/content-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            workspace_id: project.workspace_id,
            platform: item.platform,
            content_type: item.type,
            title: item.title,
            body: item.brief,
            status: 'draft',
          }),
        })
      )
      await Promise.all(saves)
      setSaved(true)
    } catch {
      setError('Failed to save some items')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Group plan by day
  const dayGroups: Record<string, PlanItem[]> = {}
  plan.forEach((item) => {
    if (!dayGroups[item.day]) dayGroups[item.day] = []
    dayGroups[item.day].push(item)
  })

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-100 mb-1">Campaign Planning</h2>
        <p className="text-neutral-500 text-sm">
          Define your topic, pick channels and a timeframe — AI builds the plan.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5">
        {/* Topic */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">Topic</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="AI in B2B sales, product-led growth, your latest feature launch..."
            rows={2}
            className="w-full bg-neutral-800/60 border border-neutral-700/50 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
          />
        </div>

        {/* Timebox */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">Timeframe</label>
          <div className="flex gap-2">
            {TIMEBOXES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimebox(t.id)}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                  timebox === t.id
                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                    : 'bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-neutral-300 hover:border-neutral-600'
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className="block text-xs mt-0.5 opacity-60">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">Channels</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => {
              const active = selectedChannels.includes(ch.id)
              return (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    active
                      ? 'border-violet-500/40 text-neutral-100'
                      : 'bg-neutral-800/40 border-neutral-700/50 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600'
                  }`}
                  style={active ? { backgroundColor: ch.color + '20', borderColor: ch.color + '60' } : {}}
                >
                  {ch.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || selectedChannels.length === 0 || generating}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-medium rounded-lg transition-all text-sm"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Generating plan...
            </span>
          ) : (
            'Generate Content Plan'
          )}
        </button>

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>

      {/* Generated Plan */}
      {plan.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200">
              Your Plan — {plan.length} posts across {selectedChannels.length} channel{selectedChannels.length > 1 ? 's' : ''}
            </h3>
            <button
              onClick={handleSaveAll}
              disabled={saving || saved}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                saved
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {saved ? 'Saved as Drafts' : saving ? 'Saving...' : 'Save All as Drafts'}
            </button>
          </div>

          {Object.entries(dayGroups).map(([day, items]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{day}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item, i) => {
                  const ch = CHANNELS.find((c) => c.id === item.platform)
                  return (
                    <div
                      key={`${day}-${i}`}
                      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700/60 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wide"
                          style={{
                            backgroundColor: (ch?.color || '#7c3aed') + '20',
                            color: ch?.color || '#7c3aed',
                          }}
                        >
                          {ch?.label || item.platform}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded capitalize ${TYPE_COLORS[item.type] || 'bg-neutral-700/30 text-neutral-400'}`}>
                          {item.type}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-neutral-100 mb-1 leading-snug">{item.title}</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">{item.brief}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state hint */}
      {plan.length === 0 && !generating && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-800/60 mb-4">
            <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-sm text-neutral-500 mb-1">No plan generated yet</p>
          <p className="text-xs text-neutral-600">Enter a topic, pick your channels and timeframe, then hit generate.</p>
        </div>
      )}
    </div>
  )
}
