import { ResearchInput, ResearchOutput } from '@/types/research'
import { fetchRedditPosts } from './reddit-fetcher'
import { evaluatePosts } from './relevance-evaluator'
import { generateResearchSummary } from './summary-generator'

export async function runRedditResearch(input: ResearchInput): Promise<ResearchOutput> {
  console.log('Starting Reddit research...')
  console.log(`Topics: ${input.topics.join(', ')}`)
  console.log(`Subreddits: ${input.subreddits.join(', ')}`)
  console.log(`Time window: ${input.timeWindow}`)
  console.log(`Min score: ${input.minScore}`)

  // Step 1: Fetch posts from all subreddits
  console.log('\n[1/3] Fetching posts from Reddit...')
  const posts = await fetchRedditPosts(
    input.subreddits,
    input.timeWindow,
    input.minScore
  )
  console.log(`Found ${posts.length} posts meeting criteria`)

  if (posts.length === 0) {
    return {
      id: crypto.randomUUID(),
      topic: input.topics.join(', '),
      subreddits: input.subreddits,
      generatedAt: new Date(),
      insights: [],
      trends: [],
      summary: 'No posts found matching your criteria. Try expanding the time window or lowering the minimum score.',
    }
  }

  // Step 2: Evaluate relevance using Claude
  console.log('\n[2/3] Evaluating post relevance...')
  const evaluatedPosts = await evaluatePosts(
    posts,
    input.topics,
    input.audienceContext,
    20 // Evaluate top 20 posts
  )
  console.log(`Evaluated ${evaluatedPosts.length} posts`)

  const relevantPosts = evaluatedPosts.filter(p => p.relevanceScore >= 0.6)
  console.log(`${relevantPosts.length} posts scored 60%+ relevance`)

  // Step 3: Generate summary with citations
  console.log('\n[3/3] Generating research summary...')
  const output = await generateResearchSummary(
    evaluatedPosts,
    input.topics,
    input.subreddits
  )

  console.log('\nResearch complete!')
  return output
}
