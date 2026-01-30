'use client'

import { useState } from 'react'
import { PromptManager } from '@/components/content-engine/PromptManager'
import { ContentQueue } from '@/components/content-engine/ContentQueue'
import { AIOBlogGenerator } from '@/components/content-engine/AIOBlogGenerator'

type Tab = 'queue' | 'prompts' | 'tone' | 'aio'

export default function ContentEnginePage() {
    const [activeTab, setActiveTab] = useState<Tab>('aio')

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <a href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                            VERA
                        </a>
                        <span className="text-gray-600">|</span>
                        <h1 className="text-white font-medium">Content Engine</h1>
                    </div>

                    {/* Tabs */}
                    <nav className="flex items-center gap-1 bg-gray-900 rounded-xl p-1">
                        <button
                            onClick={() => setActiveTab('aio')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'aio'
                                ? 'bg-violet-500 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            🚀 AIO Blog Machine
                        </button>
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'queue'
                                ? 'bg-violet-500 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            📝 Content Queue
                        </button>
                        <button
                            onClick={() => setActiveTab('prompts')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'prompts'
                                ? 'bg-violet-500 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            📋 Prompts
                        </button>
                        <button
                            onClick={() => setActiveTab('tone')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tone'
                                ? 'bg-violet-500 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            🎤 Tone of Voice
                        </button>
                    </nav>

                    <div className="flex items-center gap-3">
                        <a
                            href="/campaigns"
                            className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                        >
                            Campaign Generator →
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {activeTab === 'aio' && <AIOBlogGenerator />}
                {activeTab === 'queue' && <ContentQueue />}
                {activeTab === 'prompts' && <PromptManager />}
                {activeTab === 'tone' && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <p className="text-4xl mb-4">🎤</p>
                            <p className="text-xl mb-2">Tone of Voice Manager</p>
                            <p>Coming soon - analyze your writing to create a voice profile</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
