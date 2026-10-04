import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Bounded local regressions for the real page submit handlers, ownership state,
// and shared UX synchronizer. Deferred fake network responses exercise input
// changes, retries and stale completions. No grading, browser or auth is mocked
// into a successful acceptance result; those remain separate verification.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, "web", name), "utf8");

function functionSource(source, name) {
  const declaration = new RegExp(`^(?:async )?function ${name}\\(`, "m");
  const match = declaration.exec(source);
  assert.ok(match, `Missing production function ${name}`);
  const rest = source.slice(match.index);
  const next = /\n(?:async )?function \w+\(/.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

const uxSource = read("ux.js");
const uxSync = functionSource(uxSource, "syncAnswerSubmit");
const refreshBinding = uxSource.match(/^document\.addEventListener\("haiedu-answer-controls-refresh", syncAnswerSubmit\);$/m)?.[0];
assert.ok(refreshBinding, "Shared UX must bind the stale-owner release signal");
const consumers = [
  { file: "app.js", handler: "submitAnswer" },
  { file: "practice.js", handler: "submitAnswer" },
  { file: "diagnostic.js", handler: "submit" },
  { file: "mastery.js", handler: "submit" },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function classList(initial = []) {
  const classes = new Set(initial);
  return {
    contains: (name) => classes.has(name),
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
  };
}

function createFixture({ file, handler }) {
  const source = read(file);
  const ownershipState = source.match(/^let answerSubmission = null;$/m)?.[0];
  assert.ok(ownershipState, "Run the production ownership state declaration");
  const radios = [
    { checked: true, value: "A", disabled: false },
    { checked: false, value: "B", disabled: false },
  ];
  const assessment = ["diagnostic.js", "mastery.js"].includes(file);
  const elements = {
    submitBtn: { disabled: false },
    nextBtn: { disabled: !assessment, dataset: {}, classList: classList(assessment ? ["hidden"] : []) },
    answerForm: { dataset: {}, querySelectorAll: () => radios },
    answerArea: { querySelectorAll: () => radios },
    feedback: { className: "feedback hidden", textContent: "", innerHTML: "" },
    progressBar: { style: {} },
    sessionProgressBar: { style: {} },
    nextExplanation: { textContent: "" },
  };
  const calls = [];
  const listeners = new Map();
  const refreshEvents = [];
  const gates = [];
  const finalResults = [];
  let statusResult = Promise.resolve({});
  elements.answerForm.dispatchEvent = (event) => {
    refreshEvents.push(event.type);
    listeners.get(event.type)?.(event);
    return true;
  };
  const context = vm.createContext({
    currentSession: { id: "fixture-session" },
    current: {
      item: { id: "fixture-item", type: "single_choice" },
      sessionItemId: "fixture-session-item",
      session: { mode: "practice", position: 1, total: 8 },
    },
    questionStartedAt: 1,
    startedAt: 1,
    performance: { now: () => 10 },
    document: {
      getElementById: (id) => elements[id] ?? null,
      querySelector: () => radios.find((radio) => radio.checked),
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
    supabase: {
      functions: {
        invoke: (name, options) => {
          const request = deferred();
          calls.push({ name, body: options.body, ...request });
          return request.promise;
        },
      },
    },
    answerForm: elements.answerForm,
    submitBtn: elements.submitBtn,
    nextBtn: elements.nextBtn,
    feedback: elements.feedback,
    $: (id) => elements[id],
    Event,
    updateMastery() {},
    showGate: (...args) => gates.push(args),
    status: () => statusResult,
    renderFinalResult: (result) => finalResults.push(result),
  });
  vm.runInContext([
    ownershipState,
    functionSource(source, "collectResponse"),
    ...(file === "practice.js" ? [
      functionSource(source, "lockAnswerControls"),
      functionSource(source, "handleDiagnosticGateError"),
      functionSource(source, "escapeHtml"),
    ] : []),
    functionSource(source, handler),
    uxSync,
    refreshBinding,
  ].join("\n"), context, { filename: file, timeout: 1000 });

  return {
    elements,
    calls,
    refreshEvents,
    gates,
    finalResults,
    submit() {
      return vm.runInContext(`${handler}({ preventDefault() {} });`, context, { timeout: 1000 });
    },
    changeAnswer() {
      radios[0].checked = false;
      radios[1].checked = true;
      // The production UX input/change handlers call this synchronizer.
      vm.runInContext("syncAnswerSubmit();", context, { timeout: 1000 });
    },
    replaceItem() {
      context.current = {
        item: { id: "new-item", type: "single_choice" },
        sessionItemId: "new-session-item",
        session: { mode: "practice", position: 2, total: 8 },
      };
      elements.feedback.textContent = "Current question feedback";
      elements.feedback.innerHTML = "Current question detail";
      vm.runInContext("syncAnswerSubmit();", context, { timeout: 1000 });
    },
    useStatus(promise) { statusResult = promise; },
  };
}

for (const consumer of consumers) {
  test(`${consumer.file}: answer changes keep a pending submission disabled`, () => {
    const fixture = createFixture(consumer);
    fixture.submit();
    assert.equal(fixture.calls.length, 1);
    assert.equal(fixture.elements.submitBtn.disabled, true);
    fixture.changeAnswer();
    assert.equal(fixture.elements.submitBtn.disabled, true,
      "Shared UX must not re-enable Submit while its answer request is pending");
  });

  test(`${consumer.file}: repeated submission starts only one pending request`, () => {
    const fixture = createFixture(consumer);
    fixture.submit();
    fixture.changeAnswer();
    fixture.submit();
    assert.equal(fixture.calls.length, 1,
      "The request owner must reject a second submission while the first is pending");
    assert.equal(fixture.calls[0].body.response.value, "A");
  });

  for (const failure of ["returned", "rejected"]) {
    test(`${consumer.file}: ${failure} request error releases ownership for retry`, async () => {
      const fixture = createFixture(consumer);
      const submitted = fixture.submit();
      const error = new Error("Fixture request failed");
      if (failure === "returned") fixture.calls[0].resolve({ error });
      else fixture.calls[0].reject(error);
      await submitted;
      assert.equal(fixture.elements.answerForm.dataset.answerSubmitting, undefined);
      assert.equal(fixture.elements.submitBtn.disabled, false);
      assert.match(fixture.elements.feedback.textContent, /Fixture request failed/);
      assert.equal(fixture.refreshEvents.length, 0);
      void fixture.submit();
      assert.equal(fixture.calls.length, 2);
      assert.equal(fixture.elements.answerForm.dataset.answerSubmitting, "true");
    });
  }

  for (const outcome of ["success", "error"]) {
    test(`${consumer.file}: stale ${outcome} preserves the new question and releases its controls`, async () => {
      const fixture = createFixture(consumer);
      const submitted = fixture.submit();
      fixture.replaceItem();
      assert.equal(fixture.elements.submitBtn.disabled, true,
        "Only one answer request is allowed until the current owner settles");
      fixture.calls[0].resolve(outcome === "error"
        ? { error: new Error("Old error") }
        : { data: { session: { status: "active" }, grading: { correct: true } } });
      await submitted;
      assert.equal(fixture.elements.feedback.textContent, "Current question feedback");
      assert.equal(fixture.elements.feedback.innerHTML, "Current question detail");
      assert.equal(fixture.elements.submitBtn.disabled, false);
      assert.equal(fixture.elements.answerForm.dataset.answerSubmitting, undefined);
      assert.deepEqual(fixture.refreshEvents, ["haiedu-answer-controls-refresh"]);
      void fixture.submit();
      assert.equal(fixture.calls.length, 2);
      assert.equal(fixture.calls[1].body.sessionItemId, "new-session-item");
    });
  }

  test(`${consumer.file}: successful acceptance preserves payload and keeps Submit disabled`, async () => {
    const fixture = createFixture(consumer);
    const submitted = fixture.submit();
    assert.deepEqual(JSON.parse(JSON.stringify(fixture.calls[0].body)), {
      sessionId: "fixture-session",
      sessionItemId: "fixture-session-item",
      itemId: "fixture-item",
      response: { value: "A" },
      responseTimeMs: 9,
      ...(consumer.file === "mastery.js" ? {} : { hintUsed: false }),
    });
    assert.equal(fixture.calls[0].name, consumer.file === "mastery.js" ? "submit-mastery-answer" : "submit-answer");
    fixture.calls[0].resolve({ data: { session: { status: "active" }, grading: { correct: true } } });
    await submitted;
    assert.equal(fixture.elements.answerForm.dataset.answerSubmitting, undefined);
    assert.equal(fixture.elements.submitBtn.disabled, true);
    assert.equal(fixture.elements.nextBtn.classList.contains("hidden"), false);
    assert.equal(fixture.refreshEvents.length, 0);
    fixture.changeAnswer();
    assert.equal(fixture.elements.submitBtn.disabled, true);
  });
}

test("practice.js: delayed diagnostic-gate decoding cannot replace the new question", async () => {
  const fixture = createFixture(consumers.find(({ file }) => file === "practice.js"));
  const decoded = deferred();
  const submitted = fixture.submit();
  fixture.calls[0].resolve({ error: {
    context: { json() {}, clone: () => ({ json: () => decoded.promise }) },
  } });
  await Promise.resolve();
  await Promise.resolve();
  fixture.replaceItem();
  decoded.resolve({ error: "chapter_diagnostic_required", messageHy: "Old gate" });
  await submitted;
  assert.equal(fixture.gates.length, 0);
  assert.equal(fixture.elements.submitBtn.disabled, false);
});

test("mastery.js: final-status rejection does not unlock an accepted answer", async () => {
  const fixture = createFixture(consumers.find(({ file }) => file === "mastery.js"));
  const finalStatus = deferred();
  fixture.useStatus(finalStatus.promise);
  const submitted = fixture.submit();
  fixture.calls[0].resolve({ data: { finalResult: {} } });
  await Promise.resolve();
  await Promise.resolve();
  finalStatus.reject(new Error("Fixture status failed"));
  await assert.rejects(submitted, /Fixture status failed/);
  assert.equal(fixture.elements.answerForm.dataset.answerSubmitting, undefined);
  assert.equal(fixture.elements.submitBtn.disabled, true);
  assert.equal(fixture.refreshEvents.length, 0);
});
