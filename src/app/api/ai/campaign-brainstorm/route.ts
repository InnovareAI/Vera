import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(request: NextRequest) {
    try {
        const { brand, audience } = await request.json();

        if (!brand || !audience) {
            return NextResponse.json({ error: 'Missing brand or audience context' }, { status: 400 });
        }

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 });
        }

        const systemPrompt = `You are a creative campaign director. 
Based on the brand identity and target audience provided, brainstorm a high-impact marketing campaign.
Return a JSON object with strictly these fields:
- campaignName: A catchy, memorable name for the campaign
- campaignGoal: One of ["awareness", "engagement", "leads", "sales", "thought_leadership"]
- keyMessages: An array of 3 core messages or value statements
- callToAction: A strong, specific CTA (e.g., "Book a 15-min demo to see your ROI")
- description: A 1-sentence summary of the campaign strategy`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://vera.innovare.ai',
                'X-Title': 'VERA Campaign AI'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-haiku',
                messages: [
                    { role: 'system', content: systemPrompt + "\n\nCRITICAL: Return ONLY valid JSON." },
                    { role: 'user', content: `BRAND:\n${brand}\n\nAUDIENCE:\n${audience}` }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error('AI request failed');
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const brainstormData = JSON.parse(content);

        return NextResponse.json({
            success: true,
            data: brainstormData
        });

    } catch (error) {
        console.error('Campaign AI error:', error);
        return NextResponse.json({
            error: 'Failed to brainstorm campaign',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
