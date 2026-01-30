'use client'

import { useState, useEffect } from 'react'

interface VoiceProfile {
    personality: string[]
    doList: string[]
    dontList: string[]
    keyPhrases: string[]
    avoidPhrases: string[]
    writingStyle: {
        sentenceLength: 'short' | 'medium' | 'long' | 'varied'
        formality: 'casual' | 'professional' | 'conversational' | 'formal'
        useOfEmoji: boolean
        useOfHashtags: boolean
        perspective: 'first_person' | 'second_person' | 'third_person' | 'mixed'
    }
    summary: string
}

interface SavedVoiceProfile {
    id: string
    workspace_id: string
    name: string
    personality: string[]
    do_list: string[]
    dont_list: string[]
    key_phrases: string[]
    avoid_phrases: string[]
    writing_style: VoiceProfile['writingStyle']
    summary: string
    is_default: boolean
    created_at: string
}

interface ToneOfVoiceProps {
    workspaceId: string
    initialProfile?: VoiceProfile | null
    onSave: (profile: VoiceProfile) => void
    onSkip?: () => void
}

// Convert saved profile to VoiceProfile format
function savedToVoiceProfile(saved: SavedVoiceProfile): VoiceProfile {
    return {
        personality: saved.personality,
        doList: saved.do_list,
        dontList: saved.dont_list,
        keyPhrases: saved.key_phrases,
        avoidPhrases: saved.avoid_phrases,
        writingStyle: saved.writing_style,
        summary: saved.summary
    }
}

export function ToneOfVoice({ workspaceId, initialProfile, onSave, onSkip }: ToneOfVoiceProps) {
    const [samples, setSamples] = useState<string[]>(['', '', ''])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [profile, setProfile] = useState<VoiceProfile | null>(initialProfile || null)
    const [activeTab, setActiveTab] = useState<'saved' | 'input' | 'profile'>(initialProfile ? 'profile' : 'saved')
    const [error, setError] = useState<string | null>(null)

    // Saved profiles state
    const [savedProfiles, setSavedProfiles] = useState<SavedVoiceProfile[]>([])
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(true)
    const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)

    // Save modal state
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [saveName, setSaveName] = useState('')
    const [saveAsDefault, setSaveAsDefault] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Load saved profiles on mount
    useEffect(() => {
        const loadProfiles = async () => {
            try {
                const response = await fetch(`/api/voice-profiles?workspace_id=${workspaceId}`)
                if (response.ok) {
                    const data = await response.json()
                    setSavedProfiles(data)

                    // Auto-select default profile
                    const defaultProfile = data.find((p: SavedVoiceProfile) => p.is_default)
                    if (defaultProfile && !initialProfile) {
                        setSelectedSavedId(defaultProfile.id)
                        setProfile(savedToVoiceProfile(defaultProfile))
                    }
                }
            } catch (err) {
                console.error('Failed to load voice profiles:', err)
            } finally {
                setIsLoadingProfiles(false)
            }
        }
        loadProfiles()
    }, [workspaceId, initialProfile])

    const updateSample = (index: number, value: string) => {
        const newSamples = [...samples]
        newSamples[index] = value
        setSamples(newSamples)
    }

    const addSample = () => {
        if (samples.length < 10) {
            setSamples([...samples, ''])
        }
    }

    const removeSample = (index: number) => {
        if (samples.length > 1) {
            setSamples(samples.filter((_, i) => i !== index))
        }
    }

    const analyzeSamples = async () => {
        const validSamples = samples.filter(s => s.trim().length > 50)
        if (validSamples.length < 2) {
            setError('Please provide at least 2 samples with 50+ characters each')
            return
        }

        setIsAnalyzing(true)
        setError(null)

        try {
            const response = await fetch('/api/ai/analyze-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ samples: validSamples, workspaceId })
            })

            if (!response.ok) {
                throw new Error('Failed to analyze voice samples')
            }

            const data = await response.json()
            setProfile(data.profile)
            setSelectedSavedId(null) // Clear saved selection since this is a new analysis
            setActiveTab('profile')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const selectSavedProfile = (profileId: string) => {
        const saved = savedProfiles.find(p => p.id === profileId)
        if (saved) {
            setSelectedSavedId(profileId)
            setProfile(savedToVoiceProfile(saved))
            setActiveTab('profile')
        }
    }

    const handleSaveProfile = async () => {
        if (!profile || !saveName.trim()) return

        setIsSaving(true)
        try {
            const response = await fetch('/api/voice-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    name: saveName.trim(),
                    profile,
                    is_default: saveAsDefault
                })
            })

            if (response.ok) {
                const newProfile = await response.json()
                setSavedProfiles(prev => {
                    // If new profile is default, unset others
                    if (saveAsDefault) {
                        return [...prev.map(p => ({ ...p, is_default: false })), newProfile]
                    }
                    return [...prev, newProfile]
                })
                setSelectedSavedId(newProfile.id)
                setShowSaveModal(false)
                setSaveName('')
                setSaveAsDefault(false)
            }
        } catch (err) {
            console.error('Failed to save profile:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const deleteProfile = async (id: string) => {
        try {
            await fetch(`/api/voice-profiles?id=${id}&workspace_id=${workspaceId}`, {
                method: 'DELETE'
            })
            setSavedProfiles(prev => prev.filter(p => p.id !== id))
            if (selectedSavedId === id) {
                setSelectedSavedId(null)
                setProfile(null)
            }
        } catch (err) {
            console.error('Failed to delete profile:', err)
        }
    }

    const setAsDefault = async (id: string) => {
        try {
            await fetch('/api/voice-profiles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, workspace_id: workspaceId, is_default: true })
            })
            setSavedProfiles(prev =>
                prev.map(p => ({ ...p, is_default: p.id === id }))
            )
        } catch (err) {
            console.error('Failed to set default:', err)
        }
    }

    const filledSamples = samples.filter(s => s.trim().length > 0).length
    const totalChars = samples.reduce((acc, s) => acc + s.length, 0)

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Tone of Voice</h2>
                <p className="text-gray-400">
                    Select a saved voice profile or analyze new writing samples to capture your unique style.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'saved'
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                >
                    Saved Profiles {savedProfiles.length > 0 && `(${savedProfiles.length})`}
                </button>
                <button
                    onClick={() => setActiveTab('input')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'input'
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                >
                    Analyze New
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    disabled={!profile}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'profile'
                            ? 'bg-violet-600 text-white'
                            : profile
                                ? 'bg-gray-800 text-gray-400 hover:text-white'
                                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    }`}
                >
                    Current Profile {profile && '✓'}
                </button>
            </div>

            {/* Saved Profiles Tab */}
            {activeTab === 'saved' && (
                <div className="space-y-4">
                    {isLoadingProfiles ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Loading saved profiles...</p>
                        </div>
                    ) : savedProfiles.length === 0 ? (
                        <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
                            <div className="text-4xl mb-4">🎤</div>
                            <h3 className="text-white font-medium mb-2">No saved profiles yet</h3>
                            <p className="text-gray-500 mb-6">
                                Analyze your writing samples to create your first voice profile
                            </p>
                            <button
                                onClick={() => setActiveTab('input')}
                                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                            >
                                Analyze Writing Samples
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4">
                                {savedProfiles.map((saved) => (
                                    <div
                                        key={saved.id}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                            selectedSavedId === saved.id
                                                ? 'bg-violet-900/30 border-violet-500'
                                                : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                                        }`}
                                        onClick={() => selectSavedProfile(saved.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="text-white font-medium">{saved.name}</h4>
                                                    {saved.is_default && (
                                                        <span className="px-2 py-0.5 bg-violet-600/30 text-violet-300 text-xs rounded-full">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-400 text-sm line-clamp-2">{saved.summary}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {saved.personality.slice(0, 3).map((trait, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded"
                                                        >
                                                            {trait}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                {!saved.is_default && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setAsDefault(saved.id)
                                                        }}
                                                        className="text-gray-500 hover:text-violet-400 text-xs"
                                                        title="Set as default"
                                                    >
                                                        Set Default
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (confirm('Delete this voice profile?')) {
                                                            deleteProfile(saved.id)
                                                        }
                                                    }}
                                                    className="text-gray-600 hover:text-red-400"
                                                    title="Delete profile"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setActiveTab('input')}
                                className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-violet-500 hover:text-violet-400 transition-colors"
                            >
                                + Create New Voice Profile
                            </button>
                        </>
                    )}

                    {/* Actions for saved tab */}
                    {profile && (
                        <div className="flex gap-3 pt-4">
                            {onSkip && (
                                <button
                                    onClick={onSkip}
                                    className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-colors"
                                >
                                    Skip for now
                                </button>
                            )}
                            <button
                                onClick={() => onSave(profile)}
                                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
                            >
                                Use Selected Profile ✓
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Input Tab */}
            {activeTab === 'input' && (
                <div className="space-y-4">
                    {/* Tips */}
                    <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4">
                        <h3 className="text-blue-400 font-medium mb-2">Tips for best results</h3>
                        <ul className="text-blue-300/80 text-sm space-y-1">
                            <li>• Paste your best-performing LinkedIn posts or tweets</li>
                            <li>• Include content that represents YOUR authentic voice</li>
                            <li>• Aim for 3-5 samples, each 100+ words if possible</li>
                            <li>• Mix different content types (stories, insights, announcements)</li>
                        </ul>
                    </div>

                    {/* Sample Inputs */}
                    <div className="space-y-4">
                        {samples.map((sample, index) => (
                            <div key={index} className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-gray-400 text-sm">
                                        Sample {index + 1}
                                        {sample.length > 0 && (
                                            <span className="text-gray-600 ml-2">
                                                ({sample.length} chars)
                                            </span>
                                        )}
                                    </label>
                                    {samples.length > 1 && (
                                        <button
                                            onClick={() => removeSample(index)}
                                            className="text-gray-600 hover:text-red-400 text-sm"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={sample}
                                    onChange={(e) => updateSample(index, e.target.value)}
                                    placeholder="Paste a post, article intro, or any content that represents your voice..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Add More */}
                    {samples.length < 10 && (
                        <button
                            onClick={addSample}
                            className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-colors"
                        >
                            + Add another sample
                        </button>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 py-2">
                        <span>{filledSamples} of {samples.length} samples filled</span>
                        <span>{totalChars.toLocaleString()} total characters</span>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4 text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        {onSkip && (
                            <button
                                onClick={onSkip}
                                className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                Skip for now
                            </button>
                        )}
                        <button
                            onClick={analyzeSamples}
                            disabled={isAnalyzing || filledSamples < 2}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                                isAnalyzing || filledSamples < 2
                                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700'
                            }`}
                        >
                            {isAnalyzing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing your voice...
                                </span>
                            ) : (
                                'Analyze Voice Profile'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && profile && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border border-violet-700/30 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-3">Voice Summary</h3>
                        <p className="text-gray-300 leading-relaxed">{profile.summary}</p>
                    </div>

                    {/* Personality Traits */}
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                        <h3 className="text-white font-semibold mb-4">Personality Traits</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.personality.map((trait, i) => (
                                <span
                                    key={i}
                                    className="px-4 py-2 bg-violet-600/20 text-violet-300 rounded-full border border-violet-500/30"
                                >
                                    {trait}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Writing Style */}
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                        <h3 className="text-white font-semibold mb-4">Writing Style</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-gray-500 text-xs uppercase mb-1">Sentences</div>
                                <div className="text-white font-medium capitalize">{profile.writingStyle.sentenceLength}</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-gray-500 text-xs uppercase mb-1">Formality</div>
                                <div className="text-white font-medium capitalize">{profile.writingStyle.formality}</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-gray-500 text-xs uppercase mb-1">Emojis</div>
                                <div className="text-white font-medium">{profile.writingStyle.useOfEmoji ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-gray-500 text-xs uppercase mb-1">Perspective</div>
                                <div className="text-white font-medium capitalize">{profile.writingStyle.perspective.replace('_', ' ')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Do's and Don'ts */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-900/20 rounded-xl p-6 border border-green-700/30">
                            <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                                <span>✓</span> Do's
                            </h3>
                            <ul className="space-y-2">
                                {profile.doList.map((item, i) => (
                                    <li key={i} className="text-green-300/80 flex items-start gap-2">
                                        <span className="text-green-500 mt-1">•</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-red-900/20 rounded-xl p-6 border border-red-700/30">
                            <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
                                <span>✕</span> Don'ts
                            </h3>
                            <ul className="space-y-2">
                                {profile.dontList.map((item, i) => (
                                    <li key={i} className="text-red-300/80 flex items-start gap-2">
                                        <span className="text-red-500 mt-1">•</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Key Phrases */}
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                        <h3 className="text-white font-semibold mb-4">Signature Phrases</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.keyPhrases.map((phrase, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-lg border border-blue-700/30 text-sm"
                                >
                                    "{phrase}"
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setActiveTab('input')}
                            className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            ← Edit Samples
                        </button>
                        {!selectedSavedId && (
                            <button
                                onClick={() => setShowSaveModal(true)}
                                className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                Save Profile
                            </button>
                        )}
                        <button
                            onClick={() => onSave(profile)}
                            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
                        >
                            Use This Profile ✓
                        </button>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
                        <h3 className="text-xl font-bold text-white mb-4">Save Voice Profile</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Profile Name</label>
                                <input
                                    type="text"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    placeholder="e.g., Professional LinkedIn Voice"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                                    autoFocus
                                />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={saveAsDefault}
                                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                                    className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-violet-600 focus:ring-violet-500"
                                />
                                <span className="text-gray-300">Set as default profile for this workspace</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowSaveModal(false)
                                    setSaveName('')
                                    setSaveAsDefault(false)
                                }}
                                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={!saveName.trim() || isSaving}
                                className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
