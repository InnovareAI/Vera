-- VERA Content Engine - Based on Airtable/Make Architecture
-- Translated to Supabase with enhanced features
-- =============================================================================
-- AI MODELS - Available models for content generation
-- All models are accessed via OpenRouter API (single key for all providers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Model identification (OpenRouter format: provider/model-name)
    model_id text NOT NULL,
    -- e.g., 'openai/gpt-4o', 'anthropic/claude-3-5-sonnet', 'google/gemini-2.0-flash'
    display_name text NOT NULL,
    -- e.g., 'GPT-4o', 'Claude 3.5 Sonnet'
    -- Original provider (for reference/categorization, all accessed via OpenRouter)
    provider text NOT NULL,
    -- 'openai', 'anthropic', 'google', 'meta', 'perplexity'
    -- Capabilities
    max_tokens integer DEFAULT 4096,
    supports_images boolean DEFAULT false,
    supports_tools boolean DEFAULT false,
    -- Recommended use cases
    best_for text [],
    -- ['short-form', 'long-form', 'research', 'creative']
    -- Status
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
-- Seed default models (all accessed via OpenRouter - single API key)
INSERT INTO ai_models (
        model_id,
        display_name,
        provider,
        max_tokens,
        supports_images,
        supports_tools,
        best_for
    )
VALUES -- OpenAI
    (
        'openai/gpt-4o',
        'GPT-4o',
        'openai',
        4096,
        true,
        true,
        ARRAY ['short-form', 'linkedin', 'twitter']
    ),
    (
        'openai/gpt-4o-mini',
        'GPT-4o Mini',
        'openai',
        4096,
        true,
        true,
        ARRAY ['quick', 'drafts']
    ),
    -- Anthropic
    (
        'anthropic/claude-3.5-sonnet',
        'Claude 3.5 Sonnet',
        'anthropic',
        8192,
        true,
        true,
        ARRAY ['long-form', 'newsletters', 'blogs', 'ebooks']
    ),
    (
        'anthropic/claude-3.5-haiku',
        'Claude 3.5 Haiku',
        'anthropic',
        4096,
        true,
        true,
        ARRAY ['quick', 'comments']
    ),
    -- Google (Gemini)
    (
        'google/gemini-2.0-flash-001',
        'Gemini 2.0 Flash',
        'google',
        8192,
        true,
        true,
        ARRAY ['fast', 'multimodal', 'creative']
    ),
    (
        'google/gemini-2.0-flash-thinking-exp',
        'Gemini 2.0 Flash Thinking',
        'google',
        8192,
        true,
        true,
        ARRAY ['reasoning', 'complex', 'analysis']
    ),
    (
        'google/gemini-pro-1.5',
        'Gemini 1.5 Pro',
        'google',
        32000,
        true,
        true,
        ARRAY ['long-form', 'research', 'documents']
    ),
    -- Meta (Llama)
    (
        'meta-llama/llama-3.3-70b-instruct',
        'Llama 3.3 70B',
        'meta',
        8192,
        false,
        true,
        ARRAY ['general', 'creative', 'coding']
    ),
    -- Perplexity  
    (
        'perplexity/llama-3.1-sonar-large-128k-online',
        'Perplexity Sonar',
        'perplexity',
        4096,
        false,
        false,
        ARRAY ['research', 'factual', 'real-time']
    ) ON CONFLICT DO NOTHING;
-- =============================================================================
-- PROMPTS - Master catalog of all prompts
-- =============================================================================
CREATE TABLE IF NOT EXISTS prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Identification
    prompt_code text,
    -- Auto-generated: P1, P2, P3... (like the transcript)
    prompt_name text NOT NULL,
    -- e.g., 'LinkedIn Post', 'Twitter Thread', 'Blog Article'
    -- Platform targeting
    platform text NOT NULL,
    -- 'linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'blog', 'tiktok', 'medium'
    content_type text NOT NULL,
    -- 'post', 'comment', 'headline', 'newsletter', 'thread', 'article', 'short', 'reel'
    -- The prompts themselves
    system_prompt text NOT NULL,
    -- Voice, style, persona instructions
    user_prompt text NOT NULL,
    -- Structure, format, output requirements
    -- Model preference
    preferred_model_id uuid REFERENCES ai_models(id),
    -- Tone of Voice integration
    include_tone_of_voice boolean DEFAULT true,
    -- Whether to append workspace's tone of voice
    -- Output settings
    default_word_count integer,
    -- e.g., 300 for LinkedIn, 280 chars for Twitter
    include_hashtags boolean DEFAULT false,
    include_emoji boolean DEFAULT true,
    include_cta boolean DEFAULT true,
    -- Status
    is_active boolean DEFAULT true,
    is_template boolean DEFAULT false,
    -- Built-in templates
    -- Metadata
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Auto-generate prompt codes
CREATE OR REPLACE FUNCTION generate_prompt_code() RETURNS trigger AS $$
DECLARE next_num integer;
BEGIN
SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(
                    prompt_code
                    FROM 2
                ) AS integer
            )
        ),
        0
    ) + 1 INTO next_num
FROM prompts
WHERE workspace_id = NEW.workspace_id;
NEW.prompt_code := 'P' || next_num;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_prompt_code BEFORE
INSERT ON prompts FOR EACH ROW
    WHEN (NEW.prompt_code IS NULL) EXECUTE FUNCTION generate_prompt_code();
-- =============================================================================
-- TONE OF VOICE - Detailed writing style guides
-- =============================================================================
CREATE TABLE IF NOT EXISTS tone_of_voice (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Voice identity
    name text NOT NULL,
    -- e.g., 'Default Brand Voice', 'Technical Voice', 'Casual Voice'
    is_default boolean DEFAULT false,
    -- The actual tone guide (2000+ words as mentioned in transcript)
    voice_document text NOT NULL,
    -- Full AI-generated voice guidelines
    -- Quick reference traits
    personality_traits text [],
    -- ['professional', 'innovative', 'approachable']
    writing_style text,
    -- 'conversational', 'formal', 'technical'
    -- Do's and Don'ts
    do_list text [],
    -- Things this voice DOES
    dont_list text [],
    -- Things this voice AVOIDS
    -- Key phrases and vocabulary
    key_phrases text [],
    -- Phrases to use
    avoid_phrases text [],
    -- Phrases to avoid
    -- Source samples (for AI analysis)
    sample_content text [],
    -- Original writing samples used to generate the voice
    -- Metadata
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- =============================================================================
-- CONTENT QUEUE - The "Content Machine" equivalent
-- =============================================================================
CREATE TABLE IF NOT EXISTS content_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Input
    topic text NOT NULL,
    -- Main topic/subject
    viewpoint text,
    -- Optional: "my viewpoint" - personal perspective to inject
    context text,
    -- Additional context or instructions
    -- Prompt reference
    prompt_id uuid REFERENCES prompts(id),
    -- Derived fields (populated from prompt)
    platform text,
    content_type text,
    -- Generation settings
    model_override uuid REFERENCES ai_models(id),
    -- Override the prompt's default model
    tone_of_voice_id uuid REFERENCES tone_of_voice(id),
    -- Override default voice
    -- Output
    finished_content text,
    -- The generated content
    hashtags text [],
    media_urls text [],
    -- Generated images/videos
    -- Status
    status text DEFAULT 'pending',
    -- 'pending', 'processing', 'complete', 'error', 'scheduled'
    error_message text,
    -- Timing
    scheduled_for timestamptz,
    -- When to publish (if scheduled)
    processed_at timestamptz,
    -- Publishing
    published_at timestamptz,
    published_url text,
    -- URL of published content
    -- Metadata
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_prompts_workspace ON prompts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_prompts_platform ON prompts(platform);
CREATE INDEX IF NOT EXISTS idx_content_queue_workspace ON content_queue(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
CREATE INDEX IF NOT EXISTS idx_tone_of_voice_workspace ON tone_of_voice(workspace_id);
-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_of_voice ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;
-- AI Models - workspace members can view
CREATE POLICY "Workspace members can view models" ON ai_models FOR
SELECT USING (
        workspace_id IS NULL
        OR -- Global models
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
-- Prompts - workspace members can view, editors+ can manage
CREATE POLICY "Workspace members can view prompts" ON prompts FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
CREATE POLICY "Editors can manage prompts" ON prompts FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
            AND is_active = true
    )
);
-- Tone of Voice - same pattern
CREATE POLICY "Workspace members can view tone" ON tone_of_voice FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
CREATE POLICY "Editors can manage tone" ON tone_of_voice FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
            AND is_active = true
    )
);
-- Content Queue - same pattern
CREATE POLICY "Workspace members can view queue" ON content_queue FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND is_active = true
        )
    );
CREATE POLICY "Editors can manage queue" ON content_queue FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
            AND is_active = true
    )
);
-- =============================================================================
-- SEED DEFAULT PROMPTS (Templates)
-- =============================================================================
-- These are global templates that workspaces can copy
INSERT INTO prompts (
        prompt_name,
        platform,
        content_type,
        system_prompt,
        user_prompt,
        is_template,
        default_word_count,
        include_hashtags
    )
VALUES (
        'LinkedIn Post',
        'linkedin',
        'post',
        'You are a professional LinkedIn content writer. Write engaging, authentic content that drives meaningful professional conversations. Use a conversational yet professional tone. Include relevant insights and actionable takeaways.',
        'Write a LinkedIn post about the topic provided. Structure:
- Hook (first line that stops the scroll)
- 2-3 short paragraphs with insights
- A question to drive engagement
- 3-5 relevant hashtags

Keep it under 300 words. Use line breaks for readability.',
        true,
        300,
        true
    ),
    (
        'Twitter/X Thread',
        'twitter',
        'thread',
        'You are a Twitter expert who creates viral threads. Write punchy, engaging content that provides value in small bites. Each tweet should be able to stand alone while building a narrative.',
        'Create a Twitter thread about the topic provided. Structure:
- Tweet 1: Hook that creates curiosity
- Tweets 2-5: Key insights, one per tweet
- Final tweet: Summary + CTA

Each tweet must be under 280 characters. Number each tweet.',
        true,
        280,
        true
    ),
    (
        'Blog Article',
        'blog',
        'article',
        'You are an expert blog writer. Create well-researched, SEO-friendly articles that provide genuine value to readers. Use clear structure with headers, and include actionable insights.',
        'Write a comprehensive blog article about the topic provided. Structure:
- Compelling headline
- Introduction with hook
- 3-5 main sections with H2 headers
- Practical examples or case studies
- Conclusion with key takeaways
- Meta description (160 chars max)

Target: 1500-2000 words.',
        true,
        2000,
        false
    ),
    (
        'LinkedIn Newsletter',
        'linkedin',
        'newsletter',
        'You are a thought leader writing for your LinkedIn newsletter subscribers. Provide deep insights and expert analysis. Be personable but authoritative. Share genuine expertise and unique perspectives.',
        'Write a LinkedIn newsletter article about the topic provided. Structure:
- Compelling subject line
- Personal opening (connect with readers)
- Main thesis/insight
- 3-4 supporting points with examples
- Actionable takeaways
- Question to drive comments

Target: 800-1200 words. Use bullet points for key insights.',
        true,
        1000,
        false
    ),
    (
        'Instagram Caption',
        'instagram',
        'post',
        'You are an Instagram copywriter. Write engaging captions that complement visual content. Use a mix of storytelling and direct engagement. Know when to use emojis effectively.',
        'Write an Instagram caption about the topic provided. Structure:
- Hook (first line must grab attention)
- Story or insight (2-3 sentences)
- Call to action
- 5-10 relevant hashtags (mix of popular and niche)

Keep it under 150 words. Use relevant emojis sparingly.',
        true,
        150,
        true
    ) ON CONFLICT DO NOTHING;