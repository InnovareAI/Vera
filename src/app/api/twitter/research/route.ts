import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile, getUserTweets } from '@/lib/twitter'

export const dynamic = 'force-dynamic'

// POST /api/twitter/research - Analyze user's writing style
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { username, workspace_id } = await request.json()

    if (!username || !workspace_id) {
      return NextResponse.json({ error: 'username and workspace_id required' }, { status: 400 })
    }

    const { data: account } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'twitter')
      .single()

    if (!account) return NextResponse.json({ error: 'No Twitter account connected' }, { status: 404 })

    const tokens = { access_token: account.access_token }
    const profile = await getUserProfile(tokens, username)
    const tweets = await getUserTweets(tokens, profile.data.id, 20)

    // Analyze writing style via OpenRouter
    const tweetTexts = tweets.data?.map((t: { text: string }) => t.text).join('\n---\n') || ''

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://vera.innovare.ai',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: 'Analyze this Twitter user\'s writing style. Return JSON: { tone, avgLength, topics[], patterns[], emoji_usage, hashtag_style, engagement_hooks[] }' },
          { role: 'user', content: `Username: @${username}\nBio: ${profile.data.description}\n\nRecent tweets:\n${tweetTexts}` },
        ],
      }),
    })

    const analysis = await response.json()

    return NextResponse.json({
      profile: profile.data,
      tweets: tweets.data,
      style_analysis: analysis.choices?.[0]?.message?.content,
    })
  } catch (error: unknown) {
    console.error('Twitter research error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
