// Production acceptance request guard for My work (PR419): the student page reads one
// combined, read-only list from get-student-work. Only that exact read shape passes;
// anything else stays an unexpected browser mutation.
export function studentWorkReadAllowed(actor, fn, body) {
  return fn === 'get-student-work' && String(actor).endsWith('student') && studentWorkReadBody(body);
}

// The exact read-only body (also sent by Home's teacher-feedback card).
export function studentWorkReadBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const payload = body.payload;
  if (Object.keys(body).length !== 2 || body.action !== 'inbox') return false;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const keys = Object.keys(payload);
  return keys.length === 0 || (keys.length === 1 && ['current', 'history'].includes(payload.state));
}
