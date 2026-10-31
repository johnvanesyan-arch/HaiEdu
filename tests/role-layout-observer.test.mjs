import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// Link the actual DOM focus component into this VM fixture. Keyboard geometry
// and once-only/pointer behavior are verified in native browser tests.
const focusSource = readFileSync(new URL("../web/navigation-focus.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
const source = focusSource + "\n" + readFileSync(new URL("../web/role-layout.js", import.meta.url), "utf8")
  .replace(/^import \{ installNavigationFocus \} from '\.\/navigation-focus\.mjs';\n/m, "");
const schoolViews = ["overviewPanel", "yearPanel", "teachersPanel", "teacherPanel", "pendingPanel"];
const platformViews = ["overviewSection", "schoolsSection", "accountsSection", "archiveSection", "deletionsSection", "auditSection"];
const workspaceGates = {
  teacher: "dashboardPanel", school: "overviewPanel", schoolTeacher: "teacherDetailPanel",
  platformSchools: "masterPanel", platform: "console", platformSecurity: "securityConsole",
  content: "console", contentReview: "console", contentBank: "console", contentItem: "console",
  contentCurriculum: "console", contentEvidence: "console", contentGuides: "guideConsole", contentMaterials: "console",
};

// Execute the real navigation script with a small, dependency-free DOM fixture.
// This models the attribute/MutationObserver semantics relevant to this regression:
// setting an existing attribute to the same value still queues a record; removing
// an absent attribute does not. Observer callbacks may queue their next delivery.
// It does not model browser rendering, networking, authentication, or layout/CSS.
function fixture({ page = "school", hash = "", authorized = true, terminal = null, master = false } = {}) {
  const observers = new Set();
  const attributeWrites = [];
  const timers = [];
  let location = new URL(`https://haiedu.test/${page === "platform" ? "admin" : page === "school" ? "school-admin" : page}.html${hash}`);

  class Events {
    listeners = new Map();
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    }
    dispatchEvent(event) {
      for (const listener of this.listeners.get(event.type) || []) listener.call(this, event);
    }
  }

  function mutation(target, name, oldValue) {
    attributeWrites.push({ id: target.id, name, oldValue, value: target.getAttribute(name) });
    for (const observer of observers) {
      const options = observer.targets.get(target);
      if (options?.attributes && (!options.attributeFilter || options.attributeFilter.includes(name))) {
        observer.records.push({ type: "attributes", target, attributeName: name, oldValue });
      }
    }
  }

  class Element extends Events {
    constructor(tagName) {
      super();
      this.tagName = tagName.toUpperCase();
      this.attributes = new Map();
      this.children = [];
      this.parentElement = null;
      this.dataset = {};
      this.textContent = "";
      const updateClass = tokens => {
        if (!this.attributes.has("class") && tokens.length === 0) return;
        this.setAttribute("class", tokens.join(" "));
      };
      this.classList = {
        contains: token => this.className.split(/\s+/).includes(token),
        add: (...tokens) => updateClass([...new Set([...this.className.split(/\s+/).filter(Boolean), ...tokens])]),
        remove: (...tokens) => updateClass(this.className.split(/\s+/).filter(token => token && !tokens.includes(token))),
      };
    }
    get id() { return this.getAttribute("id") || ""; }
    set id(value) { this.setAttribute("id", value); }
    get className() { return this.getAttribute("class") || ""; }
    set className(value) { this.setAttribute("class", value); }
    get hidden() { return this.attributes.has("hidden"); }
    set hidden(value) {
      if (value) this.setAttribute("hidden", "");
      else this.removeAttribute("hidden");
    }
    get href() { return new URL(this.getAttribute("href") || "", location).href; }
    set href(value) { this.setAttribute("href", value); }
    get rel() { return this.getAttribute("rel") || ""; }
    set rel(value) { this.setAttribute("rel", value); }
    set innerHTML(value) {
      this.children.forEach(child => { child.parentElement = null; });
      this.children = [];
      this.html = value;
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) {
      const oldValue = this.getAttribute(name);
      this.attributes.set(name, String(value));
      mutation(this, name, oldValue);
    }
    removeAttribute(name) {
      if (!this.attributes.has(name)) return;
      const oldValue = this.getAttribute(name);
      this.attributes.delete(name);
      mutation(this, name, oldValue);
    }
    append(...nodes) {
      for (const node of nodes) {
        node.remove();
        node.parentElement = this;
        this.children.push(node);
      }
    }
    prepend(node) {
      node.remove();
      node.parentElement = this;
      this.children.unshift(node);
    }
    remove() {
      if (!this.parentElement) return;
      this.parentElement.children = this.parentElement.children.filter(node => node !== this);
      this.parentElement = null;
    }
    insertAdjacentElement(position, node) {
      assert.equal(position, "afterend");
      node.remove();
      const parent = this.parentElement;
      node.parentElement = parent;
      parent.children.splice(parent.children.indexOf(this) + 1, 0, node);
    }
    click() { this.dispatchEvent({ type: "click" }); }
    matches(selector) {
      if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
      if (selector.startsWith("#")) return this.id === selector.slice(1);
      if (selector === 'link[rel="prefetch"]') return this.tagName === "LINK" && this.rel === "prefetch";
      return this.tagName === selector.toUpperCase();
    }
    querySelectorAll(selector) {
      const descendants = [];
      const visit = node => node.children.forEach(child => { descendants.push(child); visit(child); });
      visit(this);
      return descendants.filter(node => selector.split(",").some(part => {
        const tokens = part.trim().split(/\s+/);
        if (!node.matches(tokens.at(-1))) return false;
        if (tokens.length === 1) return true;
        assert.equal(tokens.length, 2, `Unsupported test selector: ${part}`);
        for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (ancestor.matches(tokens[0])) return true;
        }
        return false;
      }));
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }

  class MutationObserver {
    constructor(callback) { this.callback = callback; this.targets = new Map(); this.records = []; observers.add(this); }
    observe(target, options) { this.targets.set(target, options); }
    disconnect() { this.targets.clear(); this.records = []; }
    takeRecords() { return this.records.splice(0); }
  }

  const root = new Element("html");
  const head = new Element("head");
  const body = new Element("body");
  root.append(head, body);
  body.dataset.roleWorkspace = page;
  const main = new Element("main");
  const topbar = new Element("header");
  topbar.className = "school-admin-header";
  body.append(main);
  main.append(topbar);
  const document = Object.assign(new Events(), {
    body, head,
    createElement: tag => new Element(tag),
    getElementById: id => root.querySelector(`#${id}`),
    querySelector: selector => root.querySelector(selector),
    querySelectorAll: selector => root.querySelectorAll(selector),
  });
  function add(id, parent = main, closed = true) {
    if (document.getElementById(id)) return document.getElementById(id);
    const element = new Element("section");
    element.id = id;
    if (closed) element.className = "hidden";
    parent.append(element);
    return element;
  }
  const gate = add(workspaceGates[page], main, !authorized);
  if (page === "school") {
    schoolViews.forEach(id => add(id, main, !authorized));
    add("masterPanel", main, !master);
    if (master) schoolViews.forEach(id => document.getElementById(id).classList.add("hidden"));
  }
  if (page === "platform") platformViews.forEach(id => add(id, gate, false));
  ["authPanel", "denied", "signedOut", "mfaPanel"].forEach(id => add(id, main, id !== terminal));
  const signOut = new Element("button");
  signOut.id = "signOutBtn";
  main.append(signOut);
  const window = new Events();
  Object.defineProperty(window, "location", { get: () => location });
  window.scrollTo = () => {};
  window.setTimeout = callback => timers.push(callback);
  window.requestIdleCallback = callback => timers.push(callback);
  const context = vm.createContext({ document, window, location, URL, URLSearchParams, MutationObserver });

  function flush(maxDeliveries = 64) {
    let deliveries = 0;
    while ([...observers].some(observer => observer.records.length)) {
      if (deliveries >= maxDeliveries) {
        const next = [...observers].flatMap(observer => observer.records).slice(0, 4)
          .map(record => `#${record.target.id}.${record.attributeName}`).join(", ");
        throw new Error(`MutationObserver did not settle within ${maxDeliveries} deliveries; pending: ${next}`);
      }
      for (const observer of observers) {
        const records = observer.takeRecords();
        if (records.length) { deliveries++; observer.callback(records, observer); }
      }
    }
    return deliveries;
  }

  return {
    document, window, gate, attributeWrites, MutationObserver,
    start: () => vm.runInContext(source, context, { timeout: 1000, filename: "web/role-layout.js" }),
    flush,
    navigate(hash) { location.hash = hash; window.dispatchEvent({ type: "hashchange" }); return flush(); },
    sidebar: () => document.querySelector(".hm-role-sidebar"),
    links: () => document.querySelectorAll(".hm-role-nav a"),
  };
}

function assertSelected(f, views, selected) {
  for (const id of views) assert.equal(f.document.getElementById(id).hidden, id !== selected, id);
  const current = f.links().filter(link => link.getAttribute("aria-current") === "page");
  assert.equal(current.length, 1, "exactly one navigation item is current");
  const expectedHref = selected === views[0]
    ? (views === schoolViews ? "./school-admin.html" : "./admin.html")
    : `#${selected}`;
  assert.equal(current[0].getAttribute("href"), expectedHref);
}

test("DOM fixture records same-value hidden assignments and bounds recursive observer delivery", () => {
  const f = fixture();
  const element = f.gate;
  element.hidden = true;
  const observer = new f.MutationObserver(() => {});
  observer.observe(element, { attributes: true, attributeFilter: ["hidden"] });
  element.hidden = true;
  assert.equal(observer.takeRecords().length, 1);
  element.hidden = false;
  assert.equal(observer.takeRecords().length, 1);
  element.hidden = false;
  assert.equal(observer.takeRecords().length, 0);
  const recursive = new f.MutationObserver(() => { element.hidden = true; });
  recursive.observe(element, { attributes: true, attributeFilter: ["hidden"] });
  element.hidden = true;
  assert.throws(() => f.flush(4), /did not settle/);
  recursive.disconnect();
});

for (const selected of schoolViews) {
  test(`school ${selected}: observer settles and only selected section is shown`, () => {
    const f = fixture({ hash: selected === "overviewPanel" ? "" : `#${selected}` });
    f.start();
    assert.ok(f.flush() <= 2, "initial visibility mutation delivery is bounded");
    assertSelected(f, schoolViews, selected);
    assert.equal(f.sidebar().dataset.workspace, "Դպրոցի ադմին");
    assert.equal(f.document.querySelector(".hm-workspace-loading"), null);
  });
}

test("school hash navigation and repeated role updates reach a stable state", () => {
  const f = fixture();
  f.start();
  f.flush();
  for (const selected of [...schoolViews, ...schoolViews.toReversed(), "overviewPanel"]) {
    assert.ok(f.navigate(`#${selected}`) <= 2);
    assertSelected(f, schoolViews, selected);
    f.attributeWrites.length = 0;
    f.navigate(`#${selected}`);
    assert.equal(f.attributeWrites.filter(write => write.name === "hidden").length, 0, "unchanged view does not rewrite visibility");
    f.gate.setAttribute("class", f.gate.className);
    assert.ok(f.flush() <= 2, "duplicate authorized role update settles");
    assertSelected(f, schoolViews, selected);
  }
  f.navigate("#unknown-section");
  assertSelected(f, schoolViews, "overviewPanel");
});

for (const terminal of [null, "authPanel", "denied", "signedOut", "mfaPanel"]) {
  test(`school ${terminal || "loading"}: closed authorization gate stays closed through navigation`, () => {
    const f = fixture({ authorized: false, terminal });
    f.start();
    f.flush();
    for (const id of schoolViews) {
      f.navigate(`#${id}`);
      assert.equal(f.links().length, 0, "authorized navigation is not exposed");
      for (const panel of schoolViews) assert.ok(f.document.getElementById(panel).classList.contains("hidden"), `${panel} retains its authorization class`);
    }
    if (terminal) {
      assert.equal(f.sidebar(), null);
      assert.equal(f.document.querySelector(".hm-workspace-loading"), null);
    } else {
      assert.equal(f.sidebar().dataset.workspace, "loading");
      assert.ok(f.document.querySelector(".hm-workspace-loading"));
    }
  });
}

test("school loading to authorized to denied updates navigation without reopening protected panels", () => {
  const f = fixture({ authorized: false });
  f.start();
  f.flush();
  schoolViews.forEach(id => f.document.getElementById(id).classList.remove("hidden"));
  f.flush();
  assert.equal(f.sidebar().dataset.workspace, "Դպրոցի ադմին");
  assertSelected(f, schoolViews, "overviewPanel");
  schoolViews.forEach(id => f.document.getElementById(id).classList.add("hidden"));
  f.document.getElementById("denied").classList.remove("hidden");
  f.flush();
  assert.equal(f.sidebar(), null);
  assert.equal(f.links().length, 0);
  for (const id of schoolViews) assert.ok(f.document.getElementById(id).classList.contains("hidden"));
});

for (const selected of platformViews) {
  test(`platform ${selected}: section sync settles and repeated navigation does not rewrite hidden`, () => {
    const f = fixture({ page: "platform", hash: `#${selected}` });
    f.start();
    f.flush();
    assertSelected(f, platformViews, selected);
    f.attributeWrites.length = 0;
    f.navigate(`#${selected}`);
    assert.equal(f.attributeWrites.filter(write => write.name === "hidden").length, 0);
    for (const view of platformViews) {
      f.navigate(`#${view}`);
      assertSelected(f, platformViews, view);
    }
  });
}

for (const page of Object.keys(workspaceGates).filter(page => page !== "school" && page !== "platform")) {
  test(`${page}: authorized workspace smoke and terminal-state navigation removal`, () => {
    const f = fixture({ page });
    f.start();
    assert.ok(f.flush() <= 2);
    assert.ok(f.links().length >= 4);
    assert.equal(f.document.querySelectorAll(".hm-role-sidebar").length, 1);
    assert.equal(f.document.querySelector(".hm-workspace-loading"), null);
    f.gate.classList.add("hidden");
    f.document.getElementById("signedOut").classList.remove("hidden");
    f.flush();
    assert.equal(f.sidebar(), null);
    assert.equal(f.links().length, 0);
    assert.ok(f.gate.classList.contains("hidden"));
  });
}

test("school route with platform master gate keeps school-only panels protected", () => {
  const f = fixture({ page: "school", master: true });
  f.start();
  f.flush();
  assert.equal(f.sidebar().dataset.workspace, "Հարթակի ադմին");
  for (const selected of schoolViews) {
    f.navigate(`#${selected}`);
    for (const id of schoolViews) assert.ok(f.document.getElementById(id).classList.contains("hidden"));
  }
});
