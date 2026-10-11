import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Real Edge handler; isolated PostgREST/auth doubles. No production credentials.
export function dashboardFixture({ count = 382, failedTable, rejectTable, role = 'content_admin', active = true } = {}) {
  const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const items = Array.from({ length: count }, (_, n) => ({
    id: id(n), code: `QA-${String(n).padStart(5, '0')}`, skill_id: id(n + count),
    item_type: 'single_choice', version_no: 2, review_status: 'needs_review', status: 'review',
    skills: { code: `SKILL-${n}`, subject_id: n % 2 ? 'subject-a' : 'subject-b' },
  }));
  const rows = {
    profiles: [{ id: 'fixture-reviewer', role }], items,
    item_qa_runs: items.map((item, n) => ({ id: id(n), item_id: item.id, version_no: 2, passed: true, created_at: '2026-10-11T19:16:42Z' })),
    item_reviews: [], item_versions: [], item_misconception_mappings: [],
  };
  const requests = [];
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: 'fixture-reviewer' } } }) },
    from(table) {
      const filters = [], orders = [];
      let from = 0, to = 999, single = false, inCount = 0;
      const q = {
        select() { return q; },
        eq(key, value) { filters.push(row => row[key] === value); return q; },
        in(key, values) { inCount = values.length; filters.push(row => values.includes(row[key])); return q; },
        order(key, opts = {}) { orders.push([key, opts.ascending !== false]); return q; },
        range(a, b) { from = a; to = Math.min(b, a + 999); return q; },
        maybeSingle() { single = true; return q; },
        then(resolve, reject) {
          requests.push({ table, inCount, from, to });
          if (table === rejectTable) return Promise.reject(new Error('fixture network failure')).then(resolve, reject);
          // Model an upstream failure on an oversized, whole-bank UUID filter.
          if (table === failedTable || inCount > 350) return Promise.resolve({ data: null, error: { message: 'fixture upstream read failed' } }).then(resolve, reject);
          const data = (rows[table] ?? []).filter(row => filters.every(filter => filter(row))).sort((a, b) => {
            for (const [key, asc] of orders) {
              const order = String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
              if (order) return asc ? order : -order;
            }
            return 0;
          }).slice(from, to + 1);
          return Promise.resolve({ data: single ? data[0] ?? null : data, error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  let handler;
  const source = readFileSync('supabase/functions/get-content-quality-dashboard/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), {
    createClient: () => admin, hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'fixture-only' }, serve: fn => { handler = fn; } },
    Request, Response, console: { error() {} },
  });
  return { rows, requests, async call({ anonymous = false } = {}) {
    const response = await handler(new Request('https://fixture.invalid', {
      method: 'POST', headers: anonymous ? {} : { Authorization: 'Bearer fixture-only' },
    }));
    return { status: response.status, body: await response.json() };
  } };
}
