'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import type { Project } from '@/types/project'

// ═══════════════════════════════════════════════════════════════════
// LAYER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

interface LayerTab {
  label: string
  href: string
}

interface Layer {
  id: string
  label: string
  href: string
  color: string
  tabs: LayerTab[]
}

const LAYERS: Layer[] = [
  {
    id: 'strategy',
    label: 'Strategy',
    href: '/strategy',
    color: 'violet',
    tabs: [
      { label: 'Overview', href: '' },
      { label: 'Research', href: '/research' },
      { label: 'Calendar', href: '/calendar' },
      { label: 'Competitive', href: '/competitive' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    href: '/social',
    color: 'blue',
    tabs: [
      { label: 'Create', href: '/create' },
      { label: 'Review', href: '/review' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Commenting', href: '/commenting' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    id: 'paid',
    label: 'Paid',
    href: '/paid',
    color: 'fuchsia',
    tabs: [
      { label: 'Amplify', href: '/amplify' },
      { label: 'Creatives', href: '/creatives' },
      { label: 'Campaigns', href: '/campaigns' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    id: 'seo',
    label: 'SEO',
    href: '/seo',
    color: 'emerald',
    tabs: [
      { label: 'Overview', href: '' },
      { label: 'Keywords', href: '/keywords' },
      { label: 'Rankings', href: '/rankings' },
      { label: 'GEO', href: '/geo' },
    ],
  },
  {
    id: 'nurture',
    label: 'Nurture',
    href: '/nurture',
    color: 'orange',
    tabs: [
      { label: 'Sequences', href: '/sequences' },
      { label: 'Campaigns', href: '/campaigns' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    href: '/newsletter',
    color: 'amber',
    tabs: [
      { label: 'Create', href: '/create' },
      { label: 'Subscribers', href: '/subscribers' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    id: 'web',
    label: 'Web',
    href: '/web',
    color: 'sky',
    tabs: [
      { label: 'Blog', href: '/blog' },
      { label: 'Landing Pages', href: '/landing' },
      { label: 'Case Studies', href: '/cases' },
    ],
  },
]

const STANDALONE = [
  { id: 'analytics', label: 'Analytics', href: '/analytics', color: 'gray' },
  { id: 'settings', label: 'Settings', href: '/settings', color: 'gray' },
]

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════

function LayerIcon({ id, className = 'w-5 h-5' }: { id: string; className?: string }) {
  switch (id) {
    case 'strategy':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    case 'social':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
    case 'paid':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>
    case 'seo':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" /></svg>
    case 'nurture':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
    case 'newsletter':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>
    case 'web':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
    case 'analytics':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
    case 'settings':
      return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    default:
      return null
  }
}

// Color mappings for layers
const COLOR_MAP: Record<string, { active: string; hover: string; border: string; text: string; bg: string }> = {
  violet:  { active: 'bg-violet-500/10', hover: 'hover:bg-violet-500/5', border: 'border-violet-500', text: 'text-violet-400', bg: 'bg-violet-500' },
  blue:    { active: 'bg-blue-500/10', hover: 'hover:bg-blue-500/5', border: 'border-blue-500', text: 'text-blue-400', bg: 'bg-blue-500' },
  fuchsia: { active: 'bg-fuchsia-500/10', hover: 'hover:bg-fuchsia-500/5', border: 'border-fuchsia-500', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500' },
  emerald: { active: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500/5', border: 'border-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500' },
  orange:  { active: 'bg-orange-500/10', hover: 'hover:bg-orange-500/5', border: 'border-orange-500', text: 'text-orange-400', bg: 'bg-orange-500' },
  amber:   { active: 'bg-amber-500/10', hover: 'hover:bg-amber-500/5', border: 'border-amber-500', text: 'text-amber-400', bg: 'bg-amber-500' },
  sky:     { active: 'bg-sky-500/10', hover: 'hover:bg-sky-500/5', border: 'border-sky-500', text: 'text-sky-400', bg: 'bg-sky-500' },
  gray:    { active: 'bg-gray-500/10', hover: 'hover:bg-gray-500/5', border: 'border-gray-600', text: 'text-gray-400', bg: 'bg-gray-500' },
}

// ═══════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  useEffect(() => {
    if (projectId) fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/projects/${projectId}`
      console.log('[Vera] Fetching project:', url)
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.text()
        console.error('[Vera] Project fetch failed:', res.status, body)
        throw new Error(`Failed to fetch project (${res.status})`)
      }
      const data = await res.json()
      console.log('[Vera] Project loaded:', data.name, data.id)
      setProject(data)
    } catch (err) {
      console.error('[Vera] Failed to fetch project:', err)
      setError(`Failed to load project. ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // Determine active layer and sub-tab from pathname
  const base = `/projects/${projectId}`
  const relative = pathname.replace(base, '') || '/'

  const getActiveLayer = (): Layer | null => {
    for (const layer of LAYERS) {
      if (relative.startsWith(layer.href)) return layer
    }
    return null
  }

  const getActiveStandalone = () => {
    for (const s of STANDALONE) {
      if (relative.startsWith(s.href)) return s
    }
    return null
  }

  const activeLayer = getActiveLayer()
  const activeStandalone = getActiveStandalone()
  const activeItem = activeLayer || activeStandalone

  const getActiveSubTab = (): string => {
    if (!activeLayer) return ''
    const sub = relative.replace(activeLayer.href, '')
    for (const tab of activeLayer.tabs) {
      if (tab.href && sub.startsWith(tab.href)) return tab.href
    }
    return ''
  }

  const activeSubTab = getActiveSubTab()
  const colors = activeItem ? COLOR_MAP[activeItem.color] || COLOR_MAP.gray : COLOR_MAP.gray

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4 font-medium">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!user || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-6">Please log in and select a workspace to continue.</p>
          <Link href="/login" className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
      {/* ═══ HEADER ═══ */}
      <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-base font-black text-white italic">V</span>
              </div>
              <span className="text-lg font-black tracking-tighter text-white hidden sm:block">Vera.AI</span>
            </Link>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs">
              <Link href="/projects" className="text-gray-500 hover:text-gray-300 font-bold uppercase tracking-widest transition-colors">Projects</Link>
              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              {project && (
                <>
                  <span className="text-gray-300 font-bold">{project.name}</span>
                  {activeItem && (
                    <>
                      <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      <span className={colors.text + ' font-bold'}>{activeItem.label}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={currentWorkspace?.id || ''}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none cursor-pointer text-white"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-gray-900">{ws.name}</option>
              ))}
            </select>
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center border-2 border-white/10 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-xs">{(profile?.full_name || user?.email || 'V')[0].toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error || !project ? (
        <div className="max-w-xl mx-auto px-6 py-32 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h3 className="text-xl font-black text-white mb-2">Project not found</h3>
          <p className="text-gray-500 mb-6">{error || 'This project could not be loaded.'}</p>
          <Link href="/projects" className="px-6 py-3 bg-white/5 border border-gray-700 text-white font-bold rounded-xl hover:bg-white/10 transition-colors">Back to Projects</Link>
        </div>
      ) : (
        <div className="flex min-h-[calc(100vh-4rem)]">

          {/* ═══ SIDEBAR ═══ */}
          <aside
            className={`shrink-0 border-r border-gray-800/50 bg-gray-950 flex flex-col py-4 transition-all duration-200 ease-out ${
              sidebarExpanded ? 'w-48' : 'w-16'
            }`}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
          >
            {/* Project avatar */}
            <div className="px-3 mb-4">
              <Link href={`/projects/${projectId}/strategy`} className="flex items-center gap-3 group">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shadow-lg shrink-0 group-hover:scale-105 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${project.brand_colors?.primary || '#7c3aed'}, ${project.brand_colors?.secondary || '#a855f7'})`,
                  }}
                >
                  {project.name[0]?.toUpperCase()}
                </div>
                {sidebarExpanded && (
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{project.name}</p>
                    {project.industry && <p className="text-[10px] text-gray-500 truncate">{project.industry}</p>}
                  </div>
                )}
              </Link>
            </div>

            <div className="h-px bg-gray-800/50 mx-3 mb-2" />

            {/* Layer items */}
            <nav className="flex-1 flex flex-col gap-0.5 px-2">
              {LAYERS.map((layer) => {
                const isActive = activeLayer?.id === layer.id
                const c = COLOR_MAP[layer.color]
                return (
                  <Link
                    key={layer.id}
                    href={`/projects/${projectId}${layer.href}${layer.tabs[0]?.href || ''}`}
                    className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all relative group ${
                      isActive
                        ? `${c.active} ${c.text}`
                        : `text-gray-500 ${c.hover} hover:text-gray-300`
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r ${c.bg}`} />
                    )}
                    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                      <LayerIcon id={layer.id} className="w-[18px] h-[18px]" />
                    </div>
                    {sidebarExpanded && (
                      <span className="text-xs font-bold truncate">{layer.label}</span>
                    )}
                  </Link>
                )
              })}

              <div className="h-px bg-gray-800/50 mx-1 my-2" />

              {/* Standalone items */}
              {STANDALONE.map((item) => {
                const isActive = activeStandalone?.id === item.id
                const c = COLOR_MAP[item.color]
                return (
                  <Link
                    key={item.id}
                    href={`/projects/${projectId}${item.href}`}
                    className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all relative ${
                      isActive
                        ? `${c.active} ${c.text}`
                        : `text-gray-500 ${c.hover} hover:text-gray-300`
                    }`}
                  >
                    {isActive && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r ${c.bg}`} />
                    )}
                    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                      <LayerIcon id={item.id} className="w-[18px] h-[18px]" />
                    </div>
                    {sidebarExpanded && (
                      <span className="text-xs font-bold truncate">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* ═══ MAIN CONTENT ═══ */}
          <div className="flex-1 min-w-0 flex flex-col">

            {/* Sub-tab bar (only for layers with tabs) */}
            {activeLayer && activeLayer.tabs.length > 0 && (
              <div className="border-b border-gray-800/50 bg-gray-950/50 px-8">
                <div className="flex items-center gap-0 -mb-px overflow-x-auto">
                  {activeLayer.tabs.map((tab) => {
                    const tabHref = `${base}${activeLayer.href}${tab.href}`
                    const isActiveTab = activeSubTab === tab.href
                    return (
                      <Link
                        key={tab.href}
                        href={tabHref}
                        className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                          isActiveTab
                            ? `text-white ${colors.border}`
                            : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-700'
                        }`}
                      >
                        {tab.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Page content */}
            <main className="flex-1 px-8 py-8 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </div>
  )
}
