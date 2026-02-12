'use client'

export default function SocialCommentingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Commenting Agent</h2>
        <p className="text-gray-500 text-sm">AI-powered engagement on LinkedIn — discover, generate, and post on-brand comments</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Monitors', value: '—', color: 'violet' },
          { label: 'Pending Approval', value: '—', color: 'amber' },
          { label: 'Posted Today', value: '—', color: 'emerald' },
          { label: 'This Week', value: '—', color: 'blue' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-sm">
          <p className="text-gray-600 text-xs">Configure monitors and brand voice in project settings to activate the commenting agent for this project.</p>
        </div>
      </div>
    </div>
  )
}
