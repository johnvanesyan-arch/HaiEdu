import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as validation from '../../supabase/functions/_shared/remediation-authoring-validation.mjs';
import { ids } from './phase3-db-harness.mjs';

// The actual handlers and SQL run locally. Auth/live-session inputs are doubles;
// these tests do not constitute live Supabase Auth or MFA acceptance.
export async function endpoint(db, name = 'manage-remediation-guides') {
  let handler, active = true;
  const logs = [];
  const token = (actor = ids.actor, aal = 'aal1') => 'fixture.' + Buffer.from(JSON.stringify({ sub: actor, aal })).toString('base64url') + '.fixture';
  const query = table => {
    const where = [], params = [], orders = [];
    let cols = '*', limit = null, offset = 0, single = false, mutation = null;
    const bind = value => { params.push(value); return '$' + params.length; };
    const q = {
      select(c) { cols = c; return q; },
      eq(k, v) { where.push(`${k}=${bind(v)}`); return q; },
      neq(k, v) { where.push(`${k}<>${bind(v)}`); return q; },
      is(k, v) { if (v !== null) throw Error('fixture supports null only'); where.push(`${k} is null`); return q; },
      in(k, vs) { where.push(`${k}=any(${bind(vs)})`); return q; },
      order(k, o = {}) { orders.push(`${k} ${o.ascending === false ? 'desc' : 'asc'}${o.nullsFirst ? ' nulls first' : ''}`); return q; },
      limit(n) { limit = n; return q; },
      range(a, b) { offset = a; limit = b - a + 1; return q; },
      maybeSingle() { single = true; return q; },
      single() { single = true; return q; },
      insert(data) { mutation = data; return q; },
      then(resolve, reject) {
        return (async () => {
          try {
            let sql;
            if (mutation) {
              const rows = Array.isArray(mutation) ? mutation : [mutation];
              const keys = Object.keys(rows[0]);
              const values = rows.map(row => '(' + keys.map(k => bind(row[k] && typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k])).join(',') + ')');
              sql = `insert into ${table} (${keys.join(',')}) values ${values.join(',')} returning ${cols}`;
            } else {
              let selected = cols;
              if (table === 'item_misconception_mappings') selected = selected.replace('misconceptions(code, title_hy)', `(select jsonb_build_object('code',m.code,'title_hy',m.title_hy) from misconceptions m where m.id=item_misconception_mappings.misconception_id) as misconceptions`);
              if (table === 'item_templates') selected = selected.replace('item_families(code, skill_id)', `(select jsonb_build_object('code',f.code,'skill_id',f.skill_id) from item_families f where f.id=item_templates.item_family_id) as item_families`);
              if (table === 'assessment_pool_items') selected = selected.replace('assessment_pools(code, purpose, is_protected, status)', `(select jsonb_build_object('code',p.code,'purpose',p.purpose,'is_protected',p.is_protected,'status',p.status) from assessment_pools p where p.id=assessment_pool_items.pool_id) as assessment_pools`);
              sql = `select ${selected} from ${table}${where.length ? ' where ' + where.join(' and ') : ''}${orders.length ? ' order by ' + orders.join(',') : ''}${limit !== null ? ' limit ' + limit : ''}${offset ? ' offset ' + offset : ''}`;
            }
            const result = await db.query(sql, params);
            return { data: single ? (result.rows[0] ?? null) : result.rows, error: null };
          } catch (error) { return { data: null, error: { message: error.message } }; }
        })().then(resolve, reject);
      },
    };
    return q;
  };
  const admin = {
    auth: { getUser: async jwt => {
      try { return { data: { user: { id: JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url')).sub } }, error: null }; }
      catch { return { data: { user: null }, error: { message: 'invalid' } }; }
    } },
    from: query,
    async rpc(rpcName, args) {
      try {
        const values = Object.values(args).map(v => v && typeof v === 'object' ? JSON.stringify(v) : v);
        const result = await db.query(`select ${rpcName}(${values.map((_, i) => '$' + (i + 1)).join(',')}) result`, values);
        return { data: result.rows[0].result, error: null };
      } catch (error) { return { data: null, error: { message: error.message } }; }
    },
  };
  let source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8').replace(/^import[\s\S]*?;\n/gm, '');
  source = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });
  vm.runInNewContext(source, {
    ...validation, createClient: () => admin, hasActiveLiveSession: async () => active,
    Deno: { env: { get: n => n === 'SUPABASE_URL' ? 'http://isolated.invalid' : 'fixture-only' }, serve: fn => { handler = fn; } },
    Response, Request, atob, URL, console: { error: (...args) => logs.push(args) },
  });
  return {
    token, logs, revoke() { active = false; },
    async call(body, { actor = ids.actor, aal = 'aal1', anonymous = false } = {}) {
      const response = await handler(new Request(`http://isolated.invalid/functions/v1/${name}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(anonymous ? {} : { Authorization: 'Bearer ' + token(actor, aal) }) }, body: JSON.stringify(body),
      }));
      return { status: response.status, body: await response.json() };
    },
  };
}
