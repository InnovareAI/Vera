'use client'
export default function SeoOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-100 mb-1">SEO & Search Overview</h2>
        <p className="text-neutral-500 text-sm">Search visibility, keyword rankings, and organic traffic from Google</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Organic Clicks', value: '—', sub: 'Last 30 days' },
          { label: 'Impressions', value: '—', sub: 'Last 30 days' },
          { label: 'Avg Position', value: '—', sub: 'All keywords' },
          { label: 'Indexed Pages', value: '—', sub: 'Total' },
        ].map((s) => (
          <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-semibold text-neutral-100">{s.value}</p>
            <p className="text-[10px] text-neutral-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <div>
            <p className="text-sm font-semibold text-emerald-300">Connect Google Search Console & Analytics</p>
            <p className="text-xs text-neutral-500">See real search performance data for your content</p>
          </div>
        </div>
        <button className="px-4 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 transition-all">Connect</button>
      </div>
    </div>
  )
}
