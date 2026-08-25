import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv, getSupabaseServiceRoleKey } from './env';

export function createSupabaseAdminClient() {
  const { url } = getPublicSupabaseEnv();
  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
