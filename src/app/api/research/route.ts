import { NextRequest, NextResponse } from 'next/server';

// B2B Keywords for scoring relevance
const KEYWORDS = {
    high_intent: [
        'ai sdr', 'ai bdr', 'ai sales agent', 'ai outbound', 'automated prospecting',
        'apollo alternative', 'instantly alternative', 'lemlist alternative',
        'smartlead alternative', 'clay alternative'
    ],
    problem_aware: [
        'outbound without sdr', 'cant afford sdr', 'sdr too expensive',
        'solo founder sales', 'founder-led sales', 'cold outreach automation',
        'outbound at scale', 'scaling outbound'
    ],
    pain_points: [
        'sdr turnover', 'sdr ramp time', 'cac too high',
        'outbound not working', 'cold email not working', 'cold email dead'
    ]
};

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

function calculateRelevance(text: string): { score: number; category: string; matched: string[] } {
    const lowerText = text.toLowerCase();
    const matched: string[] = [];

    // Check high intent first (highest value)
    for (const kw of KEYWORDS.high_intent) {
        if (lowerText.includes(kw)) matched.push(kw);
    }
    if (matched.length > 0) {
        return { score: 0.9 + (matched.length * 0.02), category: 'high_intent', matched };
    }

    // Check problem aware
    for (const kw of KEYWORDS.problem_aware) {
        if (lowerText.includes(kw)) matched.push(kw);
    }
    if (matched.length > 0) {
        return { score: 0.7 + (matched.length * 0.05), category: 'problem_aware', matched };
    }

    // Check pain points
    for (const kw of KEYWORDS.pain_points) {
        if (lowerText.includes(kw)) matched.push(kw);
    }
    if (matched.length > 0) {
        return { score: 0.5 + (matched.length * 0.05), category: 'pain_point', matched };
    }

    return { score: 0.3, category: 'general', matched: [] };
}

async function fetchReddit(subreddits: string[], query?: string): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];

    for (const sub of subreddits) {
        try {
            const url = query
                ? `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=10`
                : `https://www.reddit.com/r/${sub}/hot.json?limit=15`;

            const res = await fetch(url, {
                headers: { 'User-Agent': 'VeraAI-Research-Agent/1.0' }
            });

            if (!res.ok) continue;

            const data = await res.json();
            const posts = data?.data?.children || [];

            for (const post of posts) {
                const p = post.data;
                const fullText = `${p.title} ${p.selftext || ''}`;
                const { score, category, matched } = calculateRelevance(fullText);

                results.push({
                    id: `reddit_${p.id}`,
                    source: 'reddit',
                    title: p.title,
                    content: p.selftext?.slice(0, 500) || '',
                    url: `https://reddit.com${p.permalink}`,
                    author: p.author,
                    timestamp: new Date(p.created_utc * 1000).toISOString(),
                    score,
                    category: category as ResearchResult['category'],
                    matchedKeywords: matched
                });
            }
        } catch (e) {
            console.error(`Reddit fetch error for r/${sub}:`, e);
        }
    }

    return results;
}

async function fetchHackerNews(query?: string): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];

    try {
        const searchQuery = query || 'sales automation AI outbound';
        const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(searchQuery)}&tags=story&hitsPerPage=15`;

        const res = await fetch(url);
        if (!res.ok) return results;

        const data = await res.json();

        for (const hit of data.hits || []) {
            const fullText = `${hit.title} ${hit.story_text || ''}`;
            const { score, category, matched } = calculateRelevance(fullText);

            results.push({
                id: `hn_${hit.objectID}`,
                source: 'hackernews',
                title: hit.title,
                content: hit.story_text?.slice(0, 500) || '',
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                author: hit.author,
                timestamp: hit.created_at,
                score,
                category: category as ResearchResult['category'],
                matchedKeywords: matched
            });
        }
    } catch (e) {
        console.error('HN fetch error:', e);
    }

    return results;
}

async function fetchGoogleNews(query: string): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];

    try {
        // Using Google News RSS feed
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

        const res = await fetch(rssUrl);
        if (!res.ok) return results;

        const xml = await res.text();

        // Simple XML parsing for RSS items
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;
        const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
        const sourceRegex = /<source.*?>(.*?)<\/source>/;

        let match;
        let count = 0;

        while ((match = itemRegex.exec(xml)) !== null && count < 10) {
            const item = match[1];
            const titleMatch = item.match(titleRegex);
            const linkMatch = item.match(linkRegex);
            const dateMatch = item.match(pubDateRegex);
            const sourceMatch = item.match(sourceRegex);

            const title = titleMatch?.[1] || titleMatch?.[2] || '';
            const { score, category, matched } = calculateRelevance(title);

            results.push({
                id: `gnews_${count}_${Date.now()}`,
                source: 'googlenews',
                title,
                content: '',
                url: linkMatch?.[1] || '',
                author: sourceMatch?.[1] || 'Google News',
                timestamp: dateMatch?.[1] ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                score,
                category: category as ResearchResult['category'],
                matchedKeywords: matched
            });

            count++;
        }
    } catch (e) {
        console.error('Google News fetch error:', e);
    }

    return results;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const sources = searchParams.get('sources')?.split(',') || ['reddit', 'hackernews', 'googlenews'];

    const subreddits = ['startups', 'SaaS', 'sales', 'Entrepreneur', 'smallbusiness'];

    const allResults: ResearchResult[] = [];

    // Fetch from all sources in parallel
    const promises: Promise<ResearchResult[]>[] = [];

    if (sources.includes('reddit')) {
        promises.push(fetchReddit(subreddits, query || undefined));
    }
    if (sources.includes('hackernews')) {
        promises.push(fetchHackerNews(query || undefined));
    }
    if (sources.includes('googlenews')) {
        promises.push(fetchGoogleNews(query || 'B2B sales AI SDR outbound'));
    }

    const results = await Promise.all(promises);
    results.forEach(r => allResults.push(...r));

    // Sort by relevance score
    allResults.sort((a, b) => b.score - a.score);

    return NextResponse.json({
        success: true,
        count: allResults.length,
        results: allResults.slice(0, 30) // Top 30 results
    });
}
