import { NextRequest, NextResponse } from 'next/server'
import { getMediumAuthUrl } from '@/lib/medium'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/auth/medium - Initiate Medium OAuth2 flow
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.MEDIUM_CLIENT_ID
    if (!clientId) return NextResponse.json({ error: 'Medium OAuth not configured' }, { status: 500 })

    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const state = `${workspaceId}:${crypto.randomUUID()}`
    const redirectUri = `${new URL(request.url).origin}/api/auth/medium/callback`
    const authUrl = getMediumAuthUrl(clientId, redirectUri, state)

    const cookieStore = await cookies()
    cookieStore.set('medium_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' })

    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
