import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

export const coreSql = 'supabase/proposals/bf16_actor_rate_limiter_core.sql';
export const actor = n => `16000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const fixtureSql = readFileSync('tests/fixtures/actor-rate-limiter.sql', 'utf8');

export async function database() {
  const db = new PGlite();
  await db.waitReady;
  try {
    await db.exec(fixtureSql);
    await db.exec(readFileSync(coreSql, 'utf8'));
    return db;
  } catch (error) { await db.close(); throw error; }
}

export async function reserve(db, id = actor(1), costs = {app: 1}) {
  return (await db.query('select public.service_reserve_actor_rate_budgets($1,$2::jsonb) as result',
    [id, JSON.stringify(costs)])).rows[0].result;
}

export async function state(db) {
  return (await db.query(`select coalesce(jsonb_agg(to_jsonb(b) ||
    jsonb_build_object('rowVersion',xmin::text) order by actor_id,policy_key),'[]') as state
    from private.actor_rate_buckets b`)).rows[0].state;
}
