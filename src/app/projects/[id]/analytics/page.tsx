'use client'

const MOCK_STATS = [
  { label: 'Total Posts', value: '47', change: '+12', trend: 'up' },
  { label: 'Engagement Rate', value: '4.2%', change: '+0.8%', trend: 'up' },
  { label: 'Impressions', value: '12.4K', change: '+2.1K', trend: 'up' },
  { label: 'Click-through Rate', value: '2.8%', change: '-0.3%', trend: 'down' },
]

const PLATFORM_BREAKDOWN = [
  { platform: 'LinkedIn', posts: 24, engagement: '5.1%', impressions: '8.2K', icon: 'in', color: 'blue' },
  { platform: 'X (Twitter)', posts: 15, engagement: '3.4%', impressions: '3.1K', icon: 'X', color: 'gray' },
  { platform: 'Medium', posts: 8, engagement: '4.8%', impressions: '1.1K', icon: 'M', color: 'emerald' },
]

const TOP_CONTENT = [
  { title: 'How AI SDRs are replacing manual outreach', platform: 'LinkedIn', engagement: '8.2%', impressions: '2,340', date: 'Feb 8' },
  { title: 'Thread: 5 cold email mistakes killing your reply rate', platform: 'X', engagement: '6.1%', impressions: '1,890', date: 'Feb 6' },
  { title: 'The agentic future of content marketing', platform: 'Medium', engagement: '5.7%', impressions: '1,240', date: 'Feb 4' },
  { title: 'Why B2B companies need AI-first content strategies', platform: 'LinkedIn', engagement: '5.3%', impressions: '1,120', date: 'Feb 3' },
  { title: 'Sales automation stack for 2026', platform: 'LinkedIn', engagement: '4.9%', impressions: '980', date: 'Feb 1' },
]

const COLOR_MAP: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  gray: 'from-gray-500 to-gray-600',
  emerald: 'from-emerald-500 to-emerald-600',
}

export default function ProjectAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Analytics</h2>
        <p className="text-gray-500 text-sm">Track your content performance across all platforms</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_STATS.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white">{stat.value}</span>
              <span className={`text-sm font-bold mb-1 ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Engagement Over Time</h3>
        <div className="h-48 flex items-end gap-2">
          {[35, 45, 38, 52, 48, 65, 58, 72, 68, 78, 85, 92, 88, 95].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-t-lg transition-all hover:opacity-80"
                style={{ height: `${(val / 100) * 192}px` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-gray-600">
          <span>Jan 28</span>
          <span>Feb 3</span>
          <span>Feb 10</span>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Platform Breakdown</h3>
        <div className="space-y-4">
          {PLATFORM_BREAKDOWN.map((platform) => (
            <div key={platform.platform} className="flex items-center gap-4 p-4 bg-gray-950 rounded-xl border border-gray-800">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white bg-gradient-to-br ${COLOR_MAP[platform.color] || COLOR_MAP.gray}`}>
                {platform.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">{platform.platform}</h4>
                <p className="text-xs text-gray-500">{platform.posts} posts</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{platform.engagement}</p>
                <p className="text-xs text-gray-500">engagement</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{platform.impressions}</p>
                <p className="text-xs text-gray-500">impressions</p>
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
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">{content.engagement}</p>
                <p className="text-xs text-gray-500">{content.impressions} views</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
