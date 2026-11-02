import { groupLearningContexts, readLearningSelection, resolveNavigationContext, sameContext, sameCourse, contextHref, studentHomeHref, escapeHtml as esc } from './learning-navigation.mjs';
import { resourceHref } from './resource-navigation.mjs';
import { studentIcon } from './student-visuals.mjs';
const page = document.body.dataset.studentPage;
function renderChapterNavigation(detail, courses, selected) {
  // Compatibility pages describe one unit. Their chapter list must still come
  // from the same authorized release contexts as Home and the course workspace.
  if (!document.body.dataset.learningExtension) return;
  const header = document.querySelector('main.shell > .topbar');
  if (!header) return;
  let root = document.querySelector('[data-student-chapter-navigation]');
  if (!root) {
    root = document.createElement('section');
    root.className = 'card student-chapter-navigation';
    root.dataset.studentChapterNavigation = 'true';
    header.insertAdjacentElement('afterend', root);
  }
  const course = courses.find(course => sameCourse(course, selected));
  const units = course?.units ?? [];
  const tab = page === 'progress' ? 'progress' : page === 'assessment' ? 'assessment' : 'course';
  const markup = selected && units.length
    ? `<p>Այս էջում՝ <strong>${esc(selected.unitTitleHy)}</strong></p><details class="student-unit-links"${page === 'physics' && document.body.dataset.focusedTask !== 'true' ? ' open' : ''}><summary>Դասընթացի բաժինները · ${units.length}</summary><nav class="amp-subject-class-list" aria-label="Դասընթացի գլուխներ">${units.map(unit => `<a href="${esc(contextHref(unit, tab))}"${sameContext(unit, selected) ? ' aria-current="page"' : ''}>${esc(unit.unitTitleHy)}</a>`).join('')}</nav></details>`
    : `<p role="status">${detail.accessStatus === 'unavailable' ? 'Չհաջողվեց ստուգել բաժինների հասանելիությունը։' : detail.accessStatus === 'signed_out' ? 'Բաժինները տեսնելու համար մուտք գործեք ձեր հաշիվ։' : 'Ստուգում ենք բաժինների հասանելիությունը։'}</p>`;
  // Same-account refreshes must retain keyboard focus and disclosure state.
  if (root.dataset.navigationMarkup === markup) return;
  root.dataset.navigationMarkup = markup;
  root.innerHTML = markup;
}
function render(detail = {}) {
  const contexts = detail.contexts ?? [];
  const courses = groupLearningContexts(contexts);
  let selection;
  try { selection = readLearningSelection(location.search); } catch { selection = {}; }
  const selected = resolveNavigationContext(contexts, selection, document.body.dataset.learningExtension);
  renderChapterNavigation(detail, courses, selected);
  const params = new URLSearchParams(location.search);
  const requestedView = params.get('view');
  const view = page === 'materials' ? 'materials'
    : page === 'home' ? (['courses', 'work'].includes(requestedView) ? requestedView : 'home')
    : page === 'course' && params.get('tab') === 'writing' ? 'work' : 'courses';
  const main = [['home','Գլխավոր','home'], ['courses','Դասընթացներ','courses'], ['work','Իմ աշխատանքները','work'], ['materials','Նյութերի գրադարան','courses']];
  const link = ([key,label,icon], mobile = false) => `<a class="${mobile ? 'amp-mobile-link' : 'amp-nav-link'}" href="${esc(key === 'materials' ? resourceHref(selected) : studentHomeHref(key, selected))}"${key === 'materials' ? ' aria-label="Նյութերի գրադարան"' : ''}${key === view ? ' aria-current="page"' : ''}>${studentIcon(icon)}<span>${mobile && key === 'materials' ? 'Գրադարան' : label}</span></a>`;
  const items = main.map(item => link(item));
  const nav = document.querySelector('.amp-nav-list');
  if (nav) nav.innerHTML = items.join('');
  const mobile = document.querySelector('.amp-mobile-nav');
  if (mobile) mobile.innerHTML = main.map(item => link(item, true)).join('');
  window.HaiEduCourses = courses;
  window.dispatchEvent(new CustomEvent('haiedu-courses-rendered', { detail: { courses, contexts, selected } }));
}
window.addEventListener('haiedu-course-access', event => render(event.detail));
window.addEventListener('haiedu-home-selection', () => render(window.HaiEduCourseAccess));
window.addEventListener('pageshow', () => render(window.HaiEduCourseAccess));
window.addEventListener('popstate', () => render(window.HaiEduCourseAccess));
render(window.HaiEduCourseAccess);
if (page === 'home') import('./multi-subject-home.js');
