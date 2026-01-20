-- Topics discovered by Scout
create table if not exists topics (
    id uuid primary key default gen_random_uuid(),
    source text not null,
    -- reddit, twitter, google_trends, etc.
    source_url text,
    title text not null,
    content text,
    keywords text [],
    category text,
    -- trend, opportunity, competitor, pain_point
    relevance_score float,
    created_at timestamptz default now(),
    processed boolean default false
);
-- Content drafts from Writer
create table if not exists drafts (
    id uuid primary key default gen_random_uuid(),
    topic_id uuid references topics(id),
    platform text not null,
    -- linkedin, twitter, reddit, medium
    content text not null,
    status text default 'draft',
    -- draft, queued, approved, posted, rejected
    scheduled_for timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
-- Posted content tracking
create table if not exists posts (
    id uuid primary key default gen_random_uuid(),
    draft_id uuid references drafts(id),
    platform text not null,
    platform_post_id text,
    url text,
    posted_at timestamptz default now(),
    engagement jsonb -- likes, comments, shares, etc.
);
-- Seen posts (deduplication)
create table if not exists seen_posts (
    id text primary key,
    -- platform + post_id
    platform text not null,
    seen_at timestamptz default now()
);