import Anthropic from '@anthropic-ai/sdk'
import { EvaluatedPost, ResearchOutput, ResearchInsight } from '@/types/research'

const anthropic = new Anthropic()

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
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
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
