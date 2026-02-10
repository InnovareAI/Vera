import { NextRequest, NextResponse } from 'next/server'
import { getAISearchConfig, createAISearchConfig, updateAISearchConfig } from '@/agents/ai-search-agent'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const config = await getAISearchConfig(workspaceId)
    return NextResponse.json(config || null)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.workspace_id || !body.website_url) {
      return NextResponse.json({ error: 'workspace_id and website_url required' }, { status: 400 })
    }

    const config = await createAISearchConfig(body.workspace_id, body.website_url, body)
    return NextResponse.json(config, { status: 201 })
  } catch (error: unknown) {
    const message = (error as Error).message
    if (message.includes('already configured')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    const body = await request.json()
    const config = await updateAISearchConfig(workspaceId, body)
    return NextResponse.json(config)
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
