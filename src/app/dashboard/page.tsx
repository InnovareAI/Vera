'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase/client'

export default function DashboardPage() {
    const { user, profile, isLoading: authLoading, signOut } = useAuth()
    const { currentWorkspace, workspaces, currentOrganization, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
    const router = useRouter()
    const supabase = getSupabase()

    const [stats, setStats] = useState({
        pendingApprovals: 0,
        activeCampaigns: 0,
        teamEngagement: 0
    })

    useEffect(() => {
        if (currentWorkspace) {
            fetchDashboardStats()
        }
    }, [currentWorkspace])

    const fetchDashboardStats = async () => {
        // Mock stats for premium look
        setStats({
            pendingApprovals: 12,
            activeCampaigns: 4,
            teamEngagement: 85
        })
    }

    if (authLoading || workspaceLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 mt-4 font-medium">Powering up VERA...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
            {/* Navigation Overlay */}
            <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

            <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                                <span className="text-xl font-black text-white italic">V</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-white">VERA</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {[
                                { label: 'Dashboard', href: '/dashboard' },
                                { label: 'Projects', href: '/projects' },
                                { label: 'Settings', href: '/settings' },
                            ].map((item) => (
                                <Link key={item.label} href={item.href} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center gap-1">
                            <select
                                value={currentWorkspace?.id || ''}
                                onChange={(e) => switchWorkspace(e.target.value)}
                                className="bg-transparent text-sm font-bold px-3 py-1.5 focus:outline-none cursor-pointer"
                            >
                                {workspaces.map((ws) => (
                                    <option key={ws.id} value={ws.id} className="bg-gray-900">
                                        {ws.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="h-8 w-px bg-gray-800 mx-2" />

                        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                            <div className="absolute top-2 right-2 w-2 h-2 bg-fuchsia-500 rounded-full border-2 border-gray-950" />
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-3 pl-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center border-2 border-white/10 shadow-xl overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold">{(profile?.full_name || user?.email || 'V')[0].toUpperCase()}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                {/* Hero Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-violet-500/10 text-violet-400 text-xs font-bold uppercase tracking-widest rounded-full border border-violet-500/20">
                                Active Workspace
                            </span>
                            <div className="h-1 w-1 bg-gray-700 rounded-full" />
                            <span className="text-gray-500 text-xs font-medium uppercase tracking-widest">{currentOrganization?.name}</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight text-white mb-4">
                            Hello, {profile?.full_name?.split(' ')[0] || 'Innovator'}
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
                            Your agentic content engine is fueled and ready. What's the focus for today's growth?
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link href="/sharing/direct" className="px-6 py-3 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 shadow-xl shadow-white/5">
                            <span>Direct POV</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </Link>
                    </div>
                </div>

                {/* Stats Bento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Pending Approvals', value: '12', trend: '+3 today', color: 'violet' },
                        { label: 'Active Campaigns', value: '4', trend: 'Innovare Loop', color: 'fuchsia' },
                        { label: 'Team Engagement', value: '85%', trend: 'Opt-in: 4/5', color: 'blue' }
                    ].map((stat) => (
                        <div key={stat.label} className="bg-gray-900/40 border border-gray-800 p-8 rounded-3xl hover:bg-gray-900/60 transition-all group relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-${stat.color}-500/10 transition-all`} />
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">{stat.label}</p>
                            <div className="flex items-end gap-3">
                                <span className="text-5xl font-black text-white">{stat.value}</span>
                                <span className={`text-${stat.color}-400 text-sm font-bold mb-2`}>{stat.trend}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Actions Grid */}
                <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mb-8">Intelligence Control</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                        <Link href="/content-engine" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-violet-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">🚀</div>
                                <h3 className="text-xl font-black text-white mb-2">AIO Blog Machine</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Turn keywords into full-authority blog content automatically.</p>
                                <span className="text-xs font-bold text-violet-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Open Engine →</span>
                            </div>
                        </Link>

                        <Link href="/sharing/direct" className="group bg-gray-950 border-2 border-dashed border-gray-800 p-1 rounded-[2rem] hover:border-fuchsia-500/50 transition-all">
                            <div className="bg-gray-900 rounded-[1.8rem] p-8 h-full flex flex-col border border-transparent group-hover:bg-fuchsia-500/5">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">⚡</div>
                                <h3 className="text-xl font-black text-white mb-2">Direct POV</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Bypass the engine. Post your raw thoughts directly to LinkedIn.</p>
                                <span className="text-xs font-bold text-fuchsia-400 inline-flex items-center gap-1 uppercase tracking-widest">Post Now →</span>
                            </div>
                        </Link>

                        <Link href="/research" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-blue-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">🔍</div>
                                <h3 className="text-xl font-black text-white mb-2">Scout Research</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Discover what's trending across 14 sources in real-time.</p>
                                <span className="text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">View Intel →</span>
                            </div>
                        </Link>

                        <Link href="/settings/team" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-amber-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">👥</div>
                                <h3 className="text-xl font-black text-white mb-2">Team Loop</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Manage team roles and activate the auto-engagement loop.</p>
                                <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Manage Team →</span>
                            </div>
                        </Link>

                        <Link href="/cold-email" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-cyan-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">📧</div>
                                <h3 className="text-xl font-black text-white mb-2">Cold Email</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Launch targeted email campaigns with AI-generated content.</p>
                                <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Launch Campaigns →</span>
                            </div>
                        </Link>

                        <Link href="/newsletter" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-emerald-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">📰</div>
                                <h3 className="text-xl font-black text-white mb-2">Newsletter</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Build and send newsletters powered by your content queue.</p>
                                <span className="text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Create Issue →</span>
                            </div>
                        </Link>

                        <Link href="/content-engine" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-orange-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">🔎</div>
                                <h3 className="text-xl font-black text-white mb-2">SEO / GEO</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Optimize your web presence for search engines and AI agents.</p>
                                <span className="text-xs font-bold text-orange-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Analyze Site →</span>
                            </div>
                        </Link>

                        <Link href="/commenting" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-rose-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">💬</div>
                                <h3 className="text-xl font-black text-white mb-2">Commenting Agent</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">AI-powered LinkedIn engagement with anti-detection built in.</p>
                                <span className="text-xs font-bold text-rose-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Engage →</span>
                            </div>
                        </Link>

                        <Link href="/commenting" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-blue-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">🔗</div>
                                <h3 className="text-xl font-black text-white mb-2">LinkedIn</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">AI-powered LinkedIn engagement and content distribution.</p>
                                <span className="text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Connect →</span>
                            </div>
                        </Link>

                        <Link href="/twitter" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-sky-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">𝕏</div>
                                <h3 className="text-xl font-black text-white mb-2">X (Twitter)</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Post threads, engage, and grow your X presence.</p>
                                <span className="text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Post →</span>
                            </div>
                        </Link>

                        <Link href="/medium" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-green-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">✍️</div>
                                <h3 className="text-xl font-black text-white mb-2">Medium</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Publish long-form articles and repurpose blog content.</p>
                                <span className="text-xs font-bold text-green-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Publish →</span>
                            </div>
                        </Link>

                        <Link href="/settings/accounts" className="group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] hover:border-pink-500/50 transition-all shadow-2xl">
                            <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                                <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">🔗</div>
                                <h3 className="text-xl font-black text-white mb-2">Accounts</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">Connect LinkedIn, X, Medium, and configure email.</p>
                                <span className="text-xs font-bold text-pink-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Manage →</span>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Activity Feed Mock */}
                <div className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-2xl font-black text-white">Live Operations</h3>
                        <Link href="/campaigns" className="text-gray-500 hover:text-white text-sm font-bold transition-colors">View All Activities →</Link>
                    </div>

                    <div className="space-y-4">
                        {[
                            { user: 'Commenting Agent', action: 'discovered 5 new posts for', target: '#GenAI', time: '2m ago', icon: '🤖' },
                            { user: 'Thorsten Linz', action: 'scheduled a new POV for', target: 'LinkedIn', time: '14m ago', icon: '⚡' },
                            { user: 'Innovation Loop', action: 'auto-liked post from', target: 'Alekh @ Tursio', time: '1h ago', icon: '🔥' }
                        ].map((op, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-900/40 rounded-2xl border border-gray-800/50 group hover:bg-gray-900/60 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-xl">{op.icon}</div>
                                    <div className="text-sm">
                                        <span className="font-bold text-white pr-1">{op.user}</span>
                                        <span className="text-gray-500">{op.action}</span>
                                        <span className="font-bold text-violet-400 pl-1">{op.target}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-600 font-mono">{op.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
                <p className="text-gray-600 text-sm">Powered by VERA Intelligence Engine © 2026 InnovareAI</p>
            </footer>
        </div>
    )
}
