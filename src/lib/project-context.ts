import type { Project, VoiceProfile } from '@/types/project'

/**
 * Builds a brand context string from a project for use in content generation prompts.
 */
export function buildBrandContextFromProject(project: Project): string {
  const parts: string[] = []

  parts.push(`Brand: ${project.name}`)
  if (project.description) parts.push(`About: ${project.description}`)
  if (project.website_url) parts.push(`Website: ${project.website_url}`)
  if (project.industry) parts.push(`Industry: ${project.industry}`)

  if (project.products?.length > 0) {
    const productList = project.products
      .map(p => `${p.name}${p.description ? ` - ${p.description}` : ''}`)
      .join('; ')
    parts.push(`Products/Services: ${productList}`)
  }

  const icp = project.icp
  if (icp) {
    const icpParts: string[] = []
    if (icp.target_roles?.length) icpParts.push(`Target roles: ${icp.target_roles.join(', ')}`)
    if (icp.target_industries?.length) icpParts.push(`Target industries: ${icp.target_industries.join(', ')}`)
    if (icp.company_size) icpParts.push(`Company size: ${icp.company_size}`)
    if (icp.pain_points?.length) icpParts.push(`Pain points: ${icp.pain_points.join(', ')}`)
    if (icp.goals?.length) icpParts.push(`Goals: ${icp.goals.join(', ')}`)
    if (icpParts.length > 0) parts.push(`ICP: ${icpParts.join('. ')}`)
  }

  const tov = project.tone_of_voice
  if (tov) {
    const tovParts: string[] = []
    if (tov.style) tovParts.push(`Style: ${tov.style}`)
    if (tov.formality) tovParts.push(`Formality: ${tov.formality}`)
    if (tov.personality?.length) tovParts.push(`Personality: ${tov.personality.join(', ')}`)
    if (tov.dos?.length) tovParts.push(`Do: ${tov.dos.join(', ')}`)
    if (tov.donts?.length) tovParts.push(`Don't: ${tov.donts.join(', ')}`)
    if (tovParts.length > 0) parts.push(`Tone of Voice: ${tovParts.join('. ')}`)
  }

  if (project.enabled_platforms?.length > 0) {
    parts.push(`Active platforms: ${project.enabled_platforms.join(', ')}`)
  }

  return parts.join('\n')
}

/**
 * Extracts a VoiceProfile from a project's tone_of_voice settings.
 */
export function getVoiceProfileFromProject(project: Project): VoiceProfile {
  const tov = project.tone_of_voice
  if (tov?.voice_profile) return tov.voice_profile
  return {
    style: tov?.style || 'professional',
    formality: tov?.formality || 'semi-formal',
    personality: tov?.personality || [],
    dos: tov?.dos || [],
    donts: tov?.donts || [],
  }
}
