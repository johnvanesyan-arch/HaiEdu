const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const actions = new Set(['list', 'detail', 'save_draft', 'request_changes', 'approve']);
const denied = new Set(['account_or_session_inactive','content_authoring_role_required','mfa_required']);
const conflict = new Set(['stale_misconception_review','active_definition_read_only','inactive_skill','misconception_mapping_scope_mismatch','definition_unchanged']);
const invalid = new Set(['invalid_action','review_reason_required','invalid_definition','invalid_assurance_level']);
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers }); }
function claims(token) {
  try { const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))); }
  catch { return {}; }
}
export function createMisconceptionReviewHandler({ createAdmin, hasActiveLiveSession, env }) {
  return async (req) => {
    if (req.method === 'OPTIONS') return json({});
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'unauthorized' }, 401);
    if (!env.url || !env.key) return json({ error: 'server_not_configured' }, 503);
    try {
      const admin = createAdmin(env.url, env.key);
      const { data: user, error: authError } = await admin.auth.getUser(token);
      if (authError || !user?.user?.id) return json({ error: 'unauthorized' }, 401);
      const actorId = user.user.id;
      if (!(await hasActiveLiveSession(admin, token, actorId))) return json({ error: 'account_or_session_inactive' }, 403);
      const { data: profile, error: profileError } = await admin.from('profiles').select('role, account_status').eq('id', actorId).maybeSingle();
      if (profileError) return json({ error: 'review_service_unavailable' }, 503);
      if (profile?.account_status !== 'active' || !['admin','content_admin'].includes(profile.role)) return json({ error: 'content_authoring_role_required' }, 403);
      const jwt = claims(token), aal = jwt.aal === 'aal2' ? 'aal2' : 'aal1';
      let body;
      try { const raw = await req.text(); if (raw.length > 12000) return json({ error: 'request_too_large' }, 413); body = JSON.parse(raw); }
      catch { return json({ error: 'invalid_json' }, 400); }
      if (!body || Array.isArray(body) || typeof body !== 'object') return json({ error: 'invalid_json' }, 400);
      const action = body.action ?? 'list';
      if (!actions.has(action)) return json({ error: 'invalid_action' }, 400);
      let result;
      if (action === 'list') {
        const f = body.filters ?? {}, filters = {};
        if (!f || Array.isArray(f) || typeof f !== 'object') return json({ error: 'invalid_filters' }, 400);
        for (const key of ['subjectId','gradeId','unitId','skillId']) {
          if (f[key] && !uuid.test(f[key])) return json({ error: 'invalid_filters' }, 400);
          filters[key] = f[key] || '';
        }
        if (f.status && !['draft','active','retired'].includes(f.status)) return json({ error: 'invalid_filters' }, 400);
        if (f.search != null && (typeof f.search !== 'string' || f.search.length > 200)) return json({ error: 'invalid_filters' }, 400);
        const offset = f.offset ?? 0;
        if (!Number.isInteger(offset) || offset < 0 || offset > 100000) return json({ error: 'invalid_filters' }, 400);
        Object.assign(filters, { status: f.status || '', search: (f.search || '').trim(), offset });
        result = await admin.rpc('service_list_misconception_reviews', { p_filters: filters });
      } else {
        if (!uuid.test(body.id || '')) return json({ error: 'invalid_id' }, 400);
        if (action === 'detail') result = await admin.rpc('service_get_misconception_review', { p_id: body.id });
        else {
          if (action === 'approve' && aal !== 'aal2') return json({ error: 'mfa_required' }, 403);
          if (!uuid.test(jwt.session_id || '')) return json({ error: 'account_or_session_inactive' }, 403);
          if (!/^[0-9a-f]{32}$/.test(body.expectedToken || '')) return json({ error: 'expected_review_token_required' }, 400);
          result = await admin.rpc('service_review_misconception', {
            p_id: body.id, p_action: action, p_expected_token: body.expectedToken,
            p_title_hy: typeof body.titleHy === 'string' ? body.titleHy : null,
            p_description_hy: typeof body.descriptionHy === 'string' ? body.descriptionHy : null,
            p_reason: typeof body.reason === 'string' ? body.reason : '',
            p_actor_id: actorId, p_session_id: jwt.session_id, p_actor_aal: aal,
          });
        }
      }
      if (result.error) {
        const error = result.error.message;
        const status = denied.has(error) ? 403 : conflict.has(error) ? 409 : invalid.has(error) ? 400 : error === 'misconception_not_found' ? 404 : 503;
        return json({ error: status === 503 ? 'review_service_unavailable' : error }, status);
      }
      return json({ ...result.data, actor: { role: profile.role, aal } });
    } catch { return json({ error: 'review_service_unavailable' }, 503); }
  };
}
