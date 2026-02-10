'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import type { Project, PlatformId } from '@/types/project'

const PLATFORM_CONFIG: Record<PlatformId, { label: string; icon: string; href: string; color: string }> = {
  linkedin: { label: 'LinkedIn', icon: 'in', href: '/commenting', color: 'blue' },
  twitter: { label: 'X (Twitter)', icon: 'X', href: '/twitter', color: 'gray' },
  medium: { label: 'Medium', icon: 'M', href: '/medium', color: 'emerald' },
  newsletter: { label: 'Newsletter', icon: 'NL', href: '/newsletter', color: 'amber' },
  blog: { label: 'Blog', icon: 'B', href: '/content-engine', color: 'orange' },
  instagram: { label: 'Instagram', icon: 'IG', href: '#', color: 'pink' },
  tiktok: { label: 'TikTok', icon: 'TT', href: '#', color: 'rose' },
}

const COLOR_MAP: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600 hover:border-blue-500/50',
  gray: 'from-gray-500 to-gray-600 hover:border-gray-500/50',
  emerald: 'from-emerald-500 to-emerald-600 hover:border-emerald-500/50',
  amber: 'from-amber-500 to-amber-600 hover:border-amber-500/50',
  orange: 'from-orange-500 to-orange-600 hover:border-orange-500/50',
  pink: 'from-pink-500 to-pink-600 hover:border-pink-500/50',
  rose: 'from-rose-500 to-rose-600 hover:border-rose-500/50',
}

const COLOR_TEXT_MAP: Record<string, string> = {
  blue: 'text-blue-400',
  gray: 'text-gray-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  orange: 'text-orange-400',
  pink: 'text-pink-400',
  rose: 'text-rose-400',
}

export default function ProjectDashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const data = await res.json()
      setProject(data)
    } catch (err) {
      console.error('Failed to fetch project:', err)
      setError('Failed to load project.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

      <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-white italic">V</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">VERA</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Dashboard
              </Link>
              <Link href="/projects" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Projects
              </Link>
              {project && (
                <span className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg">
                  {project.name}
                </span>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center gap-1">
              <select
                value={currentWorkspace?.id || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="bg-transparent text-sm font-bold px-3 py-1.5 focus:outline-none cursor-pointer text-white"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-gray-900">
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center border-2 border-white/10 shadow-xl overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold">{(profile?.full_name || user?.email || 'V')[0].toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error || !project ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Project not found</h3>
            <p className="text-gray-500 mb-6">{error || 'This project could not be loaded.'}</p>
            <Link href="/projects" className="px-6 py-3 bg-white/5 border border-gray-700 text-white font-bold rounded-xl hover:bg-white/10 transition-colors">
              Back to Projects
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Link href="/projects" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
                    Projects
                  </Link>
                  <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                    {project.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${project.brand_colors?.primary || '#7c3aed'}, ${project.brand_colors?.secondary || '#a855f7'})`,
                    }}
                  >
                    {project.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-4xl font-black tracking-tight text-white">{project.name}</h1>
                    {project.industry && (
                      <span className="px-3 py-1 bg-violet-500/10 text-violet-400 text-xs font-bold uppercase tracking-widest rounded-full border border-violet-500/20 inline-block mt-1">
                        {project.industry}
                      </span>
                    )}
                  </div>
                </div>
                {project.description && (
                  <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">{project.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="px-6 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Project
                </Link>
              </div>
            </div>

            {/* Channel Grid */}
            {project.enabled_platforms && project.enabled_platforms.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mb-8">Active Channels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {project.enabled_platforms.map((platformId) => {
                    const config = PLATFORM_CONFIG[platformId]
                    if (!config) return null
                    const colorClass = COLOR_MAP[config.color] || COLOR_MAP.gray
                    const textClass = COLOR_TEXT_MAP[config.color] || COLOR_TEXT_MAP.gray

                    return (
                      <Link
                        key={platformId}
                        href={config.href}
                        className={`group bg-gray-900 border border-gray-800 p-1 rounded-[2rem] transition-all shadow-2xl ${config.href === '#' ? 'opacity-50 cursor-not-allowed' : `hover:border-${config.color}-500/50`}`}
                      >
                        <div className="bg-gray-800/50 rounded-[1.8rem] p-8 h-full flex flex-col">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white bg-gradient-to-br ${colorClass.split(' hover:')[0]} mb-4 group-hover:scale-110 transition-transform`}>
                            {config.icon}
                          </div>
                          <h3 className="text-lg font-black text-white mb-1">{config.label}</h3>
                          {config.href === '#' ? (
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Coming Soon</span>
                          ) : (
                            <span className={`text-xs font-bold ${textClass} group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-auto`}>
                              Open Channel
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Info Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Products */}
              <div className="bg-gray-900/20 border border-gray-800/50 rounded-3xl p-8">
                <h3 className="text-lg font-black text-white mb-6">Products & Services</h3>
                {project.products && project.products.length > 0 ? (
                  <div className="space-y-4">
                    {project.products.map((product, i) => (
                      <div key={i} className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                        <h4 className="text-sm font-bold text-white mb-1">{product.name}</h4>
                        {product.description && (
                          <p className="text-xs text-gray-500 leading-relaxed">{product.description}</p>
                        )}
                        {product.url && (
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block"
                          >
                            {product.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No products configured</p>
                )}
              </div>

              {/* ICP */}
              <div className="bg-gray-900/20 border border-gray-800/50 rounded-3xl p-8">
                <h3 className="text-lg font-black text-white mb-6">Ideal Customer Profile</h3>
                <div className="space-y-4">
                  {project.icp?.target_roles && project.icp.target_roles.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Target Roles</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.icp.target_roles.map((role, i) => (
                          <span key={i} className="px-2.5 py-1 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full border border-violet-500/20">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.icp?.target_industries && project.icp.target_industries.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Industries</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.icp.target_industries.map((ind, i) => (
                          <span key={i} className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.icp?.company_size && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Company Size</p>
                      <span className="text-sm text-gray-300">{project.icp.company_size} employees</span>
                    </div>
                  )}
                  {project.icp?.pain_points && project.icp.pain_points.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pain Points</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.icp.pain_points.map((pain, i) => (
                          <span key={i} className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20">
                            {pain}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.icp?.goals && project.icp.goals.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Goals</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.icp.goals.map((goal, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!project.icp?.target_roles?.length && !project.icp?.target_industries?.length && !project.icp?.company_size && !project.icp?.pain_points?.length && !project.icp?.goals?.length && (
                    <p className="text-gray-600 text-sm">No ICP configured</p>
                  )}
                </div>
              </div>

              {/* Tone of Voice */}
              <div className="bg-gray-900/20 border border-gray-800/50 rounded-3xl p-8">
                <h3 className="text-lg font-black text-white mb-6">Tone of Voice</h3>
                <div className="space-y-4">
                  {project.tone_of_voice?.style && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Style</p>
                      <span className="text-sm text-gray-300 capitalize">{project.tone_of_voice.style}</span>
                    </div>
                  )}
                  {project.tone_of_voice?.formality && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Formality</p>
                      <span className="text-sm text-gray-300 capitalize">{project.tone_of_voice.formality}</span>
                    </div>
                  )}
                  {project.tone_of_voice?.personality && project.tone_of_voice.personality.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Personality</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.tone_of_voice.personality.map((trait, i) => (
                          <span key={i} className="px-2.5 py-1 bg-fuchsia-500/10 text-fuchsia-400 text-xs font-bold rounded-full border border-fuchsia-500/20">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.tone_of_voice?.dos && project.tone_of_voice.dos.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Dos</p>
                      <ul className="space-y-1">
                        {project.tone_of_voice.dos.map((d, i) => (
                          <li key={i} className="text-xs text-emerald-400 flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {project.tone_of_voice?.donts && project.tone_of_voice.donts.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Don&apos;ts</p>
                      <ul className="space-y-1">
                        {project.tone_of_voice.donts.map((d, i) => (
                          <li key={i} className="text-xs text-red-400 flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!project.tone_of_voice?.style && !project.tone_of_voice?.formality && !project.tone_of_voice?.personality?.length && !project.tone_of_voice?.dos?.length && !project.tone_of_voice?.donts?.length && (
                    <p className="text-gray-600 text-sm">No tone of voice configured</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by VERA Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
