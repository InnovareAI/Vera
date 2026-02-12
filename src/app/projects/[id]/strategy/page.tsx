'use client'

export default function StrategyOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Strategy & Planning</h2>
        <p className="text-gray-500 text-sm">Brand health, content calendar, competitive intelligence, and research</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Content Calendar', desc: 'Plan and schedule your content across all channels', status: 'active', href: 'calendar' },
          { title: 'Research Hub', desc: 'Discover trends, topics, and audience signals', status: 'active', href: 'research' },
          { title: 'Competitive Intel', desc: 'Track competitor content and ad strategies', status: 'coming', href: 'competitive' },
        ].map((item) => (
          <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-white">{item.title}</h3>
              {item.status === 'coming' && (
                <span className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-500 text-[10px] font-bold">Soon</span>
              )}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
