import { NextRequest, NextResponse } from 'next/server'
import { generateCodeVerifier, generateCodeChallenge, getTwitterAuthUrl } from '@/lib/twitter'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/auth/twitter - Initiate OAuth 2.0 PKCE flow
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID
    if (!clientId) return NextResponse.json({ error: 'Twitter OAuth not configured' }, { status: 500 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = `${workspaceId}:${crypto.randomUUID()}`

    const redirectUri = `${new URL(request.url).origin}/api/auth/twitter/callback`
    const authUrl = getTwitterAuthUrl(clientId, redirectUri, state, codeChallenge)

    // Store verifier in cookie for callback
    const cookieStore = await cookies()
    cookieStore.set('twitter_code_verifier', codeVerifier, { httpOnly: true, maxAge: 600, path: '/' })
    cookieStore.set('twitter_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' })

    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
