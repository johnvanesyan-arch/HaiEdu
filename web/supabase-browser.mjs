// Browser-only dependency boundary. The exact SDK and transitive dependencies
// come from package-lock.json; all roles load the same generated local module.
export { createClient } from '@supabase/supabase-js';
