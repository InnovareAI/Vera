'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useWorkspace } from '@/contexts/AuthContext'
import type { Project } from '@/types/project'

interface ResearchResult {
  id: string
  source: 'reddit' | 'hackernews' | 'googlenews'
  title: string
  content: string
  url: string
  author: string
  timestamp: string
  score: number
  category: 'high_intent' | 'problem_aware' | 'pain_point' | 'general'
  matchedKeywords: string[]
}

interface GeneratedContent {
  platform: string
  content: string
  topic: {
    title: string
    source: string
    url: string
  }
}

export default function ProjectResearchPage() {
  const params = useParams()
  const projectId = params.id as string
  const { currentWorkspace } = useWorkspace()

  const [project, setProject] = useState<Project | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [selectedSources, setSelectedSources] = useState({
    reddit: true,
    hackernews: true,
    googlenews: true,
  })

  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          setProject(data)
          if (data.industry) {
            setQuery(data.industry)
          }
        })
        .catch(console.error)
    }
  }, [projectId])

  const fetchResearch = async () => {
    setLoading(true)
    try {
      const sources = Object.entries(selectedSources)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(',')

      const res = await fetch(`/api/research?q=${encodeURIComponent(query)}&sources=${sources}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch (e) {
      console.error('Research fetch error:', e)
    }
    setLoading(false)
  }

  const generateContent = async (result: ResearchResult, platform: string) => {
    setGenerating(`${result.id}_${platform}`)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: {
            title: result.title,
            content: result.content,
            source: result.source,
            url: result.url,
          },
          platform,
          projectContext: project
            ? {
                name: project.name,
                industry: project.industry,
                tone: project.tone_of_voice,
                icp: project.icp,
              }
            : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedContent(data)
      }
    } catch (e) {
      console.error('Generation error:', e)
    }
    setGenerating(null)
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'reddit': return 'R'
      case 'hackernews': return 'HN'
      case 'googlenews': return 'GN'
      default: return '?'
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'reddit': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'hackernews': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'googlenews': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      high_intent: 'bg-green-500/20 text-green-400 border-green-500/30',
      problem_aware: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      pain_point: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    }
    return styles[category] || styles.general
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchResearch()}
            placeholder="Search topics (e.g., AI SDR, outbound, sales automation)..."
            className="flex-1 px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder-gray-600 transition-all"
          />
          <button
            onClick={fetchResearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-white transition-all disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Source Toggles */}
        <div className="flex gap-4">
          {Object.entries(selectedSources).map(([source, enabled]) => (
            <label key={source} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() =>
                  setSelectedSources((prev) => ({ ...prev, [source]: !prev[source as keyof typeof prev] }))
                }
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-violet-500 focus:ring-violet-500/20"
              />
              <span className="text-sm text-gray-400">
                {source === 'hackernews' ? 'Hacker News' : source === 'googlenews' ? 'Google News' : 'Reddit'}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Research Feed */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Research Feed
            {results.length > 0 && <span className="text-gray-600 font-normal">({results.length})</span>}
          </h3>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {results.length === 0 && !loading && (
              <div className="text-center py-12 bg-gray-900/40 border border-gray-800 rounded-2xl">
                <svg className="w-12 h-12 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-sm">Search for topics to discover content opportunities</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm">Scanning sources...</p>
              </div>
            )}

            {results.map((result) => (
              <div
                key={result.id}
                className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getSourceColor(result.source)}`}>
                      {getSourceIcon(result.source)}
                    </span>
                    <span>{result.author}</span>
                    <span>{formatTime(result.timestamp)}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${getCategoryBadge(result.category)}`}>
                    {result.category.replace('_', ' ')}
                  </span>
                </div>

                <h4 className="font-bold text-white text-sm mb-2 line-clamp-2">{result.title}</h4>

                {result.content && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{result.content}</p>
                )}

                {result.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {result.matchedKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {['linkedin', 'twitter', 'medium'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => generateContent(result, platform)}
                      disabled={generating === `${result.id}_${platform}`}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all disabled:opacity-50 text-gray-300 font-bold"
                    >
                      {generating === `${result.id}_${platform}` ? '...' : platform}
                    </button>
                  ))}
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all text-gray-300 font-bold"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generated Content */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
            Generated Content
          </h3>

          {!generatedContent ? (
            <div className="p-8 rounded-2xl bg-gray-900 border border-gray-800 border-dashed text-center">
              <svg className="w-12 h-12 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-gray-500 text-sm">Select a topic and platform to generate content</p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold text-white">
                  {generatedContent.platform}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedContent.content)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all text-gray-300 font-bold"
                >
                  Copy
                </button>
              </div>

              <div className="mb-4 text-xs text-gray-600">
                Based on: {generatedContent.topic.title.slice(0, 60)}...
              </div>

              <div className="p-4 rounded-xl bg-gray-950 whitespace-pre-wrap text-sm leading-relaxed max-h-[50vh] overflow-y-auto text-gray-300 border border-gray-800">
                {generatedContent.content}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={async () => {
                    if (!generatedContent || !currentWorkspace) return
                    setSavingDraft(true)
                    try {
                      const res = await fetch('/api/content-items', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          workspace_id: currentWorkspace.id,
                          project_id: projectId,
                          content: generatedContent.content,
                          platform: generatedContent.platform,
                          source_url: generatedContent.topic.url,
                          source_title: generatedContent.topic.title,
                          theme: generatedContent.topic.title.slice(0, 80),
                          hook: generatedContent.content.split('\n')[0]?.slice(0, 120) || '',
                          character_count: generatedContent.content.length,
                          status: 'pending',
                        }),
                      })
                      if (res.ok) {
                        setDraftSaved(true)
                        setTimeout(() => setDraftSaved(false), 3000)
                      }
                    } catch (e) {
                      console.error('Save draft error:', e)
                    } finally {
                      setSavingDraft(false)
                    }
                  }}
                  disabled={savingDraft || draftSaved}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-sm text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {savingDraft ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
                  ) : draftSaved ? (
                    'Saved!'
                  ) : (
                    'Save to Review'
                  )}
                </button>
                <button className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 font-bold transition-all">
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
