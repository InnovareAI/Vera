import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// GET /api/ai-search-agent/content-strategy
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const workspaceId = new URL(request.url).searchParams.get('workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    // Fetch latest analysis
    const { data: analysis } = await supabase
      .from('vera_website_analysis_results')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!analysis) {
      return NextResponse.json({ error: 'No completed analysis found. Run an analysis first.' }, { status: 404 })
    }

    // Generate strategy based on analysis
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://vera.innovare.ai',
        'X-Title': 'VERA SEO Strategy',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO/GEO content strategist. Based on website analysis data, generate actionable content strategy recommendations. Return JSON with: { topics: [{ title, description, priority, platforms: [] }], keywords: [], contentGaps: [], schedule: {} }',
          },
          {
            role: 'user',
            content: `Website: ${analysis.website_url}\nSEO Score: ${analysis.seo_score}/100\nGEO Score: ${analysis.geo_score}/100\nRecommendations: ${JSON.stringify(analysis.recommendations)}\nExecutive Summary: ${analysis.executive_summary}\n\nGenerate a comprehensive content strategy.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Strategy generation failed: ${response.status}`)
    }

    const data = await response.json()
    const strategy = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ success: true, strategy, analysis_id: analysis.id })
  } catch (error: unknown) {
    console.error('Content strategy error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
