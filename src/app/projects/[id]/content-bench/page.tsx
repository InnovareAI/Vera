'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import type { Project } from '@/types/project'

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const CONTENT_TYPES = [
  { id: 'hot-take', label: 'Hot Take', desc: 'Bold opinion, spark debate', placeholder: "What's the contrarian take you want to push?" },
  { id: 'how-to', label: 'How-To', desc: 'Step-by-step tactical value', placeholder: 'What process or skill do you want to teach?' },
  { id: 'story', label: 'Story', desc: 'Personal narrative, lesson', placeholder: 'What experience do you want to share?' },
  { id: 'listicle', label: 'Listicle', desc: 'Numbered insights or tips', placeholder: 'What topic do you want to list out?' },
  { id: 'case-study', label: 'Case Study', desc: 'Results-driven proof', placeholder: 'What result do you want to showcase?' },
  { id: 'news-react', label: 'News React', desc: 'Commentary on news', placeholder: 'What industry news do you want to comment on?' },
] as const

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', limit: 3000, color: 'blue' },
  { id: 'twitter', label: 'Twitter/X', limit: 1400, color: 'sky' },
  { id: 'medium', label: 'Medium', limit: 8000, color: 'emerald' },
  { id: 'newsletter', label: 'Newsletter', limit: 3000, color: 'amber' },
] as const

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'thought-leader', label: 'Thought Leader' },
  { id: 'provocative', label: 'Provocative' },
  { id: 'educational', label: 'Educational' },
]

const FORMAT_LENGTHS = [
  { id: 'short', label: 'Short (~100w)' },
  { id: 'standard', label: 'Standard (~200w)' },
  { id: 'long', label: 'Long (~400w)' },
]

const PLATFORM_ACTIVE_STYLES: Record<string, string> = {
  linkedin: 'border-blue-500/60 bg-blue-500/10 text-blue-400 shadow-blue-500/10',
  twitter: 'border-sky-500/60 bg-sky-500/10 text-sky-400 shadow-sky-500/10',
  medium: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10',
  newsletter: 'border-amber-500/60 bg-amber-500/10 text-amber-400 shadow-amber-500/10',
}

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════

function PlatformIcon({ id, className = 'w-5 h-5' }: { id: string; className?: string }) {
  switch (id) {
    case 'linkedin':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
    case 'twitter':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    case 'medium':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" /></svg>
    case 'newsletter':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" /></svg>
    default: return null
  }
}

function ContentTypeIcon({ id, className = 'w-4 h-4' }: { id: string; className?: string }) {
  switch (id) {
    case 'hot-take':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.866 0-7-3.134-7-7 0-3.037 1.56-4.787 3.707-7.207C10.293 7.12 12 5 12 1c1.393 1.307 5 5.464 5 8.5 0 1.333-.333 2.167-1 3.5.667-.333 1.333-1 2-2 .667 1.333 1 2.667 1 4 0 3.866-3.134 7-7 7z" /></svg>
    case 'how-to':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><path d="m9 14 2 2 4-4" /></svg>
    case 'story':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    case 'listicle':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
    case 'case-study':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
    case 'news-react':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" /><path d="M7 8h6v4H7zM7 16h6" /></svg>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function CharLimitBar({ current, limit }: { current: number; limit: number }) {
  const pct = Math.min((current / limit) * 100, 100)
  const color = pct < 70 ? 'bg-green-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono tabular-nums ${pct >= 90 ? 'text-red-400' : 'text-gray-500'}`}>
        {current.toLocaleString()}/{limit.toLocaleString()}
      </span>
    </div>
  )
}

function GenerationSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[72, 100, 88, 100, 65, 90, 78, 45].map((w, i) => (
        <div
          key={i}
          className="h-3.5 bg-gray-800 rounded-md animate-pulse"
          style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

function LinkedInPreview({ content, authorName }: { content: string; authorName: string }) {
  return (
    <div className="rounded-xl bg-[#1b1f23] border border-gray-700/40 overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {authorName[0]?.toUpperCase() || 'U'}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">{authorName}</p>
          <p className="text-gray-500 text-xs">Industry Expert · 2h</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="text-[13px] text-gray-200 whitespace-pre-wrap leading-[1.65]">{content}</div>
      </div>
      <div className="px-4 py-2.5 border-t border-gray-700/30 flex items-center justify-around text-gray-500 text-xs font-medium">
        <span className="flex items-center gap-1.5 cursor-default">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m.729-7.534a2.25 2.25 0 00-2.25 2.25v4.5a2.25 2.25 0 002.25 2.25h.382" /></svg>
          Like
        </span>
        <span className="flex items-center gap-1.5 cursor-default">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
          Comment
        </span>
        <span className="flex items-center gap-1.5 cursor-default">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
          Repost
        </span>
        <span className="flex items-center gap-1.5 cursor-default">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          Send
        </span>
      </div>
    </div>
  )
}

function TwitterPreview({ content, authorName }: { content: string; authorName: string }) {
  return (
    <div className="rounded-xl bg-[#16181c] border border-gray-700/40 overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {authorName[0]?.toUpperCase() || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">{authorName}</span>
            <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.09 4.38l-3.54-3.54 1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z" /></svg>
            <span className="text-gray-500 text-sm">@{authorName.toLowerCase().replace(/\s/g, '')}</span>
          </div>
          <div className="text-[14px] text-gray-100 whitespace-pre-wrap leading-[1.5] mt-2">{content}</div>
          <div className="flex items-center gap-8 mt-3 text-gray-500 text-xs">
            <span className="flex items-center gap-1.5 cursor-default">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
              12
            </span>
            <span className="flex items-center gap-1.5 cursor-default">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
              48
            </span>
            <span className="flex items-center gap-1.5 cursor-default">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
              231
            </span>
            <span className="flex items-center gap-1.5 cursor-default">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
              1.2K
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MediumPreview({ content, authorName }: { content: string; authorName: string }) {
  const lines = content.split('\n').filter(l => l.trim())
  const title = lines[0] || 'Untitled'
  const body = lines.slice(1).join('\n')
  const wordCount = content.split(/\s+/).length
  const readTime = Math.max(1, Math.round(wordCount / 200))

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-gray-700/40 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white leading-tight mb-3">{title}</h2>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-xs">
            {authorName[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white text-xs font-medium">{authorName}</p>
            <p className="text-gray-500 text-xs">{readTime} min read</p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-4">
          <div className="text-[13px] text-gray-300 whitespace-pre-wrap leading-[1.7]">{body}</div>
        </div>
      </div>
      <div className="px-6 py-3 border-t border-gray-800/50 flex items-center justify-between text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-xs cursor-default">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m.729-7.534a2.25 2.25 0 00-2.25 2.25v4.5a2.25 2.25 0 002.25 2.25h.382" /></svg>
            47
          </span>
        </div>
        <span className="cursor-default">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
        </span>
      </div>
    </div>
  )
}

function NewsletterPreview({ content, authorName }: { content: string; authorName: string }) {
  const lines = content.split('\n').filter(l => l.trim())
  const subjectLine = lines[0]?.replace(/^Subject:\s*/i, '') || 'Newsletter'
  const body = lines.slice(1).join('\n')

  return (
    <div className="rounded-xl bg-[#1c1c1e] border border-gray-700/40 overflow-hidden">
      <div className="px-5 py-3 bg-gray-800/30 border-b border-gray-700/30 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <span className="text-gray-500 text-xs font-mono truncate flex-1">{authorName}&apos;s Newsletter</span>
      </div>
      <div className="p-5">
        <div className="mb-4">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium mb-1">Subject</p>
          <p className="text-white font-semibold text-sm">{subjectLine}</p>
        </div>
        <div className="border-t border-gray-800 pt-4">
          <div className="text-[13px] text-gray-300 whitespace-pre-wrap leading-[1.7]">{body}</div>
        </div>
      </div>
      <div className="px-5 py-2.5 border-t border-gray-800/40 text-center">
        <span className="text-gray-600 text-[10px]">Unsubscribe | View in browser</span>
      </div>
    </div>
  )
}

function PlatformPreview({ platform, content, authorName }: { platform: string; content: string; authorName: string }) {
  switch (platform) {
    case 'linkedin': return <LinkedInPreview content={content} authorName={authorName} />
    case 'twitter': return <TwitterPreview content={content} authorName={authorName} />
    case 'medium': return <MediumPreview content={content} authorName={authorName} />
    case 'newsletter': return <NewsletterPreview content={content} authorName={authorName} />
    default: return <LinkedInPreview content={content} authorName={authorName} />
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ContentBenchPage() {
  const params = useParams()
  const projectId = params.id as string
  const { profile } = useAuth()
  const { currentWorkspace } = useWorkspace()

  // Form state
  const [contentType, setContentType] = useState('hot-take')
  const [topic, setTopic] = useState('')
  const [refUrl, setRefUrl] = useState('')
  const [showRefUrl, setShowRefUrl] = useState(false)
  const [platform, setPlatform] = useState('linkedin')
  const [tone, setTone] = useState('professional')
  const [formatLength, setFormatLength] = useState('standard')

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [editableContent, setEditableContent] = useState('')
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview')

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Project/brand context
  const [project, setProject] = useState<Project | null>(null)
  const [brandExpanded, setBrandExpanded] = useState(false)

  const authorName = profile?.full_name || 'Author'
  const selectedType = CONTENT_TYPES.find(t => t.id === contentType)
  const selectedPlatform = PLATFORMS.find(p => p.id === platform)

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setProject(data) })
        .catch(console.error)
    }
  }, [projectId])

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setError(null)
    setGeneratedContent('')
    setEditableContent('')
    setSaved(false)
    setViewMode('preview')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: {
            title: topic,
            content: topic,
            source: 'manual',
            url: refUrl || '',
          },
          platform,
          tone,
          contentType,
          formatLength,
          projectContext: project ? {
            name: project.name,
            industry: project.industry,
            tone: project.tone_of_voice?.style || tone,
            icp: project.icp,
            products: project.products,
          } : undefined,
        }),
      })

      const data = await res.json()
      if (data.success && data.content) {
        setGeneratedContent(data.content)
        setEditableContent(data.content)
      } else {
        setError(data.error || 'Failed to generate content')
      }
    } catch (e) {
      console.error('Generate error:', e)
      setError('Failed to generate content. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!editableContent.trim() || !currentWorkspace) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/content-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          project_id: projectId,
          content: editableContent,
          platform,
          source_title: topic,
          theme: topic.slice(0, 80),
          hook: editableContent.split('\n')[0]?.slice(0, 120) || '',
          character_count: editableContent.length,
          status: 'pending',
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          setGeneratedContent('')
          setEditableContent('')
          setTopic('')
          setRefUrl('')
          setShowRefUrl(false)
        }, 1500)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save content')
      }
    } catch (e) {
      console.error('Save error:', e)
      setError('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!currentWorkspace) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    )
  }

  // Brand context info
  const brandItems: string[] = []
  if (project?.name) brandItems.push(project.name)
  if (project?.industry) brandItems.push(project.industry)
  if (project?.icp?.target_roles?.length) brandItems.push('ICP loaded')
  if (project?.products?.length) brandItems.push(`${project.products.length} product${project.products.length > 1 ? 's' : ''}`)
  if (project?.tone_of_voice?.style) brandItems.push(project.tone_of_voice.style + ' tone')

  return (
    <div className="flex flex-col lg:flex-row gap-0" style={{ minHeight: 'calc(100vh - 18rem)' }}>

      {/* ─── COMPOSE PANEL ─────────────────────────────────────── */}
      <div className="w-full lg:w-[420px] lg:shrink-0 lg:border-r border-gray-800/40 lg:pr-8 space-y-5 pb-8 lg:pb-0">

        {/* Content Type Grid */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2.5">
            Content Type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {CONTENT_TYPES.map((type) => {
              const active = contentType === type.id
              return (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  className={`relative p-2.5 rounded-xl text-center transition-all duration-150 border ${
                    active
                      ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/5'
                      : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900'
                  }`}
                  title={type.desc}
                >
                  <div className={`mx-auto mb-1.5 ${active ? 'text-violet-400' : 'text-gray-500'} transition-colors`}>
                    <ContentTypeIcon id={type.id} className="w-4 h-4 mx-auto" />
                  </div>
                  <span className={`text-[11px] font-semibold leading-none ${active ? 'text-violet-300' : 'text-gray-400'} transition-colors`}>
                    {type.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Topic Brief */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2.5">
            Topic / Brief
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
            placeholder={selectedType?.placeholder || 'Describe what you want to write about...'}
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-gray-900/80 border border-gray-800 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder-gray-600 text-sm resize-none transition-all leading-relaxed"
          />
          {!showRefUrl ? (
            <button
              onClick={() => setShowRefUrl(true)}
              className="mt-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
              Add reference URL
            </button>
          ) : (
            <input
              type="url"
              value={refUrl}
              onChange={(e) => setRefUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="mt-2 w-full px-3 py-2 rounded-lg bg-gray-900/80 border border-gray-800 focus:border-violet-500/50 focus:outline-none text-white placeholder-gray-600 text-xs transition-all"
            />
          )}
        </div>

        {/* Platform Tiles */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2.5">
            Platform
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PLATFORMS.map((p) => {
              const active = platform === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150 ${
                    active
                      ? `${PLATFORM_ACTIVE_STYLES[p.id]} shadow-lg`
                      : 'border-gray-800 bg-gray-900/60 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                  }`}
                >
                  <PlatformIcon id={p.id} className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-none">{p.label}</span>
                  {active && (
                    <span className="text-[9px] opacity-60">{p.limit.toLocaleString()} chars</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tone + Format */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2">
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-900/80 border border-gray-800 text-white text-xs font-medium focus:outline-none focus:border-violet-500/50 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {TONES.map((t) => (
                <option key={t.id} value={t.id} className="bg-gray-900">{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2">
              Length
            </label>
            <select
              value={formatLength}
              onChange={(e) => setFormatLength(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-900/80 border border-gray-800 text-white text-xs font-medium focus:outline-none focus:border-violet-500/50 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {FORMAT_LENGTHS.map((f) => (
                <option key={f.id} value={f.id} className="bg-gray-900">{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Brand Context */}
        {project && brandItems.length > 0 && (
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/40 overflow-hidden">
            <button
              onClick={() => setBrandExpanded(!brandExpanded)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span className="text-[11px] text-gray-400 font-medium truncate">
                  Brand: {brandItems.slice(0, 2).join(' · ')}
                </span>
              </div>
              <svg className={`w-3.5 h-3.5 text-gray-600 shrink-0 transition-transform ${brandExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {brandExpanded && (
              <div className="px-3.5 pb-3 pt-0 space-y-1.5 border-t border-gray-800/40">
                {project.name && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-green-500">&#10003;</span>
                    <span className="text-gray-500">Brand:</span>
                    <span className="text-gray-300">{project.name}</span>
                  </div>
                )}
                {project.industry && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-green-500">&#10003;</span>
                    <span className="text-gray-500">Industry:</span>
                    <span className="text-gray-300">{project.industry}</span>
                  </div>
                )}
                {project.icp?.target_roles?.length ? (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-green-500">&#10003;</span>
                    <span className="text-gray-500">ICP:</span>
                    <span className="text-gray-300">{project.icp.target_roles.slice(0, 3).join(', ')}</span>
                  </div>
                ) : null}
                {project.products?.length ? (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-green-500">&#10003;</span>
                    <span className="text-gray-500">Products:</span>
                    <span className="text-gray-300">{project.products.map(p => p.name).join(', ')}</span>
                  </div>
                ) : null}
                {project.tone_of_voice?.style && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-green-500">&#10003;</span>
                    <span className="text-gray-500">Voice:</span>
                    <span className="text-gray-300">{project.tone_of_voice.style}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="w-full relative px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-violet-500/20 overflow-hidden group"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
              Generate Content
            </>
          )}
        </button>

        {/* Keyboard shortcut hint */}
        <p className="text-[10px] text-gray-700 text-center -mt-2">
          Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono text-[9px]">Cmd</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono text-[9px]">Enter</kbd> to generate
        </p>
      </div>

      {/* ─── OUTPUT PANEL ──────────────────────────────────────── */}
      <div className="flex-1 lg:pl-8 flex flex-col min-w-0">

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-red-400 text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {generating && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${PLATFORM_ACTIVE_STYLES[platform]}`}>
                <PlatformIcon id={platform} className="w-3.5 h-3.5 inline mr-1.5" />
                {selectedPlatform?.label}
              </div>
              <div className="w-16 h-1.5 bg-gray-800 rounded-full animate-pulse" />
            </div>
            <div className="flex-1 rounded-xl border border-gray-800/50 bg-gray-900/30 overflow-hidden">
              <GenerationSkeleton />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!generating && !generatedContent && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-900/60 border border-gray-800/50 border-dashed flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-sm mb-1.5">Create something great</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Pick a content type, describe your topic, and hit generate to see your content come to life.
              </p>
            </div>
          </div>
        )}

        {/* Generated content */}
        {!generating && generatedContent && (
          <div className="flex-1 flex flex-col">

            {/* Header: view toggle + stats */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${PLATFORM_ACTIVE_STYLES[platform]}`}>
                  <PlatformIcon id={platform} className="w-3.5 h-3.5 inline mr-1.5" />
                  {selectedPlatform?.label}
                </div>
                <span className="text-gray-600 text-[11px]">
                  {selectedType?.label} · {tone}
                </span>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    viewMode === 'preview' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    viewMode === 'edit' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Character limit bar */}
            {selectedPlatform && (
              <div className="mb-3">
                <CharLimitBar current={editableContent.length} limit={selectedPlatform.limit} />
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {viewMode === 'preview' ? (
                <PlatformPreview
                  platform={platform}
                  content={editableContent}
                  authorName={authorName}
                />
              ) : (
                <textarea
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full h-full min-h-[400px] px-5 py-4 rounded-xl bg-gray-900/60 border border-gray-800 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-gray-200 text-sm leading-[1.7] resize-none font-mono transition-all"
                />
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800/40">
              <button
                onClick={handleSave}
                disabled={saving || saved || !editableContent.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-white text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Saved to Review!
                  </>
                ) : (
                  'Save to Review'
                )}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-3 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/50 text-gray-300 text-sm font-semibold transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                Regenerate
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-3 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/50 text-gray-300 text-sm font-semibold transition-all flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Stats line */}
            <div className="mt-2 text-[11px] text-gray-600 text-center">
              {editableContent.length} chars · {editableContent.split(/\s+/).filter(Boolean).length} words · {selectedPlatform?.label} · {selectedType?.label} · {tone}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
