import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPost, getMediumUser } from '@/lib/medium'

export const dynamic = 'force-dynamic'

// POST /api/medium/post - Create article
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { title, content, contentFormat, tags, publishStatus, publicationId, workspace_id } = await request.json()

    if (!workspace_id || !title || !content) {
      return NextResponse.json({ error: 'workspace_id, title, and content required' }, { status: 400 })
    }

    const { data: account } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'medium')
      .single()

    if (!account) return NextResponse.json({ error: 'No Medium account connected' }, { status: 404 })

    const tokens = { access_token: account.access_token }
    const user = await getMediumUser(tokens)

    const result = await createPost(tokens, user.data.id, {
      title,
      content,
      contentFormat: contentFormat || 'markdown',
      tags: tags || [],
      publishStatus: publishStatus || 'draft',
      publicationId,
    })

    return NextResponse.json({ success: true, post: result.data })
  } catch (error: unknown) {
    console.error('Medium post error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// GET /api/medium/post - List connected Medium accounts
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const { data } = await supabase
      .from('connected_accounts')
      .select('id, platform, account_name, account_id, created_at')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'medium')

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
