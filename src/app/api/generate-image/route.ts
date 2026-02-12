import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function generateImage(prompt: string, imageSize: string): Promise<string> {
  const FAL_API_KEY = process.env.FAL_API_KEY
  if (!FAL_API_KEY) return 'https://placehold.co/1200x630/6366f1/ffffff?text=Image+Placeholder'

  try {
    const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({ prompt, image_size: imageSize }),
    })
    const data = await response.json()

    // Wait for result if queued
    if (data.status_url) {
      let res = await fetch(data.status_url, {
        headers: { Authorization: `Key ${FAL_API_KEY}` },
      })
      let status = await res.json()
      while (status.status !== 'COMPLETED' && status.status !== 'FAILED') {
        await new Promise((r) => setTimeout(r, 2000))
        res = await fetch(data.status_url, {
          headers: { Authorization: `Key ${FAL_API_KEY}` },
        })
        status = await res.json()
      }
      return status.images?.[0]?.url || ''
    }
    return data.images?.[0]?.url || ''
  } catch (e) {
    console.error('Image generation error:', e)
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, image_size } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const imageUrl = await generateImage(
      prompt,
      image_size || 'landscape_16_9'
    )

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate image' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, imageUrl })
  } catch (error: unknown) {
    console.error('Generate image error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
