import { createClient, SupabaseClient } from '@supabase/supabase-js'

let samClient: SupabaseClient | null = null

/**
 * Creates a Supabase client for the SAM database.
 * Returns null if SAM credentials are not configured.
 */
export function createSamClient(): SupabaseClient | null {
  if (samClient) return samClient

  const url = process.env.SAM_SUPABASE_URL
  const key = process.env.SAM_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  samClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return samClient
}
