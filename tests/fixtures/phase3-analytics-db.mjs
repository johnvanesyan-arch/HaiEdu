import { readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { PGlite } from '@electric-sql/pglite';

export const itemId = n => `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export async function analyticsDatabase({ baseline = false } = {}) {
  let db;
  if (process.env.PHASE3_POSTGRES_17_CI === '1') {
    const child = spawn('python', ['tests/fixtures/phase3_sql_bridge.py'], { stdio: ['pipe', 'pipe', 'inherit'] });
    const pending = new Map(); let next = 0, readyResolve, readyReject;
    const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
    const ended = new Promise((resolve, reject) => child.once('exit', code => code === 0 ? resolve() : reject(Error(`SQL bridge exited ${code}`))));
    ended.catch(error => { readyReject(error); for (const p of pending.values()) p.reject(error); });
    createInterface({ input: child.stdout }).on('line', line => {
      const message = JSON.parse(line);
      if (message.ready) { console.log(`Isolated analytics SQL: ${message.version}`); readyResolve(); return; }
      const p = pending.get(message.id); pending.delete(message.id);
      if (message.error) p.reject(Object.assign(Error(message.error), { code: message.code }));
      else p.resolve({ rows: message.rows });
    });
    await ready;
    db = {
      query(query, params = []) { return new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); child.stdin.write(JSON.stringify({ id, query, params }) + '\n'); }); },
      exec(query) { return this.query(query); },
      async close() { child.stdin.end(JSON.stringify({ close: true }) + '\n'); await ended; },
    };
  } else {
    db = new PGlite(); await db.waitReady;
  }
  try {
    await db.exec(readFileSync('tests/fixtures/phase3-analytics.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/0033_sprint_11e_pilot_item_analytics.sql', 'utf8'));
    if (!baseline) for (const f of readdirSync('supabase/migrations').filter(f => f.endsWith('_phase3_analytics_answered_help_scope.sql')).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
    return db;
  } catch (error) { await db.close(); throw error; }
}
export async function analytics(db, code = 'QA-A-U01') {
  return (await db.query('select service_get_pilot_item_analytics($1) result', [code])).rows[0].result;
}
