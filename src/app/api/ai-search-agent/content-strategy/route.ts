import { NextRequest, NextResponse } from 'next/server'
import { generateContentStrategy } from '@/agents/ai-search-agent'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const strategy = await generateContentStrategy(workspaceId)
    return NextResponse.json({ success: true, data: strategy })
  } catch (error: unknown) {
    console.error('Content strategy error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
