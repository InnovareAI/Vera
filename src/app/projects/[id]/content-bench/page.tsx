'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useWorkspace } from '@/contexts/AuthContext'
import type { Project } from '@/types/project'

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'Twitter/X', icon: '𝕏' },
  { id: 'medium', label: 'Medium', icon: '📝' },
]

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'thought-leader', label: 'Thought Leader' },
]

export default function ContentBenchPage() {
  const params = useParams()
  const projectId = params.id as string
  const { currentWorkspace } = useWorkspace()

  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('linkedin')
  const [tone, setTone] = useState('professional')
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [editableContent, setEditableContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [projectLoaded, setProjectLoaded] = useState(false)

  const loadProject = useCallback(async () => {
    if (projectLoaded) return project
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
        setProjectLoaded(true)
        return data
      }
    } catch (e) {
      console.error('Failed to load project:', e)
    }
    return null
  }, [projectId, projectLoaded, project])

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setError(null)
    setGeneratedContent('')
    setEditableContent('')
    setSaved(false)

    try {
      const proj = await loadProject()

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: {
            title: topic,
            content: topic,
            source: 'manual',
            url: '',
          },
          platform,
          tone,
          projectContext: proj ? {
            name: proj.name,
            industry: proj.industry,
            tone: proj.tone_of_voice?.style || tone,
            icp: proj.icp,
            products: proj.products,
          } : undefined,
        }),
      })

      const data = await res.json()

      if (data.success && data.content) {
        setGeneratedContent(data.content)
        setEditableContent(data.content)
      } else {
        setError(data.error || 'Failed to generate content')
      }
    } catch (e) {
      console.error('Generate error:', e)
      setError('Failed to generate content. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!editableContent.trim() || !currentWorkspace) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/content-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          project_id: projectId,
          content: editableContent,
          platform,
          source_title: topic,
          theme: topic.slice(0, 80),
          hook: editableContent.split('\n')[0]?.slice(0, 120) || '',
          character_count: editableContent.length,
          status: 'pending',
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          setGeneratedContent('')
          setEditableContent('')
          setTopic('')
        }, 1500)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save content')
      }
    } catch (e) {
      console.error('Save error:', e)
      setError('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Topic Input */}
      <div>
        <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">
          Topic / Brief
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Describe what you want to write about... e.g., 'Why cold outreach is broken in 2026 and how AI SDRs are changing the game'"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder-gray-600 text-sm resize-none transition-all"
        />
      </div>

      {/* Platform + Tone Row */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">
            Platform
          </label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  platform === p.id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-white'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-48">
          <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">
            Tone
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-sm font-bold focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {TONES.map((t) => (
              <option key={t.id} value={t.id} className="bg-gray-900">
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !topic.trim()}
        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Content'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Generated Content */}
      {generatedContent && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                platform === 'linkedin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                platform === 'twitter' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {PLATFORMS.find(p => p.id === platform)?.icon} {PLATFORMS.find(p => p.id === platform)?.label}
              </span>
              <span className="text-gray-500 text-xs">{editableContent.length} chars</span>
            </div>
          </div>

          <div className="p-5">
            <textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              rows={14}
              className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-gray-300 text-sm leading-relaxed resize-none font-sans transition-all"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving || saved || !editableContent.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  'Saved to Review!'
                ) : (
                  'Save to Review'
                )}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-bold transition-all"
              >
                Regenerate
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(editableContent)}
                className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-bold transition-all"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
