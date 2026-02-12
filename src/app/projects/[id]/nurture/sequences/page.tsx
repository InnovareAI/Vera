'use client'
export default function NurtureSequencesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-100 mb-1">Email Sequences</h2>
        <p className="text-neutral-500 text-sm">Create and manage automated email sequences for lead nurturing</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Sequences', value: '—' },
          { label: 'Emails Sent', value: '—' },
          { label: 'Avg Open Rate', value: '—' },
        ].map((s) => (
          <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-semibold text-neutral-100">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
          </div>
          <h3 className="text-neutral-100 font-medium text-sm mb-1.5">Create Your First Sequence</h3>
          <p className="text-neutral-600 text-xs leading-relaxed">Build automated email sequences that nurture leads from first touch to conversion.</p>
        </div>
      </div>
    </div>
  )
}
