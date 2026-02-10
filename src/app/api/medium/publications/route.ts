import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMediumUser, getUserPublications } from '@/lib/medium'

export const dynamic = 'force-dynamic'

// GET /api/medium/publications
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data: account } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'medium')
      .single()

    if (!account) return NextResponse.json({ error: 'No Medium account connected' }, { status: 404 })

    const tokens = { access_token: account.access_token }
    const user = await getMediumUser(tokens)
    const pubs = await getUserPublications(tokens, user.data.id)

    return NextResponse.json(pubs.data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
