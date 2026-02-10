'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface AnalyticsData {
  total_comments: number
  avg_confidence: number
  top_monitor: { name: string; count: number } | null
  comments_this_period: number
  daily_trend: { date: string; count: number }[]
  top_monitors: { monitor_name: string; comment_count: number; avg_confidence: number }[]
  recent_comments: {
    id: string
    post_author: string
    comment_text: string
    posted_at: string
    confidence_score: number
  }[]
}

const emptyAnalytics: AnalyticsData = {
  total_comments: 0,
  avg_confidence: 0,
  top_monitor: null,
  comments_this_period: 0,
  daily_trend: [],
  top_monitors: [],
  recent_comments: [],
}

type Range = '7d' | '30d' | '90d'

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function truncate(text: string, maxLen: number) {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function CommentingAnalyticsPage() {
  const { isLoading: authLoading } = useAuth()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()

  const [range, setRange] = useState<Range>('30d')
  const [data, setData] = useState<AnalyticsData>(emptyAnalytics)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentWorkspace) {
      fetchAnalytics()
    }
  }, [currentWorkspace, range])

  const fetchAnalytics = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const res = await fetch(`/api/commenting/analytics?workspace_id=${currentWorkspace.id}&range=${range}`)
      if (res.ok) {
        const json = await res.json()
        if (json && typeof json === 'object' && !json.error) {
          setData({ ...emptyAnalytics, ...json })
        }
      }
    } catch (err) {
      console.error('Failed to load commenting analytics', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate max daily count for bar scaling
  const maxDailyCount = Math.max(...data.daily_trend.map((d) => d.count), 1)

  // Loading state
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4 font-medium">Powering up Vera.AI...</p>
        </div>
      </div>
    )
  }

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
              <span className="text-2xl font-black tracking-tighter text-white">Vera.AI</span>
            </Link>
            <span className="text-gray-600">|</span>
            <h1 className="text-white font-medium">Commenting Agent</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/commenting">
              <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Monitors
              </button>
            </Link>
            <Link href="/commenting/settings">
              <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Settings
              </button>
            </Link>
            <span className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg">
              Analytics
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Breadcrumb + Hero */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
                Dashboard
              </Link>
              <span className="text-gray-700 text-xs">/</span>
              <Link href="/commenting" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
                Commenting
              </Link>
              <span className="text-gray-700 text-xs">/</span>
              <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Analytics</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2">Commenting Analytics</h2>
            <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
              Track the performance of your AI-generated comments across all monitored profiles.
            </p>
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
            {(['7d', '30d', '90d'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  range === r
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: 'Total Comments Posted',
                  value: data.total_comments.toLocaleString(),
                  color: 'violet',
                  note: 'All time',
                },
                {
                  label: 'Avg Confidence Score',
                  value: `${Math.round(data.avg_confidence * 100)}%`,
                  color: 'fuchsia',
                  note: 'Quality metric',
                },
                {
                  label: 'Top Monitor',
                  value: data.top_monitor?.name || '--',
                  color: 'blue',
                  note: data.top_monitor ? `${data.top_monitor.count} comments` : 'No data',
                  isText: true,
                },
                {
                  label: 'Comments This Period',
                  value: data.comments_this_period.toLocaleString(),
                  color: 'emerald',
                  note: `Last ${range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}`,
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
                    <span className={`font-black text-white ${stat.isText ? 'text-2xl truncate max-w-[180px]' : 'text-5xl'}`}>
                      {stat.value}
                    </span>
                    <span className={`text-sm font-bold mb-2 ${
                      stat.color === 'violet' ? 'text-violet-400' :
                      stat.color === 'fuchsia' ? 'text-fuchsia-400' :
                      stat.color === 'blue' ? 'text-blue-400' :
                      'text-emerald-400'
                    }`}>{stat.note}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Trend */}
            {data.daily_trend.length > 0 && (
              <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white">Daily Comment Volume</h3>
                    <p className="text-sm text-gray-500 mt-1">Comments posted per day</p>
                  </div>
                  <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    {data.daily_trend.reduce((sum, d) => sum + d.count, 0)} total
                  </Badge>
                </div>

                <div className="flex items-end gap-1 h-48">
                  {data.daily_trend.map((day, i) => {
                    const heightPct = maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-2 group"
                      >
                        <span className="text-xs text-gray-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.count}
                        </span>
                        <div className="w-full flex justify-center">
                          <div
                            className="w-full max-w-[32px] rounded-t-lg transition-all duration-300 group-hover:opacity-80"
                            style={{
                              height: `${Math.max(heightPct, 2)}%`,
                              background: `linear-gradient(to top, rgb(139, 92, 246), rgb(59, 130, 246))`,
                              minHeight: day.count > 0 ? '8px' : '2px',
                            }}
                          />
                        </div>
                        {/* Show date labels sparsely for readability */}
                        {(i === 0 || i === data.daily_trend.length - 1 || i % Math.max(1, Math.floor(data.daily_trend.length / 7)) === 0) && (
                          <span className="text-[10px] text-gray-600 font-bold whitespace-nowrap">
                            {formatDate(day.date)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top Monitors Table */}
            {data.top_monitors.length > 0 && (
              <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white">Top Monitors</h3>
                    <p className="text-sm text-gray-500 mt-1">Monitors ranked by comment volume</p>
                  </div>
                  <span className="text-gray-500 text-sm font-bold">{data.top_monitors.length} monitors</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-800/50">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800/50">
                        <th className="text-left text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-6">Monitor</th>
                        <th className="text-right text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-6">Comments</th>
                        <th className="text-right text-gray-500 font-bold uppercase tracking-widest text-xs py-4 px-6">Avg Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_monitors.map((monitor, i) => (
                        <tr
                          key={monitor.monitor_name}
                          className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                                i === 0 ? 'bg-violet-500/20 text-violet-400' :
                                i === 1 ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                                i === 2 ? 'bg-blue-500/20 text-blue-400' :
                                'bg-gray-800 text-gray-500'
                              }`}>
                                {i + 1}
                              </div>
                              <span className="font-bold text-white">{monitor.monitor_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-sm text-gray-300">
                            {monitor.comment_count.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Badge className={`${
                              monitor.avg_confidence >= 0.8
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : monitor.avg_confidence >= 0.6
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {Math.round(monitor.avg_confidence * 100)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Posted Comments */}
            <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-white">Recent Posted Comments</h3>
                  <p className="text-sm text-gray-500 mt-1">Latest AI-generated comments that were posted</p>
                </div>
                <span className="text-gray-500 text-sm font-bold">Last 20</span>
              </div>

              {data.recent_comments.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-12 h-12 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No comments posted yet</p>
                  <p className="text-gray-600 text-sm mt-1">Comments will appear here once the agent starts posting.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recent_comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-gray-800/30 border border-gray-800/50 rounded-2xl p-5 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Replying to</span>
                            <span className="text-sm font-bold text-white">{comment.post_author}</span>
                            <span className="text-gray-700 text-xs">|</span>
                            <span className="text-xs text-gray-500">{formatDateTime(comment.posted_at)}</span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {truncate(comment.comment_text, 280)}
                          </p>
                        </div>
                        <Badge className={`shrink-0 ${
                          comment.confidence_score >= 0.8
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : comment.confidence_score >= 0.6
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {Math.round(comment.confidence_score * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by Vera.AI Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
