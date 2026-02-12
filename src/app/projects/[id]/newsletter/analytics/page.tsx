'use client'
export default function NewsletterAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-100 mb-1">Newsletter Analytics</h2>
        <p className="text-neutral-500 text-sm">Open rates, click rates, growth, and engagement trends</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>
          </div>
          <h3 className="text-neutral-100 font-medium text-sm mb-1.5">Send newsletters to see analytics</h3>
          <p className="text-neutral-600 text-xs leading-relaxed">Newsletter performance data will appear once you start sending.</p>
        </div>
      </div>
    </div>
  )
}
