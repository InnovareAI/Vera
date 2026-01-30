'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase/client'
import type { Profile, WorkspaceMember } from '@/types/database'

interface MemberWithProfile extends WorkspaceMember {
    profile: Profile
}

export default function TeamSettingsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
    const router = useRouter()
    const supabase = getSupabase()

    const [members, setMembers] = useState<MemberWithProfile[]>([])
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
    const [isInviting, setIsInviting] = useState(false)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    // DEV MODE: Bypass login
    // useEffect(() => {
    //     if (!authLoading && !user) {
    //         router.push('/login')
    //     }
    // }, [user, authLoading, router])

    useEffect(() => {
        if (currentWorkspace) {
            fetchMembers()
        }
    }, [currentWorkspace])

    const fetchMembers = async () => {
        if (!currentWorkspace) return

        setIsLoading(true)
        const { data, error } = await supabase
            .from('workspace_members')
            .select(`
        *,
        profile:profiles(*)
      `)
            .eq('workspace_id', currentWorkspace.id)

        if (data) {
            setMembers(data as MemberWithProfile[])
        }
        setIsLoading(false)
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return

        setIsInviting(true)
        setMessage('')

        // For now, we'll just show a message since email invites require more setup
        // In production, you'd send an invite email and create a pending invitation
        setMessage(`Invite feature coming soon! Would invite ${inviteEmail} as ${inviteRole}`)
        setInviteEmail('')
        setIsInviting(false)
        setTimeout(() => setMessage(''), 3000)
    }

    const handleRemoveMember = async (memberId: string, memberUserId: string) => {
        if (!currentWorkspace || memberUserId === user?.id) return

        if (!confirm('Are you sure you want to remove this member?')) return

        const { error } = await supabase
            .from('workspace_members')
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
            .from('workspace_members')
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

    // DEV MODE: Allow access without user
    // if (!user || !currentWorkspace) {
    //     return null
    // }

    const canManage = currentWorkspace ? ['owner', 'admin'].includes(currentWorkspace.role) : true
    const isOwner = currentWorkspace?.role === 'owner'

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white mr-4">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-semibold text-white">Team Members</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {message && (
                    <div className={`p-4 rounded-xl ${message.includes('Error') ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
                        {message}
                    </div>
                )}

                {/* Invite Form */}
                {canManage && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Invite Team Member</h2>
                        <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="colleague@company.com"
                                className="flex-1 min-w-[200px] px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                required
                            />
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                                {isOwner && <option value="admin">Admin</option>}
                            </select>
                            <button
                                type="submit"
                                disabled={isInviting}
                                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50"
                            >
                                {isInviting ? 'Inviting...' : 'Send Invite'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Members List */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-800">
                        <h2 className="text-lg font-semibold text-white">
                            Team Members ({members.length})
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="p-6 text-center text-gray-400">Loading members...</div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {members.map((member) => (
                                <div key={member.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-medium">
                                            {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">
                                                {member.profile?.full_name || 'Unknown'}
                                                {member.user_id === user?.id && (
                                                    <span className="text-gray-500 text-sm ml-2">(You)</span>
                                                )}
                                            </p>
                                            <p className="text-gray-500 text-sm">{member.profile?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {canManage && member.user_id !== user?.id && member.role !== 'owner' ? (
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="editor">Editor</option>
                                                {isOwner && <option value="admin">Admin</option>}
                                            </select>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-lg text-sm ${member.role === 'owner' ? 'bg-violet-600/30 text-violet-300' :
                                                member.role === 'admin' ? 'bg-blue-600/30 text-blue-300' :
                                                    member.role === 'editor' ? 'bg-green-600/30 text-green-300' :
                                                        'bg-gray-700/50 text-gray-400'
                                                }`}>
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </span>
                                        )}
                                        {canManage && member.user_id !== user?.id && member.role !== 'owner' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id, member.user_id)}
                                                className="text-gray-500 hover:text-red-400 transition-colors"
                                                title="Remove member"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Roles Explanation */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Role Permissions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-violet-400 font-medium">Owner</p>
                            <p className="text-gray-500">Full access, billing, delete workspace</p>
                        </div>
                        <div>
                            <p className="text-blue-400 font-medium">Admin</p>
                            <p className="text-gray-500">Manage team, settings, all content</p>
                        </div>
                        <div>
                            <p className="text-green-400 font-medium">Editor</p>
                            <p className="text-gray-500">Create and edit campaigns & content</p>
                        </div>
                        <div>
                            <p className="text-gray-400 font-medium">Viewer</p>
                            <p className="text-gray-500">View-only access to content</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
