'use client'

import { useState, useEffect } from 'react'

interface TrendData {
    category: string
    mentionCount: number
    recentMentions: number
    weeklyMentions: number
    growthRate: number
    topSources: { source: string; count: number }[]
    sampleTopics: string[]
    trendScore: number
}

interface TrendsViewProps {
    onGenerateFromTrend: (trend: TrendData) => void
}

// Category icons
const categoryIcons: Record<string, string> = {
    'AI Sales': '🤖',
    'Email Deliverability': '📧',
    'Cold Outreach': '❄️',
    'Lead Generation': '🎯',
    'Sales Automation': '⚙️',
    'Revenue Operations': '💰',
}

export function TrendsView({ onGenerateFromTrend }: TrendsViewProps) {
    const [trends, setTrends] = useState<TrendData[]>([])
    const [loading, setLoading] = useState(true)
    const [insights, setInsights] = useState('')
    const [refreshing, setRefreshing] = useState(false)

    // Fetch trends on mount
    useEffect(() => {
        fetchTrends()
    }, [])

    async function fetchTrends() {
        setLoading(true)
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/monitor-trends`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                    }
                }
            )

            if (response.ok) {
                const data = await response.json()
                setTrends(data.trends || [])
                setInsights(data.insights || '')
            }
        } catch (error) {
            console.error('Failed to fetch trends:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleRefresh() {
        setRefreshing(true)
        await fetchTrends()
        setRefreshing(false)
    }

    function getScoreColor(score: number): string {
        if (score >= 80) return 'text-green-400'
        if (score >= 50) return 'text-yellow-400'
        return 'text-gray-400'
    }

    function getGrowthColor(rate: number): string {
        if (rate >= 50) return 'text-green-400'
        if (rate >= 20) return 'text-yellow-400'
        if (rate > 0) return 'text-blue-400'
        return 'text-red-400'
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg">📈 Trend Analysis</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 shimmer rounded-xl"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white font-semibold text-lg">📈 Trending Topics</h3>
                    <p className="text-gray-400 text-sm">Fuel your content with these emerging trends</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                    {refreshing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            Analyzing...
                        </>
                    ) : (
                        <>🔄 Refresh Trends</>
                    )}
                </button>
            </div>

            {/* AI Insights */}
            {insights && (
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50 rounded-xl p-5">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <span>💡</span> AI Insights
                    </h4>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{insights}</p>
                </div>
            )}

            {/* Trend Cards */}
            <div className="grid grid-cols-3 gap-4">
                {trends.map(trend => (
                    <div
                        key={trend.category}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-5 card-hover"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{categoryIcons[trend.category] || '📊'}</span>
                                <h4 className="text-white font-semibold">{trend.category}</h4>
                            </div>
                            <div className={`text-2xl font-bold ${getScoreColor(trend.trendScore)}`}>
                                {trend.trendScore}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-xl font-bold text-white">{trend.mentionCount}</p>
                                <p className="text-gray-500 text-xs">Mentions</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-2 text-center">
                                <p className={`text-xl font-bold ${getGrowthColor(trend.growthRate)}`}>
                                    {trend.growthRate > 0 ? '+' : ''}{trend.growthRate}%
                                </p>
                                <p className="text-gray-500 text-xs">Growth</p>
                            </div>
                        </div>

                        {/* Sample Topics */}
                        {trend.sampleTopics.length > 0 && (
                            <div className="mb-4">
                                <p className="text-gray-500 text-xs mb-2">Sample topics:</p>
                                <div className="space-y-1">
                                    {trend.sampleTopics.slice(0, 2).map((topic, i) => (
                                        <p key={i} className="text-gray-400 text-xs line-clamp-1">
                                            • {topic}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Sources */}
                        {trend.topSources.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                                {trend.topSources.slice(0, 3).map(s => (
                                    <span key={s.source} className="px-2 py-0.5 bg-gray-800 rounded text-gray-400 text-xs">
                                        {s.source} ({s.count})
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={() => onGenerateFromTrend(trend)}
                            className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                            ✨ Create Content
                        </button>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {trends.length === 0 && !loading && (
                <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📊</span>
                    <h3 className="text-white font-semibold text-xl mb-2">No Trends Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-6">
                        Trends are calculated from topics discovered by your scouts.
                        Run your scouts to start seeing trends.
                    </p>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Analyze Trends
                    </button>
                </div>
            )}
        </div>
    )
}
