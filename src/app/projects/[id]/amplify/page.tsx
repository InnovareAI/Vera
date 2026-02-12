'use client'

import { useState } from 'react'

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA — structured for future API integration
// ═══════════════════════════════════════════════════════════════════

const TOP_PERFORMERS = [
  {
    id: '1',
    title: 'How AI SDRs are replacing manual outreach',
    platform: 'linkedin',
    content: 'The days of manually crafting 200 cold emails are over. AI SDRs now handle prospecting, personalization, and follow-ups at scale...',
    engagement: { rate: '8.2%', likes: 312, comments: 47, shares: 28, impressions: 2340 },
    published: 'Feb 8',
    score: 95,
    amplifyActions: ['repurpose', 'expand', 'paid', 'plan'],
  },
  {
    id: '2',
    title: '5 cold email mistakes killing your reply rate',
    platform: 'twitter',
    content: 'Thread: After analyzing 50,000 cold emails, here are the 5 mistakes destroying your reply rates...',
    engagement: { rate: '6.1%', likes: 231, comments: 34, shares: 89, impressions: 1890 },
    published: 'Feb 6',
    score: 82,
    amplifyActions: ['repurpose', 'expand', 'paid', 'plan'],
  },
  {
    id: '3',
    title: 'The agentic future of content marketing',
    platform: 'medium',
    content: 'Content marketing is shifting from manual creation to intelligent systems that learn what resonates and compound results...',
    engagement: { rate: '5.7%', likes: 156, comments: 23, shares: 18, impressions: 1240 },
    published: 'Feb 4',
    score: 74,
    amplifyActions: ['repurpose', 'expand', 'plan'],
  },
  {
    id: '4',
    title: 'Why B2B companies need AI-first content strategies',
    platform: 'linkedin',
    content: 'B2B content is broken. Most companies produce content nobody reads. Here\'s how AI-first strategies fix that...',
    engagement: { rate: '5.3%', likes: 134, comments: 19, shares: 15, impressions: 1120 },
    published: 'Feb 3',
    score: 68,
    amplifyActions: ['repurpose', 'paid', 'plan'],
  },
]

const COMPETITOR_SIGNALS = [
  { competitor: 'Competitor A', angle: 'AI replacing SDR teams', frequency: '3x/week', platform: 'LinkedIn', trend: 'rising' },
  { competitor: 'Competitor B', angle: 'Cold email automation ROI', frequency: '2x/week', platform: 'Facebook Ads', trend: 'stable' },
  { competitor: 'Competitor A', angle: 'Sales automation case studies', frequency: '4x/week', platform: 'LinkedIn', trend: 'rising' },
  { competitor: 'Competitor C', angle: 'B2B content strategy tips', frequency: '1x/week', platform: 'Twitter/X', trend: 'declining' },
]

const AMPLIFICATION_QUEUE = [
  { content: 'How AI SDRs are replacing manual outreach', action: 'Repurpose for Twitter/X', status: 'ready', priority: 'high' },
  { content: 'How AI SDRs are replacing manual outreach', action: 'Create ad variations (Meta)', status: 'ready', priority: 'high' },
  { content: '5 cold email mistakes killing your reply rate', action: 'Expand to blog post', status: 'planned', priority: 'medium' },
  { content: 'The agentic future of content marketing', action: 'Repurpose for LinkedIn', status: 'planned', priority: 'medium' },
  { content: 'AI SDR topic — plan 3 more posts', action: 'Add to content calendar', status: 'suggested', priority: 'low' },
]

type AmplifyAction = 'repurpose' | 'expand' | 'paid' | 'plan'

const ACTION_CONFIG: Record<AmplifyAction, { label: string; desc: string; color: string; bgColor: string; borderColor: string }> = {
  repurpose: { label: 'Repurpose', desc: 'Adapt for another platform', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  expand: { label: 'Expand', desc: 'Blog, newsletter, or case study', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  paid: { label: 'Ad Creative', desc: 'Generate ad variations', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/10', borderColor: 'border-fuchsia-500/20' },
  plan: { label: 'Plan More', desc: 'Schedule related content', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
}

const PLATFORM_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  linkedin: { label: 'LinkedIn', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  twitter: { label: 'Twitter/X', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  medium: { label: 'Medium', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  facebook: { label: 'Facebook', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  newsletter: { label: 'Newsletter', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function AmplifyPage() {
  const [selectedContent, setSelectedContent] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'performers' | 'competitors' | 'queue'>('performers')

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white mb-1">Amplification Engine</h2>
        <p className="text-gray-500 text-sm">Take what works and push it further — across paid, social, owned content, and planning</p>
      </div>

      {/* Signal Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top Performers</p>
          </div>
          <p className="text-2xl font-black text-white">{TOP_PERFORMERS.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">above 5% engagement</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Repurpose</p>
          </div>
          <p className="text-2xl font-black text-white">3</p>
          <p className="text-xs text-gray-500 mt-0.5">cross-platform opportunities</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-fuchsia-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ad Candidates</p>
          </div>
          <p className="text-2xl font-black text-white">2</p>
          <p className="text-xs text-gray-500 mt-0.5">ready for paid amplification</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Plan More</p>
          </div>
          <p className="text-2xl font-black text-white">1</p>
          <p className="text-xs text-gray-500 mt-0.5">topic to double down on</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {([
          { id: 'performers' as const, label: 'Top Performers' },
          { id: 'competitors' as const, label: 'Competitive Signals' },
          { id: 'queue' as const, label: 'Amplification Queue' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === tab.id
                ? 'bg-gray-800 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TOP PERFORMERS ═══ */}
      {activeSection === 'performers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Content with highest organic engagement — ready to amplify</p>
            <span className="text-[10px] text-gray-600">Sorted by amplification score</span>
          </div>

          {TOP_PERFORMERS.map((item) => {
            const isExpanded = selectedContent === item.id
            const pStyle = PLATFORM_STYLES[item.platform]

            return (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
                {/* Header row */}
                <button
                  onClick={() => setSelectedContent(isExpanded ? null : item.id)}
                  className="w-full p-5 flex items-center gap-4 text-left"
                >
                  {/* Score badge */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                    item.score >= 90 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                    item.score >= 75 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                    'bg-gray-800 border border-gray-700 text-gray-400'
                  }`}>
                    {item.score}
                  </div>

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${pStyle.bg}`}>
                        {pStyle.label}
                      </span>
                      <span className="text-[10px] text-gray-600">{item.published}</span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{item.title}</p>
                  </div>

                  {/* Engagement stats */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">{item.engagement.rate}</p>
                      <p className="text-[10px] text-gray-600">engagement</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{item.engagement.impressions.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-600">impressions</p>
                    </div>
                  </div>

                  {/* Expand icon */}
                  <svg className={`w-4 h-4 text-gray-600 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded: amplification actions */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-800/50">
                    {/* Content preview */}
                    <div className="mt-4 mb-5 p-4 rounded-xl bg-gray-950 border border-gray-800/50">
                      <p className="text-xs text-gray-400 leading-relaxed">{item.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-600">
                        <span>{item.engagement.likes} likes</span>
                        <span>{item.engagement.comments} comments</span>
                        <span>{item.engagement.shares} shares</span>
                      </div>
                    </div>

                    {/* Amplification actions grid */}
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Amplification Actions</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {item.amplifyActions.map((actionId) => {
                        const action = ACTION_CONFIG[actionId as AmplifyAction]
                        return (
                          <button
                            key={actionId}
                            className={`p-4 rounded-xl border ${action.borderColor} ${action.bgColor} hover:brightness-125 transition-all text-left group`}
                          >
                            <p className={`text-sm font-bold ${action.color} mb-1`}>{action.label}</p>
                            <p className="text-[10px] text-gray-500 leading-snug">{action.desc}</p>
                            <div className={`mt-3 flex items-center gap-1 text-[10px] font-semibold ${action.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <span>Go</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ COMPETITIVE SIGNALS ═══ */}
      {activeSection === 'competitors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">What competitors are running — which angles repeat</p>
          </div>

          {/* Connect banner */}
          <div className="p-4 rounded-xl border border-dashed border-violet-500/20 bg-violet-500/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <div>
                <p className="text-sm font-semibold text-violet-300">Competitive Intelligence</p>
                <p className="text-xs text-gray-500">Connect ad libraries and social monitors to track competitor activity</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg border border-violet-500/30 text-violet-400 text-xs font-bold hover:bg-violet-500/10 transition-all">
              Configure
            </button>
          </div>

          {/* Signals table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Competitor</th>
                    <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Angle</th>
                    <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Platform</th>
                    <th className="text-left text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3 pr-4">Frequency</th>
                    <th className="text-right text-[10px] text-gray-600 uppercase tracking-widest font-semibold pb-3">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETITOR_SIGNALS.map((signal, i) => (
                    <tr key={i} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-3 pr-4">
                        <span className="text-sm font-semibold text-white">{signal.competitor}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-300">{signal.angle}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          PLATFORM_STYLES[signal.platform.toLowerCase().replace(/[^a-z]/g, '')]?.bg || 'bg-gray-800 border-gray-700'
                        }`}>
                          {signal.platform}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-400">{signal.frequency}</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-xs font-bold ${
                          signal.trend === 'rising' ? 'text-emerald-400' :
                          signal.trend === 'stable' ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {signal.trend === 'rising' && (
                            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                          )}
                          {signal.trend === 'declining' && (
                            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" /></svg>
                          )}
                          {signal.trend === 'stable' && '—  '}
                          {signal.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-700 mt-4 text-center">Sample data — configure competitive monitoring to see real signals</p>
          </div>

          {/* Overlap insight */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Signal Overlap Detected</p>
                <p className="text-xs text-gray-500">Where your top performers intersect with competitor angles</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800/50">
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-amber-400 font-bold">&quot;AI SDR&quot;</span> is both your highest-performing topic <span className="text-gray-500">(8.2% engagement)</span> and a rising competitor angle <span className="text-gray-500">(3x/week from Competitor A)</span>. This overlap signals strong market demand — amplify aggressively before the angle saturates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AMPLIFICATION QUEUE ═══ */}
      {activeSection === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Planned amplification actions across all channels</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Ready
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <div className="w-2 h-2 rounded-full bg-amber-500" /> Planned
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <div className="w-2 h-2 rounded-full bg-gray-500" /> Suggested
              </span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {AMPLIFICATION_QUEUE.map((item, i) => (
              <div key={i} className={`flex items-center gap-4 p-5 ${i < AMPLIFICATION_QUEUE.length - 1 ? 'border-b border-gray-800/50' : ''} hover:bg-gray-800/20 transition-all`}>
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  item.status === 'ready' ? 'bg-emerald-500' :
                  item.status === 'planned' ? 'bg-amber-500' :
                  'bg-gray-500'
                }`} />

                {/* Content + action */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.content}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.action}</p>
                </div>

                {/* Priority */}
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                  item.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  item.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-gray-800 text-gray-500 border border-gray-700'
                }`}>
                  {item.priority}
                </span>

                {/* Action button */}
                <button className="px-3.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-all flex items-center gap-1.5">
                  {item.status === 'ready' ? 'Execute' : item.status === 'planned' ? 'Start' : 'Accept'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Empty state for when queue is actioned */}
          <div className="text-center py-4">
            <p className="text-[10px] text-gray-700">Actions execute through Content Bench — click to generate amplified versions</p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
        <h4 className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-4">How the Amplification Engine Works</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Signal', desc: 'Analytics identifies your top-performing organic content' },
            { step: '2', title: 'Research', desc: 'Competitive signals reveal which angles the market validates' },
            { step: '3', title: 'Amplify', desc: 'Repurpose, expand, or create ad variations from proven content' },
            { step: '4', title: 'Compound', desc: 'Performance data feeds back — each cycle gets smarter' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-400 shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{s.title}</p>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
