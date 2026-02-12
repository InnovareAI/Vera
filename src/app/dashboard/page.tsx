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
        try {
            const [contentRes, projectsRes] = await Promise.all([
                supabase.from('vera_generated_content').select('id, status', { count: 'exact' }).eq('workspace_id', currentWorkspace!.id).eq('status', 'pending'),
                supabase.from('vera_projects').select('id', { count: 'exact' }).eq('workspace_id', currentWorkspace!.id).neq('status', 'archived'),
            ])

            setStats({
                pendingApprovals: contentRes.count || 0,
                activeCampaigns: projectsRes.count || 0,
                teamEngagement: 0,
            })
        } catch {
            setStats({ pendingApprovals: 0, activeCampaigns: 0, teamEngagement: 0 })
        }
    }

    if (authLoading || workspaceLoading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="border-b border-neutral-800/60">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="text-sm font-semibold text-neutral-100 tracking-tight">
                            Vera.AI
                        </Link>
                        <nav className="flex items-center gap-1">
                            {[
                                { label: 'Dashboard', href: '/dashboard' },
                                { label: 'Projects', href: '/projects' },
                                { label: 'Settings', href: '/settings' },
                            ].map((item) => (
                                <Link key={item.label} href={item.href} className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-300 rounded-md hover:bg-neutral-800/40 transition-colors">
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const html = document.documentElement
                                const current = html.getAttribute('data-theme')
                                const next = current === 'light' ? 'dark' : 'light'
                                html.setAttribute('data-theme', next)
                                localStorage.setItem('vera-theme', next)
                            }}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-all"
                            title="Toggle theme"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                            </svg>
                        </button>
                        <select
                            value={currentWorkspace?.id || ''}
                            onChange={(e) => switchWorkspace(e.target.value)}
                            className="bg-transparent text-sm text-neutral-500 focus:outline-none cursor-pointer"
                        >
                            {workspaces.map((ws) => (
                                <option key={ws.id} value={ws.id} className="bg-neutral-900">{ws.name}</option>
                            ))}
                        </select>
                        <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center overflow-hidden">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-medium">{(profile?.full_name || user?.email || 'V')[0].toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
                {/* Greeting */}
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-100 mb-1">
                        Hello, {profile?.full_name?.split(' ')[0] || 'there'}
                    </h1>
                    <p className="text-neutral-500 text-sm">
                        {currentOrganization?.name && <span>{currentOrganization.name} &middot; </span>}
                        Your content engine is ready.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Pending approvals', value: stats.pendingApprovals },
                        { label: 'Active projects', value: stats.activeCampaigns },
                        { label: 'Team members', value: stats.teamEngagement || '—' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                            <p className="text-xs text-neutral-500 mb-1">{stat.label}</p>
                            <p className="text-2xl font-semibold text-neutral-100">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Quick actions */}
                <div>
                    <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">Quick actions</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'Projects', desc: 'Manage brands & campaigns', href: '/projects' },
                            { label: 'Content Engine', desc: 'AIO blog machine', href: '/content-engine' },
                            { label: 'Direct POV', desc: 'Post directly to LinkedIn', href: '/sharing/direct' },
                            { label: 'Research', desc: 'Discover trending topics', href: '/research' },
                            { label: 'Cold Email', desc: 'Launch email campaigns', href: '/cold-email' },
                            { label: 'Newsletter', desc: 'Build & send newsletters', href: '/newsletter' },
                            { label: 'Commenting', desc: 'AI LinkedIn engagement', href: '/commenting' },
                            { label: 'Accounts', desc: 'Connect platforms', href: '/settings/accounts' },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700/60 hover:bg-neutral-800/40 transition-all group"
                            >
                                <p className="text-sm font-medium text-neutral-200 group-hover:text-neutral-100 mb-0.5">{item.label}</p>
                                <p className="text-xs text-neutral-500">{item.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Activity */}
                <div>
                    <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">Recent activity</h2>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800/60">
                        {[
                            { actor: 'Commenting Agent', action: 'discovered 5 new posts for', target: '#GenAI', time: '2m ago' },
                            { actor: profile?.full_name || 'You', action: 'scheduled a POV for', target: 'LinkedIn', time: '14m ago' },
                            { actor: 'Innovation Loop', action: 'auto-liked post from', target: 'Alekh @ Tursio', time: '1h ago' },
                        ].map((op, i) => (
                            <div key={i} className="px-4 py-3 flex items-center justify-between">
                                <p className="text-sm text-neutral-400">
                                    <span className="text-neutral-200">{op.actor}</span> {op.action} <span className="text-violet-400">{op.target}</span>
                                </p>
                                <span className="text-xs text-neutral-600 shrink-0 ml-4">{op.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
