'use client';

import { useState } from 'react';

interface ResearchResult {
    id: string;
    source: 'reddit' | 'hackernews' | 'googlenews';
    title: string;
    content: string;
    url: string;
    author: string;
    timestamp: string;
    score: number;
    category: 'high_intent' | 'problem_aware' | 'pain_point' | 'general';
    matchedKeywords: string[];
}

interface GeneratedContent {
    platform: string;
    content: string;
    topic: {
        title: string;
        source: string;
        url: string;
    };
}

export default function ResearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ResearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [selectedSources, setSelectedSources] = useState({
        reddit: true,
        hackernews: true,
        googlenews: true
    });

    const fetchResearch = async () => {
        setLoading(true);
        try {
            const sources = Object.entries(selectedSources)
                .filter(([_, v]) => v)
                .map(([k]) => k)
                .join(',');

            const res = await fetch(`/api/research?q=${encodeURIComponent(query)}&sources=${sources}`);
            const data = await res.json();
            setResults(data.results || []);
        } catch (e) {
            console.error('Research fetch error:', e);
        }
        setLoading(false);
    };

    const generateContent = async (result: ResearchResult, platform: string) => {
        setGenerating(`${result.id}_${platform}`);
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: {
                        title: result.title,
                        content: result.content,
                        source: result.source,
                        url: result.url
                    },
                    platform
                })
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedContent(data);
            }
        } catch (e) {
            console.error('Generation error:', e);
        }
        setGenerating(null);
    };

    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'reddit': return '🔴';
            case 'hackernews': return '🟠';
            case 'googlenews': return '📰';
            default: return '📌';
        }
    };

    const getCategoryBadge = (category: string) => {
        const styles: Record<string, string> = {
            high_intent: 'bg-green-500/20 text-green-400 border-green-500/30',
            problem_aware: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            pain_point: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            general: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
        return styles[category] || styles.general;
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-lg">
                                V
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold">VERA Research</h1>
                                <p className="text-sm text-white/50">B2B Content Intelligence</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search Section */}
                <div className="mb-8">
                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchResearch()}
                            placeholder="Search topics (e.g., AI SDR, outbound, sales automation)..."
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                        <button
                            onClick={fetchResearch}
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-medium transition-all disabled:opacity-50"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    {/* Source Toggles */}
                    <div className="flex gap-4">
                        {Object.entries(selectedSources).map(([source, enabled]) => (
                            <label key={source} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={() => setSelectedSources(prev => ({ ...prev, [source]: !prev[source as keyof typeof prev] }))}
                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/20"
                                />
                                <span className="text-sm text-white/70">
                                    {getSourceIcon(source)} {source === 'hackernews' ? 'Hacker News' : source === 'googlenews' ? 'Google News' : 'Reddit'}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Research Feed */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Research Feed
                            {results.length > 0 && <span className="text-white/50 font-normal">({results.length})</span>}
                        </h2>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            {results.length === 0 && !loading && (
                                <div className="text-center py-12 text-white/40">
                                    <p>Search for B2B topics to discover content opportunities</p>
                                </div>
                            )}

                            {loading && (
                                <div className="text-center py-12">
                                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-white/50">Scanning sources...</p>
                                </div>
                            )}

                            {results.map((result) => (
                                <div
                                    key={result.id}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex items-center gap-2 text-sm text-white/50">
                                            <span>{getSourceIcon(result.source)}</span>
                                            <span>{result.source}</span>
                                            <span>•</span>
                                            <span>{result.author}</span>
                                            <span>•</span>
                                            <span>{formatTime(result.timestamp)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-xs rounded-full border ${getCategoryBadge(result.category)}`}>
                                                {result.category.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-white/40">{(result.score * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>

                                    <h3 className="font-medium mb-2 line-clamp-2">{result.title}</h3>

                                    {result.content && (
                                        <p className="text-sm text-white/60 mb-3 line-clamp-2">{result.content}</p>
                                    )}

                                    {result.matchedKeywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {result.matchedKeywords.map((kw, i) => (
                                                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-300">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-2 flex-wrap">
                                        {['linkedin', 'twitter', 'reddit', 'medium'].map((platform) => (
                                            <button
                                                key={platform}
                                                onClick={() => generateContent(result, platform)}
                                                disabled={generating === `${result.id}_${platform}`}
                                                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                                            >
                                                {generating === `${result.id}_${platform}` ? '...' : `→ ${platform}`}
                                            </button>
                                        ))}
                                        <a
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                                        >
                                            Open ↗
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Generated Content */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
                            Generated Content
                        </h2>

                        {!generatedContent ? (
                            <div className="p-8 rounded-xl bg-white/5 border border-white/10 border-dashed text-center">
                                <p className="text-white/40">Select a topic and platform to generate content</p>
                            </div>
                        ) : (
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-medium">
                                            {generatedContent.platform}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(generatedContent.content)}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                                    >
                                        Copy
                                    </button>
                                </div>

                                <div className="mb-4 text-xs text-white/40">
                                    Based on: {generatedContent.topic.title.slice(0, 60)}...
                                </div>

                                <div className="p-4 rounded-lg bg-black/30 whitespace-pre-wrap text-sm leading-relaxed max-h-[50vh] overflow-y-auto">
                                    {generatedContent.content}
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-medium text-sm transition-all">
                                        Save to Drafts
                                    </button>
                                    <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-all">
                                        Regenerate
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
