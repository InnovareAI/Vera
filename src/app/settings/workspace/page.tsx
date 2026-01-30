'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase/client'

export default function WorkspaceSettingsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const { currentWorkspace, refreshWorkspaces, isLoading: workspaceLoading } = useWorkspace()
    const router = useRouter()
    const supabase = getSupabase()

    const [name, setName] = useState('')
    const [brandVoice, setBrandVoice] = useState('')
    const [primaryColor, setPrimaryColor] = useState('#8B5CF6')
    const [secondaryColor, setSecondaryColor] = useState('#06B6D4')
    const [isSaving, setIsSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    // DEV MODE: Bypass login
    // useEffect(() => {
    //     if (!authLoading && !user) {
    //         router.push('/login')
    //     }
    // }, [user, authLoading, router])

    useEffect(() => {
        if (currentWorkspace) {
            setName(currentWorkspace.name)
            setBrandVoice(currentWorkspace.brand_voice || '')
            setPrimaryColor(currentWorkspace.brand_colors?.primary || '#8B5CF6')
            setSecondaryColor(currentWorkspace.brand_colors?.secondary || '#06B6D4')
        }
    }, [currentWorkspace])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return

        setIsSaving(true)
        setSaveMessage('')

        const { error } = await supabase
            .from('workspaces')
            .update({
                name,
                brand_voice: brandVoice || null,
                brand_colors: {
                    primary: primaryColor,
                    secondary: secondaryColor
                }
            })
            .eq('id', currentWorkspace.id)

        if (error) {
            setSaveMessage(`Error: ${error.message}`)
        } else {
            setSaveMessage('Settings saved successfully!')
            await refreshWorkspaces()
        }

        setIsSaving(false)
        setTimeout(() => setSaveMessage(''), 3000)
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

    const canEdit = currentWorkspace ? ['owner', 'admin'].includes(currentWorkspace.role) : true

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white mr-4">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-semibold text-white">Workspace Settings</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* General Settings */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">General</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Workspace Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full max-w-md px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Brand Settings */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Brand Identity</h2>

                        <div className="space-y-6">
                            {/* Colors */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Brand Colors
                                </label>
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Primary</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                disabled={!canEdit}
                                                className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent disabled:opacity-50"
                                            />
                                            <input
                                                type="text"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                disabled={!canEdit}
                                                className="w-28 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Secondary</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                disabled={!canEdit}
                                                className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent disabled:opacity-50"
                                            />
                                            <input
                                                type="text"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                disabled={!canEdit}
                                                className="w-28 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Brand Voice */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Brand Voice Guidelines
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Describe your brand's tone and style. This will guide AI-generated content.
                                </p>
                                <textarea
                                    value={brandVoice}
                                    onChange={(e) => setBrandVoice(e.target.value)}
                                    disabled={!canEdit}
                                    rows={4}
                                    placeholder="e.g., Professional yet approachable. Use clear, concise language. Avoid jargon. Emphasize innovation and customer success."
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
                        <div
                            className="rounded-xl p-6 text-white"
                            style={{
                                background: `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}40)`,
                                borderColor: primaryColor,
                                borderWidth: 1,
                                borderStyle: 'solid'
                            }}
                        >
                            <h3 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>
                                {name}
                            </h3>
                            <p className="text-gray-300 text-sm">
                                This is how your brand colors will appear in generated content and the UI.
                            </p>
                        </div>
                    </div>

                    {/* Save Button */}
                    {canEdit && (
                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>
                            {saveMessage && (
                                <p className={`text-sm ${saveMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                                    {saveMessage}
                                </p>
                            )}
                        </div>
                    )}

                    {!canEdit && (
                        <p className="text-gray-500 text-sm">
                            You don't have permission to edit workspace settings. Contact a workspace admin.
                        </p>
                    )}
                </form>
            </main>
        </div>
    )
}
