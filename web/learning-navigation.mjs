const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const keys = { enrollment: 'enrollmentId', release: 'curriculumReleaseId', unit: 'unitId' };
export function readLearningSelection(search) {
  const params = new URLSearchParams(search);
  if (!Object.keys(keys).some(key => params.has(key))) return null;
  const result = {};
  for (const [key, field] of Object.entries(keys)) {
    if (params.getAll(key).length !== 1 || !uuid(params.get(key))) throw new Error('invalid_context_selection');
    result[field] = params.get(key);
  }
  return result;
}
export const contextKey = c => [c.enrollmentId, c.curriculumReleaseId, c.unitId].join(':');
export const sameContext = (a, b) => Boolean(a && b && contextKey(a) === contextKey(b));
export const courseKey = c => [c.enrollmentId, c.subjectProgramId].join(':');
export const sameCourse = (a, b) => Boolean(a && b && courseKey(a) === courseKey(b));
export function contextHref(context, tab = 'course', extra = {}) {
  if (!Object.values(keys).every(key => uuid(context?.[key]))) throw new Error('invalid_context_selection');
  const params = new URLSearchParams(Object.fromEntries(Object.entries(keys).map(([key, field]) => [key, context[field]])));
  params.set('tab', tab);
  for (const [key, value] of Object.entries(extra)) if (value != null && !Object.hasOwn(keys, key)) params.set(key, String(value));
  return './course.html?' + params;
}
export function groupLearningContexts(contexts = []) {
  const groups = new Map();
  for (const c of contexts) {
    if (!Object.values(keys).every(key => uuid(c?.[key])) || !uuid(c.subjectProgramId)) continue;
    const key = courseKey(c);
    if (!groups.has(key)) groups.set(key, { ...c, key, units: [] });
    const group = groups.get(key);
    if (!group.units.some(unit => sameContext(unit,c))) group.units.push(c);
  }
  for (const group of groups.values()) group.units.sort((a, b) => a.unitSequence - b.unitSequence || a.unitId.localeCompare(b.unitId));
  return [...groups.values()].sort((a,b) => String(a.schoolName).localeCompare(String(b.schoolName),'hy') || a.gradeNumber-b.gradeNumber || String(a.subjectNameHy).localeCompare(String(b.subjectNameHy),'hy') || a.key.localeCompare(b.key));
}
export const courseLabel = c => [c.subjectNameHy, c.gradeLabelHy].filter(Boolean).join(' · ');
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
export function resolveNavigationContext(contexts, selection, extensionKey) {
  if (selection) return contexts.find(c => sameContext(c, selection)) ?? null;
  const matches = extensionKey ? contexts.filter(c => c.extensionKey === extensionKey) : [];
  return matches.length === 1 ? matches[0] : null;
}
