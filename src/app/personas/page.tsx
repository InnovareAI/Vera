'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase/client'
import { Persona } from '@/types/database'

export default function PersonasPage() {
    const { user } = useAuth()
    const { currentWorkspace } = useWorkspace()
    const [personas, setPersonas] = useState<Persona[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = getSupabase()

    useEffect(() => {
        if (currentWorkspace?.id) {
            fetchPersonas()
        }
    }, [currentWorkspace?.id])

    async function fetchPersonas() {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('personas')
                .select('*')
                .eq('workspace_id', currentWorkspace?.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setPersonas(data || [])
        } catch (error) {
            console.error('Error fetching personas:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const personaTypes = [
        { id: 'brand', label: 'Brand Personas', icon: '🎨', color: 'from-violet-500/20 to-fuchsia-500/20', border: 'border-violet-500/30' },
        { id: 'audience', label: 'Audience Personas', icon: '👥', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
        { id: 'product', label: 'Product Personas', icon: '📦', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' },
    ]

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                                ← Dashboard
                            </Link>
                            <h1 className="text-xl font-bold text-white">🎭 Personas</h1>
                        </div>
                        <Link
                            href="/personas/new"
                            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            + Create Persona
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">My Personas</h2>
                    <p className="text-gray-400">Define your brand identity, target audience segments, and product value propositions.</p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-gray-900/50 border border-gray-800 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {personaTypes.map(type => {
                            const filteredPersonas = personas.filter(p => p.type === type.id)
                            return (
                                <section key={type.id}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="text-2xl">{type.icon}</span>
                                        <h3 className="text-xl font-semibold text-white">{type.label}</h3>
                                        <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                                            {filteredPersonas.length}
                                        </span>
                                    </div>

                                    {filteredPersonas.length === 0 ? (
                                        <div className={`bg-gradient-to-br ${type.color} border ${type.border} border-dashed rounded-2xl p-12 text-center`}>
                                            <p className="text-gray-400 mb-4">No {type.label.toLowerCase()} created yet.</p>
                                            <Link
                                                href={`/personas/new?type=${type.id}`}
                                                className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                                            >
                                                + Build your first {type.id} persona
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {filteredPersonas.map(persona => (
                                                <Link
                                                    key={persona.id}
                                                    href={`/personas/${persona.id}`}
                                                    className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-violet-500/50 transition-all group"
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                                                            {persona.name}
                                                        </h4>
                                                        {!persona.is_active && (
                                                            <span className="bg-gray-800 text-gray-500 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                                                        {persona.description || 'No description provided.'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.keys(persona.attributes || {}).slice(0, 3).map(attr => (
                                                            <span key={attr} className="bg-gray-800/50 text-gray-500 text-[10px] px-2 py-0.5 rounded border border-gray-800">
                                                                {attr}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
