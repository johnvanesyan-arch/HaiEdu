import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { createMisconceptionReviewHandler } from "../_shared/misconception-review-management.mjs";

Deno.serve(createMisconceptionReviewHandler({
  createAdmin: (url: string, key: string) => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
  hasActiveLiveSession,
  env: { url: Deno.env.get("SUPABASE_URL"), key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") },
}));
