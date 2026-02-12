'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase/client'

interface ConnectedAccount {
    id: string
    owner_email: string
    owner_name: string
    platform: string
    integration_account_id: string
    status: string
}

export default function DirectSharePage() {
    const { user } = useAuth()
    const { currentWorkspace } = useWorkspace()
    const router = useRouter()
    const supabase = getSupabase()

    const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState('')
    const [content, setContent] = useState('')
    const [isPosting, setIsPosting] = useState(false)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (currentWorkspace) {
            fetchAccounts()
        }
    }, [currentWorkspace])

    const fetchAccounts = async () => {
        if (!currentWorkspace) return
        setIsLoading(true)

        const { data, error } = await supabase
            .from('vera_connected_accounts')
            .select('*')
            .eq('workspace_id', currentWorkspace.id)
            .eq('status', 'connected')

        if (data) {
            setAccounts(data)
            if (data.length > 0) {
                setSelectedAccountId(data[0].integration_account_id)
            }
        }
        setIsLoading(false)
    }

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || !selectedAccountId) return

        setIsPosting(true)
        setMessage('')

        try {
            // In a real app, this would call a Supabase Edge Function or an API route
            // which communicates with Unipile API to post the content.
            const response = await fetch('/api/sharing/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: selectedAccountId,
                    content: content,
                    workspaceId: currentWorkspace?.id
                })
            })

            const result = await response.json()

            if (response.ok) {
                setMessage('🚀 Post successfully sent to LinkedIn!')
                setContent('')
            } else {
                setMessage(`❌ Error: ${result.error || 'Failed to post'}`)
            }
        } catch (err) {
            setMessage('❌ System error occurred.')
        } finally {
            setIsPosting(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-neutral-400 hover:text-neutral-100 transition-colors">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                            Direct POV Share
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <h2 className="text-3xl font-bold mb-4">Post your POV</h2>
                    <p className="text-neutral-400">
                        Share your thoughts directly to LinkedIn without any AI generation or branding overhead.
                        Just clean, direct communication.
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl mb-8 flex items-center gap-3 ${message.includes('Error') || message.includes('❌') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handlePost} className="space-y-8">
                    {/* Account Selector */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                        <label className="block text-sm font-medium text-neutral-400 mb-4 font-mono uppercase tracking-widest">
                            1. Select Account
                        </label>
                        {isLoading ? (
                            <div className="h-12 bg-neutral-800 animate-pulse rounded-xl"></div>
                        ) : accounts.length === 0 ? (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                                No connected LinkedIn accounts found. Please connect an account in Team Settings.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {accounts.map(account => (
                                    <button
                                        key={account.id}
                                        type="button"
                                        onClick={() => setSelectedAccountId(account.integration_account_id)}
                                        className={`p-4 rounded-xl border transition-all text-left ${selectedAccountId === account.integration_account_id
                                            ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-900/20'
                                            : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center font-bold text-xs">
                                                {account.owner_name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-neutral-100 truncate">{account.owner_name}</div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-mono">{account.platform}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                        <label className="block text-sm font-medium text-neutral-400 mb-4 font-mono uppercase tracking-widest">
                            2. Your Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's your perspective today?"
                            className="w-full h-64 bg-neutral-800 border border-neutral-700 rounded-xl p-6 text-neutral-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none text-lg leading-relaxed"
                            required
                        />
                        <div className="mt-4 flex justify-between items-center text-xs text-neutral-500">
                            <span>Character count: {content.length}</span>
                            <span>LinkedIn limit: ~3,000</span>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isPosting || !content.trim() || accounts.length === 0}
                            className="px-12 py-4 bg-violet-600 text-neutral-100 rounded-xl font-bold text-lg hover:bg-violet-500 transition-all shadow-violet-900/40 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isPosting ? 'Sending to LinkedIn...' : 'Post to LinkedIn'}
                            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">🚀</span>
                        </button>
                    </div>
                </form>
            </main>
        </div>
    )
}
