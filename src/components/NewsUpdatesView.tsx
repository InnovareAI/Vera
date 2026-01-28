'use client'

import { useState, useEffect } from 'react'

interface NewsItem {
    id: string
    title: string
    source: string
    source_url: string
    relevance_score: number
    content: string
    created_at: string
}

interface NewsViewProps {
    onGenerateFromNews: (news: NewsItem) => void
}

// Source icons
const sourceIcons: Record<string, string> = {
    technews: '📱',
    substack: '📰',
    'google-news': '📰',
    producthunt: '🚀',
    'industry-healthcare': '🏥',
    'industry-finance': '💰',
    'industry-legal': '⚖️',
}

export function NewsUpdatesView({ onGenerateFromNews }: NewsViewProps) {
    const [news, setNews] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'technews' | 'substack' | 'google-news'>('all')

    useEffect(() => {
        fetchNews()
    }, [])

    async function fetchNews() {
        setLoading(true)
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/topics?source=in.(technews,substack,google-news,producthunt)&order=created_at.desc&limit=50`,
                {
                    headers: {
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                    }
                }
            )

            if (response.ok) {
                const data = await response.json()
                setNews(data || [])
            }
        } catch (error) {
            console.error('Failed to fetch news:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredNews = filter === 'all'
        ? news
        : news.filter(n => n.source === filter)

    // Group by date
    const groupedByDate = filteredNews.reduce((acc, item) => {
        const date = new Date(item.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        })
        if (!acc[date]) acc[date] = []
        acc[date].push(item)
        return acc
    }, {} as Record<string, NewsItem[]>)

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg">📰 Latest News</h3>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-24 shimmer rounded-xl"></div>
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
                    <h3 className="text-white font-semibold text-lg">📰 News Updates</h3>
                    <p className="text-gray-400 text-sm">Latest news to inspire your content</p>
                </div>
                <div className="flex gap-2">
                    {['all', 'technews', 'substack', 'google-news'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {f === 'all' ? 'All' : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* News by Date */}
            {Object.entries(groupedByDate).map(([date, items]) => (
                <div key={date}>
                    <h4 className="text-gray-500 text-sm font-medium mb-3 sticky top-0 bg-gray-950 py-2">
                        {date}
                    </h4>
                    <div className="space-y-3">
                        {items.map(item => {
                            let parsed: any = {}
                            try { parsed = JSON.parse(item.content || '{}') } catch { }

                            return (
                                <div
                                    key={item.id}
                                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 card-hover flex items-start gap-4"
                                >
                                    <span className="text-2xl">{sourceIcons[item.source] || '📄'}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-gray-500 text-xs">{item.source}</span>
                                            {parsed.author && (
                                                <span className="text-gray-600 text-xs">• {parsed.author}</span>
                                            )}
                                        </div>
                                        <h5 className="text-white font-medium text-sm mb-2 line-clamp-2">
                                            {item.title}
                                        </h5>
                                        {parsed.description && (
                                            <p className="text-gray-400 text-xs line-clamp-2 mb-3">
                                                {parsed.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={item.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                                            >
                                                Read More →
                                            </a>
                                            <button
                                                onClick={() => onGenerateFromNews(item)}
                                                className="text-purple-400 hover:text-purple-300 text-xs font-medium"
                                            >
                                                ✨ Create Content
                                            </button>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.relevance_score >= 0.7 ? 'bg-green-900/50 text-green-400' :
                                            item.relevance_score >= 0.5 ? 'bg-yellow-900/50 text-yellow-400' :
                                                'bg-gray-800 text-gray-400'
                                        }`}>
                                        {(item.relevance_score * 100).toFixed(0)}%
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}

            {filteredNews.length === 0 && !loading && (
                <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📰</span>
                    <h3 className="text-white font-semibold text-xl mb-2">No News Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        News is gathered by the TechNews, Substack, and Google News scouts.
                    </p>
                </div>
            )}
        </div>
    )
}
