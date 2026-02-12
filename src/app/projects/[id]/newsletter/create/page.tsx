'use client'
export default function NewsletterCreatePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Newsletter</h2>
        <p className="text-gray-500 text-sm">Create, preview, and send newsletters to your subscriber list</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Subscribers', value: '—' },
          { label: 'Issues Sent', value: '—' },
          { label: 'Avg Open Rate', value: '—' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>
          </div>
          <h3 className="text-white font-bold text-sm mb-1.5">Create Your First Newsletter</h3>
          <p className="text-gray-600 text-xs leading-relaxed">Write and send professional newsletters with AI-powered content generation.</p>
        </div>
      </div>
    </div>
  )
}
