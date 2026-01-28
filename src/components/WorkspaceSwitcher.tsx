'use client'

import { useState } from 'react'
import { useWorkspace, Workspace } from '@/context/WorkspaceContext'

export function WorkspaceSwitcher() {
    const {
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        createWorkspace,
        isLoading
    } = useWorkspace()

    const [isOpen, setIsOpen] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)

    const handleCreateWorkspace = async () => {
        if (!newName.trim()) return

        setCreating(true)
        const slug = newName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const workspace = await createWorkspace(newName, slug)

        if (workspace) {
            setCurrentWorkspace(workspace as Workspace)
            setShowCreate(false)
            setNewName('')
        }
        setCreating(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-xl">
                <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse" />
                <div className="w-24 h-4 bg-gray-700 rounded animate-pulse" />
            </div>
        )
    }

    return (
        <div className="relative">
            {/* Current workspace button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors w-full"
            >
                {/* Logo or Initial */}
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {currentWorkspace?.logo_url ? (
                        <img
                            src={currentWorkspace.logo_url}
                            alt={currentWorkspace.name}
                            className="w-full h-full rounded-lg object-cover"
                        />
                    ) : (
                        currentWorkspace?.name?.charAt(0) || '?'
                    )}
                </div>

                {/* Name */}
                <div className="flex-1 text-left">
                    <p className="text-white font-medium text-sm truncate">
                        {currentWorkspace?.name || 'Select Workspace'}
                    </p>
                    <p className="text-gray-500 text-xs capitalize">
                        {currentWorkspace?.role || 'No workspace'}
                    </p>
                </div>

                {/* Chevron */}
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* Workspace list */}
                        <div className="max-h-64 overflow-y-auto">
                            {workspaces.map(workspace => (
                                <button
                                    key={workspace.id}
                                    onClick={() => {
                                        setCurrentWorkspace(workspace)
                                        setIsOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors ${workspace.id === currentWorkspace?.id ? 'bg-violet-500/10 border-l-2 border-violet-500' : ''
                                        }`}
                                >
                                    <div className="w-7 h-7 bg-gradient-to-br from-violet-500/50 to-purple-500/50 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                        {workspace.logo_url ? (
                                            <img
                                                src={workspace.logo_url}
                                                alt={workspace.name}
                                                className="w-full h-full rounded-lg object-cover"
                                            />
                                        ) : (
                                            workspace.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-white text-sm">{workspace.name}</p>
                                        <p className="text-gray-500 text-xs capitalize">{workspace.role}</p>
                                    </div>
                                    {workspace.id === currentWorkspace?.id && (
                                        <span className="text-violet-400">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-800" />

                        {/* Create new */}
                        {showCreate ? (
                            <div className="p-3 space-y-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Workspace name..."
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowCreate(false); setNewName('') }}
                                        className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateWorkspace}
                                        disabled={creating || !newName.trim()}
                                        className="flex-1 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600 disabled:opacity-50"
                                    >
                                        {creating ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            >
                                <span className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center text-lg">+</span>
                                <span className="text-sm">Create Workspace</span>
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
