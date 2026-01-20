import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
    topic: {
        title: string;
        content: string;
        source: string;
        url: string;
    };
    platform: 'linkedin' | 'twitter' | 'reddit' | 'medium';
    tone?: 'professional' | 'casual' | 'thought-leader';
}

const PLATFORM_PROMPTS = {
    linkedin: `You are a B2B content strategist creating a LinkedIn post. 
Write a compelling, insight-driven post that:
- Starts with a hook (first line grabs attention)
- Shares a valuable insight or perspective
- Includes a subtle call-to-action
- Uses line breaks for readability
- Is 150-250 words max
- Does NOT use hashtags in the body (add 3-5 relevant hashtags at the very end)
- Sounds authentic, not salesy
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
        const { topic, platform, tone = 'professional' } = body;

        if (!topic || !platform) {
            return NextResponse.json({ error: 'Missing topic or platform' }, { status: 400 });
        }

        const systemPrompt = PLATFORM_PROMPTS[platform];

        const userPrompt = `Based on this topic/post, create content:

SOURCE: ${topic.source}
TITLE: ${topic.title}
CONTENT: ${topic.content || 'No additional content'}
URL: ${topic.url}

The content should relate to B2B sales, outbound, or startup growth challenges.
Tone: ${tone}

Generate the ${platform} content now:`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            system: systemPrompt
        });

        const content = message.content[0].type === 'text' ? message.content[0].text : '';

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
