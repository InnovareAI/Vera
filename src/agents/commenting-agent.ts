/**
 * LinkedIn Commenting Agent Service (Vera.AI)
 *
 * Generates AI-powered comments for LinkedIn posts.
 * Uses Anthropic SDK directly (Claude SDK) for agent reasoning.
 *
 * Ported from SAM's linkedin-commenting-agent.ts
 * Adapted for Vera.AI: Anthropic SDK direct, vera_ table prefixes, createAdminClient()
 *
 * Updated Nov 29, 2025: Migrated to Claude Direct API for GDPR compliance
 * Updated Dec 7, 2025: Switched to Haiku 4.5 for cost optimization
 * Updated Dec 11, 2025: Added comment variance for anti-detection
 * Updated Jan 13, 2026: Added fact extraction to prevent hallucination + comment type variety
 * Updated Feb 2026: Ported to Vera.AI with Anthropic SDK direct
 */

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getCommentVarianceContext,
  buildVariancePromptInstructions,
  type CommentVarianceContext
} from '@/agents/commenting-agent/comment-variance'
import { containsBannedPhrase } from '@/agents/commenting-agent/banned-phrases'

// ============================================
// ANTHROPIC CLIENT
// ============================================

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

const MODELS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-5-20250929',
} as const

async function chatWithClaude(options: {
  model: string
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens?: number
  temperature?: number
}): Promise<{ content: string; model: string; usage: { totalTokens: number } }> {
  const client = getClient()
  const response = await client.messages.create({
    model: options.model,
    max_tokens: options.maxTokens || 300,
    temperature: options.temperature || 0.7,
    system: options.system,
    messages: options.messages,
  })
  const textBlock = response.content.find(b => b.type === 'text')
  return {
    content: textBlock?.text || '',
    model: response.model,
    usage: { totalTokens: response.usage.input_tokens + response.usage.output_tokens }
  }
}

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Extracted facts from post content - used to prevent AI hallucination
 * The AI should ONLY reference these verified facts when mentioning specifics
 */
export interface ExtractedFacts {
  numbers: string[];        // "40% growth", "500 customers", "$2M revenue"
  quotes: string[];         // Direct quotes from the post
  claims: string[];         // Key claims or assertions made
  results: string[];        // Outcomes/results mentioned
  names: string[];          // People/companies mentioned (not author)
  hasQuestion: boolean;     // Does the post ask a question?
  questionText?: string;    // The actual question if present
}

/**
 * Comment type suggestions for engagement variety
 */
export type CommentEngagementType =
  | 'reference_result'      // Mention a specific result/number from post
  | 'ask_followup'          // Ask a thoughtful follow-up question
  | 'share_experience'      // Share related personal experience
  | 'add_perspective'       // Add a different angle/perspective
  | 'agree_and_extend'      // Agree with a point and extend it
  | 'gentle_challenge';     // Respectfully push back on a point

export interface LinkedInPost {
  id: string;
  post_linkedin_id: string;
  post_social_id: string;
  post_text: string;
  post_type: string;
  post_intent?: string; // 'question' | 'thought_leadership' | 'announcement'
  author: {
    linkedin_id: string;
    name: string;
    title?: string;
    company?: string;
    profile_url?: string;
  };
  engagement: {
    likes_count: number;
    comments_count: number;
    shares_count: number;
  };
  posted_at: Date;
  discovered_via_monitor_type?: string;
  matched_keywords?: string[];
}

/**
 * Comprehensive Brand Guidelines from vera_linkedin_brand_guidelines table
 */
export interface BrandGuidelines {
  id?: string;

  // Section 1: Quick Settings
  tone: 'professional' | 'friendly' | 'casual' | 'passionate';
  formality: 'formal' | 'semi_formal' | 'informal';
  comment_length: 'short' | 'medium' | 'long';
  question_frequency: 'frequently' | 'sometimes' | 'rarely' | 'never';
  perspective_style: 'supportive' | 'additive' | 'thought_provoking';
  confidence_level: 'assertive' | 'balanced' | 'humble';
  use_workspace_knowledge: boolean;

  // Section 2: Your Expertise
  what_you_do?: string;
  what_youve_learned?: string;
  pov_on_future?: string;
  industry_talking_points?: string;

  // Section 3: Brand Voice
  voice_reference?: string;
  tone_of_voice: string;
  writing_style?: string;
  dos_and_donts?: string;

  // Section 4: Vibe Check
  okay_funny: boolean;
  okay_blunt: boolean;
  casual_openers: boolean;
  personal_experience: boolean;
  strictly_professional: boolean;

  // Section 5: Comment Framework
  framework_preset: 'aca_i' | 'var' | 'hook_value_bridge' | 'custom';
  custom_framework?: string;
  max_characters: number;

  // Section 6: Example Comments
  example_comments?: string[];
  admired_comments?: string[];

  // Section 7: Relationship & Context
  default_relationship_tag: 'prospect' | 'client' | 'peer' | 'thought_leader' | 'unknown';
  comment_scope: 'my_expertise' | 'expertise_adjacent' | 'anything_relevant';
  auto_skip_generic: boolean;
  post_age_awareness: boolean;
  recent_comment_memory: boolean;

  // Section 8: Guardrails
  competitors_never_mention?: string[];
  end_with_cta: 'never' | 'occasionally' | 'when_relevant';
  cta_style: 'question_only' | 'soft_invitation' | 'direct_ask';

  // Section 9: Scheduling
  timezone?: string;
  posting_start_time?: string;
  posting_end_time?: string;
  post_on_weekends?: boolean;
  post_on_holidays?: boolean;

  // Section 10: Advanced
  system_prompt?: string;

  // Section 11: VIP/Priority Profiles
  priority_profiles?: PriorityProfile[];

  // Section 12: Opportunity Digest
  opportunity_digest_enabled?: boolean;
  opportunity_digest_time?: string;
}

/**
 * VIP/Priority Profile for special comment treatment
 */
export interface PriorityProfile {
  profile_id: string;           // LinkedIn profile ID
  profile_url?: string;         // LinkedIn profile URL
  name: string;                 // Display name
  relationship: 'partner' | 'client' | 'friend' | 'prospect' | 'thought_leader';
  tone_override?: string;       // Custom tone instruction for AI
  never_miss?: boolean;         // If true, always prioritize their posts
  notes?: string;               // Additional context for the AI
}

// Legacy interface for backwards compatibility
export interface CommentingAgentSettings {
  tone: 'professional' | 'friendly' | 'casual' | 'passionate';
  formality: 'formal' | 'semi-formal' | 'informal';
  commentLength: 'short' | 'medium' | 'long';
  questionFrequency: 'frequently' | 'sometimes' | 'rarely' | 'never';
  useKnowledgeBase: boolean;
  personalityDocument: string;
}

export interface WorkspaceContext {
  workspace_id: string;
  company_name: string;
  expertise_areas: string[];
  products: string[];
  value_props: string[];
  tone_of_voice: string;
  knowledge_base_snippets?: string[];
  commenting_agent_settings?: CommentingAgentSettings;
  // Comprehensive brand guidelines from vera_linkedin_brand_guidelines table
  brand_guidelines?: BrandGuidelines;
  // Full KB context when use_workspace_knowledge is enabled
  knowledge_base_context?: string;
}

export interface ProspectContext {
  is_prospect: boolean;
  prospect_id?: string;
  campaign_id?: string;
  relationship_stage?: string; // 'contacted', 'replied', 'engaged'
  notes?: string;
}

export interface ConversationThread {
  id: string;
  thread_type: 'comment' | 'reply' | 'dm' | 'digest_response';
  our_message: string;
  their_response: string;
  status: 'open' | 'resolved' | 'stale';
  created_at: string;
}

export interface PromiseRecord {
  id: string;
  promise_text: string;
  context: string;
  status: 'pending' | 'fulfilled' | 'acknowledged_missed';
  due_date?: string;
}

export interface PersonalNote {
  id: string;
  note: string;
  category: 'family' | 'work' | 'hobby' | 'challenge' | 'win' | 'other';
  created_at: string;
}

export interface RelationshipMemory {
  threads: ConversationThread[];
  promises: PromiseRecord[];
  notes: PersonalNote[];
  responses: any[];
  temperature: 'cold' | 'warming' | 'warm' | 'hot';
}

export interface CommentGenerationContext {
  post: LinkedInPost;
  workspace: WorkspaceContext;
  prospect?: ProspectContext;
  memory?: RelationshipMemory; // Relationship context from past interactions
}

export interface GeneratedComment {
  comment_text: string;
  confidence_score: number; // 0.00-1.00
  reasoning: string;
  quality_indicators: {
    adds_value: boolean;
    on_topic: boolean;
    appropriate_tone: boolean;
    avoids_sales_pitch: boolean;
    references_post_specifically: boolean;
  };
  should_auto_post: boolean; // confidence >= 0.80
  generation_metadata: {
    model: string;
    tokens_used: number;
    generation_time_ms: number;
  };
  vip_match?: PriorityProfile; // If author was a VIP
  // Fact extraction and suggestions for HITL review
  extracted_facts?: ExtractedFacts;  // Verified facts from the post
  suggested_approaches?: { type: CommentEngagementType; reason: string; prompt: string }[];
}

// ============================================
// FACT EXTRACTION (Anti-Hallucination)
// ============================================

/**
 * Extract verifiable facts from post content
 * This prevents AI from hallucinating numbers, quotes, or results
 */
export function extractFactsFromPost(postContent: string): ExtractedFacts {
  const facts: ExtractedFacts = {
    numbers: [],
    quotes: [],
    claims: [],
    results: [],
    names: [],
    hasQuestion: false,
    questionText: undefined
  };

  if (!postContent) return facts;

  // Extract numbers with context (percentages, money, counts)
  const numberPatterns = [
    /(\d+(?:\.\d+)?%\s*(?:growth|increase|decrease|improvement|reduction|more|less|higher|lower)?)/gi,
    /(\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|M|B|K))?)/gi,
    /([\d,]+(?:\+)?\s*(?:customers|users|clients|employees|team members|downloads|subscribers|followers))/gi,
    /(\d+(?:\.\d+)?x\s*(?:growth|increase|improvement|return|ROI)?)/gi,
    /([\d,]+\s*(?:hours|days|weeks|months|years)\s*(?:of|in|to)?)/gi,
    /(\d+\s*(?:out of|\/)\s*\d+)/gi
  ];

  for (const pattern of numberPatterns) {
    const matches = postContent.match(pattern);
    if (matches) {
      facts.numbers.push(...matches.map(m => m.trim()));
    }
  }

  // Dedupe numbers
  facts.numbers = [...new Set(facts.numbers)];

  // Extract direct quotes (text in quotation marks)
  const quoteMatches = postContent.match(/"([^"]+)"/g);
  if (quoteMatches) {
    facts.quotes = quoteMatches.map(q => q.replace(/"/g, '').trim()).slice(0, 3);
  }

  // Extract result-oriented phrases
  const resultPatterns = [
    /(?:resulted in|led to|achieved|accomplished|reached|hit|generated|drove|delivered)\s+([^.!?\n]+)/gi,
    /(?:we|I|our team)\s+(?:saw|experienced|noticed|found)\s+([^.!?\n]+)/gi,
    /(?:outcome|result|impact)(?:\s+was)?:?\s*([^.!?\n]+)/gi
  ];

  for (const pattern of resultPatterns) {
    let match;
    while ((match = pattern.exec(postContent)) !== null) {
      if (match[1] && match[1].length > 10 && match[1].length < 100) {
        facts.results.push(match[1].trim());
      }
    }
  }
  facts.results = facts.results.slice(0, 3);

  // Detect questions
  const questionMatch = postContent.match(/([^.!]*\?)/g);
  if (questionMatch && questionMatch.length > 0) {
    facts.hasQuestion = true;
    // Get the most meaningful question (longest, not just "right?" or "agree?")
    const meaningfulQuestion = questionMatch
      .filter(q => q.length > 15)
      .sort((a, b) => b.length - a.length)[0];
    if (meaningfulQuestion) {
      facts.questionText = meaningfulQuestion.trim();
    }
  }

  // Extract key claims (statements with strong verbs)
  const claimPatterns = [
    /(?:the key is|the secret is|what matters is|the truth is|here's what I learned)\s*:?\s*([^.!?\n]+)/gi,
    /(?:you should|you must|you need to|always|never)\s+([^.!?\n]+)/gi
  ];

  for (const pattern of claimPatterns) {
    let match;
    while ((match = pattern.exec(postContent)) !== null) {
      if (match[1] && match[1].length > 10 && match[1].length < 150) {
        facts.claims.push(match[1].trim());
      }
    }
  }
  facts.claims = facts.claims.slice(0, 3);

  return facts;
}

// ============================================
// LANGUAGE DETECTION
// ============================================

/**
 * Robust English language detection
 * Uses a combination of:
 * 1. English-exclusive words (words that don't exist in Spanish/Portuguese/French/German)
 * 2. Non-English word detection (if we find Spanish/Portuguese words, reject)
 * 3. Higher threshold for common words
 */
export function isEnglishText(text: string): boolean {
  if (!text || text.length < 20) return false;

  // Normalize text: lowercase, remove URLs, mentions, hashtags
  const cleanText = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@\w+/g, '')
    .replace(/#\w+/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanText.split(' ').filter(w => w.length > 1);
  if (words.length < 5) return false;

  // SPANISH/PORTUGUESE/FRENCH/GERMAN DETECTION
  const nonEnglishWords = [
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al', 'es', 'esta', 'son', 'estan', 'ser', 'estar', 'fue', 'sido', 'siendo',
    'para', 'por', 'con', 'sin', 'sobre', 'entre', 'hacia', 'desde', 'hasta', 'pero', 'porque', 'como', 'cuando', 'donde', 'quien', 'cual', 'cuyo',
    'nao', 'sim', 'muito', 'pouco', 'mais', 'menos', 'bem', 'mal', 'isso', 'isto', 'aquilo', 'voce', 'eles', 'elas', 'dele', 'dela', 'meu', 'minha',
    'onde', 'quando', 'porque', 'como', 'qual', 'tudo', 'nada', 'algo', 'alguem', 'ninguem', 'qualquer'
  ];

  let nonEnglishWordCount = 0;
  for (const word of words) {
    if (nonEnglishWords.includes(word)) {
      nonEnglishWordCount++;
    }
  }

  // If more than 5% of words are clearly non-English, reject
  if (nonEnglishWordCount / words.length > 0.05) return false;

  // English-EXCLUSIVE words
  const englishExclusiveWords = [
    'the', 'be', 'have', 'it', 'for', 'not', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'will', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'when', 'make', 'can', 'like', 'time', 'just'
  ];

  let englishWordCount = 0;
  for (const word of words) {
    if (englishExclusiveWords.includes(word)) {
      englishWordCount++;
    }
  }

  return (englishWordCount / words.length) >= 0.20;
}

// ============================================
// COMMENT TYPE SUGGESTIONS
// ============================================

/**
 * Suggest comment engagement types based on post content and extracted facts
 * Returns 2-3 suggested approaches ranked by likely engagement
 */
export function suggestCommentTypes(
  facts: ExtractedFacts,
  postLength: number
): { type: CommentEngagementType; reason: string; prompt: string }[] {
  const suggestions: { type: CommentEngagementType; reason: string; prompt: string }[] = [];

  // If post has specific numbers/results, referencing them is powerful
  if (facts.numbers.length > 0 || facts.results.length > 0) {
    suggestions.push({
      type: 'reference_result',
      reason: 'Post contains specific results that can be referenced',
      prompt: `Reference one of these VERIFIED facts in your comment: ${[...facts.numbers, ...facts.results].slice(0, 3).join(', ')}. Use the EXACT number/result - do not paraphrase or change it.`
    });
  }

  // If post asks a question, answer it
  if (facts.hasQuestion && facts.questionText) {
    suggestions.push({
      type: 'ask_followup',
      reason: 'Post asks a question that should be answered',
      prompt: `The author asks: "${facts.questionText}" - Answer this directly first, then optionally add your perspective.`
    });
  }

  // For longer posts, adding perspective works well
  if (postLength > 400) {
    suggestions.push({
      type: 'add_perspective',
      reason: 'Longer post has room for a different angle',
      prompt: 'Add a complementary perspective or angle the author didn\'t cover. Don\'t just agree - add something new.'
    });
  }

  // Share experience is always authentic
  suggestions.push({
    type: 'share_experience',
    reason: 'Personal experience adds authenticity',
    prompt: 'Share a brief, relevant personal experience (1-2 sentences). Start with "We found..." or "In my experience..." or "We tried X and..."'
  });

  // For posts with claims, gentle challenge can drive engagement
  if (facts.claims.length > 0) {
    suggestions.push({
      type: 'gentle_challenge',
      reason: 'Post makes claims that could be explored further',
      prompt: `Consider respectfully exploring this claim: "${facts.claims[0]}". You can agree with nuance, or ask "Have you found this applies to X situation too?"`
    });
  }

  // If post has quotes, extending them works
  if (facts.quotes.length > 0) {
    suggestions.push({
      type: 'agree_and_extend',
      reason: 'Post has quotable content to build on',
      prompt: `Build on this quote from the post: "${facts.quotes[0]}". Agree with it and add your own take.`
    });
  }

  // Return top 3 suggestions
  return suggestions.slice(0, 3);
}

// ============================================
// HELPERS
// ============================================

/**
 * Find a priority profile by LinkedIn profile ID
 *
 * @param profiles - Array of priority profiles from brand guidelines
 * @param authorProfileId - LinkedIn profile ID of the post author
 * @returns Matching priority profile or undefined
 */
function findPriorityProfile(
  profiles: PriorityProfile[] | undefined,
  authorProfileId: string | undefined
): PriorityProfile | undefined {
  if (!profiles || profiles.length === 0 || !authorProfileId) {
    return undefined;
  }

  // Direct match on profile_id
  const match = profiles.find(p => p.profile_id === authorProfileId);
  if (match) {
    console.log(`[Vera.AI] VIP Match found: ${match.name} (${match.relationship})`);
    return match;
  }

  return undefined;
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
}

// ============================================
// RELATIONSHIP MEMORY
// ============================================

/**
 * Fetch relationship memory for a person (prospect)
 * Note: Vera.AI may not have conversation_threads/promises/personal_notes tables yet,
 * so this gracefully handles missing tables with try/catch returning empty memory.
 */
export async function fetchRelationshipMemory(
  workspaceId: string,
  personId: string
): Promise<RelationshipMemory> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Gracefully handle missing tables - Vera.AI may not have all relationship tables yet
  let threads: any[] = [];
  let promises: any[] = [];
  let notes: any[] = [];
  let responses: any[] = [];

  try {
    const { data } = await supabase
      .from('vera_conversation_threads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('person_id', personId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    threads = data || [];
  } catch (err) {
    console.warn('[Vera.AI] conversation_threads table not available yet:', err);
  }

  try {
    const { data } = await supabase
      .from('vera_promises')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('person_id', personId)
      .eq('status', 'pending');
    promises = data || [];
  } catch (err) {
    console.warn('[Vera.AI] promises table not available yet:', err);
  }

  try {
    const { data } = await supabase
      .from('vera_personal_notes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('person_id', personId)
      .order('created_at', { ascending: false });
    notes = data || [];
  } catch (err) {
    console.warn('[Vera.AI] personal_notes table not available yet:', err);
  }

  try {
    const { data } = await supabase
      .from('vera_digest_responses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('person_id', personId)
      .order('created_at', { ascending: false });
    responses = data || [];
  } catch (err) {
    console.warn('[Vera.AI] digest_responses table not available yet:', err);
  }

  // Determine relationship temperature
  const interactionCount = threads.length + responses.length;
  let temperature: RelationshipMemory['temperature'] = 'cold';
  if (interactionCount >= 10) temperature = 'hot';
  else if (interactionCount >= 5) temperature = 'warm';
  else if (interactionCount >= 2) temperature = 'warming';

  return {
    threads: threads as ConversationThread[],
    promises: promises as PromiseRecord[],
    notes: notes as PersonalNote[],
    responses,
    temperature
  };
}

// ============================================
// MAIN COMMENT GENERATION
// ============================================

/**
 * Generate LinkedIn comment for a post
 */
export async function generateLinkedInComment(
  context: CommentGenerationContext
): Promise<GeneratedComment> {
  const startTime = Date.now();

  // CRITICAL SAFETY CHECK: Never generate comment for posts without content
  const postContent = context.post.post_text?.trim();
  if (!postContent || postContent.length < 20) {
    console.error('[Vera.AI] REFUSED: Cannot generate comment - post has no content or too short');
    throw new Error('POST_CONTENT_MISSING: Cannot generate comment for post without content. This prevents garbage comments.');
  }

  // CRITICAL: English language enforcement
  // Even if a post bypassed discovery filters, we double check here.
  // This prevents non-English comments from being generated.
  if (!isEnglishText(postContent)) {
    console.error('[Vera.AI] REFUSED: Non-English content detected in generation phase');
    throw new Error('NON_ENGLISH_CONTENT: Agent is configured for English only engagement. This prevents generating Spanish/Portuguese comments.');
  }

  // Fetch relationship memory if we have a prospect ID and memory wasn't provided
  if (!context.memory && context.prospect?.prospect_id) {
    try {
      context.memory = await fetchRelationshipMemory(context.workspace.workspace_id, context.prospect.prospect_id);
    } catch (err) {
      console.warn('[Vera.AI] Failed to fetch relationship memory:', err);
    }
  }

  // ANTI-DETECTION: Context-aware variance for every comment
  // Short posts get short comments, long posts get longer comments
  const postLength = postContent.length;
  const varianceContext = getCommentVarianceContext(postLength);

  // ANTI-HALLUCINATION: Extract verifiable facts from post
  // AI will ONLY be allowed to reference these verified facts
  const extractedFacts = extractFactsFromPost(postContent);
  const suggestedApproaches = suggestCommentTypes(extractedFacts, postLength);

  console.log('[Vera.AI] Generating LinkedIn comment:', {
    post_id: context.post.id,
    author: context.post.author.name,
    is_prospect: context.prospect?.is_prospect || false,
    post_length: postLength,
    variance: {
      targetLength: varianceContext.targetLength,
      category: varianceContext.lengthCategory,
      type: varianceContext.commentType,
      isContextAware: varianceContext.isContextAware,
      lengthReason: varianceContext.lengthReason
    },
    extracted_facts: {
      numbers: extractedFacts.numbers.length,
      quotes: extractedFacts.quotes.length,
      results: extractedFacts.results.length,
      hasQuestion: extractedFacts.hasQuestion
    },
    suggested_approaches: suggestedApproaches.map(s => s.type)
  });

  // Build AI prompt with variance instructions AND extracted facts
  const systemPrompt = buildCommentSystemPrompt(context, varianceContext, extractedFacts, suggestedApproaches);
  const userPrompt = buildCommentUserPrompt(context.post, varianceContext, extractedFacts);

  // Generate comment via Anthropic SDK (Claude Direct)
  // Using Haiku 4.5 for fast, cost-effective comment generation
  const response = await chatWithClaude({
    model: MODELS.HAIKU,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    maxTokens: 300,
    temperature: 0.7
  });

  const aiResponse = response.content;

  // Parse AI response (expecting JSON)
  let parsedResponse: any;
  try {
    // Extract JSON from response (AI might wrap it in markdown)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in AI response');
    }
  } catch (error) {
    console.error('[Vera.AI] Failed to parse AI response:', aiResponse);
    throw new Error('Invalid AI response format');
  }

  const generationTime = Date.now() - startTime;

  // Calculate confidence score based on quality indicators
  const confidenceScore = calculateConfidenceScore(
    parsedResponse,
    context.post,
    context.workspace,
    context.prospect
  );

  // Extract comment text
  const commentText = parsedResponse.comment_text || parsedResponse.comment || '';

  // CRITICAL: Validate no garbage/fallback content was generated
  const garbagePhrases = [
    'came through empty', 'content didn\'t load', 'mind reposting',
    'dropping it in the comments', 'post might have come through',
    'couldn\'t see', 'unable to see', 'can\'t see', 'not showing up',
    'not loading', 'post is blank', 'empty post', 'didn\'t load', 'couldn\'t load'
  ];
  const commentLower = commentText.toLowerCase();
  if (garbagePhrases.some(phrase => commentLower.includes(phrase))) {
    console.error('[Vera.AI] REJECTED: AI generated garbage/fallback comment');
    throw new Error('GARBAGE_COMMENT: AI generated placeholder content. Post may have been missing content.');
  }

  // Check for VIP match
  const bg = context.workspace.brand_guidelines;
  const vipMatch = findPriorityProfile(bg?.priority_profiles, context.post.author.linkedin_id);

  const generatedComment: GeneratedComment = {
    comment_text: commentText,
    confidence_score: confidenceScore,
    reasoning: parsedResponse.reasoning || 'Generated with high quality',
    quality_indicators: {
      adds_value: parsedResponse.adds_value !== false,
      on_topic: parsedResponse.on_topic !== false,
      appropriate_tone: parsedResponse.appropriate_tone !== false,
      avoids_sales_pitch: parsedResponse.avoids_sales_pitch !== false,
      references_post_specifically: parsedResponse.references_post_specifically !== false
    },
    should_auto_post: confidenceScore >= 0.80,
    generation_metadata: {
      model: response.model,
      tokens_used: response.usage.totalTokens,
      generation_time_ms: generationTime
    },
    vip_match: vipMatch,
    // Include extracted facts and suggestions for HITL review
    extracted_facts: extractedFacts,
    suggested_approaches: suggestedApproaches
  };

  console.log('[Vera.AI] Comment generated:', {
    post_id: context.post.id,
    confidence: confidenceScore,
    auto_post: generatedComment.should_auto_post,
    length: generatedComment.comment_text.length
  });

  return generatedComment;
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

/**
 * Build system prompt for comment generation
 * Uses comprehensive brand guidelines when available
 * Includes variance context for anti-detection and extracted facts for anti-hallucination
 */
function buildCommentSystemPrompt(
  context: CommentGenerationContext,
  varianceContext?: CommentVarianceContext,
  extractedFacts?: ExtractedFacts,
  suggestedApproaches?: { type: CommentEngagementType; reason: string; prompt: string }[]
): string {
  const { workspace, prospect, post } = context;
  const bg = workspace.brand_guidelines;
  const legacySettings = workspace.commenting_agent_settings;

  // If we have a custom system prompt override, use it as the base
  if (bg?.system_prompt && bg.system_prompt.trim().length > 0) {
    return buildCustomSystemPrompt(context, bg.system_prompt);
  }

  // Determine settings (prefer brand_guidelines, fallback to legacy)
  const tone = bg?.tone || legacySettings?.tone || 'professional';
  const formality = bg?.formality || legacySettings?.formality?.replace('-', '_') || 'semi_formal';
  const commentLength = bg?.comment_length || legacySettings?.commentLength || 'medium';
  const questionFreq = bg?.question_frequency || legacySettings?.questionFrequency || 'sometimes';
  const maxChars = bg?.max_characters || 300;

  // Style descriptions
  const toneDescriptions: Record<string, string> = {
    professional: 'professional and business-like',
    friendly: 'warm, friendly, and approachable',
    casual: 'casual, relaxed, and conversational',
    passionate: 'enthusiastic and passionate'
  };

  const formalityDescriptions: Record<string, string> = {
    formal: 'Use formal language and proper grammar. Avoid contractions and slang.',
    semi_formal: 'Use professional but conversational language. Contractions are fine.',
    informal: 'Use casual, everyday language. Be relaxed and natural.'
  };

  const lengthGuidelines: Record<string, string> = {
    short: `1-2 sentences (under ${Math.floor(maxChars * 0.5)} characters)`,
    medium: `2-3 sentences (${Math.floor(maxChars * 0.5)}-${maxChars} characters)`,
    long: `3-4 sentences (up to ${maxChars} characters)`
  };

  const questionGuidelines: Record<string, string> = {
    frequently: 'Try to end most comments with a thoughtful question to encourage dialogue.',
    sometimes: 'Include a question in about half of your comments when it feels natural.',
    rarely: 'Only ask a question if it adds significant value to the conversation.',
    never: 'Do not ask questions. Make statements and share insights instead.'
  };

  const perspectiveDescriptions: Record<string, string> = {
    supportive: 'Be supportive and affirming. Validate the author\'s points and add encouragement.',
    additive: 'Add new insight or perspective. Build on what they said with your own experience.',
    thought_provoking: 'Challenge ideas constructively. Ask deeper questions that make people think.'
  };

  const confidenceDescriptions: Record<string, string> = {
    assertive: 'Speak with confidence and authority. Use definitive statements.',
    balanced: 'Share insights confidently while remaining open to other views.',
    humble: 'Be curious and open. Use phrases like "I\'ve found that..." or "In my experience..."'
  };

  // Comment framework descriptions
  const frameworkDescriptions: Record<string, string> = {
    aca_i: 'ACA+I Framework: Acknowledge their point -> Add your insight/nuance -> Drop an I-statement from experience -> Ask a warm question',
    var: 'VAR Framework: Validate their perspective -> Add your own perspective -> Relate it back to the original topic',
    hook_value_bridge: 'Hook-Value-Bridge: Start with an intriguing hook -> Deliver real value -> Bridge to continued conversation',
    custom: bg?.custom_framework || 'Use your best judgment for structure'
  };

  let prompt = `You are a LinkedIn engagement specialist helping ${workspace.company_name} build authentic relationships through thoughtful commenting.

## CRITICAL: RESPONSE LANGUAGE
- ALWAYS generate the comment in ENGLISH.
- Even if the post contains foreign words or names, the host voice and core response must be in English.
- Use natural, business-level English as spoken in ${workspace.brand_guidelines?.timezone?.includes('Europe') ? 'the UK' : 'the US'}.

## Your Identity & Expertise`;

  // Add expertise section if available
  if (bg?.what_you_do) {
    prompt += `\n\n**What You Do**: ${bg.what_you_do}`;
  }
  if (bg?.what_youve_learned) {
    prompt += `\n\n**Key Lessons Learned**: ${bg.what_youve_learned}`;
  }
  if (bg?.pov_on_future) {
    prompt += `\n\n**Your POV on the Future**: ${bg.pov_on_future}`;
  }
  if (bg?.industry_talking_points) {
    prompt += `\n\n**Industry Talking Points**: ${bg.industry_talking_points}`;
  }

  // Company context
  prompt += `\n\n## Company Context
- Company: ${workspace.company_name}
- Expertise: ${workspace.expertise_areas.join(', ') || 'B2B Sales'}
- Products/Services: ${workspace.products.join(', ') || 'Not specified'}`;

  // Brand Voice section
  if (bg?.tone_of_voice || bg?.writing_style || bg?.voice_reference) {
    prompt += `\n\n## Brand Voice (FOLLOW CAREFULLY)`;
    if (bg.voice_reference) {
      prompt += `\n**Voice Reference**: ${bg.voice_reference}`;
    }
    if (bg.tone_of_voice) {
      prompt += `\n**Tone of Voice**: ${bg.tone_of_voice}`;
    }
    if (bg.writing_style) {
      prompt += `\n**Writing Style**: ${bg.writing_style}`;
    }
  }

  // Dos and Don'ts
  if (bg?.dos_and_donts) {
    prompt += `\n\n## Do's and Don'ts (CRITICAL)
${bg.dos_and_donts}`;
  }

  // Vibe Check - what's okay
  if (bg) {
    const vibeOkay: string[] = [];
    const vibeNotOkay: string[] = [];

    if (bg.okay_funny) vibeOkay.push('Light humor when appropriate');
    else vibeNotOkay.push('No jokes or humor');

    if (bg.okay_blunt) vibeOkay.push('Direct, blunt statements');
    else vibeNotOkay.push('Avoid being too direct or blunt');

    if (bg.casual_openers) vibeOkay.push('Casual, friendly openers');
    else vibeNotOkay.push('Keep openers professional');

    if (bg.personal_experience) vibeOkay.push('Share personal anecdotes and experiences');
    else vibeNotOkay.push('Avoid personal anecdotes');

    if (bg.strictly_professional) {
      vibeNotOkay.push('Keep everything strictly professional - no casual elements');
    }

    if (vibeOkay.length > 0 || vibeNotOkay.length > 0) {
      prompt += `\n\n## Vibe Check`;
      if (vibeOkay.length > 0) {
        prompt += `\n**Okay**: ${vibeOkay.join(', ')}`;
      }
      if (vibeNotOkay.length > 0) {
        prompt += `\n**Avoid**: ${vibeNotOkay.join(', ')}`;
      }
    }
  }

  // Knowledge Base Context (when enabled)
  if (bg?.use_workspace_knowledge && workspace.knowledge_base_context) {
    prompt += `\n\n## Company Knowledge Base (Use for context and insights)
${workspace.knowledge_base_context}`;
  } else if (workspace.knowledge_base_snippets && workspace.knowledge_base_snippets.length > 0) {
    prompt += `\n\n## Company Knowledge (Use for context)
${workspace.knowledge_base_snippets.slice(0, 3).join('\n')}`;
  }

  // Example Comments
  if (bg?.example_comments && bg.example_comments.length > 0) {
    prompt += `\n\n## Example Comments (Mimic this style)
${bg.example_comments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}`;
  }

  if (bg?.admired_comments && bg.admired_comments.length > 0) {
    prompt += `\n\n## Comments I Admire (Draw inspiration from)
${bg.admired_comments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}`;
  }

  // Communication Style Settings
  prompt += `\n\n## Communication Style
- **Tone**: ${toneDescriptions[tone]}
- **Formality**: ${formalityDescriptions[formality]}
- **Length**: ${lengthGuidelines[commentLength]} (Max: ${maxChars} chars)
- **Questions**: ${questionGuidelines[questionFreq]}
- **Perspective**: ${perspectiveDescriptions[bg?.perspective_style || 'additive']}
- **Confidence**: ${confidenceDescriptions[bg?.confidence_level || 'balanced']}`;

  // Comment Framework
  const framework = bg?.framework_preset || 'aca_i';
  prompt += `\n\n## Comment Framework
**Use**: ${frameworkDescriptions[framework]}`;

  // Post Context
  prompt += `\n\n## Post Context
Author: ${post.author.name}${post.author.title ? `, ${post.author.title}` : ''}${post.author.company ? ` at ${post.author.company}` : ''}
Posted: ${getRelativeTime(post.posted_at)}
Engagement: ${post.engagement.likes_count} likes, ${post.engagement.comments_count} comments`;

  // EXTRACTED FACTS - ANTI-HALLUCINATION
  // The AI must ONLY reference these verified facts when mentioning specifics
  if (extractedFacts && (extractedFacts.numbers.length > 0 || extractedFacts.results.length > 0 || extractedFacts.quotes.length > 0)) {
    prompt += `\n\n## VERIFIED FACTS FROM THIS POST (ONLY REFERENCE THESE)

**CRITICAL RULE**: When mentioning specific numbers, results, or quotes, you MUST use these EXACT values.
DO NOT paraphrase numbers. DO NOT make up statistics. DO NOT guess percentages.
If you reference a fact, it MUST be from this list:`;

    if (extractedFacts.numbers.length > 0) {
      prompt += `\n\n**Numbers/Metrics (use EXACTLY as written)**:
${extractedFacts.numbers.map(n => `- "${n}"`).join('\n')}`;
    }

    if (extractedFacts.results.length > 0) {
      prompt += `\n\n**Results/Outcomes mentioned**:
${extractedFacts.results.map(r => `- "${r}"`).join('\n')}`;
    }

    if (extractedFacts.quotes.length > 0) {
      prompt += `\n\n**Direct quotes from post**:
${extractedFacts.quotes.map(q => `- "${q}"`).join('\n')}`;
    }

    if (extractedFacts.claims.length > 0) {
      prompt += `\n\n**Key claims made**:
${extractedFacts.claims.map(c => `- "${c}"`).join('\n')}`;
    }

    prompt += `\n\n**Hallucination Warning**: If the post says "40% growth" and you write "50% growth", that's WRONG and makes you look careless. When in doubt, don't mention specific numbers - focus on the insight instead.`;
  }

  // SUGGESTED COMMENT APPROACHES
  if (suggestedApproaches && suggestedApproaches.length > 0) {
    prompt += `\n\n## SUGGESTED COMMENT APPROACHES (pick one)

Different comment styles get different engagement. Choose the approach that feels most natural:`;

    suggestedApproaches.forEach((approach, i) => {
      prompt += `\n\n**Option ${i + 1}: ${approach.type.replace(/_/g, ' ').toUpperCase()}**
${approach.prompt}`;
    });
  }

  // VIP/Priority Profile Check
  const vipMatch = findPriorityProfile(bg?.priority_profiles, post.author.linkedin_id);
  if (vipMatch) {
    const relationshipDescriptions: Record<string, string> = {
      partner: 'a trusted business partner or associate',
      client: 'an existing client or customer',
      friend: 'a personal friend or close connection',
      prospect: 'a high-priority prospect',
      thought_leader: 'a respected thought leader in the industry'
    };

    prompt += `\n\n## VIP AUTHOR - SPECIAL HANDLING
This is **${vipMatch.name}**, ${relationshipDescriptions[vipMatch.relationship] || 'an important contact'}.

**Relationship**: ${vipMatch.relationship.charAt(0).toUpperCase() + vipMatch.relationship.slice(1)}
${vipMatch.tone_override ? `**Tone Override**: ${vipMatch.tone_override}` : ''}
${vipMatch.notes ? `**Additional Context**: ${vipMatch.notes}` : ''}

**Guidelines for VIP**:
- Be especially warm, personal, and thoughtful
- Reference the relationship naturally if appropriate
- This person matters - make the comment feel genuine and valued
- ${vipMatch.relationship === 'friend' ? 'You can be more casual and personal' : ''}
- ${vipMatch.relationship === 'partner' ? 'Acknowledge the collaborative relationship' : ''}
- ${vipMatch.relationship === 'client' ? 'Show appreciation without being sycophantic' : ''}`;
  }

  // Prospect handling
  if (prospect?.is_prospect) {
    const relationshipTag = bg?.default_relationship_tag || 'prospect';
    prompt += `\n\n## IMPORTANT: This is a ${relationshipTag.toUpperCase()}
- Prospect Stage: ${prospect.relationship_stage || 'New'}
- Campaign: ${prospect.campaign_id ? 'Active campaign' : 'No active campaign'}
${prospect.notes ? `- Notes: ${prospect.notes}` : ''}

**Extra care required**: This comment is building a relationship with a potential customer. Be especially thoughtful, personalized, and value-focused.`;
  }

  // Guardrails
  if (bg?.competitors_never_mention && bg.competitors_never_mention.length > 0) {
    prompt += `\n\n## NEVER Mention These Competitors
${bg.competitors_never_mention.join(', ')}`;
  }

  // CTA Guidelines
  if (bg?.end_with_cta && bg.end_with_cta !== 'never') {
    const ctaStyleDesc: Record<string, string> = {
      question_only: 'End with a genuine question only - no explicit CTAs',
      soft_invitation: 'Soft invitations like "would love to chat more about this"',
      direct_ask: 'Direct but not salesy - "let\'s connect to discuss"'
    };
    prompt += `\n\n## CTA Guidelines
- Frequency: ${bg.end_with_cta}
- Style: ${ctaStyleDesc[bg.cta_style || 'question_only']}`;
  }

  // CONVERSATION CONTEXT - ALWAYS ON
  if (context.memory && (context.memory.threads.length > 0 || context.memory.notes.length > 0 || context.memory.promises.length > 0)) {
    const mem = context.memory;
    prompt += `\n\n## CONVERSATION CONTEXT - ALWAYS ON (CRITICAL)
You have HISTORY with ${post.author.name}. Every interaction builds on the last.
Relationship Temperature: **${mem.temperature.toUpperCase()}**

### Relationship Status:
- **Interaction History**: ${mem.threads.length} interactions in the last 30 days.
- **Tone to Use**: ${mem.temperature === 'hot' ? 'Full warmth, deep callbacks, personal details fair game.' :
        mem.temperature === 'warm' ? 'Warm, established rapport, light callbacks okay.' :
          mem.temperature === 'warming' ? 'Warming up, building rhythm.' : 'Cold interaction, building foundation.'}`;

    // 1. Recent Conversation Threads
    if (mem.threads.length > 0) {
      prompt += `\n\n### Recent Exchanges (Last 30 Days):
${mem.threads.slice(0, 3).map(th => `- **${th.thread_type.toUpperCase()}**: Our message: "${th.our_message}" | Their response: "${th.their_response}"`).join('\n')}

**Instruction**: Reference these previous threads naturally if they connect to the current post. Don't be weird about it - just show you remember.`;
    }

    // 2. Personal Details (Relationship Memory)
    if (mem.notes.length > 0) {
      prompt += `\n\n### Personal Details & Notes (REMEMBER THESE):
${mem.notes.slice(0, 5).map(n => `- ${n.note} (${n.category})`).join('\n')}

**Instruction**: Drop personal details naturally and warmfully. If they mentioned a kid's soccer tournament or work stress, acknowledge it if it fits the vibe. One personal callback per conversation maximum.`;
    }

    // 3. Promise Tracking
    const pendingPromises = mem.promises.filter(p => p.status === 'pending');
    if (pendingPromises.length > 0) {
      prompt += `\n\n### Open Promises (STILL OUTSTANDING):
${pendingPromises.map(p => `- ${p.promise_text} (Status: PENDING)`).join('\n')}

**Instruction**: If we promised something, follow up or acknowledge it if relevant. If we dropped the ball, own it.`;
    }

    prompt += `\n\n### Continuity Rule:
Do not introduce yourselves. Do not be generic. If we discussed X yesterday, and this post is about X, pick up the thread. Responding without context is relationship-damaging.`;
  }

  // Question Post Handling
  if (post.post_intent === 'question') {
    prompt += `\n\n## THIS IS A QUESTION POST - SPECIAL INSTRUCTIONS

**The author is asking readers to answer a question or make a choice.**

**Your Response MUST:**
1. **Directly answer the question being asked** - This is the #1 priority
2. **Start with your answer/choice** (e.g., "Team Test That One More Time" or "I prefer X")
3. **Add 1 sentence explaining why** (personal experience/insight)
4. **Optionally ask a related follow-up question** to continue the conversation
5. **DO NOT write general commentary** about the topic without answering
6. **DO NOT ignore the question** and share unrelated insights

**Example:**
- Post: "Are you team Move Fast or team Test That One More Time?"
- Good: "Team Test That One More Time. I've learned rushing to production creates tech debt that takes 3x longer to fix. What's been your experience with this?"
- Bad: "This is such an important debate in software development..." (doesn't answer the question)

**Format:** [Your choice/answer] + [Brief why] + [Optional follow-up question]`;
  }

  // Final Guidelines
  prompt += `\n\n## Comment Guidelines (CRITICAL)

**Your goal**: Generate a LinkedIn comment that adds genuine value and builds relationship

**MUST DO**:
1. Reference a SPECIFIC point from the post (not generic "great post!")
2. Add genuine insight, experience, or helpful perspective
3. Follow the framework: ${frameworkDescriptions[framework]}
4. Stay under ${maxChars} characters
5. Write like a REAL PERSON having a conversation - not a consultant trying to sound smart

**MUST NOT DO**:
1. Don't pitch products or services
2. Don't use generic praise ("Great insights!", "Thanks for sharing!")
3. Don't use corporate jargon or buzzwords
4. Don't make it about you/your company
5. Don't use emojis excessively (max 1-2 if appropriate)
6. Don't use repetitive AI-sounding openers like "This is exactly what the industry needs..."

**AVOID SOUNDING LIKE A BOT - Common Mistakes**:
- **Forced analogies**: "This is the new X of 2012" - sounds fake and overly clever
- **Overly complex questions**: Don't ask multi-part technical questions with jargon
- **Trying too hard**: Don't use unnecessarily technical language to sound smart
- **Consultant-speak**: Avoid phrases like "orchestration complexity", "before the agent even starts reasoning"
- **Perfect structure**: Real comments don't always follow perfect frameworks

**SOUND LIKE A REAL PERSON**:
- Use simple, direct language
- Ask ONE clear question, not multiple
- Share a quick personal experience or observation
- Be casual and conversational (your tone is: ${toneDescriptions[tone]})
- It's okay to be imperfect - real people don't write perfectly structured comments

**Quality Standards**:
- If you can't add genuine value, return: { "skip": true, "reason": "Cannot add authentic value" }
- Only generate comments you'd be proud to post yourself
- Would a real person actually write this? If not, rewrite it simpler.

**SENSITIVE TOPICS - MUST SKIP (return skip: true)**:
- Posts about death, loss, grief, or mourning (e.g., "passed away", "RIP", "hearts go out to", "condolences")
- Memorial posts or tributes to deceased individuals
- Posts about serious illness, accidents, or tragedy
- Posts expressing sympathy for personal hardships
- These are PRIVATE MOMENTS - automated comments are inappropriate and tone-deaf

**CRITICAL - NEVER DO THIS**:
- NEVER generate placeholder/fallback content like "post didn't load", "couldn't see content", "mind reposting"
- NEVER ask the author to repost or share content again
- NEVER reference technical issues with viewing the post
- If you don't have the post content to work with, return { "skip": true } - DO NOT MAKE SOMETHING UP

${varianceContext ? buildVariancePromptInstructions(varianceContext) : ''}

## Output Format (JSON ONLY)

Return ONLY a JSON object with this structure:
{
  "comment_text": "Your comment here...",
  "reasoning": "Why this comment adds value and fits the context",
  "adds_value": true,
  "on_topic": true,
  "appropriate_tone": true,
  "avoids_sales_pitch": true,
  "references_post_specifically": true,
  "skip": false
}

OR if the post isn't worth commenting on:
{
  "skip": true,
  "reason": "Explanation why we shouldn't comment"
}`;

  return prompt;
}

/**
 * Build prompt with custom system prompt override
 */
function buildCustomSystemPrompt(context: CommentGenerationContext, customPrompt: string): string {
  const { post, prospect, workspace } = context;
  const bg = workspace.brand_guidelines;

  // Replace placeholders in custom prompt
  let prompt = customPrompt
    .replace(/\{\{company_name\}\}/g, workspace.company_name)
    .replace(/\{\{expertise\}\}/g, workspace.expertise_areas.join(', '))
    .replace(/\{\{products\}\}/g, workspace.products.join(', '))
    .replace(/\{\{author_name\}\}/g, post.author.name)
    .replace(/\{\{author_title\}\}/g, post.author.title || '')
    .replace(/\{\{author_company\}\}/g, post.author.company || '')
    .replace(/\{\{post_text\}\}/g, post.post_text)
    .replace(/\{\{max_characters\}\}/g, String(bg?.max_characters || 300));

  // Add KB context if enabled
  if (bg?.use_workspace_knowledge && workspace.knowledge_base_context) {
    prompt += `\n\n## Company Knowledge Base\n${workspace.knowledge_base_context}`;
  }

  // Add prospect context
  if (prospect?.is_prospect) {
    prompt += `\n\n## This is a PROSPECT - Extra care required
- Stage: ${prospect.relationship_stage || 'New'}
${prospect.notes ? `- Notes: ${prospect.notes}` : ''}`;
  }

  // Add JSON output format
  prompt += `\n\n## Output Format (JSON ONLY)
Return ONLY a JSON object:
{
  "comment_text": "Your comment here...",
  "reasoning": "Why this comment adds value",
  "adds_value": true,
  "on_topic": true,
  "appropriate_tone": true,
  "avoids_sales_pitch": true,
  "references_post_specifically": true,
  "skip": false
}`;

  return prompt;
}

// ============================================
// USER PROMPT BUILDER
// ============================================

/**
 * Build user prompt with post content
 * Includes variance context for anti-detection and extracted facts for hallucination prevention
 */
function buildCommentUserPrompt(
  post: LinkedInPost,
  varianceContext?: CommentVarianceContext,
  extractedFacts?: ExtractedFacts
): string {
  // Take meaningful snippet of post (not just first few words)
  const postSnippet = post.post_text.length > 300
    ? post.post_text.substring(0, 300) + '...'
    : post.post_text;

  // Build length instruction based on variance
  let lengthInstruction = 'Make it 2-3 sentences, conversational, specific.';
  if (varianceContext) {
    const lengthMap: Record<string, string> = {
      'very_short': `Keep it VERY SHORT (${varianceContext.targetLength} chars) - just 1 quick sentence or reaction.`,
      'short': `Keep it SHORT (around ${varianceContext.targetLength} chars) - 1-2 brief sentences.`,
      'medium': `Medium length (around ${varianceContext.targetLength} chars) - 2-3 sentences.`,
      'long': `Write a LONGER comment (around ${varianceContext.targetLength} chars) - 3-4 sentences with detail.`,
      'very_long': `Write a DETAILED comment (around ${varianceContext.targetLength} chars) - share a mini-story or deep insight.`
    };
    lengthInstruction = lengthMap[varianceContext.lengthCategory] || lengthInstruction;
  }

  // Build type instruction based on variance
  let typeInstruction = '';
  if (varianceContext) {
    typeInstruction = `\n7. ${varianceContext.typePrompt}`;
  }

  return `Generate a thoughtful LinkedIn comment for this post by ${post.author.name}${post.author.title ? ` (${post.author.title})` : ''}:

---
${postSnippet}
---

CRITICAL RULES:
1. DO NOT start with "Great insights on..." - this is banned
2. DO NOT use generic phrases like "aligns with what we're seeing"
3. DO NOT mention "B2B space" or "enterprise customers" unless the post is about that
4. DO reference a SPECIFIC idea, claim, or point from the post
5. Add YOUR perspective - agree, disagree, expand, share experience
6. Sound like a real person having a conversation, not a bot${typeInstruction}

BANNED OPENER PATTERNS (NEVER USE THESE):
- "This is exactly what the industry needs..."
- "This is exactly what..."
- "Couldn't agree more..."
- "This is so important..."
- "This hits different..."
- "Spot on!" / "Nailed it!"
- "Love this take/perspective..."
- "Such an important/great point..."
- "100% this" / "So much this" / "This right here"
These sound AI-generated and repetitive. BE ORIGINAL.

EXAMPLES OF BAD COMMENTS (DO NOT DO THIS):
- "Great insights on [topic]! This aligns perfectly with..."
- "Thanks for sharing! Would love to hear more..."
- "Interesting perspective! In my experience..."
- "This is exactly what the industry needs right now..." - BANNED
- "Couldn't agree more! This is so important..." - BANNED

EXAMPLES OF GOOD COMMENTS (VARIED OPENERS):
- "The point about X really resonates - we tried Y and found Z"
- "I'd push back slightly on the idea that... because in practice..."
- "This is why I've been telling my team to focus on..."
- "What strikes me about this is..."
- "The counterintuitive part is..."
- "We learned this the hard way when..."
- "Something I'd add here..."
- "The nuance I've noticed is..."
- "Curious about your take on X aspect of this..."
${extractedFacts && extractedFacts.numbers.length > 0 ? `
VERIFIED NUMBERS FROM POST (use EXACTLY if referencing):
${extractedFacts.numbers.slice(0, 3).map(n => `- ${n}`).join('\n')}
DO NOT change these numbers. If the post says "40%" do not write "50%".` : ''}
Return JSON with comment_text. ${lengthInstruction}`;
}

// ============================================
// CONFIDENCE SCORING
// ============================================

/**
 * Calculate confidence score based on quality indicators
 */
function calculateConfidenceScore(
  aiResponse: any,
  post: LinkedInPost,
  workspace: WorkspaceContext,
  prospect?: ProspectContext
): number {
  let score = 0.5; // Base score

  // If AI marked as skip, return 0
  if (aiResponse.skip === true) {
    return 0.0;
  }

  // Quality indicators (0.5 points total)
  const indicators = [
    aiResponse.adds_value,
    aiResponse.on_topic,
    aiResponse.appropriate_tone,
    aiResponse.avoids_sales_pitch,
    aiResponse.references_post_specifically
  ];
  const qualityScore = indicators.filter(Boolean).length / indicators.length;
  score += qualityScore * 0.3;

  // Comment length (0.1 points) - prefer 50-200 characters
  const commentLength = (aiResponse.comment_text || '').length;
  if (commentLength >= 50 && commentLength <= 200) {
    score += 0.1;
  } else if (commentLength > 200 && commentLength <= 300) {
    score += 0.05;
  }

  // Post engagement (0.1 points) - higher engagement = better opportunity
  const engagementScore = Math.min(
    post.engagement.likes_count / 100,
    1.0
  );
  score += engagementScore * 0.1;

  // Prospect bonus (0.1 points) - be extra careful with prospects
  if (prospect?.is_prospect) {
    // For prospects, we want higher confidence
    score = Math.min(score, 0.85); // Cap at 0.85 for prospects (always review)
  }

  // Post recency (0.05 points) - recent posts better for engagement
  const postAge = Date.now() - new Date(post.posted_at).getTime();
  const ageInHours = postAge / (1000 * 60 * 60);
  if (ageInHours <= 24) {
    score += 0.05;
  } else if (ageInHours <= 72) {
    score += 0.02;
  }

  return Math.max(0.0, Math.min(1.0, score));
}

// ============================================
// BATCH GENERATION
// ============================================

/**
 * Batch generate comments for multiple posts
 */
export async function batchGenerateComments(
  contexts: CommentGenerationContext[]
): Promise<Array<{
  post_id: string;
  result?: GeneratedComment;
  error?: string;
}>> {
  const results = [];

  for (const context of contexts) {
    try {
      const result = await generateLinkedInComment(context);
      results.push({
        post_id: context.post.id,
        result,
        error: undefined
      });
    } catch (error) {
      results.push({
        post_id: context.post.id,
        result: undefined,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Rate limiting: Wait 2 seconds between generations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// ============================================
// QUALITY VALIDATION
// ============================================

/**
 * Validate comment meets quality standards
 */
export function validateCommentQuality(comment: GeneratedComment): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check comment length
  if (comment.comment_text.length < 20) {
    issues.push('Comment too short (< 20 characters)');
  }
  if (comment.comment_text.length > 500) {
    issues.push('Comment too long (> 500 characters)');
  }

  // Check quality indicators
  const qualityChecks = [
    { key: 'adds_value', message: 'Does not add value' },
    { key: 'on_topic', message: 'Off-topic' },
    { key: 'appropriate_tone', message: 'Inappropriate tone' },
    { key: 'avoids_sales_pitch', message: 'Sounds like a sales pitch' },
    { key: 'references_post_specifically', message: 'Does not reference post specifically' }
  ];

  for (const check of qualityChecks) {
    if (!comment.quality_indicators[check.key as keyof typeof comment.quality_indicators]) {
      issues.push(check.message);
    }
  }

  // Check for banned phrases using centralized config
  const banCheck = containsBannedPhrase(comment.comment_text);
  if (banCheck.hasBanned && banCheck.matchedPhrase) {
    issues.push(`Contains banned phrase: "${banCheck.matchedPhrase}"`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// ============================================
// POST SKIP LOGIC
// ============================================

/**
 * Check if we should skip commenting on this post
 */
export function shouldSkipPost(post: LinkedInPost, workspace: WorkspaceContext): {
  should_skip: boolean;
  reason?: string;
} {
  // Skip if post is too old (> 7 days)
  const postAge = Date.now() - new Date(post.posted_at).getTime();
  const ageInDays = postAge / (1000 * 60 * 60 * 24);
  if (ageInDays > 7) {
    return { should_skip: true, reason: 'Post too old (> 7 days)' };
  }

  // Skip if very low engagement (< 3 likes and no comments)
  if (post.engagement.likes_count < 3 && post.engagement.comments_count === 0) {
    return { should_skip: true, reason: 'Very low engagement' };
  }

  // Skip viral/saturated posts (>500 comments) - our comment won't be seen
  // These posts already have so many comments that adding another is pointless
  if (post.engagement.comments_count > 500) {
    return { should_skip: true, reason: `Viral post saturated (${post.engagement.comments_count} comments - ours won't be seen)` };
  }

  // Skip if post is too short (< 50 characters)
  if (post.post_text.length < 50) {
    return { should_skip: true, reason: 'Post too short to add value' };
  }

  // Skip sensitive topics - death, grief, tragedy, condolences
  // These are private moments where automated comments are inappropriate
  const sensitiveCheck = containsSensitiveContent(post.post_text);
  if (sensitiveCheck.isSensitive) {
    return { should_skip: true, reason: sensitiveCheck.reason };
  }

  // Skip non-English posts - detailed pattern-based language detection
  const languageCheck = isNonEnglishPost(post.post_text);
  if (languageCheck.isNonEnglish) {
    return { should_skip: true, reason: languageCheck.reason };
  }

  return { should_skip: false };
}

// ============================================
// SENSITIVE CONTENT DETECTION
// ============================================

/**
 * Check if post content contains sensitive topics that should not receive automated comments
 * This includes death, grief, tragedy, illness, and other serious personal matters
 */
function containsSensitiveContent(text: string): { isSensitive: boolean; reason?: string } {
  if (!text) return { isSensitive: false };

  const lowerText = text.toLowerCase();

  // Death and loss patterns
  const deathPatterns = [
    /\bpassed away\b/,
    /\bpassing of\b/,
    /\brest in peace\b/,
    /\brip\b(?!\s+off)/,  // RIP but not "rip off"
    /\blost\s+(my|our|his|her|their)\s+(mother|father|mom|dad|parent|child|son|daughter|brother|sister|wife|husband|friend|colleague)/,
    /\bloss\s+of\s+(her|his|their|a)\s+(child|son|daughter|mother|father|parent|spouse|partner|loved one)/,
    /\bhearts?\s+(go|are|is)\s+(out|with)\b/,
    /\bcondolences\b/,
    /\bdeepest sympathy\b/,
    /\bin loving memory\b/,
    /\bgone too soon\b/,
    /\btaken from us\b/,
    /\bmourns?\b/,
    /\bmourning\b/,
    /\bgrief\b/,
    /\bgrieving\b/,
    /\bfuneral\b/,
    /\bmemorial service\b/,
    /\bcelebration of life\b/,
    /\btragic loss\b/,
    /\bdevastated\s+(to|by)\b/,
    /\bheartbroken\b/,
    /\bpray(ing|ers)?\s+for\b.*\b(family|families|loved ones)\b/,
  ];

  for (const pattern of deathPatterns) {
    if (pattern.test(lowerText)) {
      return { isSensitive: true, reason: 'Post about death/loss - skipping out of respect' };
    }
  }

  // Serious illness/tragedy patterns
  const tragedyPatterns = [
    /\bfighting\s+(cancer|illness|disease)\b/,
    /\bbattle with\s+(cancer|illness|disease)\b/,
    /\bdiagnosed with\b/,
    /\bserious accident\b/,
    /\btragic\s+(accident|news|event)\b/,
    /\bvictims?\s+of\b/,
    /\bsuicide\b/,
    /\bmental health crisis\b/,
  ];

  for (const pattern of tragedyPatterns) {
    if (pattern.test(lowerText)) {
      return { isSensitive: true, reason: 'Post about tragedy/illness - skipping out of respect' };
    }
  }

  return { isSensitive: false };
}

// ============================================
// NON-ENGLISH POST DETECTION
// ============================================

/**
 * Detect non-English posts using common word patterns
 * Currently filters German, French, Spanish, Portuguese, Italian, Dutch
 * Posts must be in English to receive automated comments
 */
function isNonEnglishPost(text: string): { isNonEnglish: boolean; reason?: string } {
  if (!text || text.length < 30) return { isNonEnglish: false };

  const lowerText = text.toLowerCase();

  // German indicators (common words/patterns)
  const germanPatterns = [
    /\b(und|oder|aber|nicht|fur|mit|auf|aus|bei|nach|von|zum|zur|als|auch|noch|nur|schon|sehr|mehr|jetzt|hier|dann|weil|wenn|dass|wird|wurde|werden|haben|sein|sind|kann|konnen|muss|mussen|soll|wollen|alle|diese|dieser|eines|einer|keine|keiner|andere|anderen)\b/gi,
    /\b(ich|du|er|sie|wir|ihr|uns|euch|mich|dich|sich)\b/gi,
    /\b(arbeit|beispiel|entwicklung|erfahrung|erfolg|gesellschaft|unternehmen|zusammen|zukunft|wichtig)\b/gi,
  ];

  // French indicators
  const frenchPatterns = [
    /\b(et|ou|mais|pour|avec|dans|sur|sous|chez|entre|vers|sans|avant|apres|depuis|pendant|comme|tres|plus|moins|bien|aussi|encore|donc|alors|ainsi|parce|lorsque|quand|qui|que|dont|lequel|laquelle)\b/gi,
    /\b(je|tu|il|elle|nous|vous|ils|elles|mon|ton|son|notre|votre|leur|mes|tes|ses|nos|vos|leurs)\b/gi,
    /\b(etre|avoir|faire|aller|venir|voir|savoir|pouvoir|vouloir|devoir|falloir|croire|prendre|mettre)\b/gi,
  ];

  // Spanish indicators
  const spanishPatterns = [
    /\b(y|o|pero|para|con|sin|sobre|bajo|entre|hacia|desde|durante|segun|mediante|como|muy|mas|menos|tambien|ademas|ahora|entonces|porque|cuando|donde|quien|cual|cuyo)\b/gi,
    /\b(yo|tu|el|ella|nosotros|vosotros|ellos|ellas|mi|tu|su|nuestro|vuestro|mis|tus|sus)\b/gi,
    /\b(ser|estar|tener|hacer|poder|querer|deber|saber|conocer|pensar|creer|encontrar|llevar)\b/gi,
  ];

  // Portuguese indicators
  const portuguesePatterns = [
    /\b(e|ou|mas|para|com|sem|sobre|sob|entre|ate|desde|durante|segundo|como|muito|mais|menos|tambem|alem|agora|entao|porque|quando|onde|quem|qual|cujo)\b/gi,
    /\b(eu|tu|ele|ela|nos|vos|eles|elas|meu|teu|seu|nosso|vosso|minha|tua|sua|nossa|vossa)\b/gi,
    /\b(ser|estar|ter|fazer|poder|querer|dever|saber|conhecer|pensar|acreditar|encontrar|levar)\b/gi,
  ];

  // Italian indicators
  const italianPatterns = [
    /\b(e|o|ma|per|con|senza|su|sotto|tra|fra|verso|da|fino|durante|secondo|come|molto|piu|meno|anche|inoltre|adesso|allora|perche|quando|dove|chi|quale|cui)\b/gi,
    /\b(io|tu|lui|lei|noi|voi|loro|mio|tuo|suo|nostro|vostro|mia|tua|sua|nostra|vostra)\b/gi,
    /\b(essere|avere|fare|andare|venire|vedere|sapere|potere|volere|dovere|credere|pensare|trovare)\b/gi,
  ];

  // Dutch indicators
  const dutchPatterns = [
    /\b(en|of|maar|voor|met|zonder|op|onder|tussen|naar|van|tot|tijdens|volgens|zoals|zeer|meer|minder|ook|bovendien|nu|dan|omdat|wanneer|waar|wie|welke|wiens)\b/gi,
    /\b(ik|jij|hij|zij|wij|jullie|hen|mijn|jouw|zijn|haar|ons|jullie|hun)\b/gi,
    /\b(zijn|hebben|doen|gaan|komen|zien|weten|kunnen|willen|moeten|geloven|denken|vinden)\b/gi,
  ];

  // Count matches for each language
  const languages = [
    { name: 'German', patterns: germanPatterns },
    { name: 'French', patterns: frenchPatterns },
    { name: 'Spanish', patterns: spanishPatterns },
    { name: 'Portuguese', patterns: portuguesePatterns },
    { name: 'Italian', patterns: italianPatterns },
    { name: 'Dutch', patterns: dutchPatterns },
  ];

  for (const lang of languages) {
    let matchCount = 0;
    for (const pattern of lang.patterns) {
      const matches = lowerText.match(pattern);
      if (matches) {
        matchCount += matches.length;
      }
    }

    // If more than 5 matches for a language, likely non-English
    // This threshold avoids false positives from borrowed words
    if (matchCount >= 5) {
      return { isNonEnglish: true, reason: `Non-English post detected (${lang.name}) - skipping` };
    }
  }

  return { isNonEnglish: false };
}

// ============================================
// COMMENT REPLY GENERATION
// ============================================

/**
 * Context for generating a reply to an existing comment
 */
export interface CommentReplyGenerationContext {
  originalPost: {
    text: string;
    author_name: string;
  };
  targetComment: {
    id: string;
    text: string;
    author_name: string;
    reactions_count: number;
  };
  workspace: WorkspaceContext;
}

/**
 * Generate a reply to an existing LinkedIn comment
 *
 * This creates a reply to someone else's comment on a post,
 * rather than a direct comment on the post itself.
 */
export async function generateCommentReply(
  context: CommentReplyGenerationContext
): Promise<GeneratedComment> {
  const startTime = Date.now();

  console.log('[Vera.AI] Generating reply to comment:', {
    post_author: context.originalPost.author_name,
    comment_author: context.targetComment.author_name,
    comment_reactions: context.targetComment.reactions_count
  });

  // CRITICAL SAFETY CHECK: Never generate reply without proper context
  const postContent = context.originalPost.text?.trim();
  const commentContent = context.targetComment.text?.trim();
  if (!postContent || postContent.length < 20) {
    console.error('[Vera.AI] REFUSED: Cannot generate reply - original post has no content');
    throw new Error('POST_CONTENT_MISSING: Cannot generate reply for post without content.');
  }
  if (!commentContent || commentContent.length < 5) {
    console.error('[Vera.AI] REFUSED: Cannot generate reply - target comment has no content');
    throw new Error('COMMENT_CONTENT_MISSING: Cannot generate reply for comment without content.');
  }

  // Build specialized prompt for replying to comments
  const systemPrompt = buildCommentReplySystemPrompt(context);
  const userPrompt = buildCommentReplyUserPrompt(context);

  // Generate via Anthropic SDK (Claude Direct)
  // Using Haiku 4.5 for fast, cost-effective comment reply generation
  const response = await chatWithClaude({
    model: MODELS.HAIKU,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    maxTokens: 250,
    temperature: 0.7
  });

  const aiResponse = response.content;

  // Parse AI response
  let parsedResponse: any;
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in AI response');
    }
  } catch (error) {
    console.error('[Vera.AI] Failed to parse reply AI response:', aiResponse);
    throw new Error('Invalid AI response format for reply');
  }

  const generationTime = Date.now() - startTime;

  // Calculate confidence (replies generally need review)
  const confidenceScore = parsedResponse.skip ? 0.0 : 0.75;

  const generatedReply: GeneratedComment = {
    comment_text: parsedResponse.comment_text || parsedResponse.reply || '',
    confidence_score: confidenceScore,
    reasoning: parsedResponse.reasoning || 'Reply to quality comment',
    quality_indicators: {
      adds_value: parsedResponse.adds_value !== false,
      on_topic: parsedResponse.on_topic !== false,
      appropriate_tone: true,
      avoids_sales_pitch: true,
      references_post_specifically: true
    },
    should_auto_post: false, // Always review replies
    generation_metadata: {
      model: response.model,
      tokens_used: response.usage.totalTokens,
      generation_time_ms: generationTime
    }
  };

  console.log('[Vera.AI] Reply generated:', {
    to_author: context.targetComment.author_name,
    length: generatedReply.comment_text.length
  });

  return generatedReply;
}

/**
 * Build system prompt for comment reply generation
 */
function buildCommentReplySystemPrompt(context: CommentReplyGenerationContext): string {
  const { workspace, targetComment } = context;
  const bg = workspace.brand_guidelines;

  return `You are replying to a LinkedIn comment. You represent ${workspace.company_name}.

## Your Goal
Create a thoughtful, conversational reply to ${targetComment.author_name}'s comment.
Their comment has ${targetComment.reactions_count} reactions, indicating it's well-received.

## Communication Style
- Tone: ${bg?.tone_of_voice || 'Professional but friendly'}
- Length: 1-2 sentences (under 150 characters ideally)
- Be conversational, not formal

## Your Expertise
${workspace.expertise_areas.join(', ')}

## Reply Guidelines
1. Acknowledge their point briefly
2. Add a small insight or perspective from your experience
3. Keep it SHORT - this is a reply, not a comment
4. Sound like a real conversation
5. DO NOT pitch anything or be salesy
6. DO NOT use generic phrases like "great point" or "agree"

## Output Format (JSON ONLY)
{
  "comment_text": "Your reply here...",
  "reasoning": "Why this reply adds value",
  "adds_value": true,
  "on_topic": true,
  "skip": false
}

OR if you can't add value:
{
  "skip": true,
  "reason": "Why we shouldn't reply"
}`;
}

/**
 * Build user prompt for comment reply
 */
function buildCommentReplyUserPrompt(context: CommentReplyGenerationContext): string {
  return `Generate a brief reply to this comment.

ORIGINAL POST by ${context.originalPost.author_name}:
"${context.originalPost.text.substring(0, 200)}${context.originalPost.text.length > 200 ? '...' : ''}"

COMMENT by ${context.targetComment.author_name} (${context.targetComment.reactions_count} reactions):
"${context.targetComment.text}"

YOUR TASK:
Write a 1-2 sentence reply that:
- Acknowledges their point naturally (not "great point!")
- Adds YOUR perspective or experience briefly
- Continues the conversation
- Sounds human and conversational

EXAMPLES OF GOOD REPLIES:
- "The bit about X is exactly what I've seen too - though I'd add that Y makes a big difference"
- "Ha, been there. The trick that worked for us was..."
- "Curious if you've tried X - we found it changed the game for Y"

Return JSON with comment_text.`;
}

// ============================================
// DATABASE HELPERS (Vera.AI Supabase)
// ============================================

export async function getBrandGuidelines(workspaceId: string): Promise<BrandGuidelines | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vera_linkedin_brand_guidelines')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .single()
  return data
}

export async function saveBrandGuidelines(workspaceId: string, guidelines: Partial<BrandGuidelines>): Promise<BrandGuidelines> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vera_linkedin_brand_guidelines')
    .upsert({
      ...guidelines,
      workspace_id: workspaceId,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,is_active' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMonitors(workspaceId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vera_linkedin_post_monitors')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createMonitor(workspaceId: string, monitor: { name?: string; hashtags: string[]; keywords?: string[]; monitor_type?: string; created_by?: string }) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vera_linkedin_post_monitors')
    .insert({
      workspace_id: workspaceId,
      ...monitor
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCommentQueue(workspaceId: string, status?: string, limit = 50) {
  const supabase = createAdminClient()
  let query = supabase
    .from('vera_linkedin_comment_queue')
    .select('*, post:vera_linkedin_posts_discovered(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateCommentStatus(commentId: string, status: string, extra?: Record<string, any>) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vera_linkedin_comment_queue')
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveGeneratedComment(workspaceId: string, postId: string, postSocialId: string, comment: GeneratedComment) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vera_linkedin_comment_queue')
    .insert({
      workspace_id: workspaceId,
      post_id: postId,
      post_social_id: postSocialId,
      comment_text: comment.comment_text,
      comment_length: comment.comment_text.length,
      confidence_score: comment.confidence_score,
      reasoning: comment.reasoning,
      quality_indicators: comment.quality_indicators,
      extracted_facts: comment.extracted_facts,
      suggested_approaches: comment.suggested_approaches,
      generation_model: comment.generation_metadata.model,
      status: 'pending_approval'
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCommentingStats(workspaceId: string) {
  const supabase = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [pending, posted, postedToday] = await Promise.all([
    supabase.from('vera_linkedin_comment_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'pending_approval'),
    supabase.from('vera_linkedin_comment_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'posted'),
    supabase.from('vera_linkedin_comment_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'posted').gte('posted_at', today.toISOString()),
  ])

  return {
    pending: pending.count || 0,
    total_posted: posted.count || 0,
    posted_today: postedToday.count || 0,
  }
}
