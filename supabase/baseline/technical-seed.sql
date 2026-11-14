-- Four subject-neutral service policies, verified against the reviewed source
-- and read-only production values. No user, curriculum or activation data.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $baseline$
BEGIN
  IF current_setting('haiedu.fresh_baseline', true) IS DISTINCT FROM 'local-empty-v1'
     OR EXISTS (SELECT 1 FROM auth.users)
     OR EXISTS (SELECT 1 FROM private.actor_rate_policies)
     OR EXISTS (SELECT 1 FROM private.actor_rate_buckets) THEN
    RAISE EXCEPTION 'technical_seed_requires_fresh_owned_local_database';
  END IF;
END $baseline$;
INSERT INTO private.actor_rate_policies(policy_key, capacity, token_interval_us, retention_seconds) VALUES
  ('app', 60, 500000, 86400),
  ('session_start', 10, 2000000, 86400),
  ('code_redemption', 10, 60000000, 86400),
  ('invitation_email', 100, 30000000, 86400);
COMMIT;
