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
    engagement_loop_enabled: boolean
    posting_stagger_minutes: number
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

    const handleToggleEngagement = async (member: VeraMember) => {
        const { error } = await supabase
            .from('vera_workspace_members')
            .update({ engagement_loop_enabled: !member.engagement_loop_enabled })
            .eq('id', member.id)

        if (error) {
            setMessage(`Error: ${error.message}`)
        } else {
            fetchMembers()
        }
        setTimeout(() => setMessage(''), 3000)
    }

    const handleStaggerChange = async (memberId: string, minutes: number) => {
        const { error } = await supabase
            .from('vera_workspace_members')
            .update({ posting_stagger_minutes: minutes })
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
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-neutral-400 mt-4">Loading...</p>
                </div>
            </div>
        )
    }

    const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin' || true // Fallback for dev

    return (
        <div className="min-h-screen bg-neutral-950">
            {/* Header */}
            <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <Link href="/dashboard" className="text-neutral-400 hover:text-neutral-100 mr-4">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-semibold text-neutral-100">Team Management</h1>
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
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-neutral-100 mb-4">Add Team Member</h2>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            placeholder="Full Name"
                            className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="email@innovare.ai"
                            className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            required
                        />
                        <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as any)}
                            className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="approver">Approver</option>
                            <option value="norole">No Role</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isInviting}
                            className="px-6 py-3 bg-violet-600 text-neutral-100 rounded-xl font-medium hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50"
                        >
                            {isInviting ? 'Adding...' : 'Add Member'}
                        </button>
                    </form>
                </div>

                {/* Members List */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-neutral-100">
                            Workspace Members ({members.length})
                        </h2>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Innovare Workspace</div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-900/50 text-neutral-400 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Member</th>
                                    <th className="px-6 py-4 font-semibold">Unipile</th>
                                    <th className="px-6 py-4 font-semibold text-center">Auto-Boost</th>
                                    <th className="px-6 py-4 font-semibold">Stagger</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic">
                                            Loading deep workspace context...
                                        </td>
                                    </tr>
                                ) : members.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                                            No members found. Add your first team member above.
                                        </td>
                                    </tr>
                                ) : members.map((member) => (
                                    <tr key={member.id} className="hover:bg-neutral-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center text-neutral-100 font-semibold text-sm shadow-lg shadow-violet-900/20">
                                                    {(member.name || member.email)[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-neutral-100 font-medium">{member.name || 'Anonymous User'}</div>
                                                    <div className="text-neutral-500 text-sm">{member.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${member.unipile_connected ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}`}></div>
                                                <span className={`text-sm font-medium ${member.unipile_connected ? 'text-green-400' : 'text-neutral-500'}`}>
                                                    {member.unipile_connected ? 'Connected' : 'Disconnected'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleEngagement(member)}
                                                className={`p-2 rounded-full transition-all ${member.engagement_loop_enabled ? 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30' : 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700'}`}
                                                title={member.engagement_loop_enabled ? 'Disable Auto-Engagement' : 'Enable Auto-Engagement'}
                                            >
                                                {member.engagement_loop_enabled ? (
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a2 2 0 00-.8 2.4z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                    </svg>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={member.posting_stagger_minutes}
                                                    onChange={(e) => handleStaggerChange(member.id, parseInt(e.target.value))}
                                                    className="w-16 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-xs px-2 py-1 focus:ring-1 focus:ring-violet-500"
                                                />
                                                <span className="text-neutral-500 text-[10px] uppercase">min</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                className="bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-xs px-3 py-1 focus:ring-1 focus:ring-violet-500 cursor-pointer hover:bg-neutral-700 transition-colors"
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
                                                className="text-neutral-500 hover:text-red-400 p-2 transition-all opacity-0 group-hover:opacity-100"
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
                <div className="p-6 bg-violet-600/10 border border-violet-500/20 rounded-xl flex items-start gap-4">
                    <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-neutral-100 font-medium mb-1">Unipile Integration Insight</h4>
                        <p className="text-neutral-400 text-sm">
                            Connected accounts are automatically detected from Unipile. If a member shows as "Disconnected", ensure they have linked their LinkedIn account in the Unipile dashboard using the same email address.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
