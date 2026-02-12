'use client'
export default function WebBlogPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Blog Posts</h2>
        <p className="text-gray-500 text-sm">Create SEO-optimized blog content with the AIO Blog Machine</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Published Posts', value: '—' },
          { label: 'Total Traffic', value: '—' },
          { label: 'Avg Read Time', value: '—' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>
          </div>
          <h3 className="text-white font-bold text-sm mb-1.5">Create Your First Blog Post</h3>
          <p className="text-gray-600 text-xs leading-relaxed">Generate authority-building blog content optimized for search engines and AI discovery.</p>
        </div>
      </div>
    </div>
  )
}
