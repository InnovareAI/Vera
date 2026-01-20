import { NextRequest, NextResponse } from 'next/server'
import { chat, ChatMessage } from '@/agents/vera-agent'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, message } = body as {
      messages: ChatMessage[]
      message: string
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const result = await chat(messages || [], message)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Chat failed. Please try again.' },
      { status: 500 }
    )
  }
}
