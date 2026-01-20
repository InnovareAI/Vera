'use client'

import { useState, useRef, useEffect } from 'react'
import { ResearchOutput } from '@/types/research'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  research?: ResearchOutput
  timestamp: Date
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          message: userMessage.content
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        research: data.research,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">VERA</h1>
            <p className="text-xs text-gray-500">Marketing Research Agent</p>
          </div>
          <div className="text-xs text-gray-500">
            {messages.length > 0 && `${messages.length} messages`}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold text-white mb-2">
                Hi, I'm VERA
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Your AI research assistant. Ask me to research trends, analyze discussions, or find insights from Reddit and other sources.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'What\'s trending on r/artificial about AI agents?',
                  'Research MCP on r/ChatGPT and r/ClaudeAI',
                  'Find discussions about agentic workflows'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-blue-600 rounded-2xl rounded-br-md px-4 py-2'
                        : 'bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3'
                    }`}
                  >
                    {/* Message content */}
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>

                    {/* Research card */}
                    {message.research && (
                      <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                        <h4 className="text-sm font-semibold text-white mb-2">
                          Research: {message.research.topic}
                        </h4>

                        {/* Trends */}
                        {message.research.trends.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-400 mb-1">Key Trends:</p>
                            <div className="flex flex-wrap gap-1">
                              {message.research.trends.map((trend, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs"
                                >
                                  {trend}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top insights */}
                        {message.research.insights.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-2">
                              Top {Math.min(3, message.research.insights.length)} Insights:
                            </p>
                            <div className="space-y-2">
                              {message.research.insights.slice(0, 3).map((insight, i) => (
                                <a
                                  key={i}
                                  href={insight.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs text-blue-400 line-clamp-1">
                                      {insight.title}
                                    </p>
                                    <span className="text-xs text-green-400 whitespace-nowrap">
                                      {(insight.relevanceScore * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {insight.source} • {insight.score} pts
                                  </p>
                                </a>
                              ))}
                            </div>
                            {message.research.insights.length > 3 && (
                              <p className="text-xs text-gray-500 mt-2">
                                +{message.research.insights.length - 3} more insights
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-400">Researching...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask VERA to research something..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {loading ? '...' : 'Send'}
            </button>
          </form>
          <p className="text-xs text-gray-600 mt-2 text-center">
            VERA can research Reddit, analyze trends, and find relevant insights.
          </p>
        </div>
      </div>
    </main>
  )
}
