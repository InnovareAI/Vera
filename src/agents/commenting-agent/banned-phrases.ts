/**
 * Banned Comment Phrases Configuration (Vera.AI)
 * Ported from SAM's banned-comment-phrases.ts
 *
 * Centralized list of phrases that should be rejected in AI-generated LinkedIn comments.
 * These phrases are either:
 * 1. Too generic (AI-generated junk)
 * 2. Salesy/promotional
 * 3. Repetitive opener patterns
 * 4. Garbage/placeholder text from failed content loading
 *
 * Usage:
 * import { BANNED_PHRASES, containsBannedPhrase } from '@/agents/commenting-agent/banned-phrases';
 */

/**
 * All banned phrases - lowercase for case-insensitive matching
 */
export const BANNED_PHRASES: readonly string[] = [
  // === GENERIC AI PHRASES ===
  'great post',
  'great insights',
  'thanks for sharing',
  'nice insights',
  'interesting perspective',
  'aligns perfectly',
  'aligns with what we',

  // === B2B JARGON ===
  'b2b space',
  'enterprise customers',

  // === SALESY/PROMOTIONAL ===
  'would love to hear',
  'love to connect',
  'check out our',
  'we can help',
  'contact us',
  'book a demo',

  // === FILLER PHRASES ===
  'resonate with me',
  'resonates with what',

  // === REPETITIVE OPENER PATTERNS ===
  // These phrases sound AI-generated and appear too frequently
  'this is exactly what the industry needs',
  'this is exactly what',
  'exactly what the industry',
  'what the industry needs right now',
  'the industry needs right now',
  "couldn't agree more",
  'this is so important',
  'this is so true',
  'this hits different',
  'this hits home',
  'spot on',
  'nailed it',
  'love this take',
  'love this perspective',
  'such an important point',
  'such a great point',
  'absolutely this',
  'this right here',
  '100% this',
  'so much this',

  // === GARBAGE/PLACEHOLDER PHRASES ===
  // AI didn't receive proper content - indicates content loading failure
  'came through empty',
  "content didn't load",
  'mind reposting',
  'dropping it in the comments',
  'post might have come through',
  "couldn't see the content",
  'unable to see',
  "can't see your post",
  'not showing up',
  'not loading',
  'post is blank',
  'empty post',
  "didn't load",
  "couldn't load",
  "can't load",
] as const;

/**
 * Check if text contains any banned phrase
 * @param text - The text to check (will be lowercased)
 * @returns Object with result and matched phrase if found
 */
export function containsBannedPhrase(text: string): {
  hasBanned: boolean;
  matchedPhrase?: string;
} {
  const lowerText = text.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (lowerText.includes(phrase)) {
      return {
        hasBanned: true,
        matchedPhrase: phrase,
      };
    }
  }

  return { hasBanned: false };
}

/**
 * Get all banned phrases that appear in text
 * @param text - The text to check
 * @returns Array of matched phrases
 */
export function getAllBannedPhrases(text: string): string[] {
  const lowerText = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lowerText.includes(phrase));
}

/**
 * Categories of banned phrases for documentation/reporting
 */
export const BANNED_PHRASE_CATEGORIES = {
  generic_ai: [
    'great post',
    'great insights',
    'thanks for sharing',
    'nice insights',
    'interesting perspective',
    'aligns perfectly',
    'aligns with what we',
  ],
  b2b_jargon: ['b2b space', 'enterprise customers'],
  salesy: [
    'would love to hear',
    'love to connect',
    'check out our',
    'we can help',
    'contact us',
    'book a demo',
  ],
  repetitive_openers: [
    'this is exactly what the industry needs',
    "couldn't agree more",
    'spot on',
    'nailed it',
    'love this take',
    '100% this',
  ],
  garbage: [
    'came through empty',
    "content didn't load",
    'post is blank',
    "didn't load",
  ],
} as const;
