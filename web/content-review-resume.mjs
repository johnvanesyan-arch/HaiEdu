// Browser-local pointers only; every display and open still requires authorized data.
const prefix = 'haiedu:review-resume:v1:';
const ttl = 30 * 24 * 60 * 60 * 1000;
const keyFor = userId => prefix + encodeURIComponent(userId);
function readRecord(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function fresh(record) {
  return record && Number.isFinite(record.openedAt) && record.openedAt <= Date.now() && Date.now() - record.openedAt <= ttl;
}
export function readReviewResume(userId) {
  if (!userId) return null;
  const record = readRecord(keyFor(userId));
  if (!fresh(record) || record.userId !== userId || typeof record.itemId !== 'string' || !record.itemId || record.itemId.length > 200) return null;
  return {
    itemId: record.itemId, openedAt: record.openedAt,
    source: ['bank','review'].includes(record.source) ? record.source : 'review',
    token: typeof record.token === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(record.token) ? record.token : null,
  };
}
export function rememberReviewItem(userId, itemId, context) {
  if (!userId || typeof itemId !== 'string' || !itemId || itemId.length > 200) return;
  try {
    const key = keyFor(userId);
    const others = Object.keys(localStorage).filter(value => value.startsWith(prefix) && value !== key);
    for (const value of others) if (!fresh(readRecord(value))) localStorage.removeItem(value);
    const retained = others.filter(value => fresh(readRecord(value))).sort((a,b) => readRecord(a).openedAt - readRecord(b).openedAt);
    // Keep at most one pointer per account and twenty accounts per browser.
    for (const value of retained.slice(0, Math.max(0, retained.length - 19))) localStorage.removeItem(value);
    const navigation = context?.userId === userId && context.ids?.includes(itemId) ? context : null;
    localStorage.setItem(key, JSON.stringify({userId, itemId, openedAt: Date.now(), source: navigation?.source ?? 'review', token: navigation?.token ?? null}));
  } catch { /* Resume history is optional; opening a question must still work. */ }
}
export function isReviewResumeKey(key, userId) {
  return Boolean(userId && (key === null || key === keyFor(userId)));
}
