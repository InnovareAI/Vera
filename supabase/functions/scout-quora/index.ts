/**
 * VERA Scout Quora - Q&A Content Opportunity Monitoring
 * 
 * Monitors Quora for questions that represent content opportunities.
 * Uses RSS feeds (free, no API key needed).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const GOOGLE_CHAT_WEBHOOK_URL = Deno.env.get('GOOGLE_CHAT_WEBHOOK_URL') || ''

const DAILY_CAP = 40

// Quora topics to monitor (these have RSS feeds)
const QUORA_TOPICS = [
    'Sales-Automation',
    'B2B-Marketing',
    'Cold-Emailing',
    'Lead-Generation',
    'SaaS',
    'Startup-Marketing',
    'Email-Marketing-1',
    'LinkedIn-Marketing',
]

interface QuoraQuestion {
    title: string
    url: string
    topic: string
    publishedAt?: string
}

/**
 * Fetch Quora topic RSS
 */
async function fetchQuoraTopic(topic: string): Promise<QuoraQuestion[]> {
    try {
        // Quora provides RSS feeds for topics
        const rssUrl = `https://www.quora.com/topic/${topic}/rss`

        const response = await fetch(rssUrl, {
            headers: {
                'User-Agent': 'VERA-Scout/1.0 (Content Research)',
            }
        })

        if (!response.ok) {
            console.log(`⚠️ Quora topic ${topic} returned ${response.status}`)
            return []
        }

        const xml = await response.text()
        const questions: QuoraQuestion[] = []

        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

        for (const match of itemMatches) {
            const itemXml = match[1]
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
            const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''

            if (title && link) {
                questions.push({
                    title,
                    url: link,
                    topic,
                    publishedAt: pubDate,
                })
            }

            if (questions.length >= 10) break
        }

        console.log(`✅ Found ${questions.length} questions for topic: ${topic}`)
        return questions
    } catch (error) {
        console.error(`Quora RSS error for ${topic}:`, error)
        return []
    }
}

/**
 * Score question as content opportunity
 */
function scoreQuestion(question: QuoraQuestion): number {
    let score = 40 // Base score
    const title = question.title.toLowerCase()

    // Question patterns (high value)
    if (/^(how|what|why|when|where|which|can|should|is|are|do|does)/i.test(question.title)) {
        score += 20
    }

    // Specific topics
    if (/automat|ai|tool|software|platform/i.test(title)) score += 15
    if (/best|top|recommend/i.test(title)) score += 15
    if (/vs|versus|compare|alternative/i.test(title)) score += 20
    if (/startup|b2b|saas|enterprise/i.test(title)) score += 10

    // Problem indicators
    if (/struggling|problem|issue|help|advice/i.test(title)) score += 15

    return Math.min(100, score)
}

/**
 * Send Google Chat alert
 */
async function sendAlert(questions: { question: QuoraQuestion; score: number }[]): Promise<boolean> {
    if (!GOOGLE_CHAT_WEBHOOK_URL || questions.length === 0) return false

    const sections = questions.slice(0, 5).map(q => ({
        header: `❓ ${q.question.topic.replace(/-/g, ' ')}`,
        widgets: [
            {
                decoratedText: {
                    topLabel: 'Question',
                    text: q.question.title,
                    wrapText: true,
                }
            },
            {
                decoratedText: {
                    topLabel: 'Content Score',
                    text: `${q.score}/100`,
                }
            },
            {
                buttonList: {
                    buttons: [{
                        text: 'View on Quora',
                        onClick: { openLink: { url: q.question.url } }
                    }]
                }
            }
        ]
    }))

    const message = {
        cardsV2: [{
            cardId: 'vera-quora-scout',
            card: {
                header: {
                    title: '❓ VERA Quora Scout',
                    subtitle: `${questions.length} content opportunities found`,
                },
                sections,
            }
        }]
    }

    try {
        const response = await fetch(GOOGLE_CHAT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        })
        return response.ok
    } catch (error) {
        console.error('Alert error:', error)
        return false
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('❓ Starting Quora Scout...')

    const stats = {
        topicsSearched: 0,
        questionsFound: 0,
        newQuestions: 0,
        alertsSent: 0,
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const today = new Date().toISOString().split('T')[0]

        // Check daily cap
        const { count } = await supabase
            .from('seen_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'quora')
            .gte('created_at', `${today}T00:00:00Z`)

        if ((count || 0) >= DAILY_CAP) {
            return new Response(
                JSON.stringify({ success: true, message: 'Daily cap reached', stats }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const allQuestions: { question: QuoraQuestion; score: number }[] = []

        for (const topic of QUORA_TOPICS) {
            stats.topicsSearched++

            const questions = await fetchQuoraTopic(topic)
            stats.questionsFound += questions.length

            for (const question of questions) {
                const questionId = `quora-${btoa(question.url).substring(0, 50)}`

                // Check if seen
                const { data: existing } = await supabase
                    .from('seen_posts')
                    .select('id')
                    .eq('platform', 'quora')
                    .eq('post_id', questionId)
                    .single()

                if (existing) continue

                // Mark as seen
                await supabase.from('seen_posts').insert({
                    platform: 'quora',
                    post_id: questionId,
                    url: question.url,
                })

                stats.newQuestions++

                const score = scoreQuestion(question)

                // Save to topics
                await supabase.from('topics').insert({
                    title: question.title,
                    source: 'quora',
                    source_url: question.url,
                    relevance_score: score / 100,
                    content: JSON.stringify({
                        topic: question.topic,
                        publishedAt: question.publishedAt,
                    }),
                })

                if (score >= 60) {
                    allQuestions.push({ question, score })
                }
            }

            await new Promise(r => setTimeout(r, 500))
        }

        // Send alerts
        if (allQuestions.length > 0) {
            const top = allQuestions.sort((a, b) => b.score - a.score).slice(0, 5)
            const sent = await sendAlert(top)
            if (sent) stats.alertsSent = top.length
        }

        console.log('❓ Quora Scout complete:', stats)

        return new Response(
            JSON.stringify({ success: true, stats, timestamp: new Date().toISOString() }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('❌ Scout error:', error)
        return new Response(
            JSON.stringify({ error: 'Scout failed', details: error instanceof Error ? error.message : 'Unknown' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
