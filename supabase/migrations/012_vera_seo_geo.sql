-- VERA SEO/GEO Agent tables

CREATE TABLE vera_ai_search_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE,
  enabled BOOLEAN DEFAULT true,
  website_url TEXT,
  website_locked BOOLEAN DEFAULT false,
  analysis_depth TEXT DEFAULT 'standard',
  check_meta_tags BOOLEAN DEFAULT true,
  check_structured_data BOOLEAN DEFAULT true,
  check_robots_txt BOOLEAN DEFAULT true,
  check_sitemap BOOLEAN DEFAULT true,
  check_llm_readability BOOLEAN DEFAULT true,
  check_entity_clarity BOOLEAN DEFAULT true,
  check_fact_density BOOLEAN DEFAULT true,
  check_citation_readiness BOOLEAN DEFAULT true,
  learn_from_content BOOLEAN DEFAULT true,
  learn_from_comments BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vera_website_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  website_url TEXT,
  domain TEXT,
  status TEXT DEFAULT 'pending',
  seo_score INTEGER,
  geo_score INTEGER,
  overall_score INTEGER,
  seo_results JSONB,
  geo_results JSONB,
  recommendations JSONB,
  executive_summary TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
