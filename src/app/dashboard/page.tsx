'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'

export default function DashboardPage() {
    const { user, profile, isLoading: authLoading, signOut } = useAuth()
    const { currentWorkspace, workspaces, currentOrganization, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
    const router = useRouter()

    // DEV MODE: Bypass login for prototyping
    // useEffect(() => {
    //     if (!authLoading && !user) {
    //         router.push('/login')
    //     }
    // }, [user, authLoading, router])

    if (authLoading || workspaceLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading...</p>
                </div>
            </div>
        )
    }

    // DEV MODE: Don't block access when no user
    // if (!user) {
    //     return null
    // }

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Top Nav */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl font-bold text-white">V</span>
                            </div>
                            <span className="text-xl font-bold text-white">VERA</span>
                        </Link>

                        {/* Workspace Switcher */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <select
                                    value={currentWorkspace?.id || ''}
                                    onChange={(e) => switchWorkspace(e.target.value)}
                                    className="appearance-none bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    {workspaces.map((ws) => (
                                        <option key={ws.id} value={ws.id}>
                                            {ws.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* User Menu */}
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-white">{profile?.full_name || user?.email || 'Dev User'}</p>
                                    <p className="text-xs text-gray-500">{currentOrganization?.name}</p>
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-medium">
                                    {(profile?.full_name || user?.email || 'D')[0].toUpperCase()}
                                </div>
                                <button
                                    onClick={() => signOut()}
                                    className="text-gray-400 hover:text-white text-sm"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
                    </h1>
                    <p className="text-gray-400">
                        Workspace: <span className="text-violet-400 font-medium">{currentWorkspace?.name}</span>
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <Link
                        href="/campaigns"
                        className="bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-2xl p-6 hover:border-violet-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-violet-600/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            📝
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Campaigns</h3>
                        <p className="text-gray-400 text-sm">Create and manage content campaigns</p>
                    </Link>

                    <Link
                        href="/campaigns/engine"
                        className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6 hover:border-blue-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-blue-600/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            ⚡
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Content Engine</h3>
                        <p className="text-gray-400 text-sm">Generate AI-powered content</p>
                    </Link>

                    <Link
                        href="/personas"
                        className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-indigo-600/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            🎭
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Personas</h3>
                        <p className="text-gray-400 text-sm">Build brand, audience & product personas</p>
                    </Link>

                    <Link
                        href="/settings/workspace"
                        className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6 hover:border-green-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-green-600/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            🎨
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Brand</h3>
                        <p className="text-gray-400 text-sm">Configure brand colors & voice</p>
                    </Link>

                    <Link
                        href="/prompts"
                        className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-amber-600/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            ⚙️
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Prompt Machine</h3>
                        <p className="text-gray-400 text-sm">Manage custom AI writing styles</p>
                    </Link>

                    <Link
                        href="/settings/team"
                        className="bg-gradient-to-br from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-orange-600/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            👥
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Team</h3>
                        <p className="text-gray-400 text-sm">Invite and manage team members</p>
                    </Link>
                </div>

                {/* Current Workspace Info */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Workspace Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">Organization</p>
                            <p className="text-white font-medium">{currentOrganization?.name}</p>
                            <p className="text-gray-400 text-xs mt-1">Plan: {currentOrganization?.plan || 'Starter'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm mb-1">Workspace</p>
                            <p className="text-white font-medium">{currentWorkspace?.name}</p>
                            <p className="text-gray-400 text-xs mt-1">Your role: {currentWorkspace?.role}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm mb-1">Brand Colors</p>
                            <div className="flex gap-2 mt-1">
                                <div
                                    className="w-8 h-8 rounded-lg"
                                    style={{ backgroundColor: currentWorkspace?.brand_colors?.primary || '#8B5CF6' }}
                                    title="Primary"
                                />
                                <div
                                    className="w-8 h-8 rounded-lg"
                                    style={{ backgroundColor: currentWorkspace?.brand_colors?.secondary || '#06B6D4' }}
                                    title="Secondary"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
