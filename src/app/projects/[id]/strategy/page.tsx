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
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Could not load project data.</p>
      </div>
    )
  }

  const icp = project.icp
  const tone = project.tone_of_voice
  const platforms = project.enabled_platforms || []
  const products = project.products || []

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white mb-1">Strategy & Planning</h2>
        <p className="text-gray-500 text-sm">Brand health, content calendar, competitive intelligence, and research</p>
      </div>

      {/* Brand Health Card */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${project.brand_colors?.primary || '#7c3aed'}, ${project.brand_colors?.secondary || '#a855f7'})`,
            }}
          >
            {project.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-white">{project.name}</h3>
            {project.industry && (
              <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mt-0.5">{project.industry}</p>
            )}
            {project.description && (
              <p className="text-sm text-gray-400 mt-2 leading-relaxed line-clamp-2">{project.description}</p>
            )}
            {project.website_url && (
              <a href={project.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-400 mt-2 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.754a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.25" /></svg>
                {project.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>
          <Link
            href={`/projects/${projectId}/settings`}
            className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-lg transition-all shrink-0"
          >
            Edit
          </Link>
        </div>

        {/* Platform badges */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-800/50">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest self-center mr-1">Platforms</span>
            {platforms.map((p) => (
              <span key={p} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-800 text-gray-300 border border-gray-700/50 capitalize">
                {p === 'twitter' ? 'X (Twitter)' : p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Two-column: ICP + Tone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ICP Card */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              Ideal Customer Profile
            </h3>
            <Link href={`/projects/${projectId}/settings`} className="text-[10px] font-bold text-gray-600 hover:text-gray-400 transition-colors">Edit</Link>
          </div>

          {(!icp?.target_roles?.length && !icp?.target_industries?.length && !icp?.pain_points?.length && !icp?.goals?.length && !icp?.company_size) ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-600 mb-3">No ICP configured yet</p>
              <Link href={`/projects/${projectId}/settings`} className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">Set up ICP</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {icp?.target_roles && icp.target_roles.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Target Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.target_roles.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs font-bold rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {icp?.target_industries && icp.target_industries.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Industries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.target_industries.map((ind, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">{ind}</span>
                    ))}
                  </div>
                </div>
              )}
              {icp?.company_size && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Company Size</p>
                  <p className="text-xs text-gray-400">{icp.company_size} employees</p>
                </div>
              )}
              {icp?.pain_points && icp.pain_points.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Pain Points</p>
                  <ul className="space-y-1">
                    {icp.pain_points.slice(0, 3).map((pp, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="text-orange-400 mt-0.5">-</span> {pp}
                      </li>
                    ))}
                    {icp.pain_points.length > 3 && (
                      <li className="text-xs text-gray-600">+{icp.pain_points.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              {icp?.goals && icp.goals.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Goals</p>
                  <ul className="space-y-1">
                    {icp.goals.slice(0, 3).map((g, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">-</span> {g}
                      </li>
                    ))}
                    {icp.goals.length > 3 && (
                      <li className="text-xs text-gray-600">+{icp.goals.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tone Card */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
              Tone of Voice
            </h3>
            <Link href={`/projects/${projectId}/settings`} className="text-[10px] font-bold text-gray-600 hover:text-gray-400 transition-colors">Edit</Link>
          </div>

          {(!tone?.style && !tone?.formality && !tone?.personality?.length) ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-600 mb-3">No tone configured yet</p>
              <Link href={`/projects/${projectId}/settings`} className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">Set up tone</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {tone?.style && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Style</p>
                    <p className="text-sm font-bold text-white capitalize">{tone.style}</p>
                  </div>
                )}
                {tone?.formality && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Formality</p>
                    <p className="text-sm font-bold text-white capitalize">{tone.formality}</p>
                  </div>
                )}
              </div>
              {tone?.personality && tone.personality.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Personality</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tone.personality.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs font-bold rounded-md bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {tone?.dos && tone.dos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Dos</p>
                  <ul className="space-y-1">
                    {tone.dos.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">+</span> {d}
                      </li>
                    ))}
                    {tone.dos.length > 3 && <li className="text-xs text-gray-600">+{tone.dos.length - 3} more</li>}
                  </ul>
                </div>
              )}
              {tone?.donts && tone.donts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Don&apos;ts</p>
                  <ul className="space-y-1">
                    {tone.donts.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">-</span> {d}
                      </li>
                    ))}
                    {tone.donts.length > 3 && <li className="text-xs text-gray-600">+{tone.donts.length - 3} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      {products.length > 0 && products[0].name && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
              Products & Services
            </h3>
            <Link href={`/projects/${projectId}/settings`} className="text-[10px] font-bold text-gray-600 hover:text-gray-400 transition-colors">Edit</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.filter(p => p.name).map((product, i) => (
              <div key={i} className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
                <p className="text-sm font-bold text-white mb-1">{product.name}</p>
                {product.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Research Hub',
            desc: 'Discover trends, topics, and audience signals',
            href: `/projects/${projectId}/strategy/research`,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" /></svg>
            ),
            color: 'violet',
          },
          {
            title: 'Content Calendar',
            desc: 'Plan and schedule your content across all channels',
            href: `/projects/${projectId}/strategy/calendar`,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
            ),
            color: 'blue',
          },
          {
            title: 'Competitive Intel',
            desc: 'Track competitor content and ad strategies',
            href: `/projects/${projectId}/strategy/competitive`,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>
            ),
            color: 'emerald',
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 hover:bg-gray-900/60 transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
              item.color === 'violet' ? 'bg-violet-500/10 text-violet-400' :
              item.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
              'bg-emerald-500/10 text-emerald-400'
            }`}>
              {item.icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">{item.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
