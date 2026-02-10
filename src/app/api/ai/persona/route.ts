import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const PERSONA_PROMPTS = {
    brand: `You are a world-class brand strategist. 
Based on the provided context (which could be a URL or a short description), extract and refine the brand identity.
Return a JSON object with strictly these fields:
- name: The brand name
- industry: The primary industry
- url: The company website (if known)
- tone_tags: 3-5 keywords for brand personality (e.g., "Professional, Bold, Witty")
- uvp: A compelling 1-2 sentence Unique Value Proposition
- dictionary: 2-3 terminology rules (e.g., "Always use 'Expert', never 'Guru'")
- description: A concise 1-sentence brand summary`,

    audience: `You are a consumer psychology expert.
Based on the brand or product description provided, identify a high-value target audience segment.
Return a JSON object with strictly these fields:
- name: A name for this persona (e.g., "Growth Manager Gary")
- demographics: Age range, role, and industry (e.g., "30-45, Head of Marketing, B2B SaaS")
- location: Primary geographical focus
- pain_points: The 3 biggest frustrations this person faces
- barriers: What stops them from buying (the "psychographic barriers")
- description: A concise 1-sentence summary of who they are`,

    product: `You are a product marketing manager.
Based on the brand or company context provided, define a specific product persona.
Return a JSON object with strictly these fields:
- name: The product name
- solution: The "what and how" (e.g., "AI-Powered SDR Platform")
- pricing: Suggested pricing model context (e.g., "Mid-market B2B SaaS")
- competitive_edge: What makes it unique vs competitors
- description: A concise 1-sentence product summary`
};

export async function POST(request: NextRequest) {
    try {
        const { type, context } = await request.json();

        if (!type || !context) {
            return NextResponse.json({ error: 'Missing type or context' }, { status: 400 });
        }

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 });
        }

        const systemPrompt = PERSONA_PROMPTS[type as keyof typeof PERSONA_PROMPTS];
        if (!systemPrompt) {
            return NextResponse.json({ error: 'Invalid persona type' }, { status: 400 });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://vera.innovare.ai',
                'X-Title': 'Vera.AI Persona AI'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-haiku',
                messages: [
                    { role: 'system', content: systemPrompt + "\n\nCRITICAL: Return ONLY valid JSON. No preamble, no explanation." },
                    { role: 'user', content: `Context to analyze:\n${context}` }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error('AI request failed');
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Ensure it's valid JSON
        const personaData = JSON.parse(content);

        return NextResponse.json({
            success: true,
            data: personaData
        });

    } catch (error) {
        console.error('Persona AI error:', error);
        return NextResponse.json({
            error: 'Failed to generate persona data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
