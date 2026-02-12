'use client'
export default function PaidCreativesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Ad Creatives</h2>
        <p className="text-gray-500 text-sm">Generate ad copy variations, headlines, hooks, and visual concepts</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-fuchsia-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
          </div>
          <h3 className="text-white font-bold text-sm mb-1.5">Coming Soon</h3>
          <p className="text-gray-600 text-xs leading-relaxed">AI-generated ad creatives from your top-performing organic content. Copy, headlines, and visual concepts at scale.</p>
        </div>
      </div>
    </div>
  )
}
