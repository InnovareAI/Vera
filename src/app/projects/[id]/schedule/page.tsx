'use client'

import { useState } from 'react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MOCK_SCHEDULED = [
  { id: 1, title: 'AI-powered outreach strategies for B2B', platform: 'linkedin', time: '09:00', day: 0, status: 'scheduled' },
  { id: 2, title: 'Thread: 5 mistakes in cold email', platform: 'twitter', time: '12:00', day: 0, status: 'scheduled' },
  { id: 3, title: 'How we reduced CAC by 40%', platform: 'linkedin', time: '10:30', day: 1, status: 'approved' },
  { id: 4, title: 'Newsletter: Weekly AI roundup', platform: 'newsletter', time: '08:00', day: 2, status: 'scheduled' },
  { id: 5, title: 'Deep dive into agentic workflows', platform: 'medium', time: '14:00', day: 3, status: 'approved' },
  { id: 6, title: 'Sales automation hot takes', platform: 'twitter', time: '11:00', day: 4, status: 'scheduled' },
  { id: 7, title: 'LinkedIn carousel: AI Sales Stack', platform: 'linkedin', time: '09:30', day: 4, status: 'scheduled' },
]

const PLATFORM_STYLES: Record<string, { label: string; icon: string; color: string }> = {
  linkedin: { label: 'LinkedIn', icon: 'in', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  twitter: { label: 'X', icon: 'X', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  medium: { label: 'Medium', icon: 'M', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  newsletter: { label: 'Newsletter', icon: 'NL', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  blog: { label: 'Blog', icon: 'B', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

export default function ProjectSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)

  const getWeekDates = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(now.getDate() + diff + weekOffset * 7)

    return DAYS.map((day, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return {
        label: day,
        date: date.getDate(),
        month: date.toLocaleString('default', { month: 'short' }),
        isToday: date.toDateString() === now.toDateString(),
      }
    })
  }

  const weekDates = getWeekDates()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white mb-1">Schedule</h2>
          <p className="text-gray-500 text-sm">Plan and schedule your content publishing</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-sm font-bold text-gray-300 hover:text-white transition-all"
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map((date, dayIndex) => (
          <div key={dayIndex} className="min-h-[300px]">
            {/* Day Header */}
            <div className={`text-center mb-3 p-2 rounded-xl ${date.isToday ? 'bg-violet-500/10 border border-violet-500/20' : ''}`}>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{date.label}</div>
              <div className={`text-lg font-black ${date.isToday ? 'text-violet-400' : 'text-white'}`}>
                {date.date}
              </div>
              <div className="text-xs text-gray-600">{date.month}</div>
            </div>

            {/* Scheduled Items */}
            <div className="space-y-2">
              {MOCK_SCHEDULED.filter((item) => item.day === dayIndex).map((item) => {
                const platformStyle = PLATFORM_STYLES[item.platform] || PLATFORM_STYLES.blog
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${platformStyle.color}`}>
                        {platformStyle.icon}
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">{item.time}</span>
                    </div>
                    <p className="text-xs text-gray-300 font-medium line-clamp-2 group-hover:text-white transition-colors">
                      {item.title}
                    </p>
                    <div className="mt-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'scheduled' ? 'text-violet-400' : 'text-emerald-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">This Week</p>
          <span className="text-3xl font-black text-white">{MOCK_SCHEDULED.length}</span>
          <span className="text-gray-500 text-sm ml-2">posts scheduled</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Platforms</p>
          <div className="flex gap-2 mt-2">
            {Object.entries(PLATFORM_STYLES).slice(0, 4).map(([key, style]) => (
              <span key={key} className={`px-2 py-1 text-xs font-bold rounded border ${style.color}`}>
                {style.icon}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Next Post</p>
          <span className="text-sm font-bold text-white">Today at 09:00</span>
          <p className="text-xs text-gray-500 mt-1">LinkedIn - AI-powered outreach</p>
        </div>
      </div>
    </div>
  )
}
