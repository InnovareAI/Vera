'use client'
export default function PaidCampaignsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-100 mb-1">Campaign Proposals</h2>
        <p className="text-neutral-500 text-sm">Structured campaign plans with targeting, budget, and ad set logic</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-fuchsia-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
          </div>
          <h3 className="text-neutral-100 font-medium text-sm mb-1.5">Coming Soon</h3>
          <p className="text-neutral-600 text-xs leading-relaxed">AI-proposed campaign structures with targeting, budget allocation, and ad set logic for Meta and Google Ads.</p>
        </div>
      </div>
    </div>
  )
}
