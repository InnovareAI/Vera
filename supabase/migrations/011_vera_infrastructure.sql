-- VERA Infrastructure: Agent events, job queue, distributed locks

CREATE TABLE vera_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent TEXT NOT NULL,
  target_agent TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours'
);
CREATE INDEX idx_vera_agent_events_pending ON vera_agent_events(target_agent, status) WHERE status = 'pending';

CREATE TABLE vera_jobs_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  workspace_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_vera_jobs_pending ON vera_jobs_queue(job_type, status) WHERE status = 'pending';

CREATE TABLE vera_distributed_locks (
  lock_name TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
