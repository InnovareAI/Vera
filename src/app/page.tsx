'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SourceBarChart, TopicsLineChart, ScoreDistributionChart } from '@/components/Charts'
import { ContentGenerator } from '@/components/ContentGenerator'
import { TrendsView } from '@/components/TrendsView'
import { NewsUpdatesView } from '@/components/NewsUpdatesView'

// Types
interface Topic {
  id: string
  title: string
  source: string
  source_url: string
  relevance_score: number
  content: string
  created_at: string
}

interface Stats {
  totalTopics: number
  todayTopics: number
  sources: { source: string; count: number }[]
  topScoring: Topic[]
}

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Source icons
const sourceIcons: Record<string, string> = {
  linkedin: '💼',
  hackernews: '🟠',
  reddit: '🔴',
  youtube: '🎬',
  devto: '👨‍💻',
  substack: '📰',
  technews: '📱',
  quora: '❓',
  producthunt: '🚀',
  'google-news': '📰',
  g2: '⭐',
  'industry-healthcare': '🏥',
  'industry-finance': '💰',
  'industry-legal': '⚖️',
  'industry-realestate': '🏠',
  competitor: '🎯',
}

// Get source badge class
function getSourceBadge(source: string): string {
  const baseSource = source.split('-')[0]
  return `source-badge source-${baseSource}`
}

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Stats Card Component
function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: string; trend?: string }) {
  return (
    <div className="stat-card p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && <p className="text-green-400 text-xs mt-1">{trend}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

// Topic Card Component
function TopicCard({ topic, onGenerate }: { topic: Topic; onGenerate?: (topic: Topic) => void }) {
  const [expanded, setExpanded] = useState(false)
  let parsedContent: any = {}
  try {
    parsedContent = JSON.parse(topic.content || '{}')
  } catch { }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 card-hover">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-1">{sourceIcons[topic.source] || '📄'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={getSourceBadge(topic.source)}>{topic.source}</span>
            <span className="text-gray-500 text-xs">{formatRelativeTime(topic.created_at)}</span>
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${topic.relevance_score >= 0.7 ? 'bg-green-900/50 text-green-400' :
              topic.relevance_score >= 0.5 ? 'bg-yellow-900/50 text-yellow-400' :
                'bg-gray-800 text-gray-400'
              }`}>
              {(topic.relevance_score * 100).toFixed(0)}%
            </span>
          </div>
          <h3 className="text-white font-medium text-sm line-clamp-2 mb-2">
            {topic.title}
          </h3>
          {parsedContent.description && (
            <p className={`text-gray-400 text-xs ${expanded ? '' : 'line-clamp-2'}`}>
              {parsedContent.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <a
              href={topic.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
            >
              View Source →
            </a>
            {onGenerate && (
              <button
                onClick={() => onGenerate(topic)}
                className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors"
              >
                ✨ Generate
              </button>
            )}
            {parsedContent.description && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Source Filter Pills
function SourceFilters({ sources, selected, onSelect }: {
  sources: string[];
  selected: string | null;
  onSelect: (s: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selected === null
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
      >
        All Sources
      </button>
      {sources.map(source => (
        <button
          key={source}
          onClick={() => onSelect(source)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${selected === source
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
        >
          <span>{sourceIcons[source] || '📄'}</span>
          {source}
        </button>
      ))}
    </div>
  )
}

// Search Component
function SearchBar({ value, onChange, onSearch }: {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        placeholder="Search topics or run instant search..."
        className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
      <button
        onClick={onSearch}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
      >
        Search
      </button>
    </div>
  )
}

// Sidebar Component
function Sidebar({ activeView, onViewChange }: { activeView: string; onViewChange: (v: string) => void }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'topics', label: 'Topics', icon: '📑' },
    { id: 'trends', label: 'Trends', icon: '📈' },
    { id: 'news', label: 'News Updates', icon: '📰' },
    { id: 'campaigns', label: 'Campaigns', icon: '🚀', href: '/campaigns' },
    { id: 'personas', label: 'Personas', icon: '🎭', href: '/personas' },
    { id: 'competitors', label: 'Competitors', icon: '🎯' },
    { id: 'industries', label: 'Industries', icon: '🏢' },
    { id: 'search', label: 'Instant Search', icon: '🔍' },
  ]

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">VERA</h1>
            <p className="text-gray-500 text-xs">Content Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.id}>
              {'href' in item && item.href ? (
                <a
                  href={item.href}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <span>{item.icon}</span>
                  {item.label}
                  <span className="ml-auto text-xs bg-gradient-to-r from-violet-500 to-purple-500 text-white px-1.5 py-0.5 rounded">NEW</span>
                </a>
              ) : (
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeView === item.id
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Status */}
      <div className="p-3 border-t border-gray-800">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full pulse-live"></div>
            <span className="text-green-400 text-xs font-medium">All Scouts Active</span>
          </div>
          <p className="text-gray-500 text-xs">14 scouts running</p>
        </div>
      </div>
    </aside>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const [activeView, setActiveView] = useState('dashboard')
  const [topics, setTopics] = useState<Topic[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [generatingTopic, setGeneratingTopic] = useState<Topic | null>(null)

  // Fetch topics
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Fetch topics
        let query = supabase
          .from('topics')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (selectedSource) {
          query = query.eq('source', selectedSource)
        }

        const { data: topicsData, error } = await query

        if (error) throw error
        setTopics(topicsData || [])

        // Calculate stats
        const today = new Date().toISOString().split('T')[0]
        const todayTopics = (topicsData || []).filter(t =>
          t.created_at.startsWith(today)
        ).length

        // Group by source
        const sourceMap = (topicsData || []).reduce((acc, t) => {
          acc[t.source] = (acc[t.source] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const sources = Object.entries(sourceMap)
          .map(([source, count]) => ({ source, count: count as number }))
          .sort((a, b) => b.count - a.count)

        setStats({
          totalTopics: topicsData?.length || 0,
          todayTopics,
          sources,
          topScoring: (topicsData || [])
            .sort((a, b) => b.relevance_score - a.relevance_score)
            .slice(0, 5)
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedSource])

  // Handle instant search
  async function handleSearch() {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instant-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 5
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
        setActiveView('search')
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  // Get unique sources
  const uniqueSources = Array.from(new Set(topics.map(t => t.source)))

  return (
    <div className="min-h-screen flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 glass border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white capitalize">{activeView}</h2>
              <p className="text-gray-500 text-sm">
                {activeView === 'dashboard' && 'Overview of your content intelligence'}
                {activeView === 'topics' && 'All discovered topics and opportunities'}
                {activeView === 'trends' && 'Trending topics and emerging patterns'}
                {activeView === 'news' && 'Latest news to inspire your content'}
                {activeView === 'competitors' && 'Competitor mentions and market intel'}
                {activeView === 'industries' && 'Industry-specific news and updates'}
                {activeView === 'search' && 'Search across all sources in real-time'}
              </p>
            </div>
            <div className="w-96">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
              />
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  label="Total Topics"
                  value={stats?.totalTopics || 0}
                  icon="📑"
                />
                <StatCard
                  label="Today"
                  value={stats?.todayTopics || 0}
                  icon="📅"
                  trend="+12% vs yesterday"
                />
                <StatCard
                  label="Active Sources"
                  value={stats?.sources.length || 0}
                  icon="🌐"
                />
                <StatCard
                  label="Avg Score"
                  value={topics.length > 0
                    ? `${((topics.reduce((a, t) => a + t.relevance_score, 0) / topics.length) * 100).toFixed(0)}%`
                    : '0%'
                  }
                  icon="⭐"
                />
              </div>

              {/* Top Scoring Topics */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">🔥 Top Scoring Topics</h3>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 shimmer rounded-lg"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats?.topScoring.map(topic => (
                      <TopicCard key={topic.id} topic={topic} onGenerate={setGeneratingTopic} />
                    ))}
                  </div>
                )}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-4">📊 Source Distribution</h3>
                  {stats && <SourceBarChart data={stats.sources} />}
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-4">📈 Score Distribution</h3>
                  {topics.length > 0 && <ScoreDistributionChart topics={topics} />}
                </div>
              </div>

              {/* Sources Breakdown */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">📊 Topics by Source</h3>
                <div className="grid grid-cols-6 gap-3">
                  {stats?.sources.slice(0, 12).map(({ source, count }) => (
                    <div
                      key={source}
                      className="bg-gray-800 rounded-lg p-3 text-center card-hover cursor-pointer"
                      onClick={() => {
                        setSelectedSource(source)
                        setActiveView('topics')
                      }}
                    >
                      <span className="text-2xl">{sourceIcons[source] || '📄'}</span>
                      <p className="text-white font-semibold mt-1">{count}</p>
                      <p className="text-gray-500 text-xs truncate">{source}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Topics View */}
          {activeView === 'topics' && (
            <div className="space-y-4">
              <SourceFilters
                sources={uniqueSources}
                selected={selectedSource}
                onSelect={setSelectedSource}
              />

              {loading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-32 shimmer rounded-xl"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {topics.map(topic => (
                    <TopicCard key={topic.id} topic={topic} onGenerate={setGeneratingTopic} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Results View */}
          {activeView === 'search' && (
            <div className="space-y-4">
              {searching && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Searching across all sources...
                  </div>
                </div>
              )}

              {searchResults && !searching && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">
                      Results for "{searchResults.query}"
                    </h3>
                    <span className="text-gray-500 text-sm">
                      {searchResults.totalResults} results
                    </span>
                  </div>

                  {Object.entries(searchResults.bySource || {}).map(([source, results]: [string, any]) => (
                    <div key={source} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <span>{sourceIcons[source] || '📄'}</span>
                        {source}
                        <span className="text-gray-500 text-sm">({results.length})</span>
                      </h4>
                      <div className="space-y-3">
                        {results.map((result: any, i: number) => (
                          <a
                            key={i}
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                          >
                            <p className="text-white text-sm font-medium line-clamp-1">{result.title}</p>
                            {result.content && (
                              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{result.content}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!searchResults && !searching && (
                <div className="text-center py-20">
                  <span className="text-6xl mb-4 block">🔍</span>
                  <h3 className="text-white font-semibold text-xl mb-2">Instant Search</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Search across LinkedIn, Hacker News, Google News, and DEV.to in real-time.
                    Enter a topic above and hit Search.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Trends View */}
          {activeView === 'trends' && (
            <TrendsView onGenerateFromTrend={(trend) => {
              setGeneratingTopic({
                id: `trend-${trend.category}`,
                title: `Trending: ${trend.category} - ${trend.mentionCount} mentions, ${trend.growthRate}% growth`,
                source: 'trends',
                source_url: '',
                relevance_score: trend.trendScore / 100,
                content: JSON.stringify({
                  category: trend.category,
                  samples: trend.sampleTopics,
                  description: `Create content about trending topic: ${trend.category}`
                }),
                created_at: new Date().toISOString()
              })
            }} />
          )}

          {/* News Updates View */}
          {activeView === 'news' && (
            <NewsUpdatesView onGenerateFromNews={(news) => setGeneratingTopic(news)} />
          )}

          {/* Competitors View */}
          {activeView === 'competitors' && (
            <div className="text-center py-20">
              <span className="text-6xl mb-4 block">🎯</span>
              <h3 className="text-white font-semibold text-xl mb-2">Competitive Intelligence</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                Track competitor mentions across all platforms. Monitor Apollo, Instantly, Lemlist, and more.
              </p>
              <button
                onClick={async () => {
                  const response = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/monitor-competitors`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                      }
                    }
                  )
                  const data = await response.json()
                  alert(JSON.stringify(data.stats, null, 2))
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Run Competitor Scan
              </button>
            </div>
          )}

          {/* Industries View */}
          {activeView === 'industries' && (
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'healthcare', name: 'Healthcare', icon: '🏥' },
                { key: 'finance', name: 'Finance', icon: '💰' },
                { key: 'legal', name: 'Legal', icon: '⚖️' },
                { key: 'realestate', name: 'Real Estate', icon: '🏠' },
                { key: 'insurance', name: 'Insurance', icon: '🛡️' },
                { key: 'ecommerce', name: 'E-commerce', icon: '🛒' },
                { key: 'manufacturing', name: 'Manufacturing', icon: '🏭' },
                { key: 'education', name: 'Education', icon: '📚' },
              ].map(industry => (
                <div
                  key={industry.key}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center card-hover cursor-pointer"
                  onClick={async () => {
                    const response = await fetch(
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/monitor-industry`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                        },
                        body: JSON.stringify({ industries: [industry.key] })
                      }
                    )
                    const data = await response.json()
                    alert(`${industry.name}: ${data.stats?.newArticles || 0} new articles found`)
                  }}
                >
                  <span className="text-4xl">{industry.icon}</span>
                  <p className="text-white font-medium mt-3">{industry.name}</p>
                  <p className="text-gray-500 text-xs mt-1">Click to scan</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Content Generator Modal */}
      {generatingTopic && (
        <ContentGenerator
          topic={{
            title: generatingTopic.title,
            source: generatingTopic.source,
            content: generatingTopic.content,
          }}
          onClose={() => setGeneratingTopic(null)}
        />
      )}
    </div>
  )
}
