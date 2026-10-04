import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { deferred, itemHarness, moduleSource, node } from "./fixtures/content-session-harness.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const userA = { user: { id: "QA-user" } };
const userB = { user: { id: "QA-new-user" } };

test("same-user editor auth events preserve the visible dirty draft", async () => {
  const h = await itemHarness();
  h.get("console").classList.remove("hidden");
  h.get("detailPanel").innerHTML = "QA current draft";
  h.authEvent("SIGNED_IN", userA);
  h.authEvent("TOKEN_REFRESHED", userA);
  assert.equal(h.loads.length, 0);
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.get("detailPanel").innerHTML, "QA current draft");
});

test("different-user editor sign-in clears the old draft before loading", async () => {
  const h = await itemHarness();
  h.get("console").classList.remove("hidden");
  h.get("detailPanel").innerHTML = "QA private old editor";
  h.authEvent("SIGNED_IN", userB);
  assert.equal(h.loads.length, 1);
  assert.equal(h.api.snapshot().activeSession.user.id, userB.user.id);
  assert.equal(h.api.snapshot().selectedDetail, null);
  assert.equal(h.api.snapshot().dashboard, null);
  assert.equal(h.api.snapshot().editorDirty, false);
  assert.equal(h.get("detailPanel").innerHTML, "");
  assert.equal(h.get("console").classList.contains("hidden"), true);
  h.loads[0].resolve({ items: [], stats: {} });
  await flush();
  assert.equal(h.get("console").classList.contains("hidden"), false);
});

for (const failed of [false, true]) {
  test(`old editor dashboard ${failed ? "failure" : "success"} cannot overwrite a new user`, async () => {
    const h = await itemHarness();
    h.api.prepare({ dirty: false });
    const old = h.api.refresh();
    h.authEvent("SIGNED_IN", userB);
    assert.equal(h.loads.length, 2);
    h.loads[1].resolve({ items: [], stats: { owner: "B" } });
    await flush();
    if (failed) h.loads[0].reject(new Error("QA old protected error"));
    else h.loads[0].resolve({ items: [], stats: { owner: "A" } });
    await old;
    assert.equal(h.api.snapshot().dashboard.stats.owner, "B");
    assert.equal(h.get("consoleMessage").textContent, "");
  });
}

test("a pending old bootstrap does not block sign-in after logout", async () => {
  const h = await itemHarness();
  h.authEvent("USER_UPDATED", userA);
  assert.equal(h.loads.length, 1);
  h.logout();
  h.authEvent("SIGNED_IN", userB);
  assert.equal(h.loads.length, 2);
  h.loads[1].resolve({ items: [], stats: { owner: "B" } });
  await flush();
  h.loads[0].resolve({ items: [], stats: { owner: "A" } });
  await flush();
  assert.equal(h.api.snapshot().activeSession.user.id, userB.user.id);
  assert.equal(h.api.snapshot().dashboard.stats.owner, "B");
  assert.equal(h.get("console").classList.contains("hidden"), false);
});

async function curriculumHarness() {
  let listener, session = null;
  const loads = [], timers = [], nodes = new Map();
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const api = await vm.runInNewContext(`(async () => {
    ${moduleSource("web/content-curriculum.js")}
    applyScope = () => {}; rebuildSelectors = () => {};
    return { refreshData, snapshot: () => data };
  })()`, {
    $: get, document: { body: { dataset: { contentMode: "bank" } } }, window: { addEventListener() {} },
    contentSupabase: { auth: { getSession: async () => ({ data: { session } }), onAuthStateChange: (fn) => { listener = fn; } } },
    loadContentDashboard() { const request = deferred(); loads.push(request); return request.promise; },
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {},
  });
  return { api, loads, get, auth(event, next) { session = next; listener(event, next); } };
}

for (const failed of [false, true]) {
  test(`old curriculum ${failed ? "failure" : "success"} is discarded after a user switch`, async () => {
    const h = await curriculumHarness();
    h.auth("SIGNED_IN", userA);
    const old = h.api.refreshData();
    await flush();
    h.auth("SIGNED_IN", userB);
    const current = h.api.refreshData();
    await flush();
    h.loads[1].resolve({ owner: "B" });
    await current;
    if (failed) h.loads[0].reject(new Error("QA old curriculum details"));
    else h.loads[0].resolve({ owner: "A" });
    await old;
    assert.equal(h.api.snapshot().owner, "B");
    assert.equal(h.get("curriculumSummary").textContent, "");
  });
}

test("same-user curriculum token refresh preserves the catalog", async () => {
  const h = await curriculumHarness();
  h.auth("SIGNED_IN", userA);
  const pending = h.api.refreshData();
  await flush();
  h.loads[0].resolve({ owner: "A" });
  await pending;
  h.auth("TOKEN_REFRESHED", userA);
  assert.equal(h.api.snapshot().owner, "A");
  assert.equal(h.loads.length, 1);
});

test("curriculum identity event wins over an older initial session read", async () => {
  const initialRead = deferred(), timers = [], reads = [], nodes = new Map();
  let listener, firstRead = true;
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const loading = vm.runInNewContext(`(async () => { ${moduleSource("web/content-curriculum.js")} })()`, {
    $: get, document: { body: { dataset: { contentMode: "bank" } } }, window: { addEventListener() {} },
    contentSupabase: { auth: {
      getSession() { if (firstRead) { firstRead = false; return initialRead.promise; } return Promise.resolve({ data: { session: userB } }); },
      onAuthStateChange(fn) { listener = fn; },
    } },
    loadContentDashboard(session) { reads.push(session.user.id); return new Promise(() => {}); },
    MutationObserver: class { observe() {} },
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {},
  });
  listener("SIGNED_IN", userB);
  initialRead.resolve({ data: { session: userA } });
  await loading;
  for (const callback of timers) callback();
  await flush();
  assert.deepEqual(reads, [userB.user.id]);
});

test("shared workspace identity updates before the item controller loads the new account", async () => {
  const listeners = [], requests = [], nodes = new Map(), storage = new Map();
  let clientsCreated = 0;
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const client = {
    auth: { getSession: async () => ({ data: { session: userA } }), onAuthStateChange: (callback) => { listeners.push(callback); } },
    functions: { invoke(name) { const request = deferred(); requests.push({ name, ...request }); return request.promise; } },
  };
  const shared = {
    window: { addEventListener() {}, dispatchEvent() {} },
    document: { body: { dataset: { contentMode: "item" } }, getElementById: get, querySelectorAll: () => [] },
    createClient: () => { clientsCreated += 1; return client; }, SUPABASE_URL: "https://fixture.invalid", SUPABASE_PUBLISHABLE_KEY: "fixture-only",
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    URLSearchParams, location: { search: "?id=fixture-item" }, Response, CustomEvent: class {},
  };
  // Reproduce module dependency evaluation: workspace runs before its importer.
  const workspace = vm.runInNewContext(`(() => { ${moduleSource("web/content-workspace.js")}; return { clearContentDashboardCache, loadContentDashboard }; })()`, shared);
  const loading = vm.runInNewContext(`(async () => { ${moduleSource("web/content.js")}; return { snapshot: () => ({activeSession, dashboard}) }; })()`, { ...shared, ...workspace });
  await flush();
  assert.equal(clientsCreated, 1, "The two modules must reuse the same global Supabase client");
  assert.equal(listeners.length, 2);
  requests[0].resolve({ data: { items: [], stats: { owner: "A" } }, error: null });
  const api = await loading;
  assert.equal(get("console").classList.contains("hidden"), false);
  for (const callback of listeners) callback("SIGNED_IN", userB);
  await flush();
  assert.equal(requests.length, 2, "The legitimate replacement account must reach its dashboard load");
  requests[1].resolve({ data: { items: [], stats: { owner: "B" } }, error: null });
  await flush();
  assert.equal(api.snapshot().activeSession.user.id, userB.user.id);
  assert.equal(api.snapshot().dashboard.stats.owner, "B");
  assert.equal(get("console").classList.contains("hidden"), false);
  assert.equal(get("authMessage").textContent, "");
});
