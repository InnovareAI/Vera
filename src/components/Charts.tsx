'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, AreaChart, Area } from 'recharts'

// Colors for charts
const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1']

interface SourceData {
    source: string
    count: number
}

interface TrendData {
    date: string
    topics: number
}

// Source Distribution Pie Chart
export function SourcePieChart({ data }: { data: SourceData[] }) {
    const chartData = data.slice(0, 8).map(d => ({
        name: d.source,
        value: d.count,
    }))

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}

// Source Bar Chart
export function SourceBarChart({ data }: { data: SourceData[] }) {
    const chartData = data.slice(0, 6).map(d => ({
        name: d.source.length > 10 ? d.source.substring(0, 10) + '...' : d.source,
        count: d.count,
    }))

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    width={80}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Topics Over Time Chart
export function TopicsLineChart({ data }: { data: TrendData[] }) {
    return (
        <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorTopics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="date"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="topics"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorTopics)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

// Score Distribution Chart
export function ScoreDistributionChart({ topics }: { topics: { relevance_score: number }[] }) {
    // Group topics by score range
    const ranges = [
        { range: '0-20%', min: 0, max: 0.2 },
        { range: '20-40%', min: 0.2, max: 0.4 },
        { range: '40-60%', min: 0.4, max: 0.6 },
        { range: '60-80%', min: 0.6, max: 0.8 },
        { range: '80-100%', min: 0.8, max: 1.01 },
    ]

    const chartData = ranges.map(r => ({
        range: r.range,
        count: topics.filter(t => t.relevance_score >= r.min && t.relevance_score < r.max).length,
    }))

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
                <XAxis
                    dataKey="range"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
