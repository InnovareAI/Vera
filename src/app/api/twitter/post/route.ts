import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTweet, createThread } from '@/lib/twitter'

export const dynamic = 'force-dynamic'

// POST /api/twitter/post - Create tweet or thread
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { text, thread, workspace_id } = await request.json()

    if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    if (!text && !thread?.length) return NextResponse.json({ error: 'text or thread required' }, { status: 400 })

    // Fetch connected Twitter account
    const { data: account } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'twitter')
      .single()

    if (!account) return NextResponse.json({ error: 'No Twitter account connected' }, { status: 404 })

    const tokens = { access_token: account.access_token, refresh_token: account.refresh_token }

    if (thread?.length) {
      const results = await createThread(tokens, thread)
      return NextResponse.json({ success: true, type: 'thread', tweets: results })
    }

    const result = await createTweet(tokens, text)
    return NextResponse.json({ success: true, type: 'tweet', tweet: result })
  } catch (error: unknown) {
    console.error('Twitter post error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// GET /api/twitter/post - List connected accounts
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data } = await supabase
      .from('connected_accounts')
      .select('id, platform, account_name, account_id, created_at')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'twitter')

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
