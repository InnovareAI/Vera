'use client'
export default function SeoUrankingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-100 mb-1">Urankings</h2>
        <p className="text-neutral-500 text-sm">Track your search rankings over time</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </div>
          <h3 className="text-neutral-100 font-medium text-sm mb-1.5">Coming Soon</h3>
          <p className="text-neutral-600 text-xs leading-relaxed">Connect Google Search Console to unlock rankings data.</p>
        </div>
      </div>
    </div>
  )
}
