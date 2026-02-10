import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

interface VoiceProfile {
    personality: string[]
    doList: string[]
    dontList: string[]
    keyPhrases: string[]
    avoidPhrases: string[]
    writingStyle: {
        sentenceLength: 'short' | 'medium' | 'long' | 'varied'
        formality: 'casual' | 'professional' | 'conversational' | 'formal'
        useOfEmoji: boolean
        useOfHashtags: boolean
        perspective: 'first_person' | 'second_person' | 'third_person' | 'mixed'
    }
    summary: string
}

export async function POST(request: NextRequest) {
    try {
        const { samples, workspaceId } = await request.json()

        if (!samples || !Array.isArray(samples) || samples.length < 2) {
            return NextResponse.json(
                { error: 'At least 2 writing samples are required' },
                { status: 400 }
            )
        }

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            )
        }

        const combinedSamples = samples
            .map((s: string, i: number) => `--- SAMPLE ${i + 1} ---\n${s}`)
            .join('\n\n')

        const systemPrompt = `You are an expert writing analyst and brand voice specialist. Your task is to analyze writing samples and extract a detailed voice profile that can be used to generate consistent, on-brand content.

Analyze the writing samples carefully for:
1. Personality traits and tone
2. Writing patterns and style preferences
3. Signature phrases and expressions
4. Things to do and things to avoid

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
    "personality": ["trait1", "trait2", "trait3", "trait4", "trait5"],
    "doList": ["Pattern to follow 1", "Pattern to follow 2", "Pattern to follow 3", "Pattern to follow 4", "Pattern to follow 5"],
    "dontList": ["Thing to avoid 1", "Thing to avoid 2", "Thing to avoid 3", "Thing to avoid 4", "Thing to avoid 5"],
    "keyPhrases": ["signature phrase 1", "signature phrase 2", "signature phrase 3"],
    "avoidPhrases": ["phrase to avoid 1", "phrase to avoid 2"],
    "writingStyle": {
        "sentenceLength": "short|medium|long|varied",
        "formality": "casual|professional|conversational|formal",
        "useOfEmoji": true|false,
        "useOfHashtags": true|false,
        "perspective": "first_person|second_person|third_person|mixed"
    },
    "summary": "A 2-3 sentence summary of this person's unique writing voice and what makes it distinctive."
}`

        const userPrompt = `Analyze these writing samples and extract the voice profile:\n\n${combinedSamples}`

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://vera.innovare.ai',
                'X-Title': 'Vera.AI Voice Analyzer'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-sonnet',
                max_tokens: 2048,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter error:', error)
            return NextResponse.json(
                { error: 'Failed to analyze voice samples' },
                { status: 500 }
            )
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            return NextResponse.json(
                { error: 'No analysis returned' },
                { status: 500 }
            )
        }

        // Parse the JSON response
        let profile: VoiceProfile
        try {
            // Clean up potential markdown code blocks
            const cleanContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()
            profile = JSON.parse(cleanContent)
        } catch (parseError) {
            console.error('Failed to parse voice profile:', content)
            return NextResponse.json(
                { error: 'Failed to parse voice analysis' },
                { status: 500 }
            )
        }

        // Validate required fields
        if (!profile.personality || !profile.doList || !profile.summary) {
            return NextResponse.json(
                { error: 'Incomplete voice profile returned' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            profile,
            samplesAnalyzed: samples.length,
            workspaceId
        })

    } catch (error) {
        console.error('Voice analysis error:', error)
        return NextResponse.json(
            { error: 'Failed to analyze voice samples' },
            { status: 500 }
        )
    }
}
