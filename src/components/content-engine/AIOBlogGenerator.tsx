'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'

interface Brand {
    id: string
    name: string
}

export function AIOBlogGenerator() {
    const supabase = getSupabase()
    const [brands, setBrands] = useState<Brand[]>([])
    const [selectedBrand, setSelectedBrand] = useState('')
    const [queries, setQueries] = useState('')
    const [idealAnswer, setIdealAnswer] = useState('')
    const [tldr, setTldr] = useState('')

    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResult, setGeneratedResult] = useState<{
        article: string
        schema: string
        meta: string
        images: string[]
    } | null>(null)
    const [progress, setProgress] = useState('')

    useEffect(() => {
        const fetchBrands = async () => {
            const { data } = await supabase.from('personas').select('id, name').eq('type', 'brand')
            setBrands(data || [])
            if (data?.length) setSelectedBrand(data[0].id)
        }
        fetchBrands()
    }, [supabase])

    const handleGenerate = async () => {
        if (!selectedBrand || !queries) return alert('Please select a brand and enter research queries')

        setIsGenerating(true)
        setGeneratedResult(null)
        setProgress('Connecting to AIO Engine...')

        try {
            const response = await fetch('/api/aio/generate', {
                method: 'POST',
                body: JSON.stringify({
                    queries,
                    idealAnswer,
                    tldr,
                    brandId: selectedBrand
                })
            })

            if (!response.body) throw new Error('No response body')

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6))

                        if (data.status === 'generating_text' || data.status === 'generating_images') {
                            setProgress(data.message)
                        } else if (data.status === 'text_complete') {
                            setGeneratedResult(prev => ({
                                ...(prev || { article: '', schema: '', meta: '', images: [] }),
                                ...data.content
                            }))
                        } else if (data.status === 'images_complete') {
                            setGeneratedResult(prev => ({
                                ...(prev || { article: '', schema: '', meta: '', images: [] }),
                                images: data.images
                            }))
                        } else if (data.status === 'complete') {
                            setProgress('Generation Complete!')
                            setIsGenerating(false)
                        } else if (data.status === 'error') {
                            throw new Error(data.message)
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error(err)
            alert('AIO Generation Failed: ' + err.message)
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex h-full bg-gray-950 overflow-hidden">
            {/* Sidebar Controls */}
            <div className="w-80 border-r border-gray-800 p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🚀</span>
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">AIO Setup</h2>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Target Brand</label>
                        <select
                            value={selectedBrand}
                            onChange={e => setSelectedBrand(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:ring-2 focus:ring-violet-500/50"
                        >
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase italic text-violet-400">Research Queries</label>
                        <textarea
                            value={queries}
                            onChange={e => setQueries(e.target.value)}
                            placeholder="What are people/AI searching for?"
                            className="w-full h-24 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-violet-500/50 resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase italic text-fuchsia-400">Ideal Answer</label>
                        <textarea
                            value={idealAnswer}
                            onChange={e => setIdealAnswer(e.target.value)}
                            placeholder="The precise answer you want AI to give..."
                            className="w-full h-24 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-fuchsia-500/50 resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase italic text-cyan-400">Snappy TL;DR</label>
                        <textarea
                            value={tldr}
                            onChange={e => setTldr(e.target.value)}
                            placeholder="For the zero-click summary..."
                            className="w-full h-20 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-cyan-500/50 resize-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                        </>
                    ) : (
                        '✨ Run AIO Engine'
                    )}
                </button>

                {isGenerating && (
                    <p className="text-center text-xs text-violet-400 animate-pulse">{progress}</p>
                )}
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-y-auto p-12 bg-gray-900/30">
                {!generatedResult && !isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 max-w-lg mx-auto text-center">
                        <div className="text-6xl mb-6">🤖</div>
                        <h3 className="text-2xl font-bold text-white mb-2">AIO Blog Machine</h3>
                        <p className="text-sm">
                            Generate "Bottom of the Funnel" blog posts specifically engineered to rank in AI search engines (Perplexity, SearchGPT, Claude).
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-8 w-full text-left">
                            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                                <h4 className="text-white text-xs font-bold mb-1 uppercase">✓ Direct Answers</h4>
                                <p className="text-[10px]">Answers the user query in the first paragraph.</p>
                            </div>
                            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                                <h4 className="text-white text-xs font-bold mb-1 uppercase">✓ JSON Schema</h4>
                                <p className="text-[10px]">Includes valid FAQ schema for rich results.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-12 pb-20">
                        {/* Header Section */}
                        <div className="space-y-4">
                            <span className="px-3 py-1 bg-violet-500/10 text-violet-400 text-xs font-bold uppercase tracking-widest rounded-full border border-violet-500/20">
                                AIO Optimized Preview
                            </span>
                            <div className="prose prose-invert max-w-none">
                                <h1 className="text-4xl font-extrabold text-white leading-tight">
                                    Generated Content
                                </h1>
                            </div>
                        </div>

                        {/* Images Grid */}
                        {generatedResult?.images?.length ? (
                            <div className="grid grid-cols-2 gap-4">
                                {generatedResult.images.map((img, i) => (
                                    <div key={i} className="aspect-video relative rounded-2xl overflow-hidden border border-gray-800 group">
                                        <img src={img} alt={`AIO Shot ${i}`} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" title="AIO Styled Image" />
                                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white">Shot {i + 1}/4</div>
                                    </div>
                                ))}
                            </div>
                        ) : isGenerating ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-video bg-gray-800/50 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : null}

                        {/* Article Content */}
                        {generatedResult?.article && (
                            <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 shadow-2xl">
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-300">
                                    {generatedResult.article}
                                </div>
                            </div>
                        )}

                        {/* Technical Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Meta Description</h4>
                                <div className="p-4 bg-gray-800/30 border border-gray-800 rounded-2xl text-sm italic text-gray-400">
                                    "{generatedResult?.meta}"
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">FAQ JSON Schema</h4>
                                <pre className="p-4 bg-black border border-gray-800 rounded-2xl text-[10px] overflow-auto max-h-40 text-cyan-400 font-mono">
                                    {generatedResult?.schema}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
