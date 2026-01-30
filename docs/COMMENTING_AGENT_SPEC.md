# VERA Commenting Agent Specification

This specification outlines the logic and implementation plan for the VERA Commenting Agent, based on the proven high-performance architecture from SAM (Optimized for LinkedIn 360Brew).

## 1. Core Objectives

- **Build Topical Authority**: Comment only on posts where the user can add genuine value.
- **Authentic Engagement**: Avoid generic "AI-sounding" comments.
- **Algorithm Optimization**: Align with LinkedIn's 360Brew updates (Relevance over Volume).
- **Anti-Detection**: Implement human-like variance and spacing.

## 2. The 360Brew Optimization Engine

### A. Topical Relevance Filtering

Every post discovered must pass a relevance threshold (0.6/1.0) before a comment is generated.

- **Expertise Check**: Does the post align with the user's defined brand voice and areas of expertise?
- **Value Add**: Does the user have a unique perspective or data point to share?

### B. Adaptive Depth Logic

Comments should not have a fixed length. They must mirror the post's depth:

- **Short Update**: 50-120 chars (Punchy, supportive).
- **Question Post**: 150-300 chars (Answer the question first, then expand).
- **Thought Piece**: 200-400 chars (Share a counterpoint or specific experience).

### C. Engagement Distribution

- **30% Questions**: Ask curiosity-driven, open-ended questions to spark dialogue.
- **70% Insights**: Provide a meaningful takeaway or supportive perspective.
- **Reaction-Only Mode**: For extremely long articles or posts where a comment adds no value, use a context-aware reaction (Insightful, Support, Celebrate, etc.).

## 3. Technical Framework

### A. Discovery Layers

1. **Profile Monitors**: Watch key industry leaders and prospects.
2. **Hashtag Discovery**: Track top-performing posts in relevant categories.
3. **Company Monitors**: Support B2B relationship building.

### B. Relationship Memory

VERA monitors and remembers:

- **Interaction History**: Total comments on a specific author.
- **Cooldowns**: 5-day pause between comments on the same author to avoid "stalking" behavior.
- **Response Tracking**: Did the author reply or like? (Boosts relationship score).

### C. Anti-Detection & Variance

- **Randomized Spacing**: Wait 15-45 minutes between posts.
- **Comment Variance**: Mix between 4 styles (Story, Question, Insight, Statement).
- **Banned Phrase Filter**: Automatic rejection of generic phrases like "Great post!", "Nailed it!", or "Thanks for sharing!".

## 4. Unipile Integration (LinkedIn)

- **Endpoint**: `/api/v1/posts/reaction` (Context-aware reactions).
- **Endpoint**: `/api/v1/posts/{post_id}/comments` (Nested threading for replies).
- **Endpoint**: `/api/v1/users/{id}/posts` (Activity tracking for prospect warming).

## 5. Implementation Roadmap

1. [ ] Port `engagement-quality-scorer.ts` logic to VERA.
2. [ ] Integrate `author-relationship-tracker.ts` with VERA's Supabase instance.
3. [ ] Implement the HITL (Human-in-the-Loop) approval dashboard for comments.
4. [ ] Set up the English-only Language Purity guard.
