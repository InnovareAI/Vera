'use client'
export default function WebLandingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Landing Pages</h2>
        <p className="text-gray-500 text-sm">Create high-converting landing pages for campaigns and offers</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </div>
          <h3 className="text-white font-bold text-sm mb-1.5">Coming Soon</h3>
          <p className="text-gray-600 text-xs leading-relaxed">AI-generated landing pages optimized for conversion, integrated with your content strategy.</p>
        </div>
      </div>
    </div>
  )
}
