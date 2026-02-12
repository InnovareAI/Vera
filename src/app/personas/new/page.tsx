'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { PersonaBuilder } from '@/components/personas/PersonaBuilder'

function PersonaForm() {
    const searchParams = useSearchParams()
    const typeFromQuery = searchParams.get('type') as 'brand' | 'audience' | 'product' | null
    return <PersonaBuilder type={typeFromQuery || 'brand'} />
}

export default function NewPersonaPage() {
    return (
        <div className="min-h-screen bg-neutral-950">
            {/* Header */}
            <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 h-16">
                        <Link href="/personas" className="text-neutral-400 hover:text-neutral-100 transition-colors">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-bold text-neutral-100">Create New Persona</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-bold text-neutral-100 mb-4">Build Your Strategy</h2>
                    <p className="text-neutral-400 max-w-2xl mx-auto">
                        High-performing content starts with a deep understanding of your brand, your audience, and your product.
                        Define these personas once, and Vera.AI will use them to generate perfectly tailored content.
                    </p>
                </div>

                <Suspense fallback={<div className="text-neutral-100 text-center">Loading builder...</div>}>
                    <PersonaForm />
                </Suspense>
            </main>
        </div>
    )
}
