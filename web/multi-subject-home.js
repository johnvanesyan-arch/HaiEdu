import { groupLearningContexts, courseLabel, contextHref, escapeHtml as esc } from './learning-navigation.mjs';
function render(detail = {}) {
  const panel = document.getElementById('modePanel');
  if (!panel) return;
  document.getElementById('dashboardContent')?.classList.add('hidden');
  document.getElementById('dashboardLoading')?.classList.add('hidden');
  let root = document.getElementById('multiSubjectHome');
  if (!root) { root = document.createElement('div'); root.id = 'multiSubjectHome'; root.className = 'amp-multisubject-home'; panel.appendChild(root); }
  document.body.classList.add('amp-multisubject-ready');
  const courses = groupLearningContexts(detail.contexts);
  root.innerHTML = `<section id="mySubjects" aria-labelledby="mySubjectsTitle"><div class="amp-subjects-heading"><div><span class="mode-kicker">ԻՄ ԱՌԱՐԿԱՆԵՐԸ</span><h2 id="mySubjectsTitle">Դասընթացներ</h2></div><a class="ghost button-link" href="./join.html">Միանալ դասարանին</a></div>${courses.length ? `<div class="amp-subject-grid">${courses.map(course => `<article class="card amp-subject-card"><h3>${esc(courseLabel(course))}</h3><p>${esc(course.className)} · ${esc(course.schoolName)}</p><p class="subtle">${esc(course.academicYearLabel)} · Թողարկում ${esc(course.releaseNumber)}</p><div class="amp-subject-class-list">${course.units.map(unit => `<a class="button-link ghost" href="${esc(contextHref(unit))}">${esc(unit.unitTitleHy)}</a>`).join('')}</div></article>`).join('')}</div>` : '<p class="card">Հասանելի դասընթացներ դեռ չկան։ Միացեք ձեր ուսուցչի դասարանին։</p>'}</section>`;
}
window.addEventListener('haiedu-course-access', event => render(event.detail));
window.addEventListener('haiedu-navigation-ready', event => render(event.detail));
render(window.HaiEduCourseAccess);
