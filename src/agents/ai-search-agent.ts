/**
 * AI Search Agent Service (VERA)
 *
 * Analyzes websites for SEO and GEO (Generative Engine Optimization),
 * learns from content queue performance, and helps users create
 * content that ranks in AI search engines (ChatGPT, Perplexity, Claude, etc.)
 *
 * Key Features:
 * - Website SEO/GEO analysis
 * - Learning from content queue performance
 * - AI-readable content recommendations
 * - Content strategy generation
 *
 * Ported from SAM's ai-search-agent.ts for VERA
 * Uses OpenRouter for all AI calls (not direct Anthropic SDK)
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ============================================
// TYPES
// ============================================

export type AnalysisDepth = 'quick' | 'standard' | 'comprehensive'

export type GEOReadinessLevel = 'poor' | 'needs_work' | 'moderate' | 'good' | 'excellent'

export interface AISearchAgentConfig {
  id?: string
  workspace_id: string
  enabled: boolean
  website_url: string // LOCKED once set - user cannot change
  website_locked: boolean
  auto_analyze_prospects: boolean
  analysis_depth: AnalysisDepth

  // SEO Settings
  check_meta_tags: boolean
  check_structured_data: boolean
  check_robots_txt: boolean
  check_sitemap: boolean

  // GEO (Generative Engine Optimization) Settings
  check_llm_readability: boolean
  check_entity_clarity: boolean
  check_fact_density: boolean
  check_citation_readiness: boolean

  // Learning Settings
  learn_from_content: boolean
  learn_from_comments: boolean

  created_at?: string
  updated_at?: string
}

export interface SEOAnalysisResult {
  score: number // 0-100
  meta_tags: {
    title: string | null
    description: string | null
    og_image: string | null
    issues: string[]
    score: number
  }
  structured_data: {
    types_found: string[]
    issues: string[]
    score: number
  }
  robots_txt: {
    exists: boolean
    allows_crawling: boolean
    issues: string[]
    score: number
  }
  sitemap: {
    exists: boolean
    url: string | null
    issues: string[]
    score: number
  }
  technical_issues: string[]
}

export interface GEOAnalysisResult {
  score: number // 0-100
  readiness_level: GEOReadinessLevel

  // LLM Readability - Can AI easily understand your content?
  llm_readability: {
    score: number
    is_ai_parseable: boolean
    issues: string[]
    suggestions: string[]
  }

  // Entity Clarity - Are your key concepts clearly defined?
  entity_clarity: {
    score: number
    entities_found: string[]
    issues: string[]
    suggestions: string[]
  }

  // Fact Density - Does your content contain citable facts?
  fact_density: {
    score: number
    facts_found: number
    avg_facts_per_section: number
    issues: string[]
    suggestions: string[]
  }

  // v2.4 Intelligence Layer
  information_gain: {
    score: number
    unique_entities: number
    data_density_ratio: number // Entities/Fact count vs Word count
    unique_insights: string[]
  }

  hallucination_risk: {
    score: number
    risky_claims: Array<{ claim: string; context: string }>
    has_citations: boolean
  }

  // Citation Readiness - Can AI cite your content as a source?
  citation_readiness: {
    score: number
    is_authoritative: boolean
    has_unique_data: boolean
    issues: string[]
    suggestions: string[]
  }

  // AI Summary of GEO status
  ai_summary: string
}

export interface ContentLearnings {
  // From content queue (VERA equivalent of SAM's outreach)
  outreach: {
    total_messages_sent: number
    response_rate: number
    top_performing_messages: Array<{
      message_snippet: string
      response_rate: number
    }>
    themes_that_work: string[]
    themes_to_avoid: string[]
  }

  // From commenting agent (future MCP integration)
  commenting: {
    total_comments_posted: number
    avg_engagement_rate: number
    top_performing_comments: Array<{
      comment_snippet: string
      post_topic: string
      engagement: number
    }>
    topics_that_resonate: string[]
  }

  // Combined insights
  combined_insights: {
    key_themes: string[]
    voice_characteristics: string[]
    content_recommendations: string[]
  }
}

export interface ContentRecommendation {
  priority: 'high' | 'medium' | 'low'
  category: 'seo' | 'geo' | 'content' | 'technical'
  title: string
  description: string
  implementation_steps: string[]
  impact_estimate: string

  // v2.4 ROI Prioritization
  impact_score: number // 1-10
  effort_hours: number
  roi_multiplier: number
}

export interface WebsiteAnalysisResult {
  id: string
  workspace_id: string
  website_url: string
  domain: string
  analyzed_at: string
  status: 'pending' | 'analyzing' | 'completed' | 'failed'

  // Scores
  seo_score: number
  geo_score: number
  overall_score: number

  // Detailed results
  seo_results: SEOAnalysisResult
  geo_results: GEOAnalysisResult

  // AI-generated recommendations
  recommendations: ContentRecommendation[]

  // Executive summary
  executive_summary: string

  // Content learnings from other agents
  content_learnings?: ContentLearnings
}

// ============================================
// OPENROUTER AI CLIENT
// ============================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'anthropic/claude-sonnet-4',
  maxTokens: number = 1500
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vera.innovare.ai',
      'X-Title': 'VERA GEO Agent',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`AI call failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Simplified AI call without system prompt (user-only message)
 */
async function callAISimple(
  userPrompt: string,
  model: string = 'anthropic/claude-3.5-haiku',
  maxTokens: number = 500
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vera.innovare.ai',
      'X-Title': 'VERA GEO Agent',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`AI call failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// ============================================
// WEBSITE FETCHING & PARSING
// ============================================

interface FetchedWebsite {
  html: string
  url: string
  status_code: number
  content_type: string
  fetch_time_ms: number
}

/**
 * Fetch website HTML content
 */
export async function fetchWebsite(url: string): Promise<FetchedWebsite> {
  const startTime = Date.now()

  // Normalize URL
  let normalizedUrl = url
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = `https://${url}`
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VERABot/1.0; +https://vera.innovare.ai/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    })

    const html = await response.text()
    const fetchTime = Date.now() - startTime

    return {
      html,
      url: response.url, // Final URL after redirects
      status_code: response.status,
      content_type: response.headers.get('content-type') || '',
      fetch_time_ms: fetchTime,
    }
  } catch (error) {
    console.error('Failed to fetch website:', url, error)
    throw new Error(
      `Failed to fetch website: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace('www.', '')
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

// ============================================
// SEO ANALYSIS
// ============================================

/**
 * Analyze website SEO
 */
export async function analyzeSEO(html: string, url: string): Promise<SEOAnalysisResult> {
  const issues: string[] = []
  let totalScore = 0
  let scoreCount = 0

  // Meta Tags Analysis
  const metaTagsResult = analyzeMetaTags(html)
  totalScore += metaTagsResult.score
  scoreCount++
  issues.push(...metaTagsResult.issues)

  // Structured Data Analysis
  const structuredDataResult = analyzeStructuredData(html)
  totalScore += structuredDataResult.score
  scoreCount++
  issues.push(...structuredDataResult.issues)

  // Robots.txt Analysis
  const robotsResult = await analyzeRobotsTxt(url)
  totalScore += robotsResult.score
  scoreCount++
  issues.push(...robotsResult.issues)

  // Sitemap Analysis
  const sitemapResult = await analyzeSitemap(url)
  totalScore += sitemapResult.score
  scoreCount++
  issues.push(...sitemapResult.issues)

  // Technical Issues
  const technicalIssues = analyzeTechnicalSEO(html)
  issues.push(...technicalIssues)

  const overallScore = Math.round(totalScore / scoreCount)

  return {
    score: overallScore,
    meta_tags: metaTagsResult,
    structured_data: structuredDataResult,
    robots_txt: robotsResult,
    sitemap: sitemapResult,
    technical_issues: technicalIssues,
  }
}

export function analyzeMetaTags(html: string): SEOAnalysisResult['meta_tags'] {
  const issues: string[] = []
  let score = 100

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : null

  if (!title) {
    issues.push('Missing page title')
    score -= 30
  } else if (title.length < 30) {
    issues.push('Title too short (should be 50-60 characters)')
    score -= 10
  } else if (title.length > 60) {
    issues.push('Title too long (may be truncated in search results)')
    score -= 5
  }

  // Extract meta description
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  const description = descMatch ? descMatch[1].trim() : null

  if (!description) {
    issues.push('Missing meta description')
    score -= 25
  } else if (description.length < 120) {
    issues.push('Meta description too short (should be 150-160 characters)')
    score -= 10
  } else if (description.length > 160) {
    issues.push('Meta description too long (may be truncated)')
    score -= 5
  }

  // Extract Open Graph image
  const ogImageMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  const ogImage = ogImageMatch ? ogImageMatch[1] : null

  if (!ogImage) {
    issues.push('Missing Open Graph image (og:image)')
    score -= 10
  }

  return {
    title,
    description,
    og_image: ogImage,
    issues,
    score: Math.max(0, score),
  }
}

export function analyzeStructuredData(html: string): SEOAnalysisResult['structured_data'] {
  const issues: string[] = []
  let score = 100
  const typesFound: string[] = []

  // Look for JSON-LD structured data
  const jsonLdMatches = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  if (!jsonLdMatches || jsonLdMatches.length === 0) {
    issues.push('No JSON-LD structured data found')
    score -= 40
  } else {
    jsonLdMatches.forEach((match) => {
      try {
        const jsonContent = match.replace(/<script[^>]+>/, '').replace(/<\/script>/, '')
        const parsed = JSON.parse(jsonContent)
        const type =
          parsed['@type'] ||
          (Array.isArray(parsed['@graph'])
            ? parsed['@graph']
                .map((g: { '@type'?: string }) => g['@type'])
                .filter(Boolean)
            : [])
        if (Array.isArray(type)) {
          typesFound.push(...type)
        } else if (type) {
          typesFound.push(type)
        }
      } catch {
        issues.push('Invalid JSON-LD syntax detected')
        score -= 10
      }
    })
  }

  // Check for important schema types
  const importantTypes = [
    'Organization',
    'WebSite',
    'LocalBusiness',
    'Product',
    'Article',
    'Person',
  ]
  const hasImportantType = typesFound.some((t) => importantTypes.includes(t))

  if (typesFound.length > 0 && !hasImportantType) {
    issues.push('Missing core schema types (Organization, WebSite, etc.)')
    score -= 15
  }

  return {
    types_found: typesFound,
    issues,
    score: Math.max(0, score),
  }
}

export async function analyzeRobotsTxt(
  url: string
): Promise<SEOAnalysisResult['robots_txt']> {
  const issues: string[] = []
  let score = 100

  const domain = new URL(url.startsWith('http') ? url : `https://${url}`).origin

  try {
    const response = await fetch(`${domain}/robots.txt`, {
      headers: { 'User-Agent': 'VERABot/1.0' },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      issues.push('robots.txt not found')
      score -= 20
      return { exists: false, allows_crawling: true, issues, score }
    }

    const content = await response.text()
    const allowsCrawling = !content.includes('Disallow: /')

    if (!allowsCrawling) {
      issues.push('robots.txt blocks some paths')
      score -= 10
    }

    if (!content.includes('Sitemap:')) {
      issues.push('robots.txt does not reference sitemap')
      score -= 10
    }

    return {
      exists: true,
      allows_crawling: allowsCrawling,
      issues,
      score: Math.max(0, score),
    }
  } catch {
    issues.push('Could not fetch robots.txt')
    return { exists: false, allows_crawling: true, issues, score: 60 }
  }
}

export async function analyzeSitemap(
  url: string
): Promise<SEOAnalysisResult['sitemap']> {
  const issues: string[] = []
  let score = 100

  const domain = new URL(url.startsWith('http') ? url : `https://${url}`).origin
  const sitemapUrls = [`${domain}/sitemap.xml`, `${domain}/sitemap_index.xml`]

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'VERABot/1.0' },
        signal: AbortSignal.timeout(30000),
      })

      if (response.ok) {
        const content = await response.text()
        if (content.includes('<urlset') || content.includes('<sitemapindex')) {
          return { exists: true, url: sitemapUrl, issues: [], score: 100 }
        }
      }
    } catch {
      // Try next URL
    }
  }

  issues.push('No sitemap.xml found')
  score -= 30
  return { exists: false, url: null, issues, score: Math.max(0, score) }
}

export function analyzeTechnicalSEO(html: string): string[] {
  const issues: string[] = []

  // Check for viewport meta tag
  if (!html.includes('viewport')) {
    issues.push('Missing viewport meta tag (affects mobile SEO)')
  }

  // Check for canonical URL
  if (!html.includes('rel="canonical"') && !html.includes("rel='canonical'")) {
    issues.push('Missing canonical URL')
  }

  // Check for heading structure
  const h1Match = html.match(/<h1[^>]*>/gi)
  if (!h1Match) {
    issues.push('Missing H1 heading')
  } else if (h1Match.length > 1) {
    issues.push('Multiple H1 headings (should have only one)')
  }

  // Check for image alt tags
  const imgWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi)
  if (imgWithoutAlt && imgWithoutAlt.length > 0) {
    issues.push(`${imgWithoutAlt.length} images missing alt text`)
  }

  return issues
}

// ============================================
// GEO (Generative Engine Optimization) ANALYSIS
// ============================================

/**
 * Analyze website for AI/LLM readability (GEO)
 * GEO = Generative Engine Optimization - making content AI-friendly
 */
export async function analyzeGEO(
  html: string,
  url: string,
  seoResult: SEOAnalysisResult
): Promise<GEOAnalysisResult> {
  // Extract text content for AI analysis
  const textContent = extractTextContent(html)

  // Use AI to analyze GEO readiness via OpenRouter
  const geoAnalysis = await analyzeWithAI(textContent, url, seoResult)

  return geoAnalysis
}

/**
 * Extract readable text content from HTML
 */
export function extractTextContent(html: string): string {
  // Remove scripts, styles, and HTML tags
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  // Limit to first 10000 characters for analysis
  return text.substring(0, 10000)
}

/**
 * Use AI to analyze GEO readiness via OpenRouter
 */
export async function analyzeWithAI(
  textContent: string,
  url: string,
  seoResult: SEOAnalysisResult
): Promise<GEOAnalysisResult> {
  const systemPrompt = `You are an expert in Generative Engine Optimization (GEO) - the practice of making website content optimized for AI search engines like ChatGPT, Perplexity, Claude, and Google's AI Overviews.

## Your Task
Analyze the provided website content and evaluate how well it would perform when AI systems try to:
1. Understand and summarize the content
2. Extract facts and data points
3. Cite this source in AI-generated responses
4. Answer user questions using this content

## GEO Criteria

### 1. LLM Readability (0-100)
- Is the content clearly structured?
- Are concepts explained in plain language?
- Is there a logical flow that AI can follow?
- Are there clear definitions of key terms?

### 2. Entity Clarity (0-100)
- Are key entities (people, companies, products, concepts) clearly defined?
- Can AI extract WHO, WHAT, WHEN, WHERE, WHY easily?
- Are relationships between entities clear?

### 3. Fact Density (0-100)
- Does the content contain specific, citable facts?
- Are there statistics, data points, or unique insights?
- Is there original research or proprietary information?

### 4. Citation Readiness (0-100)
- Is this source authoritative on its topic?
- Would an AI confidently cite this source?
- Is the content unique and valuable?
- Does it have credibility signals (author info, dates, sources)?

### 5. Information Gain (v2.4 Intelligence Layer) (0-100)
- Does the content provide unique insights or data points not easily found elsewhere?
- What is the density of unique entities and facts relative to word count?
- High Information Gain is critical for ranking in AI models like Perplexity and SearchGPT.

### 6. Hallucination Risk (0-100)
- Evaluate claims for potential inaccuracies or lack of evidence.
- Score 100 if all claims are backed by clear evidence, logic, or citations.
- Score lowers significantly if bold claims are made without supporting data (Risky Claims).

## Output Format
Return ONLY a JSON object with this exact structure. No markdown, no explanation, just JSON:
{
  "llm_readability": {
    "score": 75,
    "is_ai_parseable": true,
    "issues": ["Issue 1", "Issue 2"],
    "suggestions": ["Suggestion 1", "Suggestion 2"]
  },
  "entity_clarity": {
    "score": 65,
    "entities_found": ["Entity1", "Entity2"],
    "issues": ["Issue 1"],
    "suggestions": ["Suggestion 1"]
  },
  "fact_density": {
    "score": 60,
    "facts_found": 5,
    "avg_facts_per_section": 2,
    "issues": ["Issue 1"],
    "suggestions": ["Suggestion 1"]
  },
  "citation_readiness": {
    "score": 70,
    "is_authoritative": true,
    "has_unique_data": false,
    "issues": ["Issue 1"],
    "suggestions": ["Suggestion 1"]
  },
  "information_gain": {
    "score": 65,
    "unique_entities": 8,
    "data_density_ratio": 0.025,
    "unique_insights": ["Insight 1", "Insight 2"]
  },
  "hallucination_risk": {
    "score": 90,
    "risky_claims": [{"claim": "example claim", "context": "example context"}],
    "has_citations": true
  },
  "ai_summary": "Brief 2-3 sentence summary of the website's GEO readiness"
}`

  const userPrompt = `Analyze this website content for GEO (Generative Engine Optimization):

URL: ${url}
Title: ${seoResult.meta_tags.title || 'Unknown'}
Description: ${seoResult.meta_tags.description || 'None'}

CONTENT:
${textContent}

Evaluate the GEO readiness and return the JSON analysis.`

  try {
    const responseContent = await callAI(
      systemPrompt,
      userPrompt,
      'anthropic/claude-sonnet-4',
      1500
    )

    // Parse AI response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in AI response')
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Calculate overall GEO score
    const scores = [
      analysis.llm_readability?.score || 0,
      analysis.entity_clarity?.score || 0,
      analysis.fact_density?.score || 0,
      analysis.citation_readiness?.score || 0,
      analysis.information_gain?.score || 0,
      analysis.hallucination_risk?.score || 0,
    ]
    const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)

    // Determine readiness level
    let readinessLevel: GEOReadinessLevel
    if (avgScore >= 80) readinessLevel = 'excellent'
    else if (avgScore >= 65) readinessLevel = 'good'
    else if (avgScore >= 50) readinessLevel = 'moderate'
    else if (avgScore >= 35) readinessLevel = 'needs_work'
    else readinessLevel = 'poor'

    return {
      score: avgScore,
      readiness_level: readinessLevel,
      llm_readability: analysis.llm_readability,
      entity_clarity: analysis.entity_clarity,
      fact_density: analysis.fact_density,
      citation_readiness: analysis.citation_readiness,
      information_gain: analysis.information_gain,
      hallucination_risk: analysis.hallucination_risk,
      ai_summary: analysis.ai_summary || 'Analysis complete.',
    }
  } catch (error) {
    console.error('GEO AI analysis failed:', error)

    // Return default values on error
    return {
      score: 50,
      readiness_level: 'moderate',
      llm_readability: {
        score: 50,
        is_ai_parseable: true,
        issues: ['Unable to complete full analysis'],
        suggestions: ['Re-run analysis'],
      },
      entity_clarity: {
        score: 50,
        entities_found: [],
        issues: ['Unable to complete full analysis'],
        suggestions: [],
      },
      fact_density: {
        score: 50,
        facts_found: 0,
        avg_facts_per_section: 0,
        issues: ['Unable to complete full analysis'],
        suggestions: [],
      },
      citation_readiness: {
        score: 50,
        is_authoritative: false,
        has_unique_data: false,
        issues: ['Unable to complete full analysis'],
        suggestions: [],
      },
      information_gain: {
        score: 50,
        unique_entities: 0,
        data_density_ratio: 0,
        unique_insights: [],
      },
      hallucination_risk: {
        score: 50,
        risky_claims: [],
        has_citations: false,
      },
      ai_summary: 'Analysis could not be completed. Please try again.',
    }
  }
}

// ============================================
// CONTENT LEARNINGS FROM CONTENT QUEUE
// ============================================

/**
 * Gather content learnings from VERA's content queue
 * (Adapted from SAM's outreach-based learnings)
 */
export async function gatherContentLearnings(
  workspaceId: string
): Promise<ContentLearnings> {
  const supabase = createAdminClient()

  // Get content queue performance data (VERA's equivalent of outreach)
  const { data: contentItems } = await supabase
    .from('content_queue')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['approved', 'published', 'posted'])
    .order('created_at', { ascending: false })
    .limit(50)

  // Calculate content metrics
  const totalContent = contentItems?.length || 0
  const publishedContent = contentItems?.filter(
    (item: { status: string }) => item.status === 'published' || item.status === 'posted'
  ) || []
  const approvalRate =
    totalContent > 0
      ? Math.round((publishedContent.length / totalContent) * 100)
      : 0

  // Extract top performing content snippets
  const topPerforming: Array<{ message_snippet: string; response_rate: number }> = []
  if (contentItems) {
    for (const item of publishedContent.slice(0, 5)) {
      const content = (item as { generated_content?: string }).generated_content || ''
      if (content) {
        topPerforming.push({
          message_snippet: content.substring(0, 100) + '...',
          response_rate: 100, // Published = successful
        })
      }
    }
  }

  // Extract themes from content topics
  const themes: string[] = []
  if (contentItems) {
    for (const item of contentItems) {
      const topic = (item as { topic?: string }).topic
      if (topic) {
        themes.push(topic)
      }
    }
  }

  // Commenting data: empty for now, will come via MCP in the future
  const commentingData = {
    total_comments_posted: 0,
    avg_engagement_rate: 0,
    top_performing_comments: [] as Array<{
      comment_snippet: string
      post_topic: string
      engagement: number
    }>,
    topics_that_resonate: [] as string[],
  }

  // Analyze themes with AI if we have data
  const analyzedThemes = await analyzeThemes(topPerforming, [])

  return {
    outreach: {
      total_messages_sent: totalContent,
      response_rate: approvalRate,
      top_performing_messages: topPerforming
        .sort((a, b) => b.response_rate - a.response_rate)
        .slice(0, 3),
      themes_that_work: analyzedThemes.outreach_themes_work,
      themes_to_avoid: analyzedThemes.outreach_themes_avoid,
    },
    commenting: commentingData,
    combined_insights: {
      key_themes: analyzedThemes.key_themes,
      voice_characteristics: analyzedThemes.voice_characteristics,
      content_recommendations: analyzedThemes.content_recommendations,
    },
  }
}

/**
 * Analyze themes from performance data using AI via OpenRouter
 */
async function analyzeThemes(
  messages: Array<{ message_snippet: string; response_rate: number }>,
  comments: Array<{ comment_snippet: string; post_topic: string; engagement: number }>
): Promise<{
  outreach_themes_work: string[]
  outreach_themes_avoid: string[]
  key_themes: string[]
  voice_characteristics: string[]
  content_recommendations: string[]
}> {
  if (messages.length === 0 && comments.length === 0) {
    return {
      outreach_themes_work: [],
      outreach_themes_avoid: [],
      key_themes: [],
      voice_characteristics: [],
      content_recommendations: ['Generate more content to enable learning insights'],
    }
  }

  const prompt = `Analyze this content performance data to extract themes:

PUBLISHED CONTENT (with approval/performance rates):
${messages.map((m) => `- ${m.message_snippet} (${m.response_rate}% success rate)`).join('\n')}

COMMENTS/ENGAGEMENT:
${comments.map((c) => `- "${c.comment_snippet}" on topic: ${c.post_topic}`).join('\n')}

Return JSON with:
{
  "outreach_themes_work": ["Theme that got good engagement"],
  "outreach_themes_avoid": ["Theme that didn't work"],
  "key_themes": ["Main themes across all content"],
  "voice_characteristics": ["Characteristics of the voice/tone used"],
  "content_recommendations": ["Recommendations for future content"]
}`

  try {
    const responseContent = await callAISimple(
      prompt,
      'anthropic/claude-3.5-haiku',
      500
    )

    const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Theme analysis failed:', error)
  }

  return {
    outreach_themes_work: [],
    outreach_themes_avoid: [],
    key_themes: [],
    voice_characteristics: [],
    content_recommendations: [],
  }
}

// ============================================
// RECOMMENDATIONS GENERATION
// ============================================

/**
 * Generate content recommendations based on analysis
 */
export async function generateRecommendations(
  seoResult: SEOAnalysisResult,
  geoResult: GEOAnalysisResult,
  learnings: ContentLearnings
): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = []

  // ROI Configuration for Categories
  // If a category score is low, its multiplier increases
  const geoMultiplier = geoResult.score < 50 ? 1.5 : 1.2
  const seoMultiplier = seoResult.score < 50 ? 1.3 : 1.1

  // SEO Recommendations
  for (const issue of seoResult.meta_tags.issues) {
    const isMissing = issue.includes('Missing')
    const impact = isMissing ? 8 : 4
    const effort = 1 // Meta tags are quick
    recommendations.push({
      priority: impact >= 7 ? 'high' : 'medium',
      category: 'seo',
      title: `Fix: ${issue}`,
      description: 'This affects how search engines display your site.',
      implementation_steps: getStepsForIssue(issue, 'seo'),
      impact_estimate: 'Improves search visibility',
      impact_score: impact,
      effort_hours: effort,
      roi_multiplier: (impact / effort) * seoMultiplier,
    })
  }

  for (const issue of seoResult.structured_data.issues) {
    const impact = 6
    const effort = 2
    recommendations.push({
      priority: 'medium',
      category: 'seo',
      title: `Structured Data: ${issue}`,
      description: 'Structured data helps search engines understand your content.',
      implementation_steps: getStepsForIssue(issue, 'structured_data'),
      impact_estimate: 'Improves rich snippet eligibility',
      impact_score: impact,
      effort_hours: effort,
      roi_multiplier: (impact / effort) * seoMultiplier,
    })
  }

  // GEO Recommendations - Readability
  for (const suggestion of geoResult.llm_readability.suggestions) {
    const impact = 7
    const effort = 3
    recommendations.push({
      priority: 'high',
      category: 'geo',
      title: `Improve AI Readability: ${suggestion}`,
      description: 'Makes your content easier for AI systems to understand and cite.',
      implementation_steps: getStepsForSuggestion(suggestion),
      impact_estimate: 'Increases AI citation likelihood',
      impact_score: impact,
      effort_hours: effort,
      roi_multiplier: (impact / effort) * geoMultiplier,
    })
  }

  // GEO Recommendations - Citation/Authority
  for (const suggestion of geoResult.citation_readiness.suggestions) {
    const impact = 9
    const effort = 5 // Authority takes more work
    recommendations.push({
      priority: 'high',
      category: 'geo',
      title: `Citation Readiness: ${suggestion}`,
      description: 'Makes your content more likely to be cited by AI systems.',
      implementation_steps: getStepsForSuggestion(suggestion),
      impact_estimate: 'Improves AI sourcing probability',
      impact_score: impact,
      effort_hours: effort,
      roi_multiplier: (impact / effort) * geoMultiplier,
    })
  }

  // v2.4 New: Information Gain Recommendations
  if (geoResult.information_gain.score < 70) {
    recommendations.push({
      priority: 'high',
      category: 'geo',
      title: 'Increase Information Gain Density',
      description:
        'AI models prioritize content with unique entities and statistics relative to word count.',
      implementation_steps: [
        'Add original data or proprietary insights',
        'Incorporate specific statistics and unique entity definitions',
        'Reduce boilerplate and repetitive phrasing',
      ],
      impact_estimate: 'Critical for Perplexity and SearchGPT ranking',
      impact_score: 9,
      effort_hours: 8,
      roi_multiplier: (9 / 8) * geoMultiplier,
    })
  }

  // v2.4 New: Hallucination Risk Mitigation
  if (geoResult.hallucination_risk.score < 80) {
    recommendations.push({
      priority: 'high',
      category: 'geo',
      title: 'Mitigate Hallucination Risks',
      description: 'Bold claims without citations reduce trust in AI models.',
      implementation_steps: [
        'Add citations for all statistical claims',
        'Link to authoritative external sources (.gov, .edu, industry leaders)',
        'Qualify opinions versus objective facts',
      ],
      impact_estimate: 'Ensures AI systems feel safe recommending your brand',
      impact_score: 8,
      effort_hours: 4,
      roi_multiplier: (8 / 4) * geoMultiplier,
    })
  }

  // Content Recommendations from learnings
  for (const rec of learnings.combined_insights.content_recommendations) {
    const impact = 6
    const effort = 3
    recommendations.push({
      priority: 'medium',
      category: 'content',
      title: rec,
      description: 'Based on analysis of your content queue performance.',
      implementation_steps: [
        'Review your existing content',
        'Apply this insight to new content',
        'Track performance',
      ],
      impact_estimate: 'Improves engagement based on historical data',
      impact_score: impact,
      effort_hours: effort,
      roi_multiplier: (impact / effort) * 1.2,
    })
  }

  // Sort by ROI Multiplier (v2.4 Spec)
  recommendations.sort((a, b) => b.roi_multiplier - a.roi_multiplier)

  return recommendations.slice(0, 10) // Top 10 recommendations
}

function getStepsForIssue(issue: string, _category: string): string[] {
  if (issue.includes('title')) {
    return [
      'Update your page title to 50-60 characters',
      'Include your main keyword near the beginning',
      'Make it compelling and unique',
    ]
  }
  if (issue.includes('description')) {
    return [
      'Write a meta description of 150-160 characters',
      'Include your main value proposition',
      'Add a call-to-action',
    ]
  }
  if (issue.includes('JSON-LD') || issue.includes('structured data')) {
    return [
      'Add Organization schema to your homepage',
      'Add WebSite schema with search action',
      'Add relevant schema for your content type (Article, Product, etc.)',
    ]
  }
  if (issue.includes('sitemap')) {
    return [
      'Generate a sitemap.xml file',
      'Include all important pages',
      'Submit to Google Search Console',
    ]
  }
  return ['Review the issue', 'Implement the fix', 'Verify with testing tools']
}

function getStepsForSuggestion(suggestion: string): string[] {
  return [
    'Identify relevant pages/sections',
    suggestion,
    'Test with AI tools to verify improvement',
  ]
}

// ============================================
// EXECUTIVE SUMMARY GENERATION
// ============================================

export async function generateExecutiveSummary(
  url: string,
  seoScore: number,
  geoScore: number,
  seoResult: SEOAnalysisResult,
  geoResult: GEOAnalysisResult,
  learnings: ContentLearnings
): Promise<string> {
  const overallScore = Math.round((seoScore + geoScore) / 2)

  const prompt = `Write a 3-4 sentence executive summary of this website analysis:

Website: ${url}
Overall Score: ${overallScore}/100
SEO Score: ${seoScore}/100
GEO Score: ${geoScore}/100
GEO Readiness: ${geoResult.readiness_level}

Key SEO Issues: ${seoResult.technical_issues.slice(0, 3).join(', ') || 'None'}
Key GEO Insight: ${geoResult.ai_summary}

Content Performance: ${learnings.outreach.response_rate}% approval rate from ${learnings.outreach.total_messages_sent} content items
Comments Posted: ${learnings.commenting.total_comments_posted}

Write a brief, actionable summary focusing on what matters most. Start with the overall status, then mention 1-2 key priorities.`

  try {
    const responseContent = await callAISimple(
      prompt,
      'anthropic/claude-3.5-haiku',
      200
    )

    return responseContent.trim()
  } catch {
    return `Your website scores ${overallScore}/100 overall (SEO: ${seoScore}, GEO: ${geoScore}). ${geoResult.ai_summary}`
  }
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Run full website analysis
 */
export async function analyzeWebsite(
  workspaceId: string,
  websiteUrl: string,
  options: { depth?: AnalysisDepth; includeLearn?: boolean } = {}
): Promise<WebsiteAnalysisResult> {
  const { depth = 'standard', includeLearn = true } = options
  const supabase = createAdminClient()

  console.log(`[VERA] Starting website analysis for ${websiteUrl}`, {
    depth,
    includeLearn,
  })

  // Create initial record
  const { data: analysisRecord, error: createError } = await supabase
    .from('vera_website_analysis_results')
    .insert({
      workspace_id: workspaceId,
      website_url: websiteUrl,
      domain: extractDomain(websiteUrl),
      status: 'analyzing',
      seo_score: 0,
      geo_score: 0,
      overall_score: 0,
    })
    .select()
    .single()

  if (createError || !analysisRecord) {
    throw new Error(
      `Failed to create analysis record: ${createError?.message}`
    )
  }

  try {
    // Fetch website
    const fetchStart = Date.now()
    const fetched = await fetchWebsite(websiteUrl)
    console.log(`[VERA] Website fetched in ${fetched.fetch_time_ms}ms`)

    // Run SEO Analysis
    const seoResult = await analyzeSEO(fetched.html, fetched.url)
    console.log(`[VERA] SEO Score: ${seoResult.score}/100`)

    // Run GEO Analysis
    const geoResult = await analyzeGEO(fetched.html, fetched.url, seoResult)
    console.log(
      `[VERA] GEO Score: ${geoResult.score}/100 (${geoResult.readiness_level})`
    )

    // Gather content learnings (if enabled)
    let learnings: ContentLearnings = {
      outreach: {
        total_messages_sent: 0,
        response_rate: 0,
        top_performing_messages: [],
        themes_that_work: [],
        themes_to_avoid: [],
      },
      commenting: {
        total_comments_posted: 0,
        avg_engagement_rate: 0,
        top_performing_comments: [],
        topics_that_resonate: [],
      },
      combined_insights: {
        key_themes: [],
        voice_characteristics: [],
        content_recommendations: [],
      },
    }

    if (includeLearn) {
      learnings = await gatherContentLearnings(workspaceId)
      console.log('[VERA] Content learnings gathered')
    }

    // Generate recommendations
    const recommendations = await generateRecommendations(
      seoResult,
      geoResult,
      learnings
    )
    console.log(`[VERA] Generated ${recommendations.length} recommendations`)

    // Calculate overall score
    const overallScore = Math.round((seoResult.score + geoResult.score) / 2)

    // Generate executive summary
    const executiveSummary = await generateExecutiveSummary(
      websiteUrl,
      seoResult.score,
      geoResult.score,
      seoResult,
      geoResult,
      learnings
    )

    const analysisTime = Date.now() - fetchStart

    // Update record with results
    const { data: updatedRecord, error: updateError } = await supabase
      .from('vera_website_analysis_results')
      .update({
        status: 'completed',
        seo_score: seoResult.score,
        geo_score: geoResult.score,
        overall_score: overallScore,
        seo_results: seoResult,
        geo_results: geoResult,
        recommendations,
        executive_summary: executiveSummary,
        fetch_duration_ms: fetched.fetch_time_ms,
        analysis_duration_ms: analysisTime,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', analysisRecord.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update analysis: ${updateError.message}`)
    }

    console.log(
      `[VERA] Analysis complete. Overall score: ${overallScore}/100`
    )

    return {
      id: updatedRecord.id,
      workspace_id: workspaceId,
      website_url: websiteUrl,
      domain: extractDomain(websiteUrl),
      analyzed_at: updatedRecord.analyzed_at,
      status: 'completed',
      seo_score: seoResult.score,
      geo_score: geoResult.score,
      overall_score: overallScore,
      seo_results: seoResult,
      geo_results: geoResult,
      recommendations,
      executive_summary: executiveSummary,
      content_learnings: learnings,
    }
  } catch (error) {
    // Update record with failure
    await supabase
      .from('vera_website_analysis_results')
      .update({
        status: 'failed',
        executive_summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      .eq('id', analysisRecord.id)

    throw error
  }
}

// ============================================
// CONFIG MANAGEMENT
// ============================================

/**
 * Get AI Search Agent config for workspace
 */
export async function getAISearchConfig(
  workspaceId: string
): Promise<AISearchAgentConfig | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('vera_ai_search_config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows
    console.error('Failed to get AI search config:', error)
  }

  return data
}

/**
 * Create AI Search Agent config with locked website URL
 */
export async function createAISearchConfig(
  workspaceId: string,
  websiteUrl: string,
  options: Partial<AISearchAgentConfig> = {}
): Promise<AISearchAgentConfig> {
  const supabase = createAdminClient()

  // Check if config already exists
  const existing = await getAISearchConfig(workspaceId)
  if (existing) {
    throw new Error(
      'AI Search Agent is already configured for this workspace. Website URL cannot be changed.'
    )
  }

  const config: Partial<AISearchAgentConfig> = {
    workspace_id: workspaceId,
    website_url: websiteUrl,
    website_locked: true, // LOCKED - cannot be changed
    enabled: true,
    auto_analyze_prospects: false,
    analysis_depth: 'standard',
    check_meta_tags: true,
    check_structured_data: true,
    check_robots_txt: true,
    check_sitemap: true,
    check_llm_readability: true,
    check_entity_clarity: true,
    check_fact_density: true,
    check_citation_readiness: true,
    learn_from_content: true,
    learn_from_comments: true,
    ...options,
  }

  const { data, error } = await supabase
    .from('vera_ai_search_config')
    .insert(config)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create AI search config: ${error.message}`)
  }

  return data
}

/**
 * Update AI Search Agent config (website URL is LOCKED)
 */
export async function updateAISearchConfig(
  workspaceId: string,
  updates: Partial<Omit<AISearchAgentConfig, 'website_url' | 'workspace_id'>>
): Promise<AISearchAgentConfig> {
  const supabase = createAdminClient()

  // website_url is explicitly excluded from updates
  const safeUpdates = { ...updates }
  delete (safeUpdates as Record<string, unknown>).website_url
  delete (safeUpdates as Record<string, unknown>).workspace_id

  const { data, error } = await supabase
    .from('vera_ai_search_config')
    .update(safeUpdates)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update AI search config: ${error.message}`)
  }

  return data
}

// ============================================
// CONTENT STRATEGY GENERATION
// ============================================

/**
 * Generate AI-optimized content strategy based on analysis
 */
export async function generateContentStrategy(
  workspaceId: string
): Promise<{
  strategy: string
  content_pillars: string[]
  topics_to_cover: string[]
  format_recommendations: string[]
}> {
  const supabase = createAdminClient()

  // Get latest analysis
  const { data: latestAnalysis } = await supabase
    .from('vera_website_analysis_results')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'completed')
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single()

  if (!latestAnalysis) {
    return {
      strategy:
        'Run a website analysis first to generate a content strategy.',
      content_pillars: [],
      topics_to_cover: [],
      format_recommendations: [],
    }
  }

  // Get learnings
  const learnings = await gatherContentLearnings(workspaceId)

  const prompt = `Based on this website analysis and content performance data, create a content strategy for ranking in AI search engines:

WEBSITE: ${latestAnalysis.website_url}
GEO SCORE: ${latestAnalysis.geo_score}/100
GEO READINESS: ${latestAnalysis.geo_results?.readiness_level}

TOP PERFORMING THEMES: ${learnings.combined_insights.key_themes.join(', ') || 'Not enough data'}
VOICE CHARACTERISTICS: ${learnings.combined_insights.voice_characteristics.join(', ') || 'Not enough data'}
TOPICS THAT RESONATE: ${learnings.commenting.topics_that_resonate.join(', ') || 'Not enough data'}

KEY ISSUES:
${latestAnalysis.geo_results?.llm_readability?.issues?.join('\n') || 'None'}

Return JSON:
{
  "strategy": "2-3 paragraph content strategy summary",
  "content_pillars": ["Main theme 1", "Main theme 2", "Main theme 3"],
  "topics_to_cover": ["Specific topic 1", "Specific topic 2", "Specific topic 3", "Specific topic 4", "Specific topic 5"],
  "format_recommendations": ["Format recommendation 1", "Format recommendation 2", "Format recommendation 3"]
}`

  try {
    const responseContent = await callAI(
      'You are a content strategy expert specializing in AI search engine optimization. Return only valid JSON.',
      prompt,
      'anthropic/claude-sonnet-4',
      1000
    )

    const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Content strategy generation failed:', error)
  }

  return {
    strategy: 'Unable to generate strategy. Please try again.',
    content_pillars: [],
    topics_to_cover: [],
    format_recommendations: [],
  }
}
