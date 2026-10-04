import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { deferred, moduleSource, node } from "./fixtures/content-session-harness.mjs";

async function reviewHarness({ initialSession = { user: { id: "fixture-user" } }, deferInitial = false, heading = false } = {}) {
  const timers = new Map(), observers = [], requests = [], sessionRead = deferred();
  let listener, nextTimer = 0;
  const state = { heading };
  const panel = { querySelector: (selector) => selector === ".detail-heading" && state.heading ? {} : null };
  const client = {
    auth: {
      getSession: () => deferInitial ? sessionRead.promise : Promise.resolve({ data: { session: initialSession } }),
      onAuthStateChange: (fn) => { listener = fn; },
    },
    functions: { invoke(name) { requests.push(name); return new Promise(() => {}); } },
  };
  const loading = vm.runInNewContext(`(async () => { ${moduleSource("web/content-review-workflow.js")} })()`, {
    window: { __haieduSupabaseClient: client },
    document: { body: { dataset: { contentItemId: "fixture-item" } }, getElementById: (id) => id === "detailPanel" ? panel : null, querySelector: () => null },
    MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} },
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    URLSearchParams, location: { search: "?id=fixture-item" }, Response,
  });
  if (!deferInitial) await loading;
  return {
    state, timers, observers, requests, loading,
    auth: (event, session = { user: { id: "fixture-user" } }) => listener(event, session),
    completeInitial: () => sessionRead.resolve({ data: { session: initialSession } }),
    mutate: () => observers.forEach((observer) => observer.callback([])),
    runTimers(limit = 8) {
      let count = 0;
      while (timers.size && count++ < limit) {
        const [id, callback] = timers.entries().next().value;
        timers.delete(id);
        callback();
      }
      return count;
    },
  };
}

test("review enhancement waits for detail mutations without recurring polling", async () => {
  const h = await reviewHarness();
  h.runTimers();
  assert.equal(h.timers.size, 0, "A missing detail heading must not sustain polling timers");
  assert.equal(h.observers.length, 1, "The existing panel should be observed while its content loads");
  h.state.heading = true;
  h.mutate();
  h.runTimers();
  assert.deepEqual(h.requests, ["get-content-review-history"]);
});

test("late initial review session cannot restart initialization after logout", async () => {
  const h = await reviewHarness({ deferInitial: true });
  h.auth("SIGNED_OUT", null);
  h.completeInitial();
  await h.loading;
  h.runTimers();
  assert.equal(h.timers.size, 0);
  assert.equal(h.observers.length, 0);
  assert.deepEqual(h.requests, []);
});

test("scheduled review sign-in is invalidated by logout", async () => {
  const h = await reviewHarness({ initialSession: null });
  h.auth("SIGNED_IN");
  h.auth("SIGNED_OUT", null);
  h.runTimers();
  assert.equal(h.timers.size, 0);
  assert.equal(h.observers.length, 0);
  assert.deepEqual(h.requests, []);
});

test("review panel changes after logout cannot issue new history reads", async () => {
  const h = await reviewHarness({ heading: true });
  h.auth("SIGNED_OUT", null);
  h.mutate();
  h.runTimers();
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.requests, []);
});

test("review session restart reuses its observer and schedules one history read", async () => {
  const h = await reviewHarness({ heading: true });
  h.auth("SIGNED_OUT", null);
  h.auth("SIGNED_IN");
  h.auth("USER_UPDATED");
  h.runTimers();
  assert.equal(h.observers.length, 1);
  assert.deepEqual(h.requests, ["get-content-review-history"]);
});

async function editorHarness() {
  const nodes = new Map();
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const answer = { value: "B", writes: 0, set innerHTML(value) { this.writes += 1; this.html = value; } };
  nodes.set("answerSingleChoice", answer);
  const optionRow = { removed: false, remove() { this.removed = true; } };
  const misconceptionRow = { removed: false, remove() { this.removed = true; } };
  const key = Object.assign(new EventTarget(), { value: "A" });
  const secondKey = Object.assign(new EventTarget(), { value: "B" });
  const removeOption = Object.assign(new EventTarget(), { closest: () => optionRow });
  const removeMisconception = Object.assign(new EventTarget(), { closest: () => misconceptionRow });
  const misconceptionHost = { writes: 0, set innerHTML(value) { this.writes += 1; this.html = value; } };
  nodes.set("misconceptionEditor", misconceptionHost);
  const selectors = {
    ".remove-option-btn": [removeOption],
    ".option-key": [key, secondKey],
    ".remove-misconception-btn": [removeMisconception],
  };
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() {} } };
  const api = await vm.runInNewContext(`(async () => { ${moduleSource("web/content.js")}; return { wireEditorRows }; })()`, {
    document: {
      body: { dataset: { contentMode: "item" } }, getElementById: get,
      querySelectorAll: (selector) => selector === ".option-key" && optionRow.removed ? [secondKey] : selectors[selector] ?? [],
      querySelector: (selector) => selector === "[data-misconception-row]" && !misconceptionRow.removed ? misconceptionRow : null,
    },
    window: { __haieduSupabaseClient: client, addEventListener() {} },
    clearContentDashboardCache() {}, URLSearchParams, location: { search: "" },
  });
  for (let i = 0; i < 5; i += 1) api.wireEditorRows();
  return { key, removeOption, removeMisconception, answer, misconceptionHost, optionRow, misconceptionRow };
}

test("repeated editor wiring synchronizes an option-key edit once", async () => {
  const h = await editorHarness();
  h.key.value = "Z";
  h.key.dispatchEvent(new Event("input"));
  assert.equal(h.answer.writes, 1);
  assert.equal(h.answer.value, "B", "An unrelated selected answer must remain selected");
});

test("repeated editor wiring handles one option removal once", async () => {
  const h = await editorHarness();
  h.removeOption.dispatchEvent(new Event("click"));
  assert.equal(h.optionRow.removed, true);
  assert.equal(h.answer.writes, 1);
  assert.equal(h.answer.value, "B");
});

test("repeated editor wiring handles the last misconception removal once", async () => {
  const h = await editorHarness();
  h.removeMisconception.dispatchEvent(new Event("click"));
  assert.equal(h.misconceptionRow.removed, true);
  assert.equal(h.misconceptionHost.writes, 1);
});
