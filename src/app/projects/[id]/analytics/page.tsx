'use client'

import { useState } from 'react'

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA — structured to match future ProjectPerformanceStats
// ═══════════════════════════════════════════════════════════════════

const STATS = [
  { label: 'Total Posts', value: '47', change: '+12', trend: 'up' as const, period: 'vs last 30d' },
  { label: 'Avg Engagement', value: '4.2%', change: '+0.8%', trend: 'up' as const, period: 'vs last 30d' },
  { label: 'Total Impressions', value: '12.4K', change: '+2.1K', trend: 'up' as const, period: 'vs last 30d' },
  { label: 'Click-through Rate', value: '2.8%', change: '-0.3%', trend: 'down' as const, period: 'vs last 30d' },
]

const FUNNEL = [
  { label: 'Social Engagement', value: '2,847', sub: 'likes, comments, shares', icon: 'social', connected: true },
  { label: 'Website Traffic', value: '—', sub: 'page views from content', icon: 'traffic', connected: false, cta: 'Connect GA4' },
  { label: 'Search Visibility', value: '—', sub: 'impressions in search', icon: 'search', connected: false, cta: 'Connect GSC' },
]

const CHART_DATA = [
  { day: 'Jan 28', value: 35 }, { day: 'Jan 29', value: 45 }, { day: 'Jan 30', value: 38 },
  { day: 'Jan 31', value: 52 }, { day: 'Feb 1', value: 48 }, { day: 'Feb 2', value: 65 },
  { day: 'Feb 3', value: 58 }, { day: 'Feb 4', value: 72 }, { day: 'Feb 5', value: 68 },
  { day: 'Feb 6', value: 78 }, { day: 'Feb 7', value: 85 }, { day: 'Feb 8', value: 92 },
  { day: 'Feb 9', value: 88 }, { day: 'Feb 10', value: 95 },
]

const PLATFORM_BREAKDOWN = [
  { platform: 'LinkedIn', posts: 24, engagement: '5.1%', impressions: '8.2K', clicks: '412', ctr: '5.0%', traffic: '—', icon: 'in', color: 'blue' },
  { platform: 'X (Twitter)', posts: 15, engagement: '3.4%', impressions: '3.1K', clicks: '89', ctr: '2.9%', traffic: '—', icon: 'X', color: 'gray' },
  { platform: 'Medium', posts: 8, engagement: '4.8%', impressions: '1.1K', clicks: '67', ctr: '6.1%', traffic: '—', icon: 'M', color: 'emerald' },
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
  { id: '1', type: 'format_performance', text: 'Posts with questions get 2.1x more comments', confidence: 0.87 },
  { id: '2', type: 'traffic_correlation', text: 'How-to content drives 5x more website traffic than hot takes', confidence: 0.92 },
  { id: '3', type: 'timing_insight', text: 'Tuesday 9am posts get highest engagement on LinkedIn', confidence: 0.78 },
  { id: '4', type: 'seo_insight', text: 'Content about AI SDRs ranks on page 1 for 3 target keywords', confidence: 0.85 },
]

const DATA_SOURCES = [
  { name: 'LinkedIn', connected: true },
  { name: 'Twitter/X', connected: true },
  { name: 'Medium', connected: true },
  { name: 'Google Analytics', connected: false },
  { name: 'Search Console', connected: false },
]

const COLOR_MAP: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  gray: 'from-gray-500 to-gray-600',
  emerald: 'from-emerald-500 to-emerald-600',
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ProjectAnalyticsPage() {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set())
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  const activeInsights = INSIGHTS.filter(i => !dismissedInsights.has(i.id))

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white mb-1">Analytics</h2>
          <p className="text-gray-500 text-sm">Content performance across platforms, traffic, and search</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-600">Last synced: —</span>
          <button
            disabled
            className="px-3.5 py-2 rounded-xl bg-gray-800/60 border border-gray-700/40 text-gray-500 text-xs font-semibold cursor-not-allowed opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            Sync Now
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white">{stat.value}</span>
              <div className="flex flex-col mb-0.5">
                <span className={`text-sm font-bold ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stat.trend === 'up' ? (
                    <svg className="w-3.5 h-3.5 inline mr-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 inline mr-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" /></svg>
                  )}
                  {stat.change}
                </span>
                <span className="text-[10px] text-gray-600">{stat.period}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Performance Funnel */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Content Performance Funnel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FUNNEL.map((stage, i) => (
            <div key={stage.label} className="relative">
              <div className={`p-6 rounded-xl border ${stage.connected ? 'border-gray-700 bg-gray-950' : 'border-dashed border-gray-700/50 bg-gray-950/50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {stage.icon === 'social' && (
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                    </div>
                  )}
                  {stage.icon === 'traffic' && (
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                    </div>
                  )}
                  {stage.icon === 'search' && (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" /></svg>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stage.label}</p>
                  </div>
                </div>
                <p className={`text-2xl font-black ${stage.connected ? 'text-white' : 'text-gray-600'}`}>{stage.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stage.sub}</p>
                {stage.cta && (
                  <button className="mt-4 w-full px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-500 text-xs font-semibold hover:border-gray-600 hover:text-gray-400 transition-all">
                    {stage.cta}
                  </button>
                )}
              </div>
              {/* Arrow between funnel stages */}
              {i < FUNNEL.length - 1 && (
                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Over Time */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Engagement Over Time</h3>
        <div className="h-48 flex items-end gap-2">
          {CHART_DATA.map((d, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 relative"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip */}
              {hoveredBar === i && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-[10px] text-white font-semibold whitespace-nowrap z-10 shadow-xl">
                  {d.day}: {d.value}
                </div>
              )}
              <div
                className={`w-full rounded-t-lg transition-all duration-150 ${
                  hoveredBar === i
                    ? 'bg-gradient-to-t from-violet-500 to-fuchsia-400'
                    : 'bg-gradient-to-t from-violet-600 to-fuchsia-500 opacity-80'
                }`}
                style={{ height: `${(d.value / 100) * 192}px` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-gray-600">
          <span>{CHART_DATA[0].day}</span>
          <span>{CHART_DATA[Math.floor(CHART_DATA.length / 2)].day}</span>
          <span>{CHART_DATA[CHART_DATA.length - 1].day}</span>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Platform Breakdown</h3>
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_repeat(5,80px)] gap-4 px-4 mb-3">
          <div className="w-10" />
          <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Platform</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold text-right">Posts</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold text-right">Engagement</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold text-right">Impressions</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold text-right">Clicks</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold text-right">CTR</div>
        </div>
        <div className="space-y-3">
          {PLATFORM_BREAKDOWN.map((p) => (
            <div key={p.platform} className="grid grid-cols-1 md:grid-cols-[auto_1fr_repeat(5,80px)] gap-4 items-center p-4 bg-gray-950 rounded-xl border border-gray-800">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white bg-gradient-to-br ${COLOR_MAP[p.color] || COLOR_MAP.gray}`}>
                {p.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{p.platform}</h4>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{p.posts}</p>
                <p className="text-[10px] text-gray-600 md:hidden">posts</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{p.engagement}</p>
                <p className="text-[10px] text-gray-600 md:hidden">engagement</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{p.impressions}</p>
                <p className="text-[10px] text-gray-600 md:hidden">impressions</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{p.clicks}</p>
                <p className="text-[10px] text-gray-600 md:hidden">clicks</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{p.ctr}</p>
                <p className="text-[10px] text-gray-600 md:hidden">CTR</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Content */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Top Performing Content</h3>
        <div className="space-y-3">
          {TOP_CONTENT.map((content, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-gray-950 rounded-xl border border-gray-800 hover:border-gray-700 transition-all">
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-sm font-black text-gray-400">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{content.title}</p>
                <p className="text-xs text-gray-500">{content.platform} &middot; {content.date}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{content.clicks}</p>
                <p className="text-[10px] text-gray-600">clicks</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">{content.engagement}</p>
                <p className="text-xs text-gray-500">{content.impressions} views</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Performance (GSC) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Search Performance</h3>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">GSC</span>
          </div>
        </div>

        {/* Connect banner */}
        <div className="mb-6 p-4 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" /></svg>
            <div>
              <p className="text-sm font-semibold text-emerald-300">Connect Google Search Console</p>
              <p className="text-xs text-gray-500">See which keywords drive traffic to your content</p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/10 transition-all">
            Connect GSC
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Query</th>
                <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Page</th>
                <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Clicks</th>
                <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Impressions</th>
                <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">CTR</th>
                <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3">Position</th>
              </tr>
            </thead>
            <tbody>
              {SEARCH_DATA.map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0">
                  <td className="py-3 pr-4">
                    <span className="text-sm font-semibold text-white">{row.query}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-gray-400 font-mono">{row.page}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm font-bold text-white">{row.clicks}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm text-gray-300">{row.impressions}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm text-gray-300">{row.ctr}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-bold ${parseFloat(row.position) <= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      #{row.position}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-700 mt-4 text-center">Sample data — connect Google Search Console to see real rankings</p>
      </div>

      {/* Website Traffic from Content (GA4) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Website Traffic from Content</h3>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">GA4</span>
          </div>
        </div>

        {/* Connect banner */}
        <div className="mb-6 p-4 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
            <div>
              <p className="text-sm font-semibold text-amber-300">Connect Google Analytics</p>
              <p className="text-xs text-gray-500">See how your content drives website traffic</p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/10 transition-all">
            Connect GA4
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Content</th>
                <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Source</th>
                <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Page Views</th>
                <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Avg Time</th>
                <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3">Bounce Rate</th>
              </tr>
            </thead>
            <tbody>
              {GA4_DATA.map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0">
                  <td className="py-3 pr-4">
                    <span className="text-sm font-semibold text-white">{row.title}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      row.platform === 'LinkedIn' ? 'bg-blue-500/10 text-blue-400' :
                      row.platform === 'X' ? 'bg-gray-700/50 text-gray-300' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>{row.platform}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm font-bold text-white">{row.pageviews.toLocaleString()}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm text-gray-300">{row.avgTime}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-semibold ${parseInt(row.bounceRate) <= 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {row.bounceRate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-700 mt-4 text-center">Sample data — connect Google Analytics to see real traffic metrics</p>
      </div>

      {/* AI Insights */}
      {activeInsights.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">AI Insights</h3>
              <span className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold">
                Generated from your performance data
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeInsights.map((insight) => (
              <div key={insight.id} className="p-4 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium leading-snug">{insight.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <div className={`h-1 rounded-full ${
                          insight.confidence >= 0.85 ? 'bg-emerald-500 w-8' :
                          insight.confidence >= 0.7 ? 'bg-amber-500 w-6' :
                          'bg-gray-600 w-4'
                        }`} />
                        <span className="text-[10px] text-gray-600">{Math.round(insight.confidence * 100)}% confidence</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissedInsights(prev => new Set([...prev, insight.id]))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-400 shrink-0"
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
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
        <h4 className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-4">Connected Data Sources</h4>
        <div className="flex flex-wrap items-center gap-4">
          {DATA_SOURCES.map((source) => (
            <div key={source.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${source.connected ? 'bg-emerald-500' : 'bg-gray-600'}`} />
              <span className={`text-xs font-medium ${source.connected ? 'text-gray-300' : 'text-gray-600'}`}>
                {source.name}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
