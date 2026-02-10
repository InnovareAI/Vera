import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTweets } from '@/lib/twitter'

export const dynamic = 'force-dynamic'

// GET /api/twitter/timeline
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data: account } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'twitter')
      .single()

    if (!account) return NextResponse.json({ error: 'No Twitter account connected' }, { status: 404 })

    const tokens = { access_token: account.access_token }
    const tweets = await getUserTweets(tokens, account.account_id, Math.min(limit, 100))

    return NextResponse.json(tweets.data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
