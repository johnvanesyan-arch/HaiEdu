// Read-only native DOM check shared by isolated and designated-fixture QA.
export async function mobileNavigationLayout() {
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const nav = document.querySelector('.amp-mobile-nav'), main = document.querySelector('main.shell');
  const errors = [];
  if (!nav?.getClientRects().length || !main) return { errors: ['student menu unavailable'] };
  const box = nav.getBoundingClientRect(), position = getComputedStyle(nav).position;
  if (nav.scrollWidth > nav.clientWidth + 1) errors.push('horizontal menu scroll');
  const links = [...nav.querySelectorAll('a')];
  if (links.length !== 4) errors.push('missing destination');
  for (const link of links) {
    const r = link.getBoundingClientRect();
    if (r.left < box.left - 1 || r.right > box.right + 1) errors.push('destination outside menu');
    if (r.width < 44 || r.height < 44) errors.push('small touch target');
    const walker = document.createTreeWalker(link.lastElementChild, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) for (const word of node.textContent.matchAll(/\S+/gu)) {
      const range = document.createRange();
      range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
      const rects = [...range.getClientRects()].filter(x => x.width > 0);
      if (rects.some(x => x.left < r.left - 1 || x.right > r.right + 1 || Math.abs(x.top - rects[0].top) > 1)) errors.push('clipped or split word');
    }
  }
  const reserved = parseFloat(document.body.style.getPropertyValue('--amp-mobile-nav-space'));
  if (position === 'fixed') {
    if (box.height > (window.visualViewport?.height ?? innerHeight) * .2 + 1) errors.push('fixed menu covers too much workspace');
    if (reserved < box.height || parseFloat(getComputedStyle(main).paddingBottom) < box.height) errors.push('last action can be covered');
  } else if (position !== 'relative' || reserved !== 0 || box.bottom > main.getBoundingClientRect().top + 1) errors.push('expanded menu overlaps workspace');
  return { version: 'haiedu-mobile-navigation-layout-v1', errors, position, height: box.height, reserved, destinations: links.length };
}
