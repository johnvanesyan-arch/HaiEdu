// Presentation only. Delegation covers links replaced by role/context rendering;
// no authentication, request, route or application state belongs here.
const navigationFocusRoots = new WeakSet();
export function installNavigationFocus(root = document) {
  if (navigationFocusRoots.has(root)) return;
  navigationFocusRoots.add(root);
  root.addEventListener('focusin', event => {
    const link = event.target.closest?.('.hm-role-nav a,.amp-nav-list a,.amp-mobile-nav a,.course-tabs a');
    if (!link || !link.matches(':focus-visible')) return;
    link.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  });
}
