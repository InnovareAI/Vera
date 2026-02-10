import { NextRequest, NextResponse } from 'next/server'
import { createSamClient } from '@/lib/supabase/sam-client'

export const dynamic = 'force-dynamic'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

interface BrandData {
  description: string | null
  industry: string | null
  products: { name: string; description: string }[]
  icp: {
    target_roles: string[]
    target_industries: string[]
    pain_points: string[]
    goals: string[]
    company_size: string | null
  }
  tone_of_voice: {
    style: string | null
    formality: string | null
    personality: string[]
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {}

  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  if (titleMatch) meta.title = titleMatch[1].trim()

  const metaPatterns = [
    { key: 'description', pattern: /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i },
    { key: 'description2', pattern: /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i },
    { key: 'og_title', pattern: /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i },
    { key: 'og_description', pattern: /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i },
    { key: 'keywords', pattern: /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i },
  ]

  for (const { key, pattern } of metaPatterns) {
    const match = html.match(pattern)
    if (match) meta[key] = match[1].trim()
  }

  return meta
}

async function fetchWebsite(url: string): Promise<{ text: string; meta: Record<string, string> }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VeraBot/1.0)',
        Accept: 'text/html',
      },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const meta = extractMeta(html)
    const text = stripHtml(html).slice(0, 5000)

    return { text, meta }
  } finally {
    clearTimeout(timeout)
  }
}

async function extractBrandWithAI(text: string, meta: Record<string, string>): Promise<BrandData> {
  const prompt = `Analyze this website content and extract structured brand information. Return ONLY valid JSON, no markdown.

WEBSITE METADATA:
- Title: ${meta.title || 'N/A'}
- Description: ${meta.description || meta.description2 || 'N/A'}
- OG Title: ${meta.og_title || 'N/A'}
- OG Description: ${meta.og_description || 'N/A'}
- Keywords: ${meta.keywords || 'N/A'}

WEBSITE BODY TEXT:
${text}

Return this exact JSON structure (fill in what you can infer, use null for unknowns, empty arrays if no data):
{
  "description": "2-3 sentence company description",
  "industry": "primary industry (e.g. AI/Tech, SaaS, Healthcare, FinTech)",
  "products": [{"name": "product name", "description": "what it does"}],
  "icp": {
    "target_roles": ["job titles they sell to"],
    "target_industries": ["industries they target"],
    "pain_points": ["problems they solve"],
    "goals": ["outcomes they deliver"],
    "company_size": "estimated target company size range or null"
  },
  "tone_of_voice": {
    "style": "professional|casual|technical|creative|educational",
    "formality": "formal|semi-formal|casual",
    "personality": ["personality traits from writing style, e.g. witty, authoritative, empathetic"]
  }
}`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vera.innovare.ai',
      'X-Title': 'Vera.AI Brand Extractor',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-haiku',
      max_tokens: 2048,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a brand analysis expert. Return ONLY valid JSON. No markdown, no code fences, no explanation.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter API error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Clean potential markdown fences
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}

async function fetchSamKBData(samWorkspaceId: string): Promise<Partial<BrandData> | null> {
  const sam = createSamClient()
  if (!sam) return null

  try {
    const [workspaceRes, icpsRes, productsRes, toneRes] = await Promise.all([
      sam.from('workspaces').select('company_description, detected_industry, value_proposition, pain_points, target_personas').eq('id', samWorkspaceId).single(),
      sam.from('knowledge_base_icps').select('name, industries, job_titles, pain_points, company_size_min, company_size_max').eq('workspace_id', samWorkspaceId).eq('is_active', true),
      sam.from('knowledge_base_products').select('name, description').eq('workspace_id', samWorkspaceId).eq('is_active', true),
      sam.from('knowledge_base').select('content').eq('workspace_id', samWorkspaceId).eq('category', 'tone-of-voice').eq('is_active', true).limit(3),
    ])

    const ws = workspaceRes.data
    const icps = icpsRes.data || []
    const products = productsRes.data || []
    const toneEntries = toneRes.data || []

    const result: Partial<BrandData> = {}

    if (ws?.company_description) result.description = ws.company_description
    if (ws?.detected_industry) result.industry = ws.detected_industry

    if (products.length > 0) {
      result.products = products.map((p: { name: string; description: string }) => ({
        name: p.name,
        description: p.description || '',
      }))
    }

    if (icps.length > 0 || ws?.pain_points || ws?.target_personas) {
      result.icp = {
        target_roles: icps.flatMap((icp: { job_titles?: string[] }) => icp.job_titles || []),
        target_industries: icps.flatMap((icp: { industries?: string[] }) => icp.industries || []),
        pain_points: ws?.pain_points || icps.flatMap((icp: { pain_points?: string[] }) => icp.pain_points || []),
        goals: [],
        company_size: icps[0]?.company_size_min && icps[0]?.company_size_max
          ? `${icps[0].company_size_min}-${icps[0].company_size_max}`
          : null,
      }
    }

    if (toneEntries.length > 0) {
      // Parse tone entries for style hints
      const toneContent = toneEntries.map((t: { content: string }) => t.content).join('\n')
      if (toneContent) {
        result.tone_of_voice = {
          style: null,
          formality: null,
          personality: [],
        }
      }
    }

    return result
  } catch (err) {
    console.error('SAM KB query failed:', err)
    return null
  }
}

function mergeBrandData(samData: Partial<BrandData> | null, websiteData: BrandData): BrandData {
  if (!samData) return websiteData

  return {
    description: websiteData.description || samData.description || null,
    industry: websiteData.industry || samData.industry || null,
    products: websiteData.products?.length > 0 ? websiteData.products : samData.products || [],
    icp: {
      target_roles: websiteData.icp?.target_roles?.length > 0 ? websiteData.icp.target_roles : samData.icp?.target_roles || [],
      target_industries: websiteData.icp?.target_industries?.length > 0 ? websiteData.icp.target_industries : samData.icp?.target_industries || [],
      pain_points: websiteData.icp?.pain_points?.length > 0 ? websiteData.icp.pain_points : samData.icp?.pain_points || [],
      goals: websiteData.icp?.goals?.length > 0 ? websiteData.icp.goals : samData.icp?.goals || [],
      company_size: websiteData.icp?.company_size || samData.icp?.company_size || null,
    },
    tone_of_voice: {
      style: websiteData.tone_of_voice?.style || samData.tone_of_voice?.style || null,
      formality: websiteData.tone_of_voice?.formality || samData.tone_of_voice?.formality || null,
      personality: websiteData.tone_of_voice?.personality?.length > 0 ? websiteData.tone_of_voice.personality : samData.tone_of_voice?.personality || [],
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, sam_workspace_id } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    // Step 1: Fetch SAM KB data (in parallel with website fetch)
    const samPromise = sam_workspace_id ? fetchSamKBData(sam_workspace_id) : Promise.resolve(null)

    // Step 2: Fetch and analyze website
    const { text, meta } = await fetchWebsite(normalizedUrl)
    const websiteData = await extractBrandWithAI(text, meta)

    // Step 3: Merge (SAM as base, website overrides)
    const samData = await samPromise
    const merged = mergeBrandData(samData, websiteData)

    return NextResponse.json({
      success: true,
      data: merged,
      sources: {
        website: true,
        sam_kb: samData !== null,
      },
    })
  } catch (error: unknown) {
    console.error('Brand extraction error:', error)
    const message = error instanceof Error ? error.message : 'Failed to extract brand info'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
