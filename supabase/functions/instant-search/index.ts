/**
 * VERA Instant Search - On-demand multi-source topic search
 * 
 * Searches across LinkedIn, Google News, DEV.to, and HN
 * for any keyword in real-time. Returns aggregated results.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const UNIPILE_DSN = Deno.env.get('UNIPILE_DSN') || 'api6.unipile.com:13670'
const UNIPILE_API_KEY = Deno.env.get('UNIPILE_API_KEY') || ''
const UNIPILE_ACCOUNT_ID = Deno.env.get('UNIPILE_ACCOUNT_ID') || ''

interface SearchResult {
    source: string
    title: string
    content: string
    url: string
    author?: string
    engagement?: {
        likes?: number
        comments?: number
        score?: number
    }
    publishedAt?: string
    relevanceScore: number
}

interface SearchRequest {
    query: string
    sources?: string[]
    limit?: number
}

/**
 * Search LinkedIn via Unipile
 */
async function searchLinkedIn(query: string, limit: number): Promise<SearchResult[]> {
    if (!UNIPILE_API_KEY || !UNIPILE_ACCOUNT_ID) return []

    try {
        const response = await fetch(
            `https://${UNIPILE_DSN}/api/v1/linkedin/search?account_id=${UNIPILE_ACCOUNT_ID}`,
            {
                method: 'POST',
                headers: {
                    'X-API-KEY': UNIPILE_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api: 'classic',
                    category: 'posts',
                    keywords: query,
                    date_posted: 'past_week',
                    sort_by: 'date',
                }),
            }
        )

        if (!response.ok) return []

        const data = await response.json()
        return (data.items || []).slice(0, limit).map((post: any) => ({
            source: 'linkedin',
            title: `${post.author?.name || 'Unknown'}: ${(post.text || '').substring(0, 100)}...`,
            content: post.text || '',
            url: post.share_url || '',
            author: post.author?.name,
            engagement: {
                likes: post.reaction_counter || 0,
                comments: post.comment_counter || 0,
            },
            publishedAt: post.parsed_datetime,
            relevanceScore: 0.8,
        }))
    } catch (error) {
        console.error('LinkedIn search error:', error)
        return []
    }
}

/**
 * Search Google News RSS
 */
async function searchGoogleNews(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const encodedQuery = encodeURIComponent(query)
        const response = await fetch(
            `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`
        )

        if (!response.ok) return []

        const xml = await response.text()
        const results: SearchResult[] = []

        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
        for (const match of itemMatches) {
            const itemXml = match[1]
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
            const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
            const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''

            if (title && link) {
                results.push({
                    source: 'google-news',
                    title,
                    content: '',
                    url: link,
                    author: source,
                    publishedAt: pubDate,
                    relevanceScore: 0.7,
                })
            }

            if (results.length >= limit) break
        }

        return results
    } catch (error) {
        console.error('Google News search error:', error)
        return []
    }
}

/**
 * Search DEV.to
 */
async function searchDevTo(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const response = await fetch(
            `https://dev.to/api/articles?per_page=${limit}&tag=${encodeURIComponent(query.toLowerCase().replace(/\s+/g, ''))}`
        )

        if (!response.ok) return []

        const articles = await response.json()
        return articles.slice(0, limit).map((article: any) => ({
            source: 'devto',
            title: article.title,
            content: article.description || '',
            url: article.url,
            author: article.user?.name,
            engagement: {
                likes: article.positive_reactions_count || 0,
                comments: article.comments_count || 0,
            },
            publishedAt: article.published_at,
            relevanceScore: 0.6,
        }))
    } catch (error) {
        console.error('DEV.to search error:', error)
        return []
    }
}

/**
 * Search Hacker News via Algolia
 */
async function searchHackerNews(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const response = await fetch(
            `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`
        )

        if (!response.ok) return []

        const data = await response.json()
        return (data.hits || []).map((hit: any) => ({
            source: 'hackernews',
            title: hit.title || '',
            content: hit.story_text || '',
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            author: hit.author,
            engagement: {
                score: hit.points || 0,
                comments: hit.num_comments || 0,
            },
            publishedAt: hit.created_at,
            relevanceScore: 0.75,
        }))
    } catch (error) {
        console.error('HN search error:', error)
        return []
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body: SearchRequest = await req.json()
        const { query, sources = ['linkedin', 'google-news', 'devto', 'hackernews'], limit = 5 } = body

        if (!query || query.trim().length < 2) {
            return new Response(
                JSON.stringify({ error: 'Query must be at least 2 characters' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`🔍 Instant search: "${query}" across ${sources.join(', ')}`)

        const searchPromises: Promise<SearchResult[]>[] = []

        if (sources.includes('linkedin')) {
            searchPromises.push(searchLinkedIn(query, limit))
        }
        if (sources.includes('google-news')) {
            searchPromises.push(searchGoogleNews(query, limit))
        }
        if (sources.includes('devto')) {
            searchPromises.push(searchDevTo(query, limit))
        }
        if (sources.includes('hackernews')) {
            searchPromises.push(searchHackerNews(query, limit))
        }

        const results = await Promise.all(searchPromises)
        const allResults = results.flat()

        // Sort by relevance
        allResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

        // Group by source
        const grouped: Record<string, SearchResult[]> = {}
        for (const result of allResults) {
            if (!grouped[result.source]) grouped[result.source] = []
            grouped[result.source].push(result)
        }

        return new Response(
            JSON.stringify({
                query,
                totalResults: allResults.length,
                results: allResults,
                bySource: grouped,
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('❌ Search error:', error)
        return new Response(
            JSON.stringify({ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
