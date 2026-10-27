import { groupLearningContexts, readLearningSelection, resolveNavigationContext, studentHomeHref, escapeHtml as esc } from './learning-navigation.mjs';
import { resourceHref } from './resource-navigation.mjs';
import { studentIcon } from './student-visuals.mjs';
const page = document.body.dataset.studentPage;
function render(detail = {}) {
  const contexts = detail.contexts ?? [];
  const courses = groupLearningContexts(contexts);
  let selection;
  try { selection = readLearningSelection(location.search); } catch { selection = {}; }
  const selected = resolveNavigationContext(contexts, selection, document.body.dataset.learningExtension);
  const params = new URLSearchParams(location.search);
  const requestedView = params.get('view');
  const view = page === 'materials' ? 'materials'
    : page === 'home' ? (['courses', 'work'].includes(requestedView) ? requestedView : 'home')
    : page === 'course' && params.get('tab') === 'writing' ? 'work' : 'courses';
  const main = [['home','Գլխավոր','home'], ['courses','Դասընթացներ','courses'], ['work','Իմ աշխատանքները','work'], ['materials','Հավելյալ նյութեր','courses']];
  const link = ([key,label,icon], mobile = false) => `<a class="${mobile ? 'amp-mobile-link' : 'amp-nav-link'}" href="${esc(key === 'materials' ? resourceHref(selected) : studentHomeHref(key, selected))}"${key === 'materials' ? ' aria-label="Հավելյալ նյութեր"' : ''}${key === view ? ' aria-current="page"' : ''}>${studentIcon(icon)}<span>${mobile && key === 'materials' ? 'Նյութեր' : label}</span></a>`;
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
