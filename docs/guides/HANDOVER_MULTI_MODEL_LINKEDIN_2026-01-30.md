# VERA Platform Handover Document
**Date:** January 30, 2026
**Features:** Multi-Model Content Generation + LinkedIn Posting Integration

---

## Overview

This handover covers two major feature implementations:

1. **Multi-Model Parallel Generation** - Generate content from multiple AI models simultaneously, allowing users to compare and select their preferred variation
2. **LinkedIn Posting via Unipile** - Direct posting to LinkedIn from the Content Review board

---

## 1. Multi-Model Content Generation

### Architecture

The system generates text, images, and videos from multiple AI models in parallel, then presents all variations to users for comparison and selection.

### Text Generation (OpenRouter)

| Model ID | Provider | Use Case |
|----------|----------|----------|
| `claude-3-5-sonnet` | Anthropic | Primary content generation |
| `claude-3-haiku` | Anthropic | Fast drafts, captions |
| `gpt-4o` | OpenAI | Alternative perspective |

**File:** `src/lib/platform-prompts.ts:60-100`

### Image Generation (FAL.AI)

| Model ID | Endpoint | Style |
|----------|----------|-------|
| `flux-pro` | `fal-ai/flux-pro/v1.1-ultra` | Premium quality |
| `flux-schnell` | `fal-ai/flux/schnell` | Fast generation |
| `stable-diffusion-xl` | `fal-ai/fast-sdxl` | Artistic styles |

**File:** `src/lib/platform-prompts.ts:110-137`

### Video Generation (FAL.AI)

| Model ID | Endpoint | Duration |
|----------|----------|----------|
| `veo-3.1-fast` | `fal-ai/veo3.1/fast` | 8 seconds |
| `kling-standard` | `fal-ai/kling-video/v1.6/standard/text-to-video` | 5 seconds |

**File:** `src/lib/platform-prompts.ts:158-175`

### Content Format Support

The system supports two content formats that affect aspect ratios:

| Format | Image Size | Video Aspect |
|--------|------------|--------------|
| `post` (Feed) | `landscape_16_9` | `16:9` |
| `story` (Reel) | `portrait_9_16` | `9:16` |

**Implementation:** `src/app/api/campaigns/generate/route.ts:179-508`

### Variation Picker Components

Three modal components for comparing variations:

| Component | File | Purpose |
|-----------|------|---------|
| `VariationPicker` | `src/components/campaigns/VariationPicker.tsx` | Compare text variations |
| `ImageVariationPicker` | `src/components/campaigns/ImageVariationPicker.tsx` | Compare image styles |
| `VideoVariationPicker` | `src/components/campaigns/VideoVariationPicker.tsx` | Compare video outputs |

### Key Interfaces

```typescript
// src/app/campaigns/page.tsx

interface ContentVariation {
    modelId: string
    modelName: string
    provider: string
    content: string
    generatedAt: string
}

interface ImageVariation {
    modelId: string
    modelName: string
    imageUrl: string
    prompt: string
    generatedAt: string
}

interface VideoVariation {
    modelId: string
    modelName: string
    videoUrl: string
    prompt: string
    generatedAt: string
}

interface GeneratedContent {
    platform: string
    type: 'text' | 'image' | 'video'
    content: string
    mediaUrl?: string
    caption?: string
    hashtags?: string[]
    status: 'generating' | 'complete' | 'error'
    variations?: ContentVariation[]
    selectedVariationIndex?: number
    imageVariations?: ImageVariation[]
    selectedImageIndex?: number
    videoVariations?: VideoVariation[]
    selectedVideoIndex?: number
}
```

---

## 2. LinkedIn Posting via Unipile

### Overview

Direct posting to LinkedIn using the Unipile unified API. Supports text posts with optional image attachments.

### Files Created/Modified

| File | Purpose |
|------|---------|
| `src/lib/unipile.ts` | Unipile API client functions |
| `src/app/api/linkedin/post/route.ts` | API route for posting |
| `src/components/content-engine/ContentReview.tsx` | UI integration |

### Unipile Client Functions

**File:** `src/lib/unipile.ts:200-344`

```typescript
// Create a LinkedIn post
async function createLinkedInPost(
    accountId: string,
    text: string,
    attachments?: PostAttachment[]
): Promise<PostResult>

// Get connected accounts
async function getConnectedAccounts(): Promise<Account[]>

// Get account details
async function getAccountDetails(accountId: string): Promise<Account | null>
```

### API Route

**Endpoint:** `POST /api/linkedin/post`

**Request Body:**
```json
{
    "text": "Post content with hashtags",
    "imageUrl": "https://...",  // Optional
    "videoUrl": "https://...",  // Optional
    "workspaceId": "uuid",      // Optional, for tracking
    "accountId": "unipile-account-id"  // Optional, uses default
}
```

**Response:**
```json
{
    "success": true,
    "post_id": "7368649927968571392",
    "message": "Post published to LinkedIn successfully!"
}
```

### UI Integration

The Content Review board includes "Post to LinkedIn" buttons in:

1. **Approved Column** - Quick post button on each card
2. **Scheduled Column** - "Post Now" button on each card
3. **Detail Panel** - Full-width post button when viewing approved/scheduled content

**States:**
- Idle: Shows "Post" or "Post Now" button
- Posting: Shows spinner with "Posting..."
- Success: Shows checkmark with "Posted!" (3 seconds)
- Error: Shows error message (5 seconds)

---

## Environment Variables Required

```env
# OpenRouter (Text Generation)
OPENROUTER_API_KEY=sk-or-...

# FAL.AI (Image & Video Generation)
FAL_API_KEY=...

# Unipile (LinkedIn Posting)
UNIPILE_DSN=https://api6.unipile.com:13670
UNIPILE_API_KEY=...
UNIPILE_ACCOUNT_ID=...  # Default LinkedIn account

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Testing Checklist

### Multi-Model Generation

- [ ] Enable "Multi-Model" toggle in Campaign Setup
- [ ] Select multiple platforms (LinkedIn, Instagram, etc.)
- [ ] Choose content format (Story vs Post) for video platforms
- [ ] Generate campaign
- [ ] Verify text variations appear with "Compare Text" button
- [ ] Verify image variations appear with "Compare Images" button
- [ ] Verify video variations appear with "Compare Videos" button
- [ ] Test selecting different variations
- [ ] Verify selected variation persists

### LinkedIn Posting

- [ ] Set environment variables (UNIPILE_*)
- [ ] Go to Campaigns > Review Posts
- [ ] Approve a post (drag to Approved or click Approve)
- [ ] Click "Post" button
- [ ] Verify loading state shows
- [ ] Verify success message appears
- [ ] Verify post appears on LinkedIn
- [ ] Test error handling (disconnect account, invalid content)

---

## Known Limitations

1. **No Native Scheduling** - Unipile doesn't support scheduled posts; you'd need to implement a job queue
2. **Rate Limits** - LinkedIn recommends max 100 posts/comments/reactions per day per account
3. **Video Upload** - Videos must be hosted URLs; direct upload not implemented
4. **Platform Coverage** - Currently only LinkedIn posting; Twitter/Instagram would need additional work

---

## Future Enhancements

1. **Scheduling System**
   - Add `scheduled_posts` table in Supabase
   - Implement cron job to poll and publish
   - Add date/time picker in UI

2. **Additional Platforms**
   - Twitter/X posting (Unipile supports it)
   - Instagram posting (requires business account)

3. **Analytics**
   - Track post performance via Unipile
   - Display engagement metrics in dashboard

4. **Account Management**
   - UI for connecting/disconnecting accounts
   - Account status monitoring

---

## Support Contacts

- **Unipile API Docs:** https://developer.unipile.com
- **FAL.AI Docs:** https://fal.ai/docs
- **OpenRouter Docs:** https://openrouter.ai/docs

---

*Generated by Claude Code on January 30, 2026*
