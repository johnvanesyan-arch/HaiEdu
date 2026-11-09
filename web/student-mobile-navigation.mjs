// Presentation only: preserve every destination and its authorized URL.
const installed = new WeakMap();

export function installStudentMobileNavigation(nav) {
  if (installed.has(nav)) return installed.get(nav);
  let frame = 0;
  const set = (node, name, value) => {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  };
  const columnsFor = (count, width, minimum, gap) =>
    [...new Set([count, Math.ceil(count / 2), 1])].find(n => (width - gap * (n - 1)) / n >= minimum) ?? 1;

  function layout() {
    frame = 0;
    if (!nav.isConnected) return;
    const body = document.body;
    const reserve = height => {
      const value = `${height}px`;
      if (body.style.getPropertyValue('--amp-mobile-nav-space') !== value) body.style.setProperty('--amp-mobile-nav-space', value);
    };
    if (!nav.getClientRects().length || getComputedStyle(nav).display === 'none') { reserve(0); return; }
    const links = [...nav.querySelectorAll('.amp-mobile-link')];
    if (!links.length) { reserve(0); return; }
    // Measure words in the stacked layout, as BF-10 does; the inline layout is decided below.
    set(nav, 'data-inline', 'false');
    const style = getComputedStyle(nav), gap = parseFloat(style.columnGap) || 0;
    const width = nav.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    let minimum = 44;
    const words = [];
    for (const link of links) {
      const label = link.lastElementChild;
      if (!label) continue;
      let wordWidth = 0;
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const word of node.textContent.matchAll(/\S+/gu)) {
          const range = document.createRange();
          range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
          wordWidth = Math.max(wordWidth, range.getBoundingClientRect().width);
        }
      }
      const s = getComputedStyle(link), padding = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
      minimum = Math.max(minimum, wordWidth + padding + 2);
      words.push({ link, wordWidth });
    }
    const columns = columnsFor(links.length, width, minimum, gap);
    set(nav, 'data-layout', 'fixed');
    nav.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    // 16.5B review, Phase 3 (S1): when the menu needs more than one row, each link puts its
    // icon beside the label, if every longest word still fits whole in its column.
    set(nav, 'data-inline', 'false');
    if (columns < links.length) {
      set(nav, 'data-inline', 'true');
      const inlineNeeded = Math.max(44, ...links.map(link => {
        const label = link.lastElementChild, icon = link.firstElementChild;
        if (!label) return 44;
        let wordWidth = 0;
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) for (const word of node.textContent.matchAll(/\S+/gu)) {
          const range = document.createRange();
          range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
          wordWidth = Math.max(wordWidth, range.getBoundingClientRect().width);
        }
        const st = getComputedStyle(link);
        return wordWidth + parseFloat(st.paddingLeft) + parseFloat(st.paddingRight) +
          (icon && icon !== label ? icon.getBoundingClientRect().width + (parseFloat(st.columnGap) || 0) : 0) + 2;
      }));
      if ((width - gap * (columns - 1)) / columns < inlineNeeded) set(nav, 'data-inline', 'false');
    }
    const height = Math.ceil(nav.getBoundingClientRect().height);
    const viewportHeight = window.visualViewport?.height ?? innerHeight;
    if (height > viewportHeight * .2) {
      // Large text/short screens get the complete menu before the content,
      // in normal document flow rather than a panel covering the workspace.
      set(nav, 'data-layout', 'flow');
      set(nav, 'data-inline', 'false');
      set(nav, 'data-text-only', 'false');
      const inlineMinimum = Math.max(44, ...words.map(({link,wordWidth}) => {
        const s = getComputedStyle(link);
        return wordWidth + parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) +
          parseFloat(s.gridTemplateColumns) + (parseFloat(s.columnGap) || 0) + 2;
      }));
      const textOnly = inlineMinimum > width;
      set(nav, 'data-text-only', String(textOnly));
      const needed = textOnly ? Math.max(44, ...words.map(({link,wordWidth}) => {
        const s = getComputedStyle(link);
        return wordWidth + parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) + 2;
      })) : inlineMinimum;
      nav.style.gridTemplateColumns = `repeat(${columnsFor(links.length, width, needed, gap)}, minmax(0, 1fr))`;
      reserve(0);
    } else reserve(height);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(layout); }
  const resize = new ResizeObserver(schedule);
  resize.observe(nav);
  const content = new MutationObserver(schedule);
  content.observe(nav, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  const controller = { refresh: schedule };
  installed.set(nav, controller);
  schedule();
  return controller;
}
