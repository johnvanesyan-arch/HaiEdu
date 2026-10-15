-- Replay-safe marker for an environment-specific production operation.
-- Production recorded the exact guarded DML and this version atomically through
-- execute_sql after the migration connector returned invalid requestState.
-- The immutable executed SQL is archived in supabase/operations at this version.
-- Other environments must record their own verified runtime manifests; replaying
-- production timestamps, binding digests or Edge versions would be inaccurate.
-- Keep the version in the chain so remote migration history reconciles, without
-- requiring production inventory or claiming production deployment elsewhere.
select 1;
