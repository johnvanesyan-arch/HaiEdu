// Presentation only: callers supply the already-authorized collection and actions.
export function renderArchive(container, {items, groupLabel, searchText, renderItem, pageSize = 12}) {
  const label = document.createElement('label');
  label.className = 'archive-search';
  label.append('Որոնել արխիվում');
  const input = document.createElement('input');
  input.type = 'search'; input.placeholder = 'Դասարան, առարկա, դպրոց կամ տարի';
  label.append(input);
  const status = document.createElement('p'); status.className = 'subtle'; status.setAttribute('role','status');
  const groups = document.createElement('div'); groups.className = 'archive-groups';
  container.replaceChildren(label, status, groups);
  function draw() {
    const query = input.value.trim().toLocaleLowerCase();
    const matching = items.filter(item => searchText(item).toLocaleLowerCase().includes(query));
    status.textContent = `${matching.length} / ${items.length} դասարան`;
    groups.replaceChildren();
    if (!matching.length) { groups.textContent = 'Համապատասխան դասարան չկա։ Փոխեք որոնումը։'; return; }
    const buckets = new Map();
    for (const item of matching) {
      const name = groupLabel(item);
      if (!buckets.has(name)) buckets.set(name, []);
      buckets.get(name).push(item);
    }
    for (const [name, entries] of [...buckets].sort(([a],[b])=>b.localeCompare(a, 'hy', {numeric:true}))) {
      const details = document.createElement('details'); details.className = 'archive-group'; details.open = Boolean(query);
      const summary = document.createElement('summary'); summary.textContent = `${name} · ${entries.length} դասարան`;
      const list = document.createElement('div'); list.className = 'teacher-class-list teacher-class-grid';
      const more = document.createElement('button'); more.type = 'button'; more.className = 'ghost archive-more';
      let count = 0;
      function appendPage() {
        const end = Math.min(entries.length, count + pageSize);
        for (; count < end; count++) list.append(renderItem(entries[count]));
        more.hidden = count === entries.length;
        more.textContent = `Ցուցադրել ևս ${Math.min(pageSize, entries.length - count)} · մնացել է ${entries.length - count}`;
      }
      more.addEventListener('click', () => { appendPage(); if (more.hidden) list.lastElementChild?.focus(); });
      details.addEventListener('toggle', () => { if (details.open && !count) appendPage(); });
      details.append(summary, list, more); groups.append(details);
      if (query) appendPage();
    }
  }
  input.addEventListener('input', draw);
  draw();
}
