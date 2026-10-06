import { groupLearningContexts, courseLabel, contextHref, sameContext, readLearningSelection, resolveNavigationContext, escapeHtml as esc } from './learning-navigation.mjs';
const page = document.body.dataset.studentPage;
function render(detail = {}) {
  const contexts = detail.contexts ?? [];
  const courses = groupLearningContexts(contexts);
  let selection;
  try { selection = readLearningSelection(location.search); } catch { selection = {}; }
  const selected = resolveNavigationContext(contexts, selection, document.body.dataset.learningExtension);
  const home = `<a class="amp-nav-link" href="./index.html"${page === 'home' ? ' aria-current="page"' : ''}><span class="amp-nav-icon">⌂</span><span>Գլխավոր</span></a>`;
  const items = [home];
  if (courses.length) items.push('<div class="amp-nav-section-label">Իմ առարկաները</div>');
  for (const course of courses) {
    const active = selected && selected.enrollmentId === course.enrollmentId && selected.curriculumReleaseId === course.curriculumReleaseId;
    const unit = active ? selected : course.units[0];
    items.push(`<a class="amp-nav-link amp-course-link" data-course-key="${esc(course.key)}" href="${esc(contextHref(unit))}"><span class="amp-nav-icon">▦</span><span>${esc(courseLabel(course))}<small>${esc(course.className)} · ${esc(course.schoolName)}</small></span></a>`);
    if (active) items.push(`<div class="amp-course-sublinks">${[['assessment','Գնահատումներ'],['course','Դասընթաց'],['progress','Առաջընթաց']].map(([tab,label]) => `<a class="amp-course-sublink" href="${esc(contextHref(unit,tab))}"${new URLSearchParams(location.search).get('tab') === tab ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</div>`);
  }
  const nav = document.querySelector('.amp-nav-list');
  if (nav) nav.innerHTML = items.join('');
  const mobile = document.querySelector('.amp-mobile-nav');
  if (mobile) mobile.innerHTML = `<a class="amp-mobile-link" href="./index.html">Գլխավոր</a><a class="amp-mobile-link" href="./index.html#mySubjects">Առարկաներ</a>${selected ? `<a class="amp-mobile-link" href="${esc(contextHref(selected))}">${esc(courseLabel(selected))}</a>` : ''}`;
  window.HaiEduCourses = courses;
  window.dispatchEvent(new CustomEvent('haiedu-courses-rendered', { detail: { courses, contexts, selected } }));
}
window.addEventListener('haiedu-course-access', event => render(event.detail));
window.addEventListener('pageshow', () => render(window.HaiEduCourseAccess));
render(window.HaiEduCourseAccess);
if (page === 'home') import('./multi-subject-home.js');
