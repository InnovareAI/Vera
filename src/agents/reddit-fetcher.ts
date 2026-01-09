import Parser from 'rss-parser'
import { RedditPost } from '@/types/research'

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'thumbnail'],
    ],
  },
})

function parseTimeWindow(timeWindow: string): number {
  const now = Date.now()
  switch (timeWindow) {
    case '6h': return now - 6 * 60 * 60 * 1000
    case '24h': return now - 24 * 60 * 60 * 1000
    case '72h': return now - 72 * 60 * 60 * 1000
    case '7d': return now - 7 * 24 * 60 * 60 * 1000
    default: return now - 24 * 60 * 60 * 1000
  }
}

export async function fetchSubredditPosts(
  subreddit: string,
  timeWindow: string,
  minScore: number
): Promise<RedditPost[]> {
  const cleanSubreddit = subreddit.replace(/^r\//, '').trim()
  const rssUrl = `https://www.reddit.com/r/${cleanSubreddit}/new.rss?limit=100`

  try {
    const feed = await parser.parseURL(rssUrl)
    const cutoffTime = parseTimeWindow(timeWindow)

    const posts: RedditPost[] = []

    for (const item of feed.items) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()

      if (pubDate.getTime() < cutoffTime) continue

      // Extract post ID from link
      const idMatch = item.link?.match(/comments\/([a-z0-9]+)\//)
      const postId = idMatch ? idMatch[1] : item.guid || ''

      // Reddit RSS doesn't include score, so we fetch it via JSON
      const jsonUrl = `https://www.reddit.com/r/${cleanSubreddit}/comments/${postId}.json`

      posts.push({
        id: postId,
        title: item.title || '',
        selftext: item.contentSnippet || item.content || '',
        url: item.link || '',
        permalink: `/r/${cleanSubreddit}/comments/${postId}`,
        subreddit: cleanSubreddit,
        score: 0, // Will be enriched
        numComments: 0, // Will be enriched
        author: item.creator || 'unknown',
        createdUtc: Math.floor(pubDate.getTime() / 1000),
        createdAt: pubDate,
      })
    }

    return posts
  } catch (error) {
    console.error(`Error fetching r/${cleanSubreddit}:`, error)
    return []
  }
}

export async function enrichPostWithScore(post: RedditPost): Promise<RedditPost> {
  try {
    const jsonUrl = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'VERA Research Agent/1.0',
      },
    })

    if (!response.ok) return post

    const data = await response.json()
    const postData = data[0]?.data?.children?.[0]?.data

    if (postData) {
      return {
        ...post,
        score: postData.score || 0,
        numComments: postData.num_comments || 0,
        selftext: postData.selftext || post.selftext,
      }
    }

    return post
  } catch (error) {
    console.error(`Error enriching post ${post.id}:`, error)
    return post
  }
}

export async function fetchRedditPosts(
  subreddits: string[],
  timeWindow: string,
  minScore: number
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = []

  // Fetch from all subreddits in parallel
  const results = await Promise.all(
    subreddits.map(sub => fetchSubredditPosts(sub, timeWindow, minScore))
  )

  for (const posts of results) {
    allPosts.push(...posts)
  }

  // Enrich posts with scores (with rate limiting)
  const enrichedPosts: RedditPost[] = []
  for (const post of allPosts) {
    const enriched = await enrichPostWithScore(post)
    if (enriched.score >= minScore) {
      enrichedPosts.push(enriched)
    }
    // Rate limit to avoid Reddit blocking
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Sort by score descending
  enrichedPosts.sort((a, b) => b.score - a.score)

  return enrichedPosts
}
