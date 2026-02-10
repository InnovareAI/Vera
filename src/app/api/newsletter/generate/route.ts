import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// POST /api/newsletter/generate - AI-generate newsletter from content queue
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { workspace_id, newsletter_id, topic, num_items } = await request.json()

    if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

    // Fetch approved content from queue
    const { data: contentItems } = await supabase
      .from('content_queue')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(num_items || 5)

    const contentSummary = (contentItems || [])
      .map((item: { topic: string; generated_content: string }) => `- ${item.topic}: ${(item.generated_content || '').slice(0, 200)}`)
      .join('\n')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://vera.innovare.ai',
        'X-Title': 'Vera.AI Newsletter Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: `You are a newsletter editor. Create a compelling newsletter issue.
Return JSON: { subject: string, preview_text: string, body_html: string, body_markdown: string }
- Subject should be attention-grabbing (under 60 chars)
- Preview text is the email preview (under 100 chars)
- body_html is the full newsletter in clean HTML
- body_markdown is the same content in Markdown
- Include sections with headers, brief summaries, and links
- Professional but engaging tone
- 3-5 minute read`,
          },
          {
            role: 'user',
            content: `Topic/Theme: ${topic || 'Weekly roundup'}\n\nApproved content to include:\n${contentSummary || 'No specific content — create a general industry newsletter.'}\n\nGenerate the newsletter issue.`,
          },
        ],
      }),
    })

    if (!response.ok) throw new Error(`Generation failed: ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { raw: content }
    }

    // If newsletter_id provided, auto-create the issue
    if (newsletter_id && parsed.subject) {
      const { data: issue } = await supabase
        .from('vera_newsletter_issues')
        .insert({
          newsletter_id,
          workspace_id,
          subject: parsed.subject,
          preview_text: parsed.preview_text || null,
          body_html: parsed.body_html || null,
          body_markdown: parsed.body_markdown || null,
        })
        .select()
        .single()

      return NextResponse.json({ success: true, issue, generated: parsed })
    }

    return NextResponse.json({ success: true, generated: parsed })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
