import { fetchRedditPosts } from './reddit-fetcher'
import { evaluatePosts } from './relevance-evaluator'
import { generateResearchSummary } from './summary-generator'
import { ResearchOutput } from '@/types/research'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// Tool definitions for function calling
const tools = [
  {
    type: 'function',
    function: {
      name: 'research_reddit',
      description: 'Research trending topics and discussions on Reddit. Use this when the user wants to find out what people are talking about on Reddit, discover trends, or gather insights from specific subreddits.',
      parameters: {
        type: 'object',
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
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_research',
      description: 'Save research results for later reference',
      parameters: {
        type: 'object',
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

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

async function callOpenRouter(messages: OpenRouterMessage[], includeTools = true): Promise<{
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vera.innovare.ai',
      'X-Title': 'Vera.AI Research Agent'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages,
      ...(includeTools ? { tools, tool_choice: 'auto' } : {})
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${error}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]?.message

  return {
    content: choice?.content || null,
    tool_calls: choice?.tool_calls
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  research?: ResearchOutput
}

const SYSTEM_PROMPT = `You are Vera.AI, an AI research assistant specializing in marketing intelligence and content research.

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

export async function chat(
  messages: ChatMessage[],
  userMessage: string
): Promise<{ response: string; research?: ResearchOutput }> {

  // Build conversation history
  const openRouterMessages: OpenRouterMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ]

  let researchResult: ResearchOutput | undefined
  let maxIterations = 5 // Prevent infinite loops

  // Agentic loop - handle tool calls
  while (maxIterations > 0) {
    maxIterations--

    const response = await callOpenRouter(openRouterMessages)

    // Check if there are tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      // Add assistant message with tool calls
      openRouterMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: response.tool_calls
      })

      // Process each tool call
      for (const toolCall of response.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        const { result, error } = await executeTool(functionName, functionArgs)

        // Check if this is research output
        if (functionName === 'research_reddit' && result && !error) {
          researchResult = result as ResearchOutput
        }

        // Add tool result to conversation
        openRouterMessages.push({
          role: 'tool',
          content: error || JSON.stringify(result),
          tool_call_id: toolCall.id
        })
      }

      // Continue the loop to get the next response
      continue
    }

    // No tool calls - we have the final response
    return {
      response: response.content || 'I encountered an issue processing your request.',
      research: researchResult
    }
  }

  return {
    response: 'I encountered an issue processing your request (max iterations reached).',
    research: researchResult
  }
}
