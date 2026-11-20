// Isolated, in-memory registry for the legacy mastery rules (I-2, option A). Applies the
// real repository migration to PGlite; no remote client, credentials or production data.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export const registryMigration = 'supabase/migrations/20261120120000_legacy_mastery_rule_registry.sql';
export const roleSQL = `do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;`;
export async function registryDatabase() {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(roleSQL);
  await db.exec(readFileSync(registryMigration, 'utf8'));
  return db;
}
export const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
export const ruleRow = async (db, version) => (await one(db, 'select service_legacy_mastery_rule_version($1) r', [version])).r;
export const activeRule = async (db, unit = 'PHY7-U01') => (await one(db, 'select service_legacy_mastery_active_rule($1) r', [unit])).r;
export const activate = async (db, version, unit = 'PHY7-U01', reason = 'isolated rehearsal') =>
  (await one(db, 'select service_activate_legacy_mastery_rule($1,$2,$3,$4) r', [unit, version, 'isolated-test', reason])).r;
// Chapter I codes as seeded in the registry: S01 … S10.
export const CODES = Array.from({ length: 10 }, (_, n) => `PHY7-U01-S${String(n + 1).padStart(2, '0')}`);
export const skillResults = counts => CODES.map((code, n) => ({ skillId: `skill-${n + 1}`, code, nameHy: code, correct: counts[n], total: 2 }));
export const totals = rows => ({ correct: rows.reduce((s, r) => s + r.correct, 0), answered: rows.reduce((s, r) => s + r.total, 0) });
