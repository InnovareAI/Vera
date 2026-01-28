-- Brand Profiles for Campaign Generator
-- Stores brand training data for AI content generation
CREATE TABLE IF NOT EXISTS brand_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    -- Voice & Tone
    voice text,
    -- e.g., "Professional yet approachable"
    tonality text,
    -- e.g., "bold", "educational", "inspirational"
    -- Training Data (stored as JSONB for flexibility)
    training_data jsonb DEFAULT '{
        "examples": [],
        "voiceSamples": [],
        "doList": [],
        "dontList": [],
        "writingRules": [],
        "keyPhrases": [],
        "avoidPhrases": []
    }'::jsonb,
    -- Brand Guidelines (imported from SAM or manual)
    brand_guidelines text,
    guidelines_source text,
    -- 'manual', 'sam', 'imported'
    -- Colors & Visual
    brand_colors text [],
    -- Array of hex colors
    logo_url text,
    -- Metadata
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_profiles_default ON brand_profiles(is_default)
WHERE is_default = true;
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_brand_profile_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS brand_profiles_updated_at ON brand_profiles;
CREATE TRIGGER brand_profiles_updated_at BEFORE
UPDATE ON brand_profiles FOR EACH ROW EXECUTE FUNCTION update_brand_profile_timestamp();
-- Generated Campaigns table (to track what was generated)
CREATE TABLE IF NOT EXISTS campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    brand_profile_id uuid REFERENCES brand_profiles(id),
    -- Campaign Config
    config jsonb NOT NULL,
    -- Full campaign configuration
    -- Status
    status text DEFAULT 'draft',
    -- draft, generating, complete, published
    -- Generated Content
    generated_content jsonb DEFAULT '[]'::jsonb,
    -- Metrics
    total_items integer DEFAULT 0,
    completed_items integer DEFAULT 0,
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    published_at timestamptz
);
-- Index for listing campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON campaigns(brand_profile_id);
-- Add RLS policies
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- For now, allow all access (update with proper auth later)
CREATE POLICY "Allow all access to brand_profiles" ON brand_profiles FOR ALL USING (true);
CREATE POLICY "Allow all access to campaigns" ON campaigns FOR ALL USING (true);