'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/types/project'

export default function StrategyOverviewPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => { setProject(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-500 text-sm">Could not load project data.</p>
      </div>
    )
  }

  const icp = project.icp
  const tone = project.tone_of_voice
  const platforms = project.enabled_platforms || []
  const products = project.products || []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-100 mb-1">Strategy & Planning</h2>
        <p className="text-neutral-500 text-sm">Brand health, content calendar, competitive intelligence, and research</p>
      </div>

      {/* Brand Health Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ background: project.brand_colors?.primary || '#7c3aed' }}
          >
            {project.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-100">{project.name}</h3>
            {project.industry && (
              <p className="text-xs text-violet-400 mt-0.5">{project.industry}</p>
            )}
            {project.description && (
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed line-clamp-2">{project.description}</p>
            )}
            {project.website_url && (
              <a href={project.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-violet-400 mt-2 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.754a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.25" /></svg>
                {project.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>
          <Link
            href={`/projects/${projectId}/settings`}
            className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all shrink-0"
          >
            Edit
          </Link>
        </div>

        {/* Platform badges */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-800/60">
            <span className="text-xs font-medium text-neutral-600 self-center mr-1">Platforms</span>
            {platforms.map((p) => (
              <span key={p} className="px-2 py-0.5 text-xs rounded bg-neutral-800 text-neutral-400 capitalize">
                {p === 'twitter' ? 'X (Twitter)' : p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Two-column: ICP + Tone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ICP Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-200">Ideal Customer Profile</h3>
            <Link href={`/projects/${projectId}/settings`} className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Edit</Link>
          </div>

          {(!icp?.target_roles?.length && !icp?.target_industries?.length && !icp?.pain_points?.length && !icp?.goals?.length && !icp?.company_size) ? (
            <div className="text-center py-6">
              <p className="text-xs text-neutral-600 mb-3">No ICP configured yet</p>
              <Link href={`/projects/${projectId}/settings`} className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">Set up ICP</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {icp?.target_roles && icp.target_roles.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">Target Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.target_roles.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-violet-500/10 text-violet-400">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {icp?.target_industries && icp.target_industries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">Industries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.target_industries.map((ind, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-violet-500/8 text-violet-400">{ind}</span>
                    ))}
                  </div>
                </div>
              )}
              {icp?.company_size && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1">Company Size</p>
                  <p className="text-xs text-neutral-400">{icp.company_size} employees</p>
                </div>
              )}
              {icp?.pain_points && icp.pain_points.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">Pain Points</p>
                  <ul className="space-y-1">
                    {icp.pain_points.slice(0, 3).map((pp, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                        <span className="text-neutral-600 mt-0.5">-</span> {pp}
                      </li>
                    ))}
                    {icp.pain_points.length > 3 && (
                      <li className="text-xs text-neutral-600">+{icp.pain_points.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              {icp?.goals && icp.goals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">Goals</p>
                  <ul className="space-y-1">
                    {icp.goals.slice(0, 3).map((g, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                        <span className="text-neutral-600 mt-0.5">-</span> {g}
                      </li>
                    ))}
                    {icp.goals.length > 3 && (
                      <li className="text-xs text-neutral-600">+{icp.goals.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tone Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-200">Tone of Voice</h3>
            <Link href={`/projects/${projectId}/settings`} className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Edit</Link>
          </div>

          {(!tone?.style && !tone?.formality && !tone?.personality?.length) ? (
            <div className="text-center py-6">
              <p className="text-xs text-neutral-600 mb-3">No tone configured yet</p>
              <Link href={`/projects/${projectId}/settings`} className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">Set up tone</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {tone?.style && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Style</p>
                    <p className="text-sm text-neutral-200 capitalize">{tone.style}</p>
                  </div>
                )}
                {tone?.formality && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Formality</p>
                    <p className="text-sm text-neutral-200 capitalize">{tone.formality}</p>
                  </div>
                )}
              </div>
              {tone?.personality && tone.personality.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">Personality</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tone.personality.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-violet-500/10 text-violet-400">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {tone?.dos && tone.dos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">Dos</p>
                  <ul className="space-y-1">
                    {tone.dos.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5">+</span> {d}
                      </li>
                    ))}
                    {tone.dos.length > 3 && <li className="text-xs text-neutral-600">+{tone.dos.length - 3} more</li>}
                  </ul>
                </div>
              )}
              {tone?.donts && tone.donts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">Don&apos;ts</p>
                  <ul className="space-y-1">
                    {tone.donts.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">-</span> {d}
                      </li>
                    ))}
                    {tone.donts.length > 3 && <li className="text-xs text-neutral-600">+{tone.donts.length - 3} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      {products.length > 0 && products[0].name && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-200">Products & Services</h3>
            <Link href={`/projects/${projectId}/settings`} className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Edit</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.filter(p => p.name).map((product, i) => (
              <div key={i} className="p-4 bg-neutral-800/40 border border-neutral-800 rounded-lg">
                <p className="text-sm font-medium text-neutral-200 mb-1">{product.name}</p>
                {product.description && (
                  <p className="text-xs text-neutral-500 line-clamp-2">{product.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Research Hub', desc: 'Discover trends, topics, and audience signals', href: `/projects/${projectId}/strategy/research` },
          { title: 'Content Calendar', desc: 'Plan and schedule your content across all channels', href: `/projects/${projectId}/strategy/calendar` },
          { title: 'Competitive Intel', desc: 'Track competitor content and ad strategies', href: `/projects/${projectId}/strategy/competitive` },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700/60 hover:bg-neutral-800/30 transition-all group"
          >
            <h3 className="text-sm font-medium text-neutral-200 mb-1 group-hover:text-neutral-100 transition-colors">{item.title}</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
