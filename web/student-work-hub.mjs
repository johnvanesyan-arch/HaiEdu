// My work: one status filter and one refresh across the student's assigned-work
// sources (teacher tasks, writing assignments, material assignments).
// Presentation only. Each source keeps its own requests, authorization, paging,
// history and editing; this module never fetches, scores or writes.

const buckets = {
  task: { not_started: 'todo', draft: 'todo', returned: 'returned', reviewed: 'returned', submitted: 'submitted' },
  writing: { not_started: 'todo', draft: 'todo', changes_requested: 'returned', reviewed: 'returned', submitted: 'submitted' },
};
export const workFilters = [['todo', 'Կատարելու'], ['returned', 'Վերադարձված'], ['submitted', 'Ներկայացված']];

// Material assignments record no completion (opening a PDF is not completed work),
// so they stay in "to do". Unknown states get no bucket and are never hidden.
// A link may open My work on one tab (Home's teacher-feedback card opens «Returned»).
export function initialWorkFilter(search = globalThis.location?.search ?? '') {
  const shown = new URLSearchParams(search).get('show');
  return workFilters.some(([key]) => key === shown) ? shown : 'todo';
}
export function workBucket(source, state) {
  if (source === 'material') return 'todo';
  if (state == null) return buckets[source] ? 'todo' : null;
  return buckets[source]?.[state] ?? null;
}
export function workStateAttribute(source, state) {
  const bucket = workBucket(source, state);
  return bucket ? ` data-work-state="${bucket}"` : '';
}

// The count reads « · n» as text; the separator is its own span so phones can put the
// number under the label (16.5B review, Phase 2d).
export function writeWorkCount(node, text) {
  node.textContent = '';
  if (!text) return;
  const separator = document.createElement('span');
  separator.className = 'student-work-sep'; separator.textContent = ' · ';
  node.append(separator, text);
}
export function workToolbarMarkup() {
  return `<section class="student-work-toolbar" aria-label="Աշխատանքների ցուցակի կառավարում"><div class="student-work-filter" role="group" aria-label="Ցույց տալ ըստ վիճակի">${workFilters.map(([key, label], index) => `<button type="button" data-work-filter="${key}" aria-pressed="${index === 0}"><span>${label}</span><span class="student-work-count" data-work-count="${key}"></span></button>`).join('')}</div><button type="button" class="ghost student-work-refresh" data-work-refresh>Թարմացնել</button></section>`;
}

// sources: number of sources that report; refresh(): asks every source to reload.
export function mountWorkHub({ toolbar, scope, sources, refresh }) {
  let filter = initialWorkFilter();
  const reports = new Map();
  function apply() {
    scope.dataset.workShowing = filter;
    for (const card of scope.querySelectorAll('[data-work-state]')) card.toggleAttribute('data-work-hidden', card.dataset.workState !== filter);
    for (const list of scope.querySelectorAll('[data-work-list]')) {
      list.querySelector(':scope > .student-work-none')?.remove();
      const cards = [...list.querySelectorAll('[data-work-state]')];
      if (cards.length && cards.every(card => card.hasAttribute('data-work-hidden'))) list.insertAdjacentHTML('beforeend', '<p class="student-work-none">Այս վիճակով աշխատանք այստեղ չկա։</p>');
    }
    // Counts only when every source shows its full current list (not history, an open
    // item or an error); "+" marks pages that are not loaded yet.
    const known = reports.size === sources && [...reports.values()].every(r => !r.partial);
    const more = [...reports.values()].some(r => r.hasMore);
    for (const [key] of workFilters) {
      const count = toolbar.querySelector(`[data-work-count="${key}"]`);
      writeWorkCount(count, known ? `${scope.querySelectorAll(`[data-work-state="${key}"]`).length}${more ? '+' : ''}` : '');
    }
    for (const button of toolbar.querySelectorAll('[data-work-filter]')) button.setAttribute('aria-pressed', String(button.dataset.workFilter === filter));
  }
  const click = event => {
    const choice = event.target.closest('[data-work-filter]');
    if (choice) { filter = choice.dataset.workFilter; apply(); return; }
    if (event.target.closest('[data-work-refresh]')) refresh();
  };
  toolbar.addEventListener('click', click);
  apply();
  return {
    report(source, { hasMore = false, partial = false } = {}) { reports.set(source, { hasMore, partial }); apply(); },
    dispose() { toolbar.removeEventListener('click', click); reports.clear(); },
  };
}
