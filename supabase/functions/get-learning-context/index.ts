import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { hasActiveLiveSession } from '../_shared/auth.ts';
import { createLearningContextHandler } from '../_shared/learning-context-handler.mjs';

Deno.serve(createLearningContextHandler({
  createAdmin: (url: string, key: string) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
  hasActiveLiveSession,
  env: { url: Deno.env.get('SUPABASE_URL'), key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') },
}));
