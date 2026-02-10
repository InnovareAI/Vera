import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/ai-search-agent/analyze - Start website analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { website_url, workspace_id } = await request.json()

    if (!website_url || !workspace_id) {
      return NextResponse.json({ error: 'website_url and workspace_id required' }, { status: 400 })
    }

    const domain = new URL(website_url).hostname

    // Create analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('vera_website_analysis_results')
      .insert({
        workspace_id,
        website_url,
        domain,
        status: 'pending',
      })
      .select()
      .single()

    if (analysisError) throw analysisError

    // Queue job for async processing
    const { error: jobError } = await supabase
      .from('vera_jobs_queue')
      .insert({
        job_type: 'seo-analysis',
        workspace_id,
        payload: { analysis_id: analysis.id, website_url, domain },
      })

    if (jobError) throw jobError

    return NextResponse.json({ success: true, analysis_id: analysis.id, status: 'queued' })
  } catch (error: unknown) {
    console.error('Error starting analysis:', error)
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
