/**
 * MCP Innovare Hub - Universal Connector
 *
 * Central MCP server connecting all Innovare AI teams:
 * - SAM (Sales Agent) - CRM, outreach, lead data
 * - VERA (Marketing Agent) - Paid ads, social media, content
 * - Future agents...
 *
 * Capabilities:
 * 1. Shared Knowledge Base - Pull client KB from any team
 * 2. Cross-Team Communication - Pass data between SAM ↔ VERA
 * 3. Unified Client Context - Single source of truth for client data
 * 4. Content Sync - Share approved content between teams
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
// Initialize Supabase client (shared database)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// ============================================================
// KNOWLEDGE BASE TOOLS (Shared across all teams)
// ============================================================
async function listWorkspaces() {
    const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, detected_industry, company_url, company_description')
        .order('name');
    if (error)
        throw new Error(`Failed to list workspaces: ${error.message}`);
    return data;
}
async function getKnowledgeBase(workspaceId, category, source) {
    let query = supabase
        .from('knowledge_base')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);
    if (category)
        query = query.eq('category', category);
    if (source)
        query = query.eq('source_type', source);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error)
        throw new Error(`Failed to fetch KB: ${error.message}`);
    return data;
}
async function searchKnowledge(workspaceId, query, limit = 10) {
    const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(limit);
    if (error)
        throw new Error(`Search failed: ${error.message}`);
    return data;
}
async function addKnowledge(workspaceId, entry) {
    const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
        workspace_id: workspaceId,
        category: entry.category,
        title: entry.title,
        content: entry.content,
        source_type: entry.source_type,
        tags: entry.tags || [],
        source_metadata: entry.metadata || {}
    })
        .select()
        .single();
    if (error)
        throw new Error(`Failed to add KB entry: ${error.message}`);
    return data;
}
// ============================================================
// SAM-SPECIFIC TOOLS
// ============================================================
async function getICPData(workspaceId) {
    const { data, error } = await supabase
        .from('sam_icp_knowledge_entries')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('stage');
    if (error)
        throw new Error(`Failed to fetch ICP: ${error.message}`);
    // Group by category
    return data?.reduce((acc, entry) => {
        const cat = entry.category || 'other';
        if (!acc[cat])
            acc[cat] = [];
        acc[cat].push({
            question: entry.question_text,
            answer: entry.answer_text,
            structured: entry.answer_structured,
            stage: entry.stage
        });
        return acc;
    }, {});
}
async function getCRMContacts(workspaceId, limit = 50) {
    const { data, error } = await supabase
        .from('sam_accounts')
        .select('id, name, company, title, email, linkedin_url, status')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        throw new Error(`Failed to fetch contacts: ${error.message}`);
    return data;
}
async function getCampaigns(workspaceId, status) {
    let query = supabase
        .from('sam_campaigns')
        .select('id, name, status, type, created_at, updated_at')
        .eq('workspace_id', workspaceId);
    if (status)
        query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error)
        throw new Error(`Failed to fetch campaigns: ${error.message}`);
    return data;
}
// ============================================================
// VERA-SPECIFIC TOOLS
// ============================================================
async function getContentQueue(workspaceId, status) {
    let query = supabase
        .from('content_queue')
        .select('*')
        .eq('workspace_id', workspaceId);
    if (status)
        query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error)
        throw new Error(`Failed to fetch content queue: ${error.message}`);
    return data;
}
async function getApprovedContent(workspaceId, platform, limit = 20) {
    let query = supabase
        .from('content_queue')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'approved');
    if (platform)
        query = query.eq('platform', platform);
    const { data, error } = await query
        .order('approved_at', { ascending: false })
        .limit(limit);
    if (error)
        throw new Error(`Failed to fetch approved content: ${error.message}`);
    return data;
}
// ============================================================
// CROSS-TEAM TOOLS
// ============================================================
async function getWorkspaceContext(workspaceId) {
    const [workspace, icp, kb, recentContent] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', workspaceId).single(),
        getICPData(workspaceId),
        supabase
            .from('knowledge_base')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_active', true)
            .in('category', ['brand', 'messaging', 'products', 'case_studies'])
            .limit(50),
        supabase
            .from('content_queue')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('status', 'approved')
            .order('approved_at', { ascending: false })
            .limit(10)
    ]);
    return {
        workspace: workspace.data,
        icp,
        knowledge: kb.data,
        recentApprovedContent: recentContent.data
    };
}
async function syncContentToSAM(workspaceId, contentId, contentType) {
    // When VERA approves content, sync to SAM for outreach use
    const { data: content, error: contentError } = await supabase
        .from('content_queue')
        .select('*')
        .eq('id', contentId)
        .single();
    if (contentError)
        throw new Error(`Content not found: ${contentError.message}`);
    // Add to knowledge base for SAM to use in outreach
    const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
        workspace_id: workspaceId,
        category: 'approved_content',
        subcategory: content.platform,
        title: `${content.platform} post - ${new Date().toISOString().split('T')[0]}`,
        content: content.content_text || content.caption || '',
        source_type: 'vera',
        tags: [content.platform, contentType, 'approved'],
        source_metadata: {
            content_id: contentId,
            platform: content.platform,
            approved_at: content.approved_at,
            media_urls: content.media_urls
        }
    })
        .select()
        .single();
    if (error)
        throw new Error(`Failed to sync to SAM: ${error.message}`);
    return data;
}
async function getLeadsForRetargeting(workspaceId, criteria) {
    // Get leads from SAM that could be retargeted via VERA paid ads
    let query = supabase
        .from('sam_accounts')
        .select('id, name, company, title, linkedin_url, status, engagement_score')
        .eq('workspace_id', workspaceId);
    if (criteria?.status) {
        query = query.eq('status', criteria.status);
    }
    if (criteria?.minEngagement) {
        query = query.gte('engagement_score', criteria.minEngagement);
    }
    const { data, error } = await query.limit(100);
    if (error)
        throw new Error(`Failed to fetch leads: ${error.message}`);
    return data;
}
// ============================================================
// SERVER SETUP
// ============================================================
async function main() {
    const server = new Server({
        name: 'innovare-hub',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {}
        }
    });
    // Register all tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            // === Workspace Tools ===
            {
                name: 'list_workspaces',
                description: 'List all client workspaces across SAM and VERA',
                inputSchema: { type: 'object', properties: {}, required: [] }
            },
            {
                name: 'get_workspace_context',
                description: 'Get full context for a client: company info, ICP, brand, recent content. Use before any content generation.',
                inputSchema: {
                    type: 'object',
                    properties: { workspace_id: { type: 'string' } },
                    required: ['workspace_id']
                }
            },
            // === Knowledge Base Tools ===
            {
                name: 'get_knowledge_base',
                description: 'Get knowledge base entries for a workspace. Filter by category (brand, messaging, products, case_studies) or source (sam, vera, manual).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        category: { type: 'string', description: 'Filter by category' },
                        source: { type: 'string', description: 'Filter by source: sam, vera, manual, api' }
                    },
                    required: ['workspace_id']
                }
            },
            {
                name: 'search_knowledge',
                description: 'Search knowledge base for specific topics',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        query: { type: 'string' },
                        limit: { type: 'number', default: 10 }
                    },
                    required: ['workspace_id', 'query']
                }
            },
            {
                name: 'add_knowledge',
                description: 'Add a new entry to the shared knowledge base',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        category: { type: 'string' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        source_type: { type: 'string', enum: ['sam', 'vera', 'manual', 'api'] },
                        tags: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['workspace_id', 'category', 'title', 'content', 'source_type']
                }
            },
            // === SAM Tools ===
            {
                name: 'get_icp_data',
                description: '[SAM] Get Ideal Customer Profile data: personas, pain points, prospecting criteria',
                inputSchema: {
                    type: 'object',
                    properties: { workspace_id: { type: 'string' } },
                    required: ['workspace_id']
                }
            },
            {
                name: 'get_crm_contacts',
                description: '[SAM] Get CRM contacts/leads for a workspace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        limit: { type: 'number', default: 50 }
                    },
                    required: ['workspace_id']
                }
            },
            {
                name: 'get_campaigns',
                description: '[SAM] Get outreach campaigns for a workspace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        status: { type: 'string', description: 'Filter by status: active, paused, completed' }
                    },
                    required: ['workspace_id']
                }
            },
            // === VERA Tools ===
            {
                name: 'get_content_queue',
                description: '[VERA] Get content queue items for a workspace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        status: { type: 'string', description: 'Filter: pending, approved, rejected, scheduled' }
                    },
                    required: ['workspace_id']
                }
            },
            {
                name: 'get_approved_content',
                description: '[VERA] Get approved content ready for publishing',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        platform: { type: 'string', description: 'Filter: linkedin, twitter, instagram, facebook' },
                        limit: { type: 'number', default: 20 }
                    },
                    required: ['workspace_id']
                }
            },
            // === Cross-Team Tools ===
            {
                name: 'sync_content_to_sam',
                description: '[VERA→SAM] Sync approved content to SAM for use in outreach',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        content_id: { type: 'string' },
                        content_type: { type: 'string', description: 'Type: social_post, blog, video, case_study' }
                    },
                    required: ['workspace_id', 'content_id', 'content_type']
                }
            },
            {
                name: 'get_leads_for_retargeting',
                description: '[SAM→VERA] Get leads from SAM that can be retargeted via paid ads',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspace_id: { type: 'string' },
                        status: { type: 'string', description: 'Lead status filter' },
                        min_engagement: { type: 'number', description: 'Minimum engagement score' }
                    },
                    required: ['workspace_id']
                }
            }
        ]
    }));
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            let result;
            switch (name) {
                case 'list_workspaces':
                    result = await listWorkspaces();
                    break;
                case 'get_workspace_context':
                    result = await getWorkspaceContext(args?.workspace_id);
                    break;
                case 'get_knowledge_base':
                    result = await getKnowledgeBase(args?.workspace_id, args?.category, args?.source);
                    break;
                case 'search_knowledge':
                    result = await searchKnowledge(args?.workspace_id, args?.query, args?.limit);
                    break;
                case 'add_knowledge':
                    result = await addKnowledge(args?.workspace_id, {
                        category: args?.category,
                        title: args?.title,
                        content: args?.content,
                        source_type: args?.source_type,
                        tags: args?.tags
                    });
                    break;
                case 'get_icp_data':
                    result = await getICPData(args?.workspace_id);
                    break;
                case 'get_crm_contacts':
                    result = await getCRMContacts(args?.workspace_id, args?.limit);
                    break;
                case 'get_campaigns':
                    result = await getCampaigns(args?.workspace_id, args?.status);
                    break;
                case 'get_content_queue':
                    result = await getContentQueue(args?.workspace_id, args?.status);
                    break;
                case 'get_approved_content':
                    result = await getApprovedContent(args?.workspace_id, args?.platform, args?.limit);
                    break;
                case 'sync_content_to_sam':
                    result = await syncContentToSAM(args?.workspace_id, args?.content_id, args?.content_type);
                    break;
                case 'get_leads_for_retargeting':
                    result = await getLeadsForRetargeting(args?.workspace_id, {
                        status: args?.status,
                        minEngagement: args?.min_engagement
                    });
                    break;
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true
            };
        }
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Innovare Hub running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
