'use client'
export default function PaidAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-100 mb-1">Ad Performance</h2>
        <p className="text-neutral-500 text-sm">Track paid campaign performance across Meta and Google Ads</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-fuchsia-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>
          </div>
          <h3 className="text-neutral-100 font-medium text-sm mb-1.5">Connect Ad Platforms</h3>
          <p className="text-neutral-600 text-xs leading-relaxed">Connect Meta Ads and Google Ads to track campaign performance and ROI.</p>
        </div>
      </div>
    </div>
  )
}
