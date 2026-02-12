import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

interface PlanRequest {
  topic: string
  timebox: '1-week' | '2-weeks' | '1-month'
  channels: string[]
  projectContext?: {
    name?: string
    industry?: string
    tone?: string
    icp?: { target_roles?: string[]; pain_points?: string[]; goals?: string[] }
    products?: { name: string; description: string }[]
  }
}

const TIMEBOX_CONFIG: Record<string, { days: number; postsPerChannel: number; label: string }> = {
  '1-week': { days: 7, postsPerChannel: 3, label: '1 week' },
  '2-weeks': { days: 14, postsPerChannel: 5, label: '2 weeks' },
  '1-month': { days: 30, postsPerChannel: 8, label: '1 month' },
}

export async function POST(req: NextRequest) {
  try {
    const body: PlanRequest = await req.json()
    const { topic, timebox, channels, projectContext } = body

    if (!topic || !channels?.length) {
      return NextResponse.json({ error: 'topic and channels are required' }, { status: 400 })
    }

    const config = TIMEBOX_CONFIG[timebox] || TIMEBOX_CONFIG['1-week']
    const totalPosts = config.postsPerChannel * channels.length

    const today = new Date()
    const channelList = channels.map(c => c === 'twitter' ? 'X (Twitter)' : c.charAt(0).toUpperCase() + c.slice(1)).join(', ')

    let brandContext = ''
    if (projectContext) {
      const parts: string[] = []
      if (projectContext.name) parts.push(`Brand: ${projectContext.name}`)
      if (projectContext.industry) parts.push(`Industry: ${projectContext.industry}`)
      if (projectContext.tone) parts.push(`Tone: ${projectContext.tone}`)
      if (projectContext.icp?.target_roles?.length) parts.push(`Target audience: ${projectContext.icp.target_roles.join(', ')}`)
      if (projectContext.icp?.pain_points?.length) parts.push(`Pain points: ${projectContext.icp.pain_points.slice(0, 3).join(', ')}`)
      if (projectContext.products?.length) parts.push(`Products: ${projectContext.products.map(p => p.name).join(', ')}`)
      brandContext = parts.join('. ') + '.'
    }

    const systemPrompt = `You are a senior content strategist. Generate a content plan as a JSON array. Each item must have: day (string like "Day 1", "Day 2"), platform (one of: ${channels.join(', ')}), type (one of: hot-take, how-to, story, listicle, case-study, news-react), title (catchy post title), brief (1-2 sentence description of what to write). Return ONLY valid JSON array, no markdown, no explanation.`

    const userPrompt = `Create a ${config.label} content plan for the topic: "${topic}"

Channels: ${channelList}
Total posts: ~${totalPosts} (about ${config.postsPerChannel} per channel, spread across ${config.days} days)
Start date: ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
${brandContext ? `\nBrand context: ${brandContext}` : ''}

Rules:
- Vary content types across the plan (mix hot-takes, how-tos, stories, listicles)
- LinkedIn gets more professional/thought-leadership content
- Twitter/X gets shorter, punchier takes
- Medium gets long-form, educational content
- Blog gets SEO-focused, comprehensive articles
- Space posts evenly across the timeframe
- Each post should approach the topic from a different angle
- Make titles specific and compelling, not generic`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://vera.innovare.ai',
        'X-Title': 'Vera.AI Content Planner',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku-20241022',
        max_tokens: 3000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenRouter error: ${errText}`)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '[]'

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return NextResponse.json({ success: true, plan, timebox: config.label, topic })
  } catch (error: unknown) {
    console.error('Generate plan error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
