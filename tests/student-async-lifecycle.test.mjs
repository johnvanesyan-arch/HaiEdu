import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const remediationSource = readFileSync(new URL("../web/remediation.js", import.meta.url), "utf8")
  .replace(/^import .*;\s*$/gm, "");

// These tests execute the real help controller with deferred API promises and
// a bounded DOM observer double. No network, authentication, scoring, or browser
// rendering is simulated. The fixture supplies an already-authorized practice.
function helpFixture() {
  const observers = [];
  const calls = [];
  const nodes = new Map();
  const observedMutation = (target, type, attributeName) => {
    for (const observer of observers) {
      const options = observer.targets.get(target);
      if (!options) continue;
      if (type === "attributes" && (!options.attributes || (options.attributeFilter && !options.attributeFilter.includes(attributeName)))) continue;
      if (type === "childList" && !options.childList) continue;
      observer.records.push({ target, type, attributeName });
    }
  };
  class Element {
    constructor(id = "") {
      this.id = id;
      this.attributes = new Map();
      this.listeners = new Map();
      this.disabled = false;
      this.value = "";
      this.controls = [];
      this.children = [];
      this._text = "";
      this.dataset = new Proxy({}, { set: (object, key, value) => {
        object[key] = value;
        observedMutation(this, "attributes", key === "itemCode" ? "data-item-code" : `data-${key}`);
        return true;
      } });
      const tokens = new Set();
      this.classList = {
        contains: token => tokens.has(token),
        add: (...values) => { values.forEach(value => tokens.add(value)); observedMutation(this, "attributes", "class"); },
        remove: (...values) => { values.forEach(value => tokens.delete(value)); observedMutation(this, "attributes", "class"); },
        toggle: (token, force = !tokens.has(token)) => {
          if (tokens.has(token) === force) return force;
          if (force) tokens.add(token); else tokens.delete(token);
          observedMutation(this, "attributes", "class");
          return force;
        },
      };
    }
    get textContent() { return this._text; }
    set textContent(value) { this._text = String(value); observedMutation(this, "childList"); }
    querySelectorAll() { return this.controls; }
    appendChild(child) { this.children.push(child); }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(callback);
    }
    dispatch(type) { for (const callback of this.listeners.get(type) || []) callback({ type }); }
  }
  const ids = ["practicePanel", "sessionMode", "itemCode", "submitBtn", "answerArea", "feedback", "helpControls", "helpBtn", "helpPanel", "helpTitle", "helpStrategy", "helpContent", "helpNote"];
  ids.forEach(id => nodes.set(id, new Element(id)));
  nodes.get("sessionMode").textContent = "Վարժանք";
  nodes.get("itemCode").dataset.itemCode = "question-a";
  nodes.get("feedback").classList.add("hidden");
  nodes.get("helpPanel").classList.add("hidden");
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.targets = new Map(); this.records = []; observers.push(this); }
    observe(target, options) { assert.ok(target); this.targets.set(target, options); }
  }
  const supabase = { functions: { invoke(name, options) {
    const call = { name, options };
    call.promise = new Promise((resolve, reject) => { call.resolve = resolve; call.reject = reject; });
    calls.push(call);
    return call.promise;
  } } };
  const context = vm.createContext({
    document: { getElementById: id => nodes.get(id) || null, createElement: () => new Element(), head: new Element() },
    createClient: () => supabase,
    SUPABASE_URL: "https://example.invalid", SUPABASE_PUBLISHABLE_KEY: "fixture",
    MutationObserver, HTMLInputElement: Element,
  });
  vm.runInContext(`${remediationSource}\n;globalThis.testController = { requestHelp, syncHelpVisibility };`, context, { timeout: 1000 });
  function flush() {
    let deliveries = 0;
    while (observers.some(observer => observer.records.length)) {
      assert.ok(++deliveries <= 32, "help observer must settle");
      for (const observer of observers) {
        const records = observer.records.splice(0);
        if (records.length) observer.callback(records);
      }
    }
  }
  flush();
  return {
    nodes, calls, flush,
    request: () => context.testController.requestHelp(),
    question(code) { nodes.get("itemCode").dataset.itemCode = code; flush(); },
    hidePractice() { nodes.get("practicePanel").classList.add("hidden"); flush(); },
    showPractice() { nodes.get("practicePanel").classList.remove("hidden"); flush(); },
  };
}

const hint = title => ({ data: { titleHy: title, contentHy: `${title} content`, level: 1, moreHelpAvailable: true }, error: null });

test("help request renders a current answer and coalesces repeated activation", async () => {
  const f = helpFixture();
  const first = f.request();
  await f.request();
  assert.equal(f.calls.length, 1);
  f.calls[0].resolve(hint("current"));
  await first;
  assert.equal(f.nodes.get("helpTitle").textContent, "current");
  assert.equal(f.nodes.get("helpBtn").disabled, false);
});

test("late help response cannot paint a previous question's hint into the current question", async () => {
  const f = helpFixture();
  const first = f.request();
  f.question("question-b");
  f.calls[0].resolve(hint("old question"));
  await first;
  assert.equal(f.nodes.get("helpPanel").classList.contains("hidden"), true);
  assert.equal(f.nodes.get("helpContent").textContent, "");
  assert.equal(f.nodes.get("helpBtn").disabled, false);
});

test("completion rechecks the item before its observer notification is delivered", async () => {
  const f = helpFixture();
  const first = f.request();
  f.nodes.get("itemCode").dataset.itemCode = "question-b";
  f.calls[0].resolve(hint("old question"));
  await first;
  assert.equal(f.nodes.get("helpPanel").classList.contains("hidden"), true);
  assert.equal(f.nodes.get("helpContent").textContent, "");
  f.flush();
});

test("question changes retain one pending help request and allow the new item after it settles", async () => {
  const f = helpFixture();
  const first = f.request();
  f.question("question-b");
  await f.request();
  assert.equal(f.calls.length, 1, "context changes do not create concurrent server help requests");
  assert.equal(f.nodes.get("helpBtn").disabled, true);
  f.calls[0].resolve(hint("old question"));
  await first;
  assert.equal(f.nodes.get("helpBtn").disabled, false, "old completion releases the current control");
  assert.equal(f.nodes.get("helpContent").textContent, "");
  const second = f.request();
  assert.equal(f.calls.length, 2);
  f.calls[1].resolve(hint("new question"));
  await second;
  assert.equal(f.nodes.get("helpTitle").textContent, "new question");
  assert.equal(f.nodes.get("helpBtn").disabled, false);
});

test("leaving practice invalidates a pending help response even if the item code is reused", async () => {
  const f = helpFixture();
  const first = f.request();
  f.hidePractice();
  f.showPractice();
  f.calls[0].resolve(hint("prior practice"));
  await first;
  assert.equal(f.nodes.get("helpPanel").classList.contains("hidden"), true);
  assert.equal(f.nodes.get("helpContent").textContent, "");
});

test("late help failure cannot replace the newer question's help state", async () => {
  const f = helpFixture();
  const first = f.request();
  f.question("question-b");
  f.calls[0].resolve({ data: null, error: { message: "old failure" } });
  await first;
  assert.equal(f.nodes.get("helpPanel").classList.contains("hidden"), true);
  assert.equal(f.nodes.get("helpContent").textContent, "");
});

test("mode changes invalidate pending hints and retain existing help restrictions", async () => {
  const f = helpFixture();
  const first = f.request();
  f.nodes.get("sessionMode").textContent = "help-disabled-mode";
  f.flush();
  await f.request();
  assert.equal(f.calls.length, 1);
  f.calls[0].resolve(hint("old mode"));
  await first;
  assert.equal(f.nodes.get("helpControls").classList.contains("hidden"), true);
  assert.equal(f.nodes.get("helpPanel").classList.contains("hidden"), true);
});

test("draft entry during pending help prevents late display and clearing the draft permits retry", async () => {
  const f = helpFixture();
  const first = f.request();
  const answer = { value: "draft" };
  f.nodes.get("answerArea").controls = [answer];
  f.nodes.get("answerArea").dispatch("input");
  f.calls[0].resolve(hint("late hint"));
  await first;
  assert.equal(f.nodes.get("helpPanel").classList.contains("hidden"), true);
  const blocked = f.request();
  assert.equal(f.calls.length, 1);
  await blocked;
  answer.value = "";
  f.nodes.get("answerArea").dispatch("input");
  const retry = f.request();
  assert.equal(f.calls.length, 2);
  f.calls[1].resolve(hint("retry"));
  await retry;
  assert.equal(f.nodes.get("helpTitle").textContent, "retry");
});

test("exhausted help stays disabled and cannot issue another help request", async () => {
  const f = helpFixture();
  const first = f.request();
  f.calls[0].resolve({ data: { ...hint("final help").data, level: 3, moreHelpAvailable: false }, error: null });
  await first;
  const blocked = f.request();
  assert.equal(f.calls.length, 1);
  await blocked;
  assert.equal(f.nodes.get("helpBtn").disabled, true);
});

test("current help failure releases the button and allows retry", async () => {
  const f = helpFixture();
  const first = f.request();
  f.calls[0].resolve({ data: null, error: { message: "temporary failure" } });
  await first;
  assert.equal(f.nodes.get("helpBtn").disabled, false);
  const retry = f.request();
  assert.equal(f.calls.length, 2);
  f.calls[1].resolve(hint("retry"));
  await retry;
  assert.equal(f.nodes.get("helpTitle").textContent, "retry");
});

test("unexpected rejected help promise releases pending state and allows retry", async () => {
  const f = helpFixture();
  const first = f.request();
  f.calls[0].reject(new Error("unexpected request failure"));
  await assert.doesNotReject(first);
  assert.equal(f.nodes.get("helpBtn").disabled, false);
  const retry = f.request();
  assert.equal(f.calls.length, 2);
  f.calls[1].resolve(hint("retry"));
  await retry;
  assert.equal(f.nodes.get("helpTitle").textContent, "retry");
});
