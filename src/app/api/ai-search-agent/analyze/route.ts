import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeWebsite } from '@/agents/ai-search-agent'

export const dynamic = 'force-dynamic'

// POST /api/ai-search-agent/analyze - Start website analysis
export async function POST(request: NextRequest) {
  try {
    const { website_url, workspace_id, depth, include_learnings } = await request.json()

    if (!website_url || !workspace_id) {
      return NextResponse.json({ error: 'website_url and workspace_id required' }, { status: 400 })
    }

    // Run analysis inline (takes 30-60 seconds)
    const result = await analyzeWebsite(workspace_id, website_url, {
      depth: depth || 'standard',
      includeLearn: include_learnings !== false,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    console.error('Error running analysis:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// GET /api/ai-search-agent/analyze - Fetch latest analysis results
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_website_analysis_results')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json(data || null)
  } catch (error: unknown) {
    console.error('Error fetching analysis:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
