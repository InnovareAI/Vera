import { NextRequest, NextResponse } from 'next/server'
import { runRedditResearch } from '@/agents/reddit-research-agent'
import { ResearchInput } from '@/types/research'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const input: ResearchInput = {
      topics: body.topics || [],
      subreddits: body.subreddits || [],
      timeWindow: body.timeWindow || '24h',
      minScore: body.minScore || 10,
      audienceContext: body.audienceContext || '',
    }

    if (input.topics.length === 0) {
      return NextResponse.json(
        { error: 'At least one topic is required' },
        { status: 400 }
      )
    }

    if (input.subreddits.length === 0) {
      return NextResponse.json(
        { error: 'At least one subreddit is required' },
        { status: 400 }
      )
    }

    const result = await runRedditResearch(input)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Research API error:', error)
    return NextResponse.json(
      { error: 'Research failed. Please try again.' },
      { status: 500 }
    )
  }
}
