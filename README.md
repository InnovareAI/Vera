# VERA AI — Content Intelligence System

VERA is InnovareAI's content agent — a three-part system that researches, writes, and distributes content across social platforms.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    VERA AI                          │
├─────────────────┬─────────────┬─────────────────────┤
│   SCOUT         │   WRITER    │   PUBLISHER         │
│   (Research)    │   (Content) │   (Distribution)    │
├─────────────────┼─────────────┼─────────────────────┤
│ • Reddit monitor│ • Draft     │ • Queue + approve   │
│ • Keyword match │ • Repurpose │ • Platform APIs     │
│ • Signal detect │ • Tone adapt│ • Track engagement  │
└─────────────────┴─────────────┴─────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Features

### Web App (Next.js)

- **`/`** — Conversational chat interface with VERA research agent
- **`/research`** — Multi-source research dashboard with content generation

### API Routes

| Endpoint | Function |
|----------|----------|
| `/api/chat` | Agentic conversation with Claude |
| `/api/research` | Multi-source research (Reddit, HN, Google News) |
| `/api/generate` | Platform-specific content generation |

### Edge Functions (Supabase)

| Function | Purpose | Schedule |
|----------|---------|----------|
| `scout-reddit` | Monitors Reddit for B2B opportunities | Every 15 min (0,15,30,45) |
| `scout-hackernews` | Monitors Hacker News for tech discussions | Every 15 min (0,15,30,45) |
| `scout-linkedin` | LinkedIn post monitoring via Unipile API | Every 15 min (7,22,37,52) |
| `scout-google-news` | Industry news via Google News RSS | Every 30 min (3,33) |
| `scout-producthunt` | New product launches & competitors | Every 30 min (10,40) |
| `scout-devto` | Technical content on DEV.to | Every 30 min (17,47) |
| `notify-gchat` | Sends formatted Google Chat notifications | On-demand |

## Deploying Scout (Phase 1)

### Prerequisites

- Supabase project with database
- Google Chat webhook URL
- Anthropic API key

### 1. Set Supabase Secrets

```bash
# Set secrets for edge functions
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...
```

### 2. Run Database Migrations

```bash
# Apply schema
supabase db push

# Or manually run migrations
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy scout-reddit
supabase functions deploy notify-gchat
```

### 4. Test Manually

```bash
curl -X POST https://<project>.supabase.co/functions/v1/scout-reddit \
  -H "Authorization: Bearer SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

### 5. Setup Cron (Supabase Dashboard)

1. Go to **Database → Extensions** → Enable `pg_cron` and `pg_net`
2. Run the SQL from `supabase/migrations/002_setup_cron.sql`
3. Update the project reference in the SQL

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `GOOGLE_CHAT_WEBHOOK_URL` | Yes* | Google Chat webhook for alerts |

*Required for Scout notifications

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **AI:** Anthropic Claude (claude-sonnet-4-20250514)
- **Database:** Supabase Postgres
- **Edge Functions:** Deno (Supabase Edge)
- **Deployment:** Netlify (frontend), Supabase (backend)

## Project Structure

```
vera/
├── src/
│   ├── app/           # Next.js pages & API routes
│   ├── agents/        # AI agent implementations
│   ├── components/    # React components
│   ├── lib/           # Utilities
│   └── types/         # TypeScript types
├── supabase/
│   ├── functions/     # Edge functions
│   │   ├── scout-reddit/
│   │   └── notify-gchat/
│   └── migrations/    # Database migrations
└── public/            # Static assets
```

## Roadmap

- [x] **Phase 1:** Scout + Notifications (Reddit monitoring, Google Chat alerts)
- [x] **Phase 2:** Multi-Platform Scouting
  - [x] Hacker News monitoring
  - [x] LinkedIn via Unipile API (Sales Navigator)
  - [x] Google News RSS feeds
  - [x] Product Hunt monitoring
  - [x] DEV.to technical content
  - [ ] Twitter/X (pending API setup)
  - [ ] Instagram profiles (available via Unipile)
  - [ ] Reddit OAuth integration (pending credentials)
- [ ] **Phase 3:** Writer Integration (AI drafts in alerts, approval flow)
- [ ] **Phase 4:** Publisher (LinkedIn, Twitter scheduling, platform APIs)
- [ ] **Phase 5:** Analytics (engagement tracking, performance reports)

## License

Private - InnovareAI
