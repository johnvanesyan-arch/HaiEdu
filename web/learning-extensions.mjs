// Explicitly registered compatibility surface; new subjects use the governed workspace.
const registry = Object.freeze({
  'legacy-physics7-u01-v1': Object.freeze({ course: './physics-7.html', assessment: './assessment.html', progress: './progress.html',
    diagnostic: './diagnostic.html', practice: './practice.html', mastery_check: './mastery.html', chapter_review: './practice.html?mode=chapter_review' }),
});
export function registeredExtensionHref(key, action, context) {
  if (!key || context?.extensionKey !== key || !registry[key]?.[action]) return null;
  const url = new URL(registry[key][action], 'https://extension.invalid');
  for (const [query, field] of [['enrollment','enrollmentId'],['release','curriculumReleaseId'],['unit','unitId']]) url.searchParams.set(query, context[field]);
  return '.' + url.pathname + url.search;
}
