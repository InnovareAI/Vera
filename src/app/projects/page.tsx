'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import type { Project } from '@/types/project'

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  medium: 'Medium',
  newsletter: 'Newsletter',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  blog: 'Blog',
}

export default function ProjectsPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentWorkspace) fetchProjects()
  }, [currentWorkspace])

  const fetchProjects = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects?workspace_id=${currentWorkspace.id}`)
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      setError('Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }

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
          <p className="text-neutral-500 text-sm mb-6">Please log in and select a workspace.</p>
          <Link href="/login" className="px-6 py-2.5 bg-violet-500 text-white font-medium rounded-lg hover:bg-violet-600 transition-colors text-sm">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold text-neutral-100 tracking-tight">
              Vera.AI
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-300 rounded-md hover:bg-neutral-800/40 transition-colors">Dashboard</Link>
              <Link href="/projects" className="px-3 py-1.5 text-sm text-neutral-100 bg-neutral-800/50 rounded-md">Projects</Link>
              <Link href="/settings" className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-300 rounded-md hover:bg-neutral-800/40 transition-colors">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={currentWorkspace?.id || ''}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="bg-transparent text-sm text-neutral-500 focus:outline-none cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-neutral-900">{ws.name}</option>
              ))}
            </select>
            <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-medium">{(profile?.full_name || user?.email || 'V')[0].toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-100">Projects</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage your brands and content channels.</p>
          </div>
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-violet-500 text-white font-medium rounded-lg hover:bg-violet-600 transition-colors text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-neutral-500 text-sm mb-4">{error}</p>
            <button onClick={fetchProjects} className="px-4 py-2 bg-neutral-800 text-neutral-300 font-medium rounded-lg hover:bg-neutral-700 transition-colors text-sm">
              Try Again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">No projects yet</h3>
            <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto">
              Create your first project to configure brand voice, ICP, and channels.
            </p>
            <Link href="/projects/new" className="px-4 py-2 bg-violet-500 text-white font-medium rounded-lg hover:bg-violet-600 transition-colors text-sm">
              Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700/60 hover:bg-neutral-800/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
                    style={{ background: project.brand_colors?.primary || '#7c3aed' }}
                  >
                    {project.name[0]?.toUpperCase()}
                  </div>
                  {project.is_default && (
                    <span className="px-2 py-0.5 text-xs text-violet-400 bg-violet-500/10 rounded-md font-medium">Default</span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-neutral-200 mb-0.5 group-hover:text-neutral-100">{project.name}</h3>
                {project.industry && (
                  <p className="text-xs text-neutral-500 mb-2">{project.industry}</p>
                )}
                {project.description && (
                  <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-3">{project.description}</p>
                )}
                {!project.description && <div className="mb-3" />}

                {project.enabled_platforms && project.enabled_platforms.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-3 border-t border-neutral-800/60">
                    {project.enabled_platforms.slice(0, 4).map((p) => (
                      <span key={p} className="px-1.5 py-0.5 text-xs text-neutral-500 bg-neutral-800 rounded">
                        {PLATFORM_LABELS[p] || p}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
