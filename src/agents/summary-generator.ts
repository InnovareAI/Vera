import { EvaluatedPost, ResearchOutput, ResearchInsight } from '@/types/research'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

async function callOpenRouter(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vera.innovare.ai',
      'X-Title': 'VERA Summary Generator'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function generateResearchSummary(
  posts: EvaluatedPost[],
  topics: string[],
  subreddits: string[]
): Promise<ResearchOutput> {
  const topPosts = posts.filter(p => p.relevanceScore >= 0.6).slice(0, 10)

  const postsContext = topPosts.map((p, i) => `
[${i + 1}] "${p.title}"
- Subreddit: r/${p.subreddit}
- Score: ${p.score} | Comments: ${p.numComments}
- Relevance: ${(p.relevanceScore * 100).toFixed(0)}%
- Content: ${p.selftext.slice(0, 500)}
- URL: https://reddit.com${p.permalink}
`).join('\n')

  const prompt = `You are a research analyst synthesizing Reddit discussions into actionable insights.

RESEARCH TOPICS: ${topics.join(', ')}
SUBREDDITS ANALYZED: ${subreddits.map(s => `r/${s}`).join(', ')}

TOP RELEVANT POSTS:
${postsContext}

Generate a research summary with:

1. EXECUTIVE SUMMARY (2-3 sentences overview)
2. KEY TRENDS (3-5 emerging themes/patterns you observe)
3. For each trend, cite the specific posts that support it using [1], [2], etc.

Respond in JSON format:
{
  "summary": "Executive summary here...",
  "trends": ["trend 1", "trend 2", "trend 3"]
}

Be specific and cite sources. Every claim should reference at least one post.`

  try {
    const content = await callOpenRouter(prompt)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response')
    }

    const result = JSON.parse(jsonMatch[0])

    const insights: ResearchInsight[] = topPosts.map(p => ({
      title: p.title,
      summary: p.relevanceReason,
      url: `https://reddit.com${p.permalink}`,
      source: `r/${p.subreddit}`,
      score: p.score,
      comments: p.numComments,
      relevanceScore: p.relevanceScore,
      relevanceReason: p.relevanceReason,
    }))

    return {
      id: crypto.randomUUID(),
      topic: topics.join(', '),
      subreddits,
      generatedAt: new Date(),
      insights,
      trends: result.trends || [],
      summary: result.summary || '',
    }
  } catch (error) {
    console.error('Error generating summary:', error)

    // Return basic output without AI summary
    const insights: ResearchInsight[] = topPosts.map(p => ({
      title: p.title,
      summary: p.relevanceReason,
      url: `https://reddit.com${p.permalink}`,
      source: `r/${p.subreddit}`,
      score: p.score,
      comments: p.numComments,
      relevanceScore: p.relevanceScore,
      relevanceReason: p.relevanceReason,
    }))

    return {
      id: crypto.randomUUID(),
      topic: topics.join(', '),
      subreddits,
      generatedAt: new Date(),
      insights,
      trends: [],
      summary: 'Summary generation failed. See individual insights below.',
    }
  }
}
