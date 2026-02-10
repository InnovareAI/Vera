import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeMediumCode, getMediumUser } from '@/lib/medium'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/auth/medium/callback
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
    const savedState = cookieStore.get('medium_oauth_state')?.value
    if (state !== savedState) {
      return NextResponse.redirect(new URL('/settings/accounts?error=invalid_state', request.url))
    }

    const workspaceId = state.split(':')[0]
    const redirectUri = `${new URL(request.url).origin}/api/auth/medium/callback`

    const tokens = await exchangeMediumCode(code, redirectUri)
    const user = await getMediumUser(tokens)

    await supabase
      .from('connected_accounts')
      .upsert({
        workspace_id: workspaceId,
        platform: 'medium',
        account_id: user.data?.id,
        account_name: user.data?.username,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        metadata: { name: user.data?.name, imageUrl: user.data?.imageUrl },
      }, { onConflict: 'workspace_id,platform' })

    cookieStore.delete('medium_oauth_state')
    return NextResponse.redirect(new URL('/settings/accounts?success=medium', request.url))
  } catch (error: unknown) {
    console.error('Medium callback error:', error)
    return NextResponse.redirect(new URL(`/settings/accounts?error=${encodeURIComponent((error as Error).message)}`, request.url))
  }
}
