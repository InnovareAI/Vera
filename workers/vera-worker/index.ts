import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { processColdEmailBatch } from './cold-email/processor.js';
import { processNewsletterSend } from './newsletter/processor.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const CRON_SECRET = process.env.VERA_CRON_SECRET;

const supabase = createClient(
  process.env.VERA_SUPABASE_URL!,
  process.env.VERA_SUPABASE_SERVICE_ROLE_KEY!
);

// Auth middleware for cron triggers
function requireCronAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const secret = req.headers['x-cron-secret'];
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vera-worker', timestamp: new Date().toISOString() });
});

// Task trigger endpoint
app.post('/trigger/:task', requireCronAuth, async (req, res) => {
  const { task } = req.params;
  const startedAt = new Date().toISOString();

  try {
    switch (task) {
      case 'cold-email-send':
        await processColdEmailBatch(supabase);
        break;
      case 'newsletter-send':
        await processNewsletterSend(supabase);
        break;
      case 'process-agent-events':
        // Process pending agent events
        await processAgentEvents(supabase);
        break;
      default:
        res.status(400).json({ error: `Unknown task: ${task}` });
        return;
    }
    res.json({ success: true, task, startedAt, completedAt: new Date().toISOString() });
  } catch (error) {
    console.error(`Task ${task} failed:`, error);
    res.status(500).json({ error: `Task failed: ${(error as Error).message}`, task, startedAt });
  }
});

async function processAgentEvents(supabase: ReturnType<typeof createClient>) {
  const { data: events } = await supabase
    .from('vera_agent_events')
    .select('*')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(50);

  if (!events?.length) return;

  for (const event of events) {
    try {
      // Process event based on type
      console.log(`Processing event ${event.id}: ${event.event_type} from ${event.source_agent}`);

      await supabase
        .from('vera_agent_events')
        .update({ status: 'processed' })
        .eq('id', event.id);
    } catch (err) {
      console.error(`Failed to process event ${event.id}:`, err);
    }
  }
}

app.listen(PORT, () => {
  console.log(`VERA Worker running on port ${PORT}`);
});
