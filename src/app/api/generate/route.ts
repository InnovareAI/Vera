import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

interface GenerateRequest {
    topic: {
        title: string;
        content: string;
        source: string;
        url: string;
    };
    platform: 'linkedin' | 'twitter' | 'reddit' | 'medium';
    tone?: 'professional' | 'casual' | 'thought-leader';
    projectContext?: {
        name?: string;
        industry?: string;
        tone?: string;
        icp?: {
            target_roles?: string[];
            pain_points?: string[];
            goals?: string[];
        };
        products?: { name: string; description: string }[];
    };
}

const PLATFORM_PROMPTS = {
    linkedin: `You are a B2B content strategist creating a LinkedIn post optimized for LinkedIn's 360Brew algorithm (2025).

360BREW ALGORITHM CONTEXT:
LinkedIn's 360Brew is a 150B-parameter unified AI model that performs semantic reasoning — it reads, understands, and matches users based on meaning and context, not keywords.
- TOPICAL AUTHORITY: Posts aligned to the author's domain get 5x more reach. Never write off-brand content.
- "SAVES" = #1 SIGNAL: "Saves" are 5x more powerful than likes. Write content people NEED to save — frameworks, checklists, counterintuitive insights.
- MEANINGFUL ENGAGEMENT: Short reactions ("Great post!") are filtered as noise. End with questions that invite 10+ word thoughtful responses.
- HASHTAG STUFFING IS DEAD: The LMM reads full text semantically. Use 2-3 hashtags at most, at the end only.
- NO LOW-DWELL CONTENT: Thin bait posts, polls without context, or "agree?" posts are suppressed.
- LANGUAGE PURITY: Content must match the profile's primary language.

Write a compelling, insight-driven post that:
- Starts with a hook (first line grabs attention before "see more" cut-off)
- Shares a valuable insight or perspective worth saving
- Includes a subtle call-to-action
- Uses line breaks for readability
- Is 150-250 words max
- Adds 2-3 relevant hashtags at the very end (fewer is better under 360Brew)
- Sounds authentic, not salesy
- Ends with an open question that invites thoughtful, 10+ word responses
- Creates "save-worthy" value: frameworks, step-by-step breakdowns, counterintuitive insights
- Positions the author as knowledgeable about sales/outbound challenges`,

    twitter: `You are a B2B content strategist creating a Twitter/X thread.
Write a punchy, engaging thread that:
- Tweet 1: Strong hook that stops the scroll
- Tweets 2-5: Key insights, one per tweet
- Final tweet: Takeaway + soft CTA
- Each tweet under 280 characters
- Use "🧵" to indicate thread
- No hashtags except final tweet (max 2)
- Conversational, direct tone`,

    reddit: `You are helping craft an authentic Reddit reply.
Write a helpful, genuine response that:
- Directly addresses the poster's question/pain
- Shares practical advice from experience
- Does NOT promote products directly
- Sounds like a real person, not marketing
- Is 100-200 words
- May include a subtle mention of "tools that helped me" if relevant
- Ends with an offer to share more details if helpful`,

    medium: `You are outlining a Medium article for B2B audience.
Create an article outline that:
- Has a compelling headline
- Includes 5-7 section headers
- Has 2-3 bullet points per section with key points
- Suggests a hook for the introduction
- Includes a strong conclusion angle
- Total article would be 1000-1500 words when written`
};

export async function POST(request: NextRequest) {
    try {
        const body: GenerateRequest = await request.json();
        const { topic, platform, tone = 'professional', projectContext } = body;

        if (!topic || !platform) {
            return NextResponse.json({ error: 'Missing topic or platform' }, { status: 400 });
        }

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
        }

        const systemPrompt = PLATFORM_PROMPTS[platform];

        // Build project context section if available
        let projectSection = '';
        if (projectContext) {
            const parts: string[] = [];
            if (projectContext.name) parts.push(`BRAND: ${projectContext.name}`);
            if (projectContext.industry) parts.push(`INDUSTRY: ${projectContext.industry}`);
            if (projectContext.products?.length) {
                parts.push(`PRODUCTS: ${projectContext.products.map(p => `${p.name} — ${p.description}`).join('; ')}`);
            }
            if (projectContext.icp) {
                const icpParts: string[] = [];
                if (projectContext.icp.target_roles?.length) icpParts.push(`Target roles: ${projectContext.icp.target_roles.join(', ')}`);
                if (projectContext.icp.pain_points?.length) icpParts.push(`Pain points: ${projectContext.icp.pain_points.join(', ')}`);
                if (projectContext.icp.goals?.length) icpParts.push(`Goals: ${projectContext.icp.goals.join(', ')}`);
                if (icpParts.length) parts.push(`ICP: ${icpParts.join('. ')}`);
            }
            if (projectContext.tone) parts.push(`BRAND TONE: ${projectContext.tone}`);
            if (parts.length) {
                projectSection = `\n\nPROJECT CONTEXT (write content aligned to this brand):\n${parts.join('\n')}`;
            }
        }

        const userPrompt = `Based on this topic/post, create content:

SOURCE: ${topic.source}
TITLE: ${topic.title}
CONTENT: ${topic.content || 'No additional content'}
URL: ${topic.url}${projectSection}

Tone: ${tone}

Generate the ${platform} content now:`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://vera.innovare.ai',
                'X-Title': 'Vera.AI Content Generator'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-haiku', // Claude Haiku 4.5 - faster & cost-effective
                max_tokens: 1024,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API error:', errorText);
            return NextResponse.json({
                error: 'Failed to generate content',
                details: errorText
            }, { status: 500 });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        return NextResponse.json({
            success: true,
            platform,
            content,
            topic: {
                title: topic.title,
                source: topic.source,
                url: topic.url
            }
        });

    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate content',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
