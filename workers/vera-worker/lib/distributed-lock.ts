import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export async function acquireLock(
  supabase: SupabaseClient,
  lockName: string,
  ttlSeconds = 300
): Promise<string | null> {
  const instanceId = randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  // Try to insert new lock
  const { error: insertError } = await supabase
    .from('vera_distributed_locks')
    .insert({ lock_name: lockName, instance_id: instanceId, expires_at: expiresAt });

  if (!insertError) return instanceId;

  // Lock exists — check if expired
  const { data: existing } = await supabase
    .from('vera_distributed_locks')
    .select('expires_at')
    .eq('lock_name', lockName)
    .single();

  if (existing && new Date(existing.expires_at) < new Date()) {
    // Expired lock — take it over
    const { error: updateError } = await supabase
      .from('vera_distributed_locks')
      .update({ instance_id: instanceId, expires_at: expiresAt })
      .eq('lock_name', lockName)
      .lt('expires_at', new Date().toISOString());

    if (!updateError) return instanceId;
  }

  return null; // Could not acquire
}

export async function releaseLock(
  supabase: SupabaseClient,
  lockName: string,
  instanceId: string
): Promise<void> {
  await supabase
    .from('vera_distributed_locks')
    .delete()
    .eq('lock_name', lockName)
    .eq('instance_id', instanceId);
}

export async function withLock<T>(
  supabase: SupabaseClient,
  lockName: string,
  fn: () => Promise<T>,
  ttlSeconds = 300
): Promise<T | null> {
  const instanceId = await acquireLock(supabase, lockName, ttlSeconds);
  if (!instanceId) {
    console.log(`Could not acquire lock: ${lockName}`);
    return null;
  }

  try {
    return await fn();
  } finally {
    await releaseLock(supabase, lockName, instanceId);
  }
}
