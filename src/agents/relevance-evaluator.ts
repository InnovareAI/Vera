import { RedditPost, EvaluatedPost } from '@/types/research'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

async function callOpenRouter(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vera.innovare.ai',
      'X-Title': 'Vera.AI Relevance Evaluator'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function evaluatePostRelevance(
  post: RedditPost,
  topics: string[],
  audienceContext: string
): Promise<EvaluatedPost> {
  const prompt = `You are a research analyst evaluating content relevance.

TOPICS OF INTEREST:
${topics.join(', ')}

TARGET AUDIENCE:
${audienceContext}

REDDIT POST TO EVALUATE:
Title: ${post.title}
Subreddit: r/${post.subreddit}
Content: ${post.selftext.slice(0, 1500)}
Score: ${post.score} upvotes
Comments: ${post.numComments}

Rate this post's relevance to the topics and audience on a scale of 0.0 to 1.0.
Provide a brief reason (1-2 sentences) explaining why.

Respond in JSON format:
{
  "relevanceScore": 0.85,
  "relevanceReason": "Your reason here"
}`

  try {
    const content = await callOpenRouter(prompt)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { ...post, relevanceScore: 0.5, relevanceReason: 'Could not parse response' }
    }

    const result = JSON.parse(jsonMatch[0])

    return {
      ...post,
      relevanceScore: result.relevanceScore || 0.5,
      relevanceReason: result.relevanceReason || 'No reason provided',
    }
  } catch (error) {
    console.error('Error evaluating post:', error)
    return { ...post, relevanceScore: 0.5, relevanceReason: 'Evaluation error' }
  }
}

export async function evaluatePosts(
  posts: RedditPost[],
  topics: string[],
  audienceContext: string,
  maxPosts: number = 20
): Promise<EvaluatedPost[]> {
  // Only evaluate top posts by score to save API calls
  const topPosts = posts.slice(0, maxPosts)

  const evaluated: EvaluatedPost[] = []

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < topPosts.length; i += 5) {
    const batch = topPosts.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(post => evaluatePostRelevance(post, topics, audienceContext))
    )
    evaluated.push(...results)
  }

  // Sort by relevance score
  evaluated.sort((a, b) => b.relevanceScore - a.relevanceScore)

  return evaluated
}
