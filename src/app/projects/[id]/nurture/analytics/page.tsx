'use client'
export default function NurtureAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Email Performance</h2>
        <p className="text-gray-500 text-sm">Open rates, click rates, replies, and conversion tracking</p>
      </div>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>
          </div>
          <h3 className="text-white font-bold text-sm mb-1.5">Send emails to see analytics</h3>
          <p className="text-gray-600 text-xs leading-relaxed">Email performance metrics will appear here once sequences are active.</p>
        </div>
      </div>
    </div>
  )
}
