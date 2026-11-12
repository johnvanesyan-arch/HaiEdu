const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const loads = new WeakMap();
const unavailable = () => Object.assign(new Error("captcha_unavailable"), { code: "captcha_unavailable" });
const required = () => Object.assign(new Error("captcha_required"), { code: "captcha_required" });

function hideAuthLinkValues(win) {
  if (!win?.location?.href || !win.history?.replaceState) return;
  const clean = new URL(win.location.href);
  const keepJoinCode = clean.searchParams.get("next") === "join" &&
    /^[A-Za-z0-9]{8}$/.test((clean.searchParams.get("code") || "").trim());
  for (const key of ["student_invitation", "access_token", "refresh_token", "provider_token", "provider_refresh_token", "token_hash", "code"]) {
    if (key !== "code" || !keepJoinCode) clean.searchParams.delete(key);
  }
  clean.hash = "";
  if (clean.href !== win.location.href) win.history.replaceState(null, "", `${clean.pathname}${clean.search}`);
}

function providerFor(win, doc) {
  if (win.turnstile?.render && win.turnstile?.remove) return Promise.resolve(win.turnstile);
  if (loads.has(win)) return loads.get(win);
  let finish;
  const promise = new Promise((resolve, reject) => { finish = { resolve, reject }; });
  loads.set(win, promise);
  const script = doc.createElement("script");
  script.src = SCRIPT_URL;
  script.async = true;
  let settled = false;
  const settle = (error) => {
    if (settled) return;
    settled = true;
    win.clearTimeout(timer);
    script.onload = script.onerror = null;
    if (error || !win.turnstile?.render || !win.turnstile?.remove) {
      loads.delete(win);
      script.remove();
      finish.reject(unavailable());
    } else finish.resolve(win.turnstile);
  };
  const timer = win.setTimeout(() => settle(unavailable()), 10000);
  script.onload = () => settle();
  script.onerror = () => settle(unavailable());
  doc.head.append(script);
  return promise;
}

export function createAuthChallenge(config, { document: doc, window: win } = {}) {
  if (config?.enabled !== true) return {
    mount() {}, destroy() {}, take() { return { token: undefined, finish() {} }; },
  };
  let root, widgetRoot, status, retry, container, widget, provider;
  let generation = 0, token = "", busy = false, failed = false;
  const validConfig = config.provider === "turnstile" && typeof config.siteKey === "string" && config.siteKey.trim();
  function removeWidget() {
    if (provider && widget != null) {
      try { provider.remove(widget); } catch { /* The generation still invalidates its callbacks. */ }
    }
    widget = null;
    widgetRoot?.replaceChildren();
  }
  function notice(text, allowRetry = false) {
    if (status) status.textContent = text;
    if (retry) retry.hidden = !allowRetry;
  }
  async function render() {
    const epoch = ++generation;
    token = "";
    busy = false;
    failed = false;
    removeWidget();
    notice("Ավարտեք անվտանգության ստուգումը։");
    const current = () => generation === epoch && root?.isConnected;
    try {
      if (!validConfig || !doc || !win) throw unavailable();
      provider = await providerFor(win, doc);
      if (!current()) return;
      widget = provider.render(widgetRoot, {
        sitekey: config.siteKey,
        size: "normal",
        appearance: "always",
        theme: "auto",
        "response-field": false,
        retry: "never",
        "refresh-expired": "manual",
        callback(value) {
          if (!current() || busy || typeof value !== "string" || !value) return;
          token = value;
          failed = false;
          notice("Անվտանգության ստուգումն ավարտված է։");
        },
        "expired-callback"() {
          if (!current()) return;
          token = "";
          notice("Անվտանգության ստուգման ժամկետը լրացել է։ Կրկնեք ստուգումը։", true);
        },
        "timeout-callback"() {
          if (!current()) return;
          token = "";
          notice("Անվտանգության ստուգումը չի ավարտվել։ Կրկնեք այն։", true);
        },
        "error-callback"() {
          if (!current()) return;
          token = "";
          failed = true;
          notice("Անվտանգության ստուգումը չհաջողվեց։ Կրկնեք այն։", true);
        },
      });
    } catch {
      if (!current()) return;
      token = "";
      failed = true;
      notice("Անվտանգության ստուգումը չբեռնվեց։ Կրկին փորձեք բեռնել այն։", true);
    }
  }
  function destroy() {
    generation++;
    token = "";
    busy = false;
    failed = false;
    removeWidget();
    root?.remove();
    root = widgetRoot = status = retry = container = null;
  }
  return {
    mount(target, before = null) {
      if (!target) { destroy(); return; }
      hideAuthLinkValues(win);
      if (container === target && root?.isConnected) return;
      destroy();
      container = target;
      root = doc.createElement("div");
      root.className = "auth-challenge";
      root.dataset.authChallenge = "";
      const label = doc.createElement("p");
      label.className = "subtle small";
      label.textContent = "Անվտանգության ստուգում";
      widgetRoot = doc.createElement("div");
      widgetRoot.className = "auth-challenge__widget";
      status = doc.createElement("p");
      status.className = "auth-challenge__status subtle small";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      retry = doc.createElement("button");
      retry.type = "button";
      retry.className = "ghost";
      retry.textContent = "Կրկնել ստուգումը";
      retry.hidden = true;
      retry.addEventListener("click", () => { void render(); });
      root.append(label, widgetRoot, status, retry);
      target.insertBefore(root, before);
      void render();
    },
    take() {
      if (failed) throw unavailable();
      if (!root?.isConnected || !token || busy) throw required();
      const value = token, epoch = generation;
      token = "";
      busy = true;
      let finished = false;
      return { token: value, finish() {
        if (finished) return;
        finished = true;
        if (generation === epoch && root?.isConnected) void render();
      } };
    },
    destroy,
  };
}
