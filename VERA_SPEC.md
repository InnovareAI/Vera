# VERA AI — Content Intelligence System

## Overview

VERA is InnovareAI's content agent — a three-part system that researches, writes, and distributes content across social platforms. It connects to SAM (sales agent) via MCP for shared context.

## Architecture

┌─────────────────────────────────────────────────────────┐
│                        VERA AI                          │
├─────────────────┬─────────────────┬─────────────────────┤
│   SCOUT         │   WRITER        │   PUBLISHER         │
│   (Research)    │   (Content)     │   (Distribution)    │
├─────────────────┼─────────────────┼─────────────────────┤
│ • Trend monitor │ • Draft posts   │ • Reddit responses  │
│ • Topic research│ • Long-form     │ • LinkedIn posts    │
│ • Competitor    │ • Repurpose     │ • Twitter/X         │
│   tracking      │ • Adapt tone    │ • Medium articles   │
│ • Signal detect │   per platform  │ • Queue + approve   │
└────────┬────────┴────────┬────────┴──────────┬──────────┘
│                 │                   │
└────────────────►│◄──────────────────┘
│
Shared Supabase
(topics, drafts, calendar, analytics)

## Agents

### 1. SCOUT (Research Agent)

**Purpose:** Find topics, trends, and opportunities

**Capabilities:**

- Reddit/HN monitoring for keywords and rising posts
- Twitter/X trending in sales/SaaS/startup niches
- Google Trends for keyword tracking
- Competitor content tracking (Apollo, Instantly, Clay, etc.)
- Signal detection (high-intent posts, pain points, buying signals)

**Outputs:**

- Topic suggestions with context
- Opportunity alerts (posts to respond to)
- Trend reports
- Content gap analysis

**Keywords to Monitor:**

Direct product fit:

- AI SDR, AI BDR, AI sales agent, AI outbound, automated prospecting

Problem-aware:

- how to do outbound without SDR, can't afford SDR, SDR too expensive
- outbound at scale, solo founder sales, founder-led sales, cold outreach automation

Competitor/alternative seekers:

- Apollo alternative, Instantly alternative, Lemlist alternative
- Smartlead alternative, Clay alternative

Pain points:

- SDR turnover, SDR ramp time, CAC too high
- outbound not working, cold email not working, scaling outbound

**Subreddits:**

- r/startups, r/SaaS, r/sales, r/Entrepreneur
- r/smallbusiness, r/indiehackers, r/growmybusiness

### 2. WRITER (Content Agent)

**Purpose:** Create content from research

**Capabilities:**

- Draft social posts (LinkedIn, Twitter/X)
- Draft long-form (Medium, blog)
- Draft Reddit responses
- Repurpose content across formats
- Adapt tone per platform
- Maintain brand voice consistency

**Inputs:**

- Topics from Scout
- Brand voice guidelines
- Content calendar
- Platform-specific constraints

**Outputs:**

- Draft posts with platform tags
- Suggested posting times
- Hashtag recommendations
- Content variations (A/B options)

### 3. PUBLISHER (Distribution Agent)

**Purpose:** Queue, approve, and track content

**Capabilities:**

- Queue management with scheduling
- Human-in-the-loop approval flow
- Platform API integrations
- Engagement tracking
- Performance analytics

**Platforms:**

- Reddit (manual post, auto-alert)
- LinkedIn (API or manual)
- Twitter/X (API or manual)
- Medium (API or manual)

**Workflow:**

1. Scout finds opportunity
2. Writer drafts response/post
3. Publisher queues for approval
4. Human reviews, edits, approves
5. Content posted (auto or manual)
6. Engagement tracked

## Tech Stack

- **Runtime:** Supabase Edge Functions (Deno)
- **Database:** Supabase Postgres
- **Queue:** Supabase Realtime + cron
- **AI:** OpenAI/Anthropic for drafting
- **Notifications:** Google Chat webhook
- **MCP:** Connect to SAM for shared context

## Database Schema

```sql
-- Topics discovered by Scout
create table topics (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- reddit, twitter, google_trends, etc.
  source_url text,
  title text not null,
  content text,
  keywords text[],
  category text, -- trend, opportunity, competitor, pain_point
  relevance_score float,
  created_at timestamptz default now(),
  processed boolean default false
);

-- Content drafts from Writer
create table drafts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  platform text not null, -- linkedin, twitter, reddit, medium
  content text not null,
  status text default 'draft', -- draft, queued, approved, posted, rejected
  scheduled_for timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Posted content tracking
create table posts (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references drafts(id),
  platform text not null,
  platform_post_id text,
  url text,
  posted_at timestamptz default now(),
  engagement jsonb -- likes, comments, shares, etc.
);

-- Seen posts (deduplication)
create table seen_posts (
  id text primary key, -- platform + post_id
  platform text not null,
  seen_at timestamptz default now()
);
```

## Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Reddit (read-only, no auth needed for public posts)
# Uses public JSON API

# OpenAI/Anthropic
OPENAI_API_KEY=
# or
ANTHROPIC_API_KEY=

# Google Chat
GOOGLE_CHAT_WEBHOOK_URL=

# Optional: Platform APIs for auto-posting
TWITTER_API_KEY=
TWITTER_API_SECRET=
LINKEDIN_ACCESS_TOKEN=
MEDIUM_ACCESS_TOKEN=
```

## V0 Scope (MVP)

### Phase 1: Scout + Notifications

- Reddit monitor edge function
- Keyword matching
- Google Chat alerts with deep links
- Deduplication (seen_posts table)
- Supabase cron (every 15 min)

### Phase 2: Writer Integration

- AI-drafted responses in alerts
- Store drafts in database
- Basic approval flow (mark as used/rejected)

### Phase 3: Multi-Platform

- LinkedIn post drafting
- Twitter/X drafting
- Content calendar
- Scheduling

### Phase 4: Analytics

- Engagement tracking
- What's working reports
- Topic performance

## Alert Format (Google Chat)

🎯 HIGH-FIT OPPORTUNITY

r/startups • u/founder_jane • 2h ago

"How are you handling outbound as a solo founder?"

I'm pre-seed, no budget for SDRs. Doing everything manually
and it's killing me. Cold email feels spammy, LinkedIn is
slow. What's working for you?

---

💬 SUGGESTED RESPONSE:

Been there. What worked for me: focus on 20 high-fit
prospects per week instead of blasting hundreds.
Personalized LinkedIn + email combo. I ended up using
an AI tool to handle the research and sequencing so I
could focus on actual conversations. Happy to share
more if useful.

---

🔗 <https://reddit.com/r/startups/comments/xyz123>

Category: pain_point | Keywords: solo founder, outbound, SDR

## MCP Connection to SAM

Future: VERA can access SAM's prospect data to:

1. Find content topics from common objections
2. Identify industries with high engagement
3. Correlate content → pipeline impact

SAM can access VERA's signals to:

1. Add social engagement as touchpoint
2. Prioritize prospects who engaged with content

## File Structure

```
vera/
├── supabase/
│   ├── functions/
│   │   ├── scout-reddit/
│   │   │   └── index.ts
│   │   ├── scout-twitter/
│   │   │   └── index.ts
│   │   ├── writer-draft/
│   │   │   └── index.ts
│   │   └── notify-gchat/
│   │       └── index.ts
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── package.json
└── README.md
```

## Getting Started

1. Create Supabase project
2. Run migrations
3. Set environment variables
4. Deploy edge functions
5. Set up cron job (Database → Extensions → pg_cron)
6. Create Google Chat webhook
7. Test with manual function invoke

## Commands

```bash
# Local development
supabase start
supabase functions serve scout-reddit

# Deploy
supabase functions deploy scout-reddit
supabase functions deploy notify-gchat

# Test
curl -X POST http://localhost:54321/functions/v1/scout-reddit
```
