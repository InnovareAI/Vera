// Project types for VERA

export type PlatformId = 'linkedin' | 'twitter' | 'medium' | 'newsletter' | 'instagram' | 'tiktok' | 'blog'

export interface ProjectProduct {
  name: string
  description: string
  url?: string
}

export interface ProjectICP {
  target_roles?: string[]
  target_industries?: string[]
  company_size?: string
  pain_points?: string[]
  goals?: string[]
}

export interface VoiceProfile {
  style: string
  formality: string
  personality: string[]
  dos: string[]
  donts: string[]
}

export interface ProjectToneOfVoice {
  style?: string
  formality?: string
  personality?: string[]
  dos?: string[]
  donts?: string[]
  voice_profile?: VoiceProfile
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  website_url: string | null
  logo_url: string | null
  brand_colors: { primary: string; secondary: string }
  industry: string | null
  products: ProjectProduct[]
  icp: ProjectICP
  tone_of_voice: ProjectToneOfVoice
  enabled_platforms: PlatformId[]
  platform_settings: Record<string, unknown>
  status: string
  is_default: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}
