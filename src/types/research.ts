export interface ResearchInput {
  topics: string[]
  subreddits: string[]
  timeWindow: '6h' | '24h' | '72h' | '7d'
  minScore: number
  audienceContext: string
}

export interface RedditPost {
  id: string
  title: string
  selftext: string
  url: string
  permalink: string
  subreddit: string
  score: number
  numComments: number
  author: string
  createdUtc: number
  createdAt: Date
}

export interface EvaluatedPost extends RedditPost {
  relevanceScore: number
  relevanceReason: string
}

export interface ResearchInsight {
  title: string
  summary: string
  url: string
  source: string
  score: number
  comments: number
  relevanceScore: number
  relevanceReason: string
}

export interface ResearchOutput {
  id: string
  topic: string
  subreddits: string[]
  generatedAt: Date
  insights: ResearchInsight[]
  trends: string[]
  summary: string
}
