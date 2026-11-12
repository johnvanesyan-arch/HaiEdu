// Synthetic provider for isolated page/controller tests. No external script or
// production challenge is loaded. Provider loading/failure has dedicated tests.
export function installSyntheticTurnstile() {
  const widgets = new Map();
  let sequence = 0;
  window.__syntheticTurnstile = { renders: [], removed: [] };
  window.turnstile = {
    render(target, options) {
      const id = String(++sequence);
      const frame = document.createElement('iframe');
      frame.title = 'Synthetic security check';
      frame.width = '150'; frame.height = '140';
      target.append(frame);
      widgets.set(id, { target, options });
      window.__syntheticTurnstile.renders.push(id);
      queueMicrotask(() => { if (widgets.has(id)) options.callback('synthetic-challenge-' + id); });
      return id;
    },
    remove(id) {
      widgets.get(id)?.target.replaceChildren();
      widgets.delete(id);
      window.__syntheticTurnstile.removed.push(id);
    },
  };
}
