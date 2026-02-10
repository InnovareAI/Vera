import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// POST /api/cold-email/generate - AI-generate email subject + body
export async function POST(request: NextRequest) {
  try {
    const { topic, tone, target_audience, workspace_id } = await request.json()

    if (!topic || !workspace_id) {
      return NextResponse.json({ error: 'topic and workspace_id required' }, { status: 400 })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://vera.innovare.ai',
        'X-Title': 'Vera.AI Cold Email Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `You are a cold email expert. Generate a compelling cold email with high open and reply rates.
Return JSON: { subject: string, subject_b: string, body: string, body_b: string, variables: string[] }
- subject/subject_b are A/B test variants
- body/body_b are A/B test variants
- Use {{first_name}}, {{company}}, {{variable_name}} for personalization
- variables lists all variable names used
- Keep subject under 60 chars
- Keep body under 200 words
- Be conversational, not salesy
- Include a clear CTA`,
          },
          {
            role: 'user',
            content: `Topic: ${topic}\nTone: ${tone || 'professional'}\nTarget: ${target_audience || 'B2B decision makers'}\n\nGenerate the cold email.`,
          },
        ],
      }),
    })

    if (!response.ok) throw new Error(`Generation failed: ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Try to parse as JSON
    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { raw: content }
    }

    return NextResponse.json({ success: true, ...parsed })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
