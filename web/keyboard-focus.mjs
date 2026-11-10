// Focus follows an explicit action, never a page's initial async load.
const visible = node => Boolean(node?.isConnected && !node.matches(':disabled')
  && !node.closest('[hidden], [inert], .hidden') && node.getClientRects().length);

function focus(node) {
  if (!visible(node)) return false;
  if (node.tabIndex < 0 && !node.hasAttribute('tabindex')) node.tabIndex = -1;
  node.focus();
  return node.ownerDocument.activeElement === node;
}

export function captureFocusHandoff(scope, { from = scope?.ownerDocument?.activeElement } = {}) {
  const document = scope?.ownerDocument;
  const url = document?.defaultView?.location.href;
  let cancelled = !from || from === document?.body || !scope?.contains?.(from);
  const onFocus = event => { if (event.target !== from) cancelled = true; };
  const onPointer = event => { if (!from.contains(event.target)) cancelled = true; };
  const cancel = () => {
    document?.removeEventListener('focusin', onFocus, true);
    document?.removeEventListener('pointerdown', onPointer, true);
  };
  if (!cancelled) {
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('pointerdown', onPointer, true);
  }
  return {
    move(target) {
      cancel();
      if (cancelled || !scope.isConnected || target?.ownerDocument !== document || document.defaultView.location.href !== url) return false;
      const active = document.activeElement;
      if (active !== from && active !== document.body) return false;
      return focus(target);
    },
    cancel,
  };
}

export function createModalFocus({ container, dialog, initialFocus, fallbackFocus }) {
  const document = container.ownerDocument;
  let active = false, opener = null, url = null;
  const background = new Map();
  const controls = () => [...dialog.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')]
    .filter(node => node.tabIndex >= 0 && visible(node));
  const containFocus = event => {
    if (active && !dialog.contains(event.target)) focus(initialFocus) || focus(dialog);
  };
  const trapTab = event => {
    if (!active || event.key !== 'Tab') return;
    const items = controls(), first = items[0], last = items.at(-1);
    if (!first) { event.preventDefault(); focus(dialog); return; }
    const current = document.activeElement;
    if (!dialog.contains(current) || (event.shiftKey ? current === first : current === last)) {
      event.preventDefault(); focus(event.shiftKey ? last : first);
    }
  };
  return {
    open(from = document.activeElement) {
      if (!active) {
        active = true; opener = from; url = document.defaultView.location.href;
        // The drawer is nested in main. Inert siblings at each ancestor level,
        // never main itself or another ancestor containing the dialog.
        for (let branch = container; branch.parentElement; branch = branch.parentElement) {
          for (const sibling of branch.parentElement.children) {
            if (sibling === branch || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) continue;
            background.set(sibling, sibling.getAttribute('inert'));
            sibling.inert = true;
          }
          if (branch.parentElement === document.body) break;
        }
        document.addEventListener('keydown', trapTab, true);
        document.addEventListener('focusin', containFocus, true);
      }
      focus(initialFocus) || focus(dialog);
    },
    close({ restoreFocus = true } = {}) {
      if (!active) return;
      active = false;
      document.removeEventListener('keydown', trapTab, true);
      document.removeEventListener('focusin', containFocus, true);
      for (const [node, previous] of background) {
        if (previous === null) node.removeAttribute('inert');
        else node.setAttribute('inert', previous);
      }
      background.clear();
      const from = opener; opener = null;
      if (restoreFocus && document.defaultView.location.href === url) focus(from) || focus(fallbackFocus());
    },
  };
}
