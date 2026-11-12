// Server-only admission. Off until a separately approved rollout. Call after
// verifying the bearer identity. Request fields never choose actor or policy.
export const RATE_BUDGET_ROUTES = Object.freeze([
  "accept-staff-account",
  "bootstrap-school",
  "complete-student-invitation",
  "get-admin-dashboard",
  "get-chapter-mastery-lifecycle",
  "get-content-quality-dashboard",
  "get-content-review-history",
  "get-learning-audio",
  "get-learning-context",
  "get-learning-task-set",
  "get-mastery-check-status",
  "get-my-privacy",
  "get-pilot-item-analytics",
  "get-practice-item",
  "get-remediation-help",
  "get-school-admin-overview",
  "get-school-performance-analytics",
  "get-school-subject-options",
  "get-school-teachers",
  "get-session-item",
  "get-student-classes",
  "get-student-dashboard",
  "get-student-onboarding-options",
  "get-student-work",
  "get-teacher-academic-context",
  "get-teacher-dashboard",
  "get-teacher-student",
  "get-teacher-workspace",
  "get-unit-guides",
  "join-class",
  "manage-admin-account",
  "manage-content-quality",
  "manage-institutional-invitation",
  "manage-institutional-membership",
  "manage-institutional-teacher-class",
  "manage-misconception-reviews",
  "manage-my-privacy",
  "manage-remediation-guides",
  "manage-resource-assignments",
  "manage-school-academic-year",
  "manage-school-teacher",
  "manage-staff-invitation",
  "manage-student-invitation",
  "manage-supplementary-resources",
  "manage-teacher-class",
  "manage-teacher-feedback",
  "manage-teacher-profile",
  "manage-teacher-subject",
  "manage-teacher-task-delivery",
  "manage-teacher-task-drafts",
  "manage-teacher-task-review",
  "manage-teacher-task-review-files",
  "manage-teacher-task-sources",
  "manage-teacher-task-student-files",
  "manage-teacher-task-student-work",
  "manage-unit-materials",
  "manage-writing-assignments",
  "manage-written-work",
  "provision-staff-account",
  "provision-student-account",
  "record-recommendation-event",
  "redeem-institutional-invitation",
  "start-learning-session",
  "submit-answer",
  "submit-mastery-answer"
]);
const routeSet = new Set(RATE_BUDGET_ROUTES);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
const codeRoutes = new Set(['join-class', 'redeem-institutional-invitation', 'complete-student-invitation']);
const mailRoutes = new Set(['provision-student-account', 'provision-staff-account', 'manage-staff-invitation']);
const parsedBodies = new WeakMap();
const MAX_MAIL_BODY = 65536;
const cors = {'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type', 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Access-Control-Expose-Headers':'Retry-After', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Type':'application/json'};
const reply = (error, status, wait) => new Response(JSON.stringify({error, ...(wait ? {retryAfterSeconds:wait} : {})}), {status, headers:{...cors, ...(wait ? {'Retry-After':String(wait)} : {})}});
export class RateBudgetFailure extends Error {
  constructor(response) { super('rate_budget_response'); this.response = response; }
}
export const rateBudgetErrorResponse = error => error instanceof RateBudgetFailure ? error.response : null;

// The handler reads exactly the body examined for mail cost. No stream tee,
// second read, recipient-count field, or automatic retry.
export async function readRateBudgetJson(request) {
  const entry = parsedBodies.get(request);
  if (!entry) return request.json();
  if (entry.error) throw entry.error;
  return entry.value;
}
async function boundedMailJson(request) {
  try {
    if (Number(request.headers?.get('content-length')) > MAX_MAIL_BODY) return {tooLarge:true};
    const reader = request.body?.getReader();
    let text;
    if (reader) {
      const chunks = []; let size = 0;
      try {
        for (;;) {
          const {value, done} = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > MAX_MAIL_BODY) { await reader.cancel(); return {tooLarge:true}; }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size); let at = 0;
      for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
      text = new TextDecoder().decode(bytes);
    } else if (typeof request.text === 'function') {
      text = await request.text();
      if (new TextEncoder().encode(text).byteLength > MAX_MAIL_BODY) return {tooLarge:true};
    } else {
      const value = await request.json();
      if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_MAIL_BODY) return {tooLarge:true};
      const entry = {value}; parsedBodies.set(request, entry); return entry;
    }
    const entry = {value:JSON.parse(text)}; parsedBodies.set(request, entry); return entry;
  } catch (error) { const entry = {error}; parsedBodies.set(request, entry); return entry; }
}
const email = value => typeof value === 'string' && value.length >= 3 && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function mailCost(route, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 0;
  if (route === 'manage-staff-invitation') return body.action === 'resend' && uuid(body.invitationId) ? 1 : 0;
  if (route === 'provision-staff-account') return email(typeof body.email === 'string' ? body.email.trim().toLowerCase() : null) ? 1 : 0;
  const bulk = Array.isArray(body.emails);
  if (bulk && body.email !== undefined) return 0;
  const raw = bulk ? body.emails : [body.email];
  if (raw.length < 1 || raw.length > 20 || raw.some(value => typeof value !== 'string')) return 0;
  const normalized = [...new Set(raw.map(value => value.trim().toLowerCase()))];
  return normalized.every(email) ? normalized.length : 0;
}
function sessionClaim(token) {
  if (typeof token !== 'string') return null;
  try {
    const parts = token.split('.'); if (parts.length !== 3) return null;
    const value = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(value.padEnd(Math.ceil(value.length / 4) * 4, '=')));
    return uuid(claims.session_id) ? claims.session_id : null;
  } catch { return null; }
}
export function createRateBudgetGate(getMode, {timeoutMs = 4000} = {}) {
  return async function enforce(request, admin, actor, verifiedToken, route) {
    let mode;
    try { mode = getMode(); } catch { return reply('rate_budget_unavailable', 503); }
    if (mode === undefined || mode === null || mode === '' || mode === 'off') return null;
    if (mode !== 'enforce-v1' || !routeSet.has(route)) return reply('rate_budget_unavailable', 503);
    const session = sessionClaim(verifiedToken);
    if (!uuid(actor) || !session) return reply('rate_budget_session_inactive', 403);
    const costs = {app:1};
    if (route === 'start-learning-session') costs.session_start = 1;
    if (codeRoutes.has(route)) costs.code_redemption = 1;
    if (mailRoutes.has(route)) {
      const entry = await boundedMailJson(request);
      if (entry.tooLarge) return reply('request_too_large', 413);
      const cost = mailCost(route, entry.value); if (cost) costs.invitation_email = cost;
    }
    const controller = new AbortController(); let timer;
    try {
      const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error('rate_budget_timeout')); }, timeoutMs); });
      let operation = admin.rpc('service_reserve_session_rate_budgets', {p_actor:actor, p_session:session, p_costs:costs});
      if (typeof operation?.abortSignal === 'function') operation = operation.abortSignal(controller.signal);
      const result = await Promise.race([operation, deadline]);
      if (result?.error) {
        if (result.error.code === '42501' && result.error.message === 'rate_budget_session_inactive') return reply('rate_budget_session_inactive', 403);
        return reply('rate_budget_unavailable', 503);
      }
      const data = result?.data, wait = data?.retryAfterSeconds;
      if (typeof data?.allowed !== 'boolean' || !Number.isSafeInteger(wait) || wait < 0 || wait > 259200 || data.allowed && wait !== 0 || !data.allowed && wait < 1) return reply('rate_budget_unavailable', 503);
      return data.allowed ? null : reply('rate_limit_exceeded', 429, wait);
    } catch { return reply('rate_budget_unavailable', 503); }
    finally { clearTimeout(timer); }
  };
}
export const enforceRateBudget = createRateBudgetGate(() => globalThis.Deno?.env?.get('HAIEDU_RATE_BUDGETS_MODE'));
