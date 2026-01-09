'use client'

import { useState } from 'react'
import { ResearchOutput } from '@/types/research'

export default function Home() {
  const [topics, setTopics] = useState('')
  const [subreddits, setSubreddits] = useState('')
  const [timeWindow, setTimeWindow] = useState('24h')
  const [minScore, setMinScore] = useState(10)
  const [audienceContext, setAudienceContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResearchOutput | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/research/reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: topics.split(',').map(t => t.trim()).filter(Boolean),
          subreddits: subreddits.split(',').map(s => s.trim().replace(/^r\//, '')).filter(Boolean),
          timeWindow,
          minScore,
          audienceContext,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Research failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">VERA</h1>
          <p className="text-gray-400">Reddit Research Agent</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Research Parameters</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Topics (comma separated)
                </label>
                <input
                  type="text"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="AI automation, agentic workflows, MCP"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Subreddits (comma separated)
                </label>
                <input
                  type="text"
                  value={subreddits}
                  onChange={(e) => setSubreddits(e.target.value)}
                  placeholder="artificial, ChatGPT, LocalLLaMA"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Time Window
                  </label>
                  <select
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="6h">Last 6 hours</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="72h">Last 3 days</option>
                    <option value="7d">Last 7 days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Min Score
                  </label>
                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Audience Context
                </label>
                <textarea
                  value={audienceContext}
                  onChange={(e) => setAudienceContext(e.target.value)}
                  placeholder="Describe your target audience, e.g., 'B2B SaaS founders interested in AI-powered sales automation'"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              >
                {loading ? 'Researching...' : 'Run Research'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Research Results</h2>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-400">Analyzing Reddit posts...</span>
              </div>
            )}

            {!loading && !result && (
              <p className="text-gray-500 text-center py-12">
                Enter your research parameters and click "Run Research" to start.
              </p>
            )}

            {result && (
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Summary</h3>
                  <p className="text-gray-300">{result.summary}</p>
                </div>

                {/* Trends */}
                {result.trends.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Key Trends</h3>
                    <ul className="space-y-2">
                      {result.trends.map((trend, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          <span className="text-gray-300">{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Insights */}
                {result.insights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Top Insights ({result.insights.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {result.insights.map((insight, i) => (
                        <div
                          key={i}
                          className="p-3 bg-gray-800 rounded-md border border-gray-700"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <a
                              href={insight.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 font-medium text-sm line-clamp-2"
                            >
                              {insight.title}
                            </a>
                            <span className="ml-2 text-xs text-green-400 whitespace-nowrap">
                              {(insight.relevanceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            <span>{insight.source}</span>
                            <span className="mx-2">•</span>
                            <span>{insight.score} pts</span>
                            <span className="mx-2">•</span>
                            <span>{insight.comments} comments</span>
                          </div>
                          <p className="text-sm text-gray-400">{insight.relevanceReason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="text-xs text-gray-500 pt-4 border-t border-gray-800">
                  Generated at {new Date(result.generatedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
