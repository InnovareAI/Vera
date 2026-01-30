'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase/client'

interface VeraMember {
    id: string
    workspace_id: string
    email: string
    name: string | null
    role: 'admin' | 'editor' | 'approver' | 'norole'
    status: string
    user_id?: string
    unipile_connected?: boolean
    unipile_status?: string
}

export default function TeamSettingsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
    const router = useRouter()
    const supabase = getSupabase()

    const [members, setMembers] = useState<VeraMember[]>([])
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteName, setInviteName] = useState('')
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'approver' | 'norole'>('editor')
    const [isInviting, setIsInviting] = useState(false)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (currentWorkspace) {
            fetchMembers()
        }
    }, [currentWorkspace])

    const fetchMembers = async () => {
        if (!currentWorkspace) return

        setIsLoading(true)

        // Fetch members and their connected accounts
        const { data: membersData, error: membersError } = await supabase
            .from('vera_workspace_members')
            .select('*')
            .eq('workspace_id', currentWorkspace.id)

        const { data: accountsData, error: accountsError } = await supabase
            .from('vera_connected_accounts')
            .select('owner_email, status, platform')
            .eq('workspace_id', currentWorkspace.id)

        if (membersData) {
            const enrichedMembers = membersData.map((member: any) => {
                const account = accountsData?.find((a: any) => a.owner_email === member.email)
                return {
                    ...member,
                    unipile_connected: !!account,
                    unipile_status: account?.status || 'disconnected'
                }
            })
            setMembers(enrichedMembers)
        }
        setIsLoading(false)
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return

        setIsInviting(true)
        setMessage('')

        const { error } = await supabase
            .from('vera_workspace_members')
            .upsert({
                workspace_id: currentWorkspace.id,
                email: inviteEmail,
                name: inviteName,
                role: inviteRole
            }, { onConflict: 'workspace_id,email' })

        if (error) {
            setMessage(`Error: ${error.message}`)
        } else {
            setMessage(`Member ${inviteName || inviteEmail} added successfully`)
            setInviteEmail('')
            setInviteName('')
            fetchMembers()
        }

        setIsInviting(false)
        setTimeout(() => setMessage(''), 3000)
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!currentWorkspace) return
        if (!confirm('Are you sure you want to remove this member?')) return

        const { error } = await supabase
            .from('vera_workspace_members')
            .delete()
            .eq('id', memberId)

        if (error) {
            setMessage(`Error: ${error.message}`)
        } else {
            setMessage('Member removed')
            fetchMembers()
        }
        setTimeout(() => setMessage(''), 3000)
    }

    const handleRoleChange = async (memberId: string, newRole: string) => {
        const { error } = await supabase
            .from('vera_workspace_members')
            .update({ role: newRole })
            .eq('id', memberId)

        if (error) {
            setMessage(`Error: ${error.message}`)
        } else {
            fetchMembers()
        }
        setTimeout(() => setMessage(''), 3000)
    }

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

    const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin' || true // Fallback for dev

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white mr-4">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-semibold text-white">Team Management</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {message && (
                    <div className={`p-4 rounded-xl ${message.includes('Error') ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
                        {message}
                    </div>
                )}

                {/* Invite Form */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Add Team Member</h2>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            placeholder="Full Name"
                            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="email@innovare.ai"
                            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            required
                        />
                        <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as any)}
                            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="approver">Approver</option>
                            <option value="norole">No Role</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isInviting}
                            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50"
                        >
                            {isInviting ? 'Adding...' : 'Add Member'}
                        </button>
                    </form>
                </div>

                {/* Members List */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-white">
                            Workspace Members ({members.length})
                        </h2>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Innovare Workspace</div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Member</th>
                                    <th className="px-6 py-4 font-semibold">Unipile Status</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                            Loading deep workspace context...
                                        </td>
                                    </tr>
                                ) : members.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No members found. Add your first team member above.
                                        </td>
                                    </tr>
                                ) : members.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-900/20">
                                                    {(member.name || member.email)[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{member.name || 'Anonymous User'}</div>
                                                    <div className="text-gray-500 text-sm">{member.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${member.unipile_connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                                                <span className={`text-sm font-medium ${member.unipile_connected ? 'text-green-400' : 'text-gray-500'}`}>
                                                    {member.unipile_connected ? 'Connected' : 'Disconnected'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                className="bg-gray-800 border-none rounded-lg text-white text-sm px-3 py-1 focus:ring-2 focus:ring-violet-500 cursor-pointer hover:bg-gray-700 transition-colors"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="editor">Editor</option>
                                                <option value="approver">Approver</option>
                                                <option value="norole">No Role</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="text-gray-500 hover:text-red-400 p-2 transition-all opacity-0 group-hover:opacity-100"
                                                title="Remove member"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Dashboard Integration Hint */}
                <div className="p-6 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-white font-medium mb-1">Unipile Integration Insight</h4>
                        <p className="text-gray-400 text-sm">
                            Connected accounts are automatically detected from Unipile. If a member shows as "Disconnected", ensure they have linked their LinkedIn account in the Unipile dashboard using the same email address.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
