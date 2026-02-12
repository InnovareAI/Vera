'use client'
export default function NurtureCampaignsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Drip Campaigns</h2>
        <p className="text-gray-500 text-sm">Automated multi-step email campaigns with conditional logic</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
          </div>
          <h3 className="text-white font-bold text-sm mb-1.5">Coming Soon</h3>
          <p className="text-gray-600 text-xs leading-relaxed">Multi-step drip campaigns with conditional branching based on recipient behavior.</p>
        </div>
      </div>
    </div>
  )
}
