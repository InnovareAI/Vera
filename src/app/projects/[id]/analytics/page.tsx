'use client'

import { useState } from 'react'

const STATS = [
  { label: 'Total Posts', value: '47', change: '+12', trend: 'up' as const, period: 'vs last 30d' },
  { label: 'Avg Engagement', value: '4.2%', change: '+0.8%', trend: 'up' as const, period: 'vs last 30d' },
  { label: 'Total Impressions', value: '12.4K', change: '+2.1K', trend: 'up' as const, period: 'vs last 30d' },
  { label: 'Click-through Rate', value: '2.8%', change: '-0.3%', trend: 'down' as const, period: 'vs last 30d' },
]

const FUNNEL = [
  { label: 'Social Engagement', value: '2,847', sub: 'likes, comments, shares', connected: true },
  { label: 'Website Traffic', value: '\u2014', sub: 'page views from content', connected: false, cta: 'Connect GA4' },
  { label: 'Search Visibility', value: '\u2014', sub: 'impressions in search', connected: false, cta: 'Connect GSC' },
]

const CHART_DATA = [
  { day: 'Jan 28', value: 35 }, { day: 'Jan 29', value: 45 }, { day: 'Jan 30', value: 38 },
  { day: 'Jan 31', value: 52 }, { day: 'Feb 1', value: 48 }, { day: 'Feb 2', value: 65 },
  { day: 'Feb 3', value: 58 }, { day: 'Feb 4', value: 72 }, { day: 'Feb 5', value: 68 },
  { day: 'Feb 6', value: 78 }, { day: 'Feb 7', value: 85 }, { day: 'Feb 8', value: 92 },
  { day: 'Feb 9', value: 88 }, { day: 'Feb 10', value: 95 },
]

const PLATFORM_BREAKDOWN = [
  { platform: 'LinkedIn', posts: 24, engagement: '5.1%', impressions: '8.2K', clicks: '412', ctr: '5.0%', icon: 'in' },
  { platform: 'X (Twitter)', posts: 15, engagement: '3.4%', impressions: '3.1K', clicks: '89', ctr: '2.9%', icon: 'X' },
  { platform: 'Medium', posts: 8, engagement: '4.8%', impressions: '1.1K', clicks: '67', ctr: '6.1%', icon: 'M' },
]

const TOP_CONTENT = [
  { title: 'How AI SDRs are replacing manual outreach', platform: 'LinkedIn', engagement: '8.2%', impressions: '2,340', clicks: 187, date: 'Feb 8' },
  { title: 'Thread: 5 cold email mistakes killing your reply rate', platform: 'X', engagement: '6.1%', impressions: '1,890', clicks: 112, date: 'Feb 6' },
  { title: 'The agentic future of content marketing', platform: 'Medium', engagement: '5.7%', impressions: '1,240', clicks: 94, date: 'Feb 4' },
  { title: 'Why B2B companies need AI-first content strategies', platform: 'LinkedIn', engagement: '5.3%', impressions: '1,120', clicks: 78, date: 'Feb 3' },
  { title: 'Sales automation stack for 2026', platform: 'LinkedIn', engagement: '4.9%', impressions: '980', clicks: 56, date: 'Feb 1' },
]

const SEARCH_DATA = [
  { query: 'AI SDR tool', page: '/blog/ai-sdr-guide', clicks: 142, impressions: '3.2K', ctr: '4.4%', position: '3.2' },
  { query: 'cold email automation', page: '/blog/cold-email-tips', clicks: 98, impressions: '2.8K', ctr: '3.5%', position: '5.1' },
  { query: 'content marketing AI', page: '/blog/agentic-content', clicks: 76, impressions: '1.9K', ctr: '4.0%', position: '4.7' },
  { query: 'sales automation 2026', page: '/blog/sales-stack', clicks: 54, impressions: '1.4K', ctr: '3.9%', position: '6.3' },
  { query: 'B2B outreach strategy', page: '/blog/b2b-outreach', clicks: 41, impressions: '1.1K', ctr: '3.7%', position: '8.2' },
]

const GA4_DATA = [
  { title: 'How AI SDRs are replacing manual outreach', platform: 'LinkedIn', pageviews: 847, avgTime: '2:34', bounceRate: '38%' },
  { title: 'The agentic future of content marketing', platform: 'Medium', pageviews: 623, avgTime: '3:12', bounceRate: '31%' },
  { title: '5 cold email mistakes killing your reply rate', platform: 'X', pageviews: 412, avgTime: '1:48', bounceRate: '52%' },
  { title: 'B2B companies need AI-first content strategies', platform: 'LinkedIn', pageviews: 298, avgTime: '2:21', bounceRate: '41%' },
  { title: 'Sales automation stack for 2026', platform: 'LinkedIn', pageviews: 187, avgTime: '1:56', bounceRate: '45%' },
]

const INSIGHTS = [
  { id: '1', text: 'Posts with questions get 2.1x more comments', confidence: 0.87 },
  { id: '2', text: 'How-to content drives 5x more website traffic than hot takes', confidence: 0.92 },
  { id: '3', text: 'Tuesday 9am posts get highest engagement on LinkedIn', confidence: 0.78 },
  { id: '4', text: 'Content about AI SDRs ranks on page 1 for 3 target keywords', confidence: 0.85 },
]

const DATA_SOURCES = [
  { name: 'LinkedIn', connected: true },
  { name: 'Twitter/X', connected: true },
  { name: 'Medium', connected: true },
  { name: 'Google Analytics', connected: false },
  { name: 'Search Console', connected: false },
]

export default function ProjectAnalyticsPage() {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set())
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  const activeInsights = INSIGHTS.filter(i => !dismissedInsights.has(i.id))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100 mb-1">Analytics</h2>
          <p className="text-neutral-500 text-sm">Content performance across platforms, traffic, and search</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-600">Last synced: \u2014</span>
          <button
            disabled
            className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700/50 text-neutral-500 text-xs font-medium cursor-not-allowed opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            Sync Now
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-xs font-medium text-neutral-500 mb-2">{stat.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-semibold text-neutral-100">{stat.value}</span>
              <div className="flex flex-col mb-0.5">
                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stat.change}
                </span>
                <span className="text-[10px] text-neutral-600">{stat.period}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Performance Funnel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-5">Content Performance Funnel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FUNNEL.map((stage, i) => (
            <div key={stage.label} className="relative">
              <div className={`p-5 rounded-lg border ${stage.connected ? 'border-neutral-800 bg-neutral-950' : 'border-dashed border-neutral-800 bg-neutral-950/50'}`}>
                <p className="text-xs font-medium text-neutral-500 mb-2">{stage.label}</p>
                <p className={`text-2xl font-semibold ${stage.connected ? 'text-neutral-100' : 'text-neutral-600'}`}>{stage.value}</p>
                <p className="text-xs text-neutral-500 mt-1">{stage.sub}</p>
                {stage.cta && (
                  <button className="mt-3 w-full px-3 py-1.5 rounded-lg border border-dashed border-neutral-700 text-neutral-500 text-xs font-medium hover:border-neutral-600 hover:text-neutral-400 transition-all">
                    {stage.cta}
                  </button>
                )}
              </div>
              {i < FUNNEL.length - 1 && (
                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                  <svg className="w-4 h-4 text-neutral-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Over Time */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-5">Engagement Over Time</h3>
        <div className="h-48 flex items-end gap-1.5">
          {CHART_DATA.map((d, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 relative"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {hoveredBar === i && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-[10px] text-neutral-200 font-medium whitespace-nowrap z-10">
                  {d.day}: {d.value}
                </div>
              )}
              <div
                className={`w-full rounded-t transition-all duration-150 ${
                  hoveredBar === i ? 'bg-violet-400' : 'bg-violet-500/60'
                }`}
                style={{ height: `${(d.value / 100) * 192}px` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-neutral-600">
          <span>{CHART_DATA[0].day}</span>
          <span>{CHART_DATA[Math.floor(CHART_DATA.length / 2)].day}</span>
          <span>{CHART_DATA[CHART_DATA.length - 1].day}</span>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-5">Platform Breakdown</h3>
        <div className="hidden md:grid grid-cols-[auto_1fr_repeat(5,80px)] gap-4 px-4 mb-3">
          <div className="w-8" />
          <div className="text-xs text-neutral-600 font-medium">Platform</div>
          <div className="text-xs text-neutral-600 font-medium text-right">Posts</div>
          <div className="text-xs text-neutral-600 font-medium text-right">Engagement</div>
          <div className="text-xs text-neutral-600 font-medium text-right">Impressions</div>
          <div className="text-xs text-neutral-600 font-medium text-right">Clicks</div>
          <div className="text-xs text-neutral-600 font-medium text-right">CTR</div>
        </div>
        <div className="space-y-2">
          {PLATFORM_BREAKDOWN.map((p) => (
            <div key={p.platform} className="grid grid-cols-1 md:grid-cols-[auto_1fr_repeat(5,80px)] gap-4 items-center p-3 bg-neutral-950 rounded-lg border border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-400">
                {p.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-neutral-200">{p.platform}</h4>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-200">{p.posts}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-200">{p.engagement}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-200">{p.impressions}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-200">{p.clicks}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-200">{p.ctr}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Content */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-5">Top Performing Content</h3>
        <div className="space-y-2">
          {TOP_CONTENT.map((content, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700/60 transition-all">
              <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-500">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-200 truncate">{content.title}</p>
                <p className="text-xs text-neutral-500">{content.platform} &middot; {content.date}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm text-neutral-200">{content.clicks}</p>
                <p className="text-[10px] text-neutral-600">clicks</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-400">{content.engagement}</p>
                <p className="text-xs text-neutral-500">{content.impressions} views</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Performance (GSC) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Search Performance</h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400">GSC</span>
        </div>

        <div className="mb-5 p-4 rounded-lg border border-dashed border-neutral-700 bg-neutral-950/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-300">Connect Google Search Console</p>
            <p className="text-xs text-neutral-500">See which keywords drive traffic to your content</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 text-xs font-medium hover:bg-neutral-800 transition-all">
            Connect GSC
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left text-xs text-neutral-600 font-medium pb-3 pr-4">Query</th>
                <th className="text-left text-xs text-neutral-600 font-medium pb-3 pr-4">Page</th>
                <th className="text-right text-xs text-neutral-600 font-medium pb-3 pr-4">Clicks</th>
                <th className="text-right text-xs text-neutral-600 font-medium pb-3 pr-4">Impressions</th>
                <th className="text-right text-xs text-neutral-600 font-medium pb-3 pr-4">CTR</th>
                <th className="text-right text-xs text-neutral-600 font-medium pb-3">Position</th>
              </tr>
            </thead>
            <tbody>
              {SEARCH_DATA.map((row, i) => (
                <tr key={i} className="border-b border-neutral-800/50 last:border-0">
                  <td className="py-3 pr-4"><span className="text-sm text-neutral-200">{row.query}</span></td>
                  <td className="py-3 pr-4"><span className="text-xs text-neutral-500 font-mono">{row.page}</span></td>
                  <td className="py-3 pr-4 text-right"><span className="text-sm text-neutral-200">{row.clicks}</span></td>
                  <td className="py-3 pr-4 text-right"><span className="text-sm text-neutral-400">{row.impressions}</span></td>
                  <td className="py-3 pr-4 text-right"><span className="text-sm text-neutral-400">{row.ctr}</span></td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-medium ${parseFloat(row.position) <= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      #{row.position}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-neutral-700 mt-4 text-center">Sample data — connect Google Search Console to see real rankings</p>
      </div>

      {/* Website Traffic from Content (GA4) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Website Traffic from Content</h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400">GA4</span>
        </div>

        <div className="mb-5 p-4 rounded-lg border border-dashed border-neutral-700 bg-neutral-950/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-300">Connect Google Analytics</p>
            <p className="text-xs text-neutral-500">See how your content drives website traffic</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 text-xs font-medium hover:bg-neutral-800 transition-all">
            Connect GA4
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left text-xs text-neutral-600 font-medium pb-3 pr-4">Content</th>
                <th className="text-left text-xs text-neutral-600 font-medium pb-3 pr-4">Source</th>
                <th className="text-right text-xs text-neutral-600 font-medium pb-3 pr-4">Page Views</th>
                <th className="text-right text-xs text-neutral-600 font-medium pb-3 pr-4">Avg Time</th>
                <th className="text-right text-xs text-neutral-600 font-medium pb-3">Bounce Rate</th>
              </tr>
            </thead>
            <tbody>
              {GA4_DATA.map((row, i) => (
                <tr key={i} className="border-b border-neutral-800/50 last:border-0">
                  <td className="py-3 pr-4"><span className="text-sm text-neutral-200">{row.title}</span></td>
                  <td className="py-3 pr-4">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400">{row.platform}</span>
                  </td>
                  <td className="py-3 pr-4 text-right"><span className="text-sm text-neutral-200">{row.pageviews.toLocaleString()}</span></td>
                  <td className="py-3 pr-4 text-right"><span className="text-sm text-neutral-400">{row.avgTime}</span></td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-medium ${parseInt(row.bounceRate) <= 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {row.bounceRate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-neutral-700 mt-4 text-center">Sample data — connect Google Analytics to see real traffic metrics</p>
      </div>

      {/* AI Insights */}
      {activeInsights.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">AI Insights</h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400">
              Generated from your performance data
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeInsights.map((insight) => (
              <div key={insight.id} className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700/60 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 leading-snug">{insight.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <div className={`h-1 rounded-full ${
                          insight.confidence >= 0.85 ? 'bg-emerald-500 w-8' :
                          insight.confidence >= 0.7 ? 'bg-amber-500 w-6' :
                          'bg-neutral-600 w-4'
                        }`} />
                        <span className="text-[10px] text-neutral-600">{Math.round(insight.confidence * 100)}% confidence</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissedInsights(prev => new Set([...prev, insight.id]))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-600 hover:text-neutral-400 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Sources Footer */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
        <h4 className="text-xs font-medium text-neutral-600 mb-3">Connected Data Sources</h4>
        <div className="flex flex-wrap items-center gap-4">
          {DATA_SOURCES.map((source) => (
            <div key={source.name} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${source.connected ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
              <span className={`text-xs ${source.connected ? 'text-neutral-400' : 'text-neutral-600'}`}>
                {source.name}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
