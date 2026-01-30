'use client'

import { useState } from 'react'
import { useWorkspace } from '@/contexts/AuthContext'

interface CampaignSidebarProps {
    activeView: 'setup' | 'output' | 'review'
    onViewChange: (view: 'setup' | 'output' | 'review') => void
    hasGeneration: boolean
}

export function CampaignSidebar({ activeView, onViewChange, hasGeneration }: CampaignSidebarProps) {
    const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace()
    const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)

    const navItems = [
        { id: 'review', label: 'Content Review', icon: '📋', available: true },
        { id: 'setup', label: 'New Campaign', icon: '🎯', available: true },
        { id: 'output', label: 'Generated Output', icon: '✨', available: hasGeneration },
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

            {/* Workspace Switcher */}
            <div className="p-4 border-b border-gray-800/50">
                <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Workspace</p>
                <div className="relative">
                    <button
                        onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: currentWorkspace?.brand_colors?.primary || '#7c3aed' }}
                            >
                                {currentWorkspace?.name?.charAt(0) || 'W'}
                            </div>
                            <span className="text-white text-sm font-medium truncate">
                                {currentWorkspace?.name || 'Select Workspace'}
                            </span>
                        </div>
                        <span className="text-gray-500 text-xs">▼</span>
                    </button>

                    {showWorkspaceMenu && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                            {workspaces.map(ws => (
                                <button
                                    key={ws.id}
                                    onClick={() => {
                                        switchWorkspace(ws.id)
                                        setShowWorkspaceMenu(false)
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-700/50 transition-colors ${
                                        currentWorkspace?.id === ws.id ? 'bg-violet-600/20' : ''
                                    }`}
                                >
                                    <div
                                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                                        style={{ backgroundColor: ws.brand_colors?.primary || '#7c3aed' }}
                                    >
                                        {ws.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white text-sm font-medium truncate block">{ws.name}</span>
                                        <span className="text-gray-500 text-xs">{ws.role}</span>
                                    </div>
                                    {currentWorkspace?.id === ws.id && (
                                        <span className="text-violet-400">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <div className="space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => item.available && onViewChange(item.id as 'setup' | 'output' | 'review')}
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
                    <div className="grid grid-cols-5 gap-2">
                        {/* LinkedIn */}
                        <div className="w-9 h-9 bg-[#0077B5]/20 rounded-lg flex items-center justify-center group hover:bg-[#0077B5]/30 transition-colors cursor-pointer" title="LinkedIn">
                            <svg className="w-5 h-5 text-[#0077B5]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </div>
                        {/* X/Twitter */}
                        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center group hover:bg-white/20 transition-colors cursor-pointer" title="X / Twitter">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </div>
                        {/* Instagram */}
                        <div className="w-9 h-9 bg-gradient-to-br from-[#833AB4]/20 via-[#FD1D1D]/20 to-[#F77737]/20 rounded-lg flex items-center justify-center group hover:from-[#833AB4]/30 hover:via-[#FD1D1D]/30 hover:to-[#F77737]/30 transition-colors cursor-pointer" title="Instagram">
                            <svg className="w-5 h-5 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                        </div>
                        {/* Facebook */}
                        <div className="w-9 h-9 bg-[#1877F2]/20 rounded-lg flex items-center justify-center group hover:bg-[#1877F2]/30 transition-colors cursor-pointer" title="Facebook">
                            <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </div>
                        {/* YouTube */}
                        <div className="w-9 h-9 bg-[#FF0000]/20 rounded-lg flex items-center justify-center group hover:bg-[#FF0000]/30 transition-colors cursor-pointer" title="YouTube">
                            <svg className="w-5 h-5 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </div>
                        {/* TikTok */}
                        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center group hover:bg-white/20 transition-colors cursor-pointer" title="TikTok">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                        </div>
                        {/* Reddit */}
                        <div className="w-9 h-9 bg-[#FF4500]/20 rounded-lg flex items-center justify-center group hover:bg-[#FF4500]/30 transition-colors cursor-pointer" title="Reddit">
                            <svg className="w-5 h-5 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                            </svg>
                        </div>
                        {/* Blog/Medium */}
                        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center group hover:bg-white/20 transition-colors cursor-pointer" title="Blog">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                            </svg>
                        </div>
                        {/* Threads */}
                        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center group hover:bg-white/20 transition-colors cursor-pointer" title="Threads">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.873-.723 2.07-1.133 3.37-1.157.921-.017 1.807.105 2.653.363.015-.601-.01-1.176-.076-1.72-.202-1.668-.878-2.554-2.013-2.636-.792-.057-1.468.134-1.952.555-.465.404-.737.987-.81 1.737l-2.043-.239c.127-1.247.63-2.251 1.498-2.984.932-.788 2.168-1.163 3.67-1.116 1.695.068 2.936.758 3.584 1.994.462.881.653 2.044.568 3.457.724.318 1.368.728 1.91 1.225 1.093 1.003 1.787 2.347 2.008 3.888.247 1.716-.096 3.385-1.022 4.97C19.146 22.22 16.12 24 12.186 24zm-.207-9.592c-.763.018-1.42.196-1.903.514-.458.303-.693.715-.66 1.16.031.437.302.809.762 1.046.516.266 1.17.378 1.846.316 1.053-.096 1.78-.483 2.227-1.187.238-.374.424-.895.54-1.537-.917-.258-1.885-.33-2.812-.312z"/>
                            </svg>
                        </div>
                        {/* Newsletter */}
                        <div className="w-9 h-9 bg-violet-500/20 rounded-lg flex items-center justify-center group hover:bg-violet-500/30 transition-colors cursor-pointer" title="Newsletter">
                            <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
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
