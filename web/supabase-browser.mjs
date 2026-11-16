// Browser-only dependency boundary. The exact SDK and transitive dependencies
// come from package-lock.json; all roles load the same generated local module.
import {createClient as createSdkClient} from '@supabase/supabase-js';
import {installClientFailureReporter} from './client-failure-reporter.mjs';
export function createClient(url, key, options) {
  const client = createSdkClient(url, key, options);
  installClientFailureReporter(client, url, key);
  return client;
}
