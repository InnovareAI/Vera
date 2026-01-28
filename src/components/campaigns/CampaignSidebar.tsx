'use client'

interface CampaignSidebarProps {
    activeView: 'setup' | 'output'
    onViewChange: (view: 'setup' | 'output') => void
    hasGeneration: boolean
}

export function CampaignSidebar({ activeView, onViewChange, hasGeneration }: CampaignSidebarProps) {
    const navItems = [
        { id: 'setup', label: 'Campaign Setup', icon: '⚙️', available: true },
        { id: 'output', label: 'Generated Content', icon: '✨', available: hasGeneration },
    ]

    return (
        <aside className="w-64 bg-gradient-to-b from-gray-900 to-[#0a0a0f] border-r border-gray-800/50 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-800/50">
                <a href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                        <span className="text-white font-bold text-lg">V</span>
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-xl tracking-tight">VERA</h1>
                        <p className="text-gray-500 text-xs">Campaign Generator</p>
                    </div>
                </a>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <div className="space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => item.available && onViewChange(item.id as 'setup' | 'output')}
                            disabled={!item.available}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === item.id
                                    ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-white border border-violet-500/30'
                                    : item.available
                                        ? 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                        : 'text-gray-600 cursor-not-allowed'
                                }`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Platform Icons */}
                <div className="mt-8 p-4 bg-gray-800/30 rounded-xl">
                    <p className="text-gray-500 text-xs font-medium mb-3 uppercase tracking-wider">Supported Platforms</p>
                    <div className="flex gap-3">
                        <div className="w-9 h-9 bg-[#0077B5]/20 rounded-lg flex items-center justify-center" title="LinkedIn">
                            <span className="text-lg">💼</span>
                        </div>
                        <div className="w-9 h-9 bg-[#1DA1F2]/20 rounded-lg flex items-center justify-center" title="X/Twitter">
                            <span className="text-lg">𝕏</span>
                        </div>
                        <div className="w-9 h-9 bg-[#00A86B]/20 rounded-lg flex items-center justify-center" title="Medium">
                            <span className="text-lg">📝</span>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-[#833AB4]/20 via-[#FD1D1D]/20 to-[#F77737]/20 rounded-lg flex items-center justify-center" title="Instagram">
                            <span className="text-lg">📸</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Agent Status */}
            <div className="p-4 border-t border-gray-800/50">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-xs font-medium">Agents Ready</span>
                    </div>
                    <p className="text-gray-500 text-xs">Claude + OpenRouter + FAL.AI</p>
                </div>
            </div>
        </aside>
    )
}
