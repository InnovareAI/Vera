'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import type { Project } from '@/types/project'

const TABS = [
  { label: 'Content Bench', href: '' },
  { label: 'Research', href: '/research' },
  { label: 'Schedule', href: '/schedule' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Settings', href: '/settings' },
]

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

  const getActiveTab = () => {
    const base = `/projects/${projectId}`
    if (pathname === base || pathname === base + '/') return ''
    for (const tab of TABS) {
      if (tab.href && pathname.startsWith(base + tab.href)) return tab.href
    }
    return ''
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

  const activeTab = getActiveTab()

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
              <span className="text-2xl font-black tracking-tighter text-white">Vera.AI</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Projects', href: '/projects' },
                { label: 'Settings', href: '/settings' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  {item.label}
                </Link>
              ))}
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

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error || !project ? (
        <main className="max-w-7xl mx-auto px-6 py-12">
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
        </main>
      ) : (
        <>
          {/* Project Header */}
          <div className="border-b border-gray-800/50 bg-gray-950">
            <div className="max-w-7xl mx-auto px-6 pt-8 pb-0">
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

              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${project.brand_colors?.primary || '#7c3aed'}, ${project.brand_colors?.secondary || '#a855f7'})`,
                  }}
                >
                  {project.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">{project.name}</h1>
                  {project.industry && (
                    <span className="px-3 py-0.5 bg-violet-500/10 text-violet-400 text-xs font-bold uppercase tracking-widest rounded-full border border-violet-500/20 inline-block mt-1">
                      {project.industry}
                    </span>
                  )}
                </div>
              </div>

              {/* Tab Bar */}
              <div className="flex items-center gap-0 -mb-px overflow-x-auto">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.href
                  return (
                    <Link
                      key={tab.href}
                      href={`/projects/${projectId}${tab.href}`}
                      className={`px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                        isActive
                          ? 'text-white border-violet-500'
                          : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <main className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </main>
        </>
      )}

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/50 text-center">
        <p className="text-gray-600 text-sm">Powered by Vera.AI Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
