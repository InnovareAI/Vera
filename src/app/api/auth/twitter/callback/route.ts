import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeTwitterCode, getUserProfile } from '@/lib/twitter'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/auth/twitter/callback
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings/accounts?error=missing_params', request.url))
    }

    const cookieStore = await cookies()
    const codeVerifier = cookieStore.get('twitter_code_verifier')?.value
    const savedState = cookieStore.get('twitter_oauth_state')?.value

    if (!codeVerifier || state !== savedState) {
      return NextResponse.redirect(new URL('/settings/accounts?error=invalid_state', request.url))
    }

    const workspaceId = state.split(':')[0]
    const redirectUri = `${new URL(request.url).origin}/api/auth/twitter/callback`

    // Exchange code for tokens
    const tokens = await exchangeTwitterCode(code, codeVerifier, redirectUri)

    // Get user profile
    const profile = await getUserProfile({ access_token: tokens.access_token }, 'me')

    // Store connected account
    await supabase
      .from('connected_accounts')
      .upsert({
        workspace_id: workspaceId,
        platform: 'twitter',
        account_id: profile.data?.id,
        account_name: profile.data?.username,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : null,
        metadata: { name: profile.data?.name, profile_image: profile.data?.profile_image_url },
      }, { onConflict: 'workspace_id,platform' })

    // Clean up cookies
    cookieStore.delete('twitter_code_verifier')
    cookieStore.delete('twitter_oauth_state')

    return NextResponse.redirect(new URL('/settings/accounts?success=twitter', request.url))
  } catch (error: unknown) {
    console.error('Twitter callback error:', error)
    return NextResponse.redirect(new URL(`/settings/accounts?error=${encodeURIComponent((error as Error).message)}`, request.url))
  }
}
