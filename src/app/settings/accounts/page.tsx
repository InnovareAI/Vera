'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase/client'
import { LinkedInLogo } from '@/components/ui/LinkedInLogo'

interface ConnectedAccount {
    id: string
    platform: string
    platform_username: string | null
    platform_display_name: string | null
    status: string
    connected_at: string
}

export default function AccountsSettingsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
    const supabase = getSupabase()

    const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (currentWorkspace && user) {
            fetchAccounts()
        }
    }, [currentWorkspace, user])

    const fetchAccounts = async () => {
        if (!currentWorkspace || !user) return
        setIsLoading(true)

        try {
            const { data, error } = await supabase
                .from('vera_connected_accounts')
                .select('id, platform, platform_username, platform_display_name, status, connected_at')
                .eq('workspace_id', currentWorkspace.id)
                .eq('user_id', user.id)

            if (error) {
                console.error('Error fetching accounts:', error)
            } else {
                setAccounts(data || [])
            }
        } catch (err) {
            console.error('Failed to fetch accounts:', err)
        }

        setIsLoading(false)
    }

    const getAccountForPlatform = (platform: string): ConnectedAccount | undefined => {
        return accounts.find(a => a.platform === platform && a.status === 'active')
    }

    const handleDisconnect = async (accountId: string, platformName: string) => {
        if (!confirm(`Disconnect your ${platformName} account? You can reconnect it later.`)) return

        const { error } = await supabase
            .from('vera_connected_accounts')
            .update({ status: 'revoked' })
            .eq('id', accountId)

        if (error) {
            setMessage(`Error disconnecting: ${error.message}`)
        } else {
            setMessage(`${platformName} disconnected successfully.`)
            fetchAccounts()
        }
        setTimeout(() => setMessage(''), 4000)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    if (authLoading || workspaceLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 mt-4 font-medium">Loading accounts...</p>
                </div>
            </div>
        )
    }

    const linkedinAccount = getAccountForPlatform('linkedin')
    const twitterAccount = getAccountForPlatform('twitter')
    const mediumAccount = getAccountForPlatform('medium')

    // Email is configured via env vars (Postmark), not via connected_accounts
    const emailConfigured = true // Postmark is server-side config

    const platforms = [
        {
            id: 'linkedin',
            name: 'LinkedIn',
            description: 'Post thought leadership content and engage with your professional network.',
            account: linkedinAccount,
            icon: (
                <LinkedInLogo size={40} />
            ),
            connectUrl: null as string | null, // Unipile is configured server-side
            connectLabel: 'Connect LinkedIn',
            accentColor: 'blue',
        },
        {
            id: 'twitter',
            name: 'X (Twitter)',
            description: 'Share short-form insights and engage in real-time conversations.',
            account: twitterAccount,
            icon: (
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-gray-700">
                    <span className="text-white text-xl font-black">𝕏</span>
                </div>
            ),
            connectUrl: `/api/auth/twitter?workspace_id=${currentWorkspace?.id}`,
            connectLabel: 'Connect X',
            accentColor: 'gray',
        },
        {
            id: 'medium',
            name: 'Medium',
            description: 'Publish long-form articles and reach a wider audience of readers.',
            account: mediumAccount,
            icon: (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <span className="text-black text-2xl font-black">M</span>
                </div>
            ),
            connectUrl: `/api/auth/medium?workspace_id=${currentWorkspace?.id}`,
            connectLabel: 'Connect Medium',
            accentColor: 'green',
        },
        {
            id: 'email',
            name: 'Email (Postmark)',
            description: 'Send cold emails and newsletters via Postmark transactional email.',
            account: null,
            icon: (
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
            ),
            connectUrl: null,
            connectLabel: 'Configure',
            accentColor: 'orange',
            isEmail: true,
        },
    ]

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white mr-4 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <nav className="flex items-center gap-2 text-sm">
                            <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 transition-colors">Dashboard</Link>
                            <span className="text-gray-700">/</span>
                            <span className="text-gray-500">Settings</span>
                            <span className="text-gray-700">/</span>
                            <span className="text-white font-semibold">Connected Accounts</span>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                {/* Page Title */}
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Connected Accounts</h1>
                    <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-2xl">
                        Link your social platforms and email services to enable multi-channel publishing from VERA.
                    </p>
                </div>

                {/* Status Message */}
                {message && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('Error') ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
                        {message}
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-800 rounded-xl" />
                                    <div className="flex-1">
                                        <div className="h-4 w-32 bg-gray-800 rounded mb-2" />
                                        <div className="h-3 w-64 bg-gray-800/60 rounded" />
                                    </div>
                                    <div className="h-8 w-24 bg-gray-800 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Platform Cards */
                    <div className="space-y-4">
                        {platforms.map((platform) => {
                            const isConnected = platform.id === 'email'
                                ? emailConfigured
                                : !!platform.account

                            return (
                                <div
                                    key={platform.id}
                                    className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:bg-gray-900/60 transition-all group"
                                >
                                    <div className="flex items-center gap-5">
                                        {/* Platform Icon */}
                                        <div className="flex-shrink-0">
                                            {platform.icon}
                                        </div>

                                        {/* Platform Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-white">{platform.name}</h3>
                                                {isConnected ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                                        Connected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-gray-500 border border-gray-700">
                                                        Not Connected
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-gray-500 text-sm">{platform.description}</p>

                                            {/* Connected Account Details */}
                                            {platform.account && (
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                    {platform.account.platform_display_name && (
                                                        <span className="font-medium text-gray-300">
                                                            {platform.account.platform_display_name}
                                                        </span>
                                                    )}
                                                    {platform.account.platform_username && (
                                                        <span>@{platform.account.platform_username}</span>
                                                    )}
                                                    <span className="text-gray-600">
                                                        Connected {formatDate(platform.account.connected_at)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Email Config Details */}
                                            {platform.id === 'email' && emailConfigured && (
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span className="font-medium text-gray-300">Postmark Configured</span>
                                                    <span className="text-gray-600">Server-side integration</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <div className="flex-shrink-0">
                                            {platform.account ? (
                                                <button
                                                    onClick={() => handleDisconnect(platform.account!.id, platform.name)}
                                                    className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                                                >
                                                    Disconnect
                                                </button>
                                            ) : platform.id === 'email' ? (
                                                <Link
                                                    href="/settings/workspace"
                                                    className="px-4 py-2 text-sm font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all inline-block"
                                                >
                                                    Configure
                                                </Link>
                                            ) : platform.id === 'linkedin' ? (
                                                <div className="text-right">
                                                    <span className="text-xs text-gray-500 block mb-1">Via Unipile</span>
                                                    <button
                                                        onClick={() => {
                                                            setMessage('LinkedIn is connected via Unipile. Contact your admin to manage the connection.')
                                                            setTimeout(() => setMessage(''), 5000)
                                                        }}
                                                        className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all"
                                                    >
                                                        Connect LinkedIn
                                                    </button>
                                                </div>
                                            ) : platform.connectUrl ? (
                                                <a
                                                    href={platform.connectUrl}
                                                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all inline-block ${
                                                        platform.accentColor === 'gray'
                                                            ? 'text-white bg-white/10 border border-white/20 hover:bg-white/20'
                                                            : 'text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20'
                                                    }`}
                                                >
                                                    {platform.connectLabel}
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Info Banner */}
                <div className="p-6 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-white font-medium mb-1">Multi-Channel Publishing</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Once connected, your accounts become available for publishing across all VERA workflows -- content engine, direct POV, cold email campaigns, and newsletters. LinkedIn is managed through Unipile for enhanced reliability.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
