# MCP Innovare Hub

Universal MCP connector for all Innovare AI teams.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Innovare Hub                             │
│              Universal Team Connector                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐    │
│  │     SAM     │◄──►│  Shared KB       │◄──►│    VERA     │    │
│  │   (Sales)   │    │  (Supabase)      │    │ (Marketing) │    │
│  └─────────────┘    └──────────────────┘    └─────────────┘    │
│        │                    │                       │           │
│        ▼                    ▼                       ▼           │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐    │
│  │ CRM Data    │    │ Cross-Team Sync  │    │ Content Q   │    │
│  │ ICP Data    │    │ Retargeting      │    │ Paid Ads    │    │
│  │ Campaigns   │    │ Content Sharing  │    │ Social      │    │
│  └─────────────┘    └──────────────────┘    └─────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tools

### Workspace Tools

- `list_workspaces` - List all client workspaces
- `get_workspace_context` - Full context: company, ICP, brand, content

### Knowledge Base (Shared)

- `get_knowledge_base` - Get KB entries by category/source
- `search_knowledge` - Search KB for topics
- `add_knowledge` - Add new KB entry

### SAM Tools

- `get_icp_data` - Ideal Customer Profile data
- `get_crm_contacts` - CRM contacts/leads
- `get_campaigns` - Outreach campaigns

### VERA Tools

- `get_content_queue` - Content queue items
- `get_approved_content` - Approved content for publishing

### Cross-Team Sync

- `sync_content_to_sam` - Sync VERA content to SAM for outreach
- `get_leads_for_retargeting` - Get SAM leads for VERA paid ads

## Setup

```bash
cd mcp-innovare-hub
npm install
npm run build
```

## Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage in Claude/Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "innovare-hub": {
      "command": "node",
      "args": ["/path/to/mcp-innovare-hub/dist/index.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    }
  }
}
```

## Data Flow

### VERA → SAM

1. VERA creates content
2. Content approved via HITL
3. `sync_content_to_sam` adds to shared KB
4. SAM uses content in outreach sequences

### SAM → VERA

1. SAM generates leads
2. `get_leads_for_retargeting` pulls engaged leads
3. VERA creates retargeting audiences
4. Paid ads target warm leads
