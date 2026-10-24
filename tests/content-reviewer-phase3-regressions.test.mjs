import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function nodeStub() {
  const classes = new Set();
  return { value: "", dataset: {}, textContent: "", innerHTML: "", listeners: new Map(),
    classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)),
      contains: x => classes.has(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
    addEventListener(type, fn) { this.listeners.set(type, fn); } };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Execute the browser module with isolated I/O. The real refresh function runs;
// the item redraw is a spy so a late replacement can be observed without a DOM library.
async function editorHarness(mode = "item") {
  const nodes = new Map(["console", "authPanel", "authMessage", "signOutBtn", "refreshBtn",
    "consoleMessage", "detailPanel", "editPromptHy"].map(id => [id, nodeStub()]));
  const events = [], selections = [], reads = [];
  const auth = { getSession: async () => ({ data: { session: null } }), onAuthStateChange() {}, signOut: async () => {} };
  let response = deferred();
  const source = readFileSync("web/content.js", "utf8").replace(/^import .*;\n/gm, "");
  const sandbox = {
    document: { body: { dataset: { contentMode: mode } }, getElementById: id => nodes.get(id) ?? null, querySelectorAll: () => [] },
    window: { __haieduSupabaseClient: { auth }, addEventListener() {}, dispatchEvent: event => events.push(event) },
    location: { search: "?id=question-alpha" }, URLSearchParams,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    clearContentDashboardCache() {},
    loadContentDashboard(session, options) { reads.push({ session, options }); return response.promise; },
  };
  const api = await vm.runInNewContext(`(async () => { ${source}
    selectItem = async (id) => {
      trackSelection(id);
      selectedId = id;
      editorDirty = false;
      document.getElementById("editPromptHy").value = "fresh saved text";
      selectedDetail = { item: { id, currentVersion: 5 } };
    };
    renderStats = () => {};
    populateSkillFilter = () => {};
    renderRows = () => {};
    return {
      refresh,
      prepare() {
        activeSession = { user: { id: "isolated-reviewer" } };
        selectedId = "question-alpha";
        selectedDetail = { item: { id: selectedId, currentVersion: 4 } };
        dashboard = { items: [{ id: selectedId }], marker: "previous" };
        document.getElementById("editPromptHy").value = "previous saved text";
        editorDirty = false;
      },
      edit() { editorDirty = true; document.getElementById("editPromptHy").value = "unsaved fixture text"; },
      discard() { editorDirty = false; },
      snapshot() { return { editorDirty, selectedId, selectedDetail, dashboard }; }
    };
  })()`, { ...sandbox, trackSelection: id => selections.push(id) });
  api.prepare();
  return { api, nodes, events, selections, reads, response: () => response, nextRead() { response = deferred(); } };
}

const fresh = () => ({ items: [{ id: "question-alpha" }], marker: "fresh" });

test("a pending refresh preserves edits entered before its response returns", async () => {
  const h = await editorHarness();
  const prior = h.api.snapshot();
  const pending = h.api.refresh("question-alpha", { force: true });
  assert.equal(h.reads.length, 1);
  h.api.edit();
  h.response().resolve(fresh());
  assert.equal(await pending, true);
  assert.equal(h.nodes.get("editPromptHy").value, "unsaved fixture text");
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.api.snapshot().selectedDetail, prior.selectedDetail);
  assert.equal(h.api.snapshot().dashboard, prior.dashboard);
  assert.equal(h.selections.length, 0, "late read must not reconstruct a dirty editor");
  assert.equal(h.events.length, 0, "unapplied dashboard must not be announced to companions");
});

test("a clean item refresh still applies the authoritative saved detail", async () => {
  const h = await editorHarness();
  const pending = h.api.refresh("question-alpha", { force: true });
  h.response().resolve(fresh());
  assert.equal(await pending, true);
  assert.deepEqual(h.selections, ["question-alpha"]);
  assert.equal(h.nodes.get("editPromptHy").value, "fresh saved text");
  assert.equal(h.api.snapshot().dashboard.marker, "fresh");
  assert.equal(h.events.length, 1);
});

test("refresh after deliberate discard can apply fresh saved content", async () => {
  const h = await editorHarness();
  const pending = h.api.refresh("question-alpha", { force: true });
  h.api.edit();
  h.response().resolve(fresh());
  await pending;
  h.api.discard();
  h.nextRead();
  const retry = h.api.refresh("question-alpha", { force: true });
  h.response().resolve(fresh());
  assert.equal(await retry, true);
  assert.deepEqual(h.selections, ["question-alpha"]);
  assert.equal(h.api.snapshot().editorDirty, false);
});

test("a rejected read preserves local edits and reports failure", async () => {
  const h = await editorHarness();
  const pending = h.api.refresh("question-alpha", { force: true });
  h.api.edit();
  h.response().reject(new Error("isolated read failure"));
  assert.equal(await pending, false);
  assert.equal(h.nodes.get("editPromptHy").value, "unsaved fixture text");
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.nodes.get("consoleMessage").textContent, "isolated read failure");
  assert.equal(h.selections.length, 0);
});

test("a clean bank refresh still announces and applies its dashboard", async () => {
  const h = await editorHarness("bank");
  const pending = h.api.refresh(null, { force: true });
  h.response().resolve(fresh());
  assert.equal(await pending, true);
  assert.equal(h.api.snapshot().dashboard.marker, "fresh");
  assert.equal(h.api.snapshot().selectedId, null);
  assert.equal(h.events.length, 1);
  assert.equal(h.selections.length, 0);
});

async function curriculumHarness() {
  const nodes = new Map(["gradeFilter", "subjectFilter", "programFilter", "unitFilter"].map(id => [id, nodeStub()]));
  const source = readFileSync("web/content-curriculum.js", "utf8").replace(/^import .*;\n/gm, "");
  const api = await vm.runInNewContext(`(async () => { ${source}
    return {
      rebuildSelectors,
      setCatalogue(catalog) { data = { catalog }; },
      initializeAll() { initialized = true; }
    };
  })()`, {
    $: id => nodes.get(id) ?? null, location: { search: "" }, URLSearchParams,
    window: { addEventListener() {} },
    contentSupabase: { auth: { onAuthStateChange() {}, getSession: async () => ({ data: { session: null } }) } },
  });
  api.setCatalogue({
    grades: [{ id: "grade-alpha", labelHy: "Դասարան Ա", number: 2 }],
    subjects: [{ id: "subject-alpha", nameHy: "Առարկա Ա" }, { id: "subject-beta", nameHy: "Առարկա Բ" }],
    programs: [
      { id: "program-alpha", gradeId: "grade-alpha", subjectId: "subject-alpha", subjectNameHy: "Առարկա Ա", gradeLabelHy: "Դասարան Ա", versionLabel: "version-alpha" },
      { id: "program-beta", gradeId: "grade-alpha", subjectId: "subject-beta", subjectNameHy: "Առարկա Բ", gradeLabelHy: "Դասարան Ա", versionLabel: "version-beta" },
    ],
    units: [{ id: "unit-alpha", programId: "program-alpha", code: "UNIT-A" }, { id: "unit-beta", programId: "program-beta", code: "UNIT-B" }],
  });
  api.initializeAll();
  return { api, nodes };
}

test("programme reset option stays Armenian across subject changes and all-content mode", async () => {
  const h = await curriculumHarness();
  for (const subject of ["subject-alpha", "subject-beta", ""]) {
    h.nodes.get("subjectFilter").value = subject;
    h.api.rebuildSelectors("subject");
    const html = h.nodes.get("programFilter").innerHTML;
    const defaultLabel = html.match(/^<option value=""[^>]*>([^<]+)<\/option>/)?.[1];
    assert.equal(defaultLabel, "Բոլոր ծրագրերը");
    assert.equal(h.nodes.get("programFilter").value, "");
    assert.ok(html.includes(subject === "subject-beta" ? "program-beta" : "program-alpha"));
  }
});

test("localized selector rebuild preserves governed programme and unit identity", async () => {
  const h = await curriculumHarness();
  h.nodes.get("programFilter").value = "program-beta";
  h.nodes.get("unitFilter").value = "unit-beta";
  h.api.rebuildSelectors();
  assert.equal(h.nodes.get("programFilter").value, "program-beta");
  assert.equal(h.nodes.get("unitFilter").value, "unit-beta");
  assert.equal(h.nodes.get("subjectFilter").value, "");
  assert.ok(h.nodes.get("unitFilter").innerHTML.includes("unit-beta"));
  assert.ok(!h.nodes.get("unitFilter").innerHTML.includes("unit-alpha"));
});
