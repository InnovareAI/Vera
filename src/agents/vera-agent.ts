import Anthropic from '@anthropic-ai/sdk'
import { fetchRedditPosts } from './reddit-fetcher'
import { evaluatePosts } from './relevance-evaluator'
import { generateResearchSummary } from './summary-generator'
import { ResearchOutput } from '@/types/research'

const anthropic = new Anthropic()

// Define tools for VERA
const tools: Anthropic.Tool[] = [
  {
    name: 'research_reddit',
    description: 'Research trending topics and discussions on Reddit. Use this when the user wants to find out what people are talking about on Reddit, discover trends, or gather insights from specific subreddits.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of topics to research (e.g., ["AI agents", "automation", "MCP"])'
        },
        subreddits: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of subreddits to search (e.g., ["artificial", "ChatGPT", "LocalLLaMA"])'
        },
        time_window: {
          type: 'string',
          enum: ['6h', '24h', '72h', '7d'],
          description: 'How far back to search (default: 24h)'
        },
        audience_context: {
          type: 'string',
          description: 'Description of the target audience to help evaluate relevance'
        }
      },
      required: ['topics', 'subreddits']
    }
  },
  {
    name: 'save_research',
    description: 'Save research results for later reference',
    input_schema: {
      type: 'object' as const,
      properties: {
        research_id: {
          type: 'string',
          description: 'ID of the research to save'
        },
        name: {
          type: 'string',
          description: 'Name for the saved research'
        }
      },
      required: ['research_id', 'name']
    }
  }
]

// Tool execution
async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<{ result: unknown; error?: string }> {
  try {
    switch (name) {
      case 'research_reddit': {
        const topics = input.topics as string[]
        const subreddits = input.subreddits as string[]
        const timeWindow = (input.time_window as string) || '24h'
        const audienceContext = (input.audience_context as string) || ''

        // Fetch posts
        const posts = await fetchRedditPosts(subreddits, timeWindow, 10)

        if (posts.length === 0) {
          return {
            result: {
              success: false,
              message: 'No posts found matching criteria. Try different subreddits or expand the time window.'
            }
          }
        }

        // Evaluate relevance
        const evaluatedPosts = await evaluatePosts(posts, topics, audienceContext, 15)

        // Generate summary
        const research = await generateResearchSummary(evaluatedPosts, topics, subreddits)

        return { result: research }
      }

      case 'save_research': {
        // TODO: Save to Supabase
        return {
          result: {
            success: true,
            message: `Research saved as "${input.name}"`
          }
        }
      }

      default:
        return { result: null, error: `Unknown tool: ${name}` }
    }
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    }
  }
}

// Format research output for display
function formatResearchOutput(research: ResearchOutput): string {
  let output = `## Research Results: ${research.topic}\n\n`

  output += `**Summary:** ${research.summary}\n\n`

  if (research.trends.length > 0) {
    output += `**Key Trends:**\n`
    research.trends.forEach((trend, i) => {
      output += `${i + 1}. ${trend}\n`
    })
    output += '\n'
  }

  if (research.insights.length > 0) {
    output += `**Top Insights (${research.insights.length}):**\n\n`
    research.insights.slice(0, 5).forEach((insight, i) => {
      output += `**${i + 1}. [${insight.title}](${insight.url})**\n`
      output += `   - Source: ${insight.source} | Score: ${insight.score} | Relevance: ${(insight.relevanceScore * 100).toFixed(0)}%\n`
      output += `   - ${insight.relevanceReason}\n\n`
    })
  }

  output += `\n*Research ID: ${research.id}*`

  return output
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  research?: ResearchOutput
}

export async function chat(
  messages: ChatMessage[],
  userMessage: string
): Promise<{ response: string; research?: ResearchOutput }> {

  // Build conversation history for Claude
  const claudeMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content
  }))

  // Add new user message
  claudeMessages.push({ role: 'user', content: userMessage })

  const systemPrompt = `You are VERA, an AI research assistant specializing in marketing intelligence and content research.

Your capabilities:
- Research Reddit for trending topics, discussions, and insights
- Analyze relevance of content to specific audiences
- Summarize findings with citations

When users ask about trends, topics, or want research:
1. Use the research_reddit tool to gather data
2. Present findings in a clear, actionable format
3. Always include source links for citations

Be conversational but efficient. Ask clarifying questions if needed (which subreddits, what audience, etc).

If the user's request is vague, suggest relevant subreddits based on their topic:
- AI/ML: artificial, MachineLearning, ChatGPT, LocalLLaMA, ClaudeAI
- Marketing: marketing, digital_marketing, socialmedia, content_marketing
- Business: Entrepreneur, startups, smallbusiness
- Tech: technology, programming, webdev

Always respond helpfully and format research results clearly with markdown.`

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages: claudeMessages
  })

  let researchResult: ResearchOutput | undefined

  // Agentic loop - handle tool calls
  while (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(
      block => block.type === 'tool_use'
    ) as Anthropic.ToolUseBlock | undefined

    if (!toolUseBlock) break

    const { result, error } = await executeTool(
      toolUseBlock.name,
      toolUseBlock.input as Record<string, unknown>
    )

    // Check if this is research output
    if (toolUseBlock.name === 'research_reddit' && result && !error) {
      researchResult = result as ResearchOutput
    }

    // Continue conversation with tool result
    claudeMessages.push({
      role: 'assistant',
      content: response.content
    })

    claudeMessages.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseBlock.id,
        content: error || JSON.stringify(result)
      }]
    })

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: claudeMessages
    })
  }

  // Extract final text response
  const textBlock = response.content.find(
    block => block.type === 'text'
  ) as Anthropic.TextBlock | undefined

  return {
    response: textBlock?.text || 'I encountered an issue processing your request.',
    research: researchResult
  }
}
