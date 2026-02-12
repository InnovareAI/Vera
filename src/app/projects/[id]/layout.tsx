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
  tabs: LayerTab[]
}

const LAYERS: Layer[] = [
  {
    id: 'strategy',
    label: 'Planning',
    href: '/strategy',
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
    tabs: [
      { label: 'Blog', href: '/blog' },
      { label: 'Landing Pages', href: '/landing' },
      { label: 'Case Studies', href: '/cases' },
    ],
  },
]

const STANDALONE = [
  { id: 'analytics', label: 'Analytics', href: '/analytics' },
  { id: 'settings', label: 'Settings', href: '/settings' },
]

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

  useEffect(() => {
    if (projectId) fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/projects/${projectId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch project (${res.status})`)
      setProject(await res.json())
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

  const activeLayer = LAYERS.find((l) => relative.startsWith(l.href)) || null
  const activeStandalone = STANDALONE.find((s) => relative.startsWith(s.href)) || null
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

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-neutral-100 mb-2">Sign in required</h2>
          <p className="text-neutral-500 mb-6 text-sm">Please log in and select a workspace to continue.</p>
          <Link href="/login" className="px-6 py-2.5 bg-violet-500 text-white font-medium rounded-lg hover:bg-violet-600 transition-colors text-sm">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex min-h-screen">

        {/* ═══ SIDEBAR ═══ */}
        <aside className="w-56 shrink-0 border-r border-neutral-800/60 bg-neutral-950 flex flex-col">

          {/* Logo + workspace */}
          <div className="px-4 pt-4 pb-2">
            <Link href="/dashboard" className="text-sm font-semibold text-neutral-100 tracking-tight">
              Vera.AI
            </Link>
            <select
              value={currentWorkspace?.id || ''}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="mt-2 w-full bg-transparent text-xs text-neutral-500 focus:outline-none cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-neutral-900">{ws.name}</option>
              ))}
            </select>
          </div>

          <div className="h-px bg-neutral-800/60 mx-4 my-2" />

          {/* Project */}
          {project && (
            <div className="px-4 py-2">
              <Link href={`/projects/${projectId}/strategy`} className="flex items-center gap-2.5 group">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0"
                  style={{
                    background: project.brand_colors?.primary || '#7c3aed',
                  }}
                >
                  {project.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-neutral-300 truncate group-hover:text-neutral-100 transition-colors">{project.name}</span>
              </Link>
            </div>
          )}

          <div className="h-px bg-neutral-800/60 mx-4 my-2" />

          {/* Layer navigation */}
          <nav className="flex-1 px-3 py-1 space-y-0.5">
            {LAYERS.map((layer) => {
              const isActive = activeLayer?.id === layer.id
              return (
                <Link
                  key={layer.id}
                  href={`/projects/${projectId}${layer.href}${layer.tabs[0]?.href || ''}`}
                  className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-violet-500/8 text-neutral-100 font-medium'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40'
                  }`}
                >
                  {layer.label}
                </Link>
              )
            })}

            <div className="h-px bg-neutral-800/60 mx-1 my-3" />

            {STANDALONE.map((item) => {
              const isActive = activeStandalone?.id === item.id
              return (
                <Link
                  key={item.id}
                  href={`/projects/${projectId}${item.href}`}
                  className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-violet-500/8 text-neutral-100 font-medium'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User + Theme */}
          <div className="px-4 py-3 border-t border-neutral-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-white">{(profile?.full_name || user?.email || 'V')[0].toUpperCase()}</span>
                  )}
                </div>
                <span className="text-xs text-neutral-500 truncate">{profile?.full_name || user?.email}</span>
              </div>
              <button
                onClick={() => {
                  const html = document.documentElement
                  const current = html.getAttribute('data-theme')
                  const next = current === 'light' ? 'dark' : 'light'
                  html.setAttribute('data-theme', next)
                  localStorage.setItem('vera-theme', next)
                }}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-all shrink-0"
                title="Toggle theme"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN ═══ */}
        <div className="flex-1 min-w-0 flex flex-col">

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error || !project ? (
            <div className="max-w-md mx-auto px-6 py-32 text-center">
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">Project not found</h3>
              <p className="text-neutral-500 text-sm mb-6">{error || 'This project could not be loaded.'}</p>
              <Link href="/projects" className="px-4 py-2 bg-neutral-800 text-neutral-300 font-medium rounded-lg hover:bg-neutral-700 transition-colors text-sm">
                Back to Projects
              </Link>
            </div>
          ) : (
            <>
              {/* Breadcrumb + sub-tabs */}
              <div className="border-b border-neutral-800/60 px-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 pt-4 pb-2 text-sm">
                  <Link href="/projects" className="text-neutral-500 hover:text-neutral-300 transition-colors">Projects</Link>
                  <span className="text-neutral-700">/</span>
                  <Link href={`/projects/${projectId}/strategy`} className="text-neutral-500 hover:text-neutral-300 transition-colors">{project.name}</Link>
                  {activeItem && (
                    <>
                      <span className="text-neutral-700">/</span>
                      <span className="text-neutral-300">{activeItem.label}</span>
                    </>
                  )}
                </div>

                {/* Sub-tabs */}
                {activeLayer && activeLayer.tabs.length > 0 && (
                  <div className="flex items-center gap-0 -mb-px">
                    {activeLayer.tabs.map((tab) => {
                      const tabHref = `${base}${activeLayer.href}${tab.href}`
                      const isActiveTab = activeSubTab === tab.href
                      return (
                        <Link
                          key={tab.href}
                          href={tabHref}
                          className={`px-3 py-2 text-sm transition-colors ${
                            isActiveTab
                              ? 'text-neutral-100 font-medium border-b-2 border-violet-500'
                              : 'text-neutral-500 hover:text-neutral-300 border-b-2 border-transparent'
                          }`}
                        >
                          {tab.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Page content */}
              <main className="flex-1 px-8 py-6 overflow-y-auto">
                {children}
              </main>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
