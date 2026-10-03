import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function harness() {
  const nodes = new Map(), listeners = new Map(), requests = [], urls = [];
  let focused = null;
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set(), attributes = new Map();
    const element = { id, value: "", innerHTML: "", textContent: "", tabIndex: 0, dataset: {}, events: new Map(),
      classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)),
        contains: x => classes.has(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
      setAttribute: (name, value) => attributes.set(name, value), getAttribute: name => attributes.get(name) ?? null,
      addEventListener(name, callback) { this.events.set(name, callback); },
      focus() { focused = this; }, scrollTo() {} };
    nodes.set(id, element);
    return element;
  }
  const keys = ["content", "preview", "sources", "history"];
  const buttons = keys.map(key => { const e = node("tab-"+key); e.dataset.guideTabButton = key; return e; });
  const panels = keys.map(key => { const e = node("panel-"+key); e.dataset.guideTab = key; return e; });
  const location = { href: "https://isolated.invalid/content-guides?id=template%3Aguide-alpha", search: "?id=template%3Aguide-alpha" };
  const history = Object.fromEntries(["replaceState", "pushState"].map(method => [method, (_state, _title, url) => {
    location.href = String(url); location.search = new URL(url).search; urls.push({ method, url: String(url) });
  }]));
  const supabase = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() {} },
    functions: { invoke(_name, { body }) { const pending = deferred(); requests.push({ body, ...pending }); return pending.promise; } } };
  const source = readFileSync("web/content-guides.js", "utf8").replace(/^import .*;\n/gm, "");
  const api = await vm.runInNewContext(`(async () => { ${source}
    return { renderEditor, wireGuideTabs, activateGuideTab, renderVariantDetails, markGuideDirty, previewGuide,
      prepare(guide, id = "template:guide-alpha") {
        selectedId = id; editorDirty = false;
        catalog = [{ guideScope: "template", guideSourceId: "guide-alpha" }];
        detail = { guide, variants: [{ id: "variant-alpha", code: "ITEM-A", prompt_hy: "Question A" },
          { id: "variant-beta", code: "ITEM-B", prompt_hy: "Question B" }], history: [], fallback: { available: false } };
      },
      edit() { editorDirty = true; },
      snapshot: () => ({ selectedId, editorDirty, detail, activeGuideTab })
    };
  })()`, {
    window: { __haieduSupabaseClient: supabase, location, history, scrollTo() {},
      addEventListener: (name, callback) => listeners.set(name, callback) },
    document: { getElementById: node, querySelectorAll(selector) {
      if (selector === "[data-guide-tab-button]") return buttons;
      if (selector === "[data-guide-tab]") return panels;
      return [];
    }, querySelector(selector) {
      const key = selector.match(/data-guide-tab="([^"]+)"/)?.[1];
      return key ? panels.find(p => p.dataset.guideTab === key) : null;
    } },
    URL, URLSearchParams, setTimeout, confirm: () => false,
  });
  const guide = { guideScope: "template", guideSourceId: "guide-alpha", lifecycleStatus: "draft", runtimeStatus: "draft",
    runtimeVersion: 1, authoringVersion: 1, itemTemplateCode: "TEMPLATE-A", content: { titleHy: "Saved title" }, referenceMetadata: {} };
  api.prepare(guide);
  node("guideTitleHy").value = "Saved title";
  node("previewVariant").value = "variant-alpha";
  return { api, node, buttons, panels, listeners, location, requests, urls, guide, focus: () => focused };
}

test("dirty browser Back preserves the editor and restores its matching URL", async () => {
  const h = await harness();
  h.api.edit(); h.node("guideTitleHy").value = "Unsaved fixture title";
  const prior = h.api.snapshot().detail;
  h.location.href = "https://isolated.invalid/content-guides"; h.location.search = "";
  h.listeners.get("popstate")();
  assert.equal(h.api.snapshot().selectedId, "template:guide-alpha");
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.api.snapshot().detail, prior);
  assert.equal(h.node("guideTitleHy").value, "Unsaved fixture title");
  assert.equal(new URL(h.location.href).searchParams.get("id"), "template:guide-alpha");
  assert.equal(h.requests.length, 0);
  assert.match(h.node("guideMessage").textContent, /չպահպանված|Չպահպանված/);
});

test("dirty Forward to the same guide does not reconstruct the form", async () => {
  const h = await harness();
  h.api.edit(); h.node("guideTitleHy").value = "Unsaved fixture title";
  h.listeners.get("popstate")();
  assert.equal(h.requests.length, 0);
  assert.equal(h.node("guideTitleHy").value, "Unsaved fixture title");
  assert.equal(h.api.snapshot().editorDirty, true);
});

test("clean browser Back still returns to the catalogue", async () => {
  const h = await harness();
  h.location.href = "https://isolated.invalid/content-guides"; h.location.search = "";
  h.listeners.get("popstate")();
  assert.equal(h.api.snapshot().selectedId, null);
  assert.equal(h.api.snapshot().editorDirty, false);
});

test("an unpublished runtime is never labelled as a published learner version", async () => {
  const h = await harness();
  h.api.renderEditor();
  const html = h.node("guideEditor").innerHTML;
  assert.doesNotMatch(html, /<strong>Հրապարակված տարբերակ<\/strong><br>1/);
  assert.match(html, /Սովորողին ցուցադրվող տարբերակ/);
  assert.match(html, /Չի հրապարակվել/);
});

test("a reopened authoring draft still shows its actually published runtime version", async () => {
  const h = await harness();
  h.api.prepare({ ...h.guide, runtimeStatus: "published", runtimeVersion: 2, authoringVersion: 6 });
  h.api.renderEditor();
  assert.match(h.node("guideEditor").innerHTML, /Սովորողին ցուցադրվող տարբերակ<\/strong><br>2/);
  assert.doesNotMatch(h.node("guideEditor").innerHTML, /Չի հրապարակվել/);
});

test("tab buttons and panels have reciprocal identities and one entry in tab order", async () => {
  const h = await harness();
  h.api.wireGuideTabs();
  for (let i = 0; i < h.buttons.length; i++) {
    assert.equal(h.buttons[i].getAttribute("aria-controls"), h.panels[i].id);
    assert.equal(h.panels[i].getAttribute("aria-labelledby"), h.buttons[i].id);
  }
  assert.deepEqual(h.buttons.map(e => e.tabIndex), [0, -1, -1, -1]);
});

test("Arrow, Home and End move focus and activate the matching preloaded panel", async () => {
  const h = await harness();
  h.api.wireGuideTabs();
  function key(index, value) { let prevented = false;
    h.buttons[index].events.get("keydown")?.({ key: value, preventDefault() { prevented = true; } });
    return prevented;
  }
  assert.equal(key(0, "ArrowRight"), true);
  assert.equal(h.focus(), h.buttons[1]);
  assert.equal(h.api.snapshot().activeGuideTab, "preview");
  assert.deepEqual(h.buttons.map(e => e.tabIndex), [-1, 0, -1, -1]);
  assert.equal(key(1, "End"), true); assert.equal(h.focus(), h.buttons[3]);
  assert.equal(key(3, "ArrowRight"), true); assert.equal(h.focus(), h.buttons[0]);
  assert.equal(key(0, "ArrowLeft"), true); assert.equal(h.focus(), h.buttons[3]);
  assert.equal(key(3, "Home"), true); assert.equal(h.focus(), h.buttons[0]);
  assert.equal(key(0, "ArrowDown"), false);
});

test("clearing the variant removes the old preview and validation", async () => {
  const h = await harness();
  h.node("previewPanel").innerHTML = "Old item A";
  h.node("validationPanel").innerHTML = "Old validation";
  h.node("previewVariant").value = "";
  h.api.renderVariantDetails();
  assert.equal(h.node("previewPanel").innerHTML, "");
  assert.equal(h.node("previewPanel").classList.contains("hidden"), true);
  assert.match(h.node("validationPanel").innerHTML, /դեռ չի գործարկվել/);
});

test("a late preview result cannot reappear after the variant is cleared", async () => {
  const h = await harness();
  const pending = h.api.previewGuide();
  assert.equal(h.requests[0].body.action, "preview");
  h.node("previewVariant").value = ""; h.api.renderVariantDetails();
  h.requests[0].resolve({ data: { preview: { itemCode: "ITEM-A" }, validation: { errors: [], warnings: [] } }, error: null });
  await pending;
  assert.equal(h.node("previewPanel").innerHTML, "");
  assert.equal(h.node("previewPanel").classList.contains("hidden"), true);
});

test("a stale preview failure cannot overwrite the new selection", async () => {
  const h = await harness();
  const pending = h.api.previewGuide();
  h.node("previewVariant").value = "variant-beta"; h.api.renderVariantDetails();
  h.requests[0].reject(new Error("isolated stale failure"));
  await pending;
  assert.equal(h.node("guideMessage").textContent, "");
});

test("editing guide content invalidates the preceding preview", async () => {
  const h = await harness();
  h.node("previewPanel").innerHTML = "Old hints";
  h.api.markGuideDirty();
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.node("previewPanel").innerHTML, "");
  assert.equal(h.node("submitReviewBtn").disabled, true);
});

test("a current preview renders its requested identity using only the read action", async () => {
  const h = await harness();
  const pending = h.api.previewGuide();
  h.requests[0].resolve({ data: { preview: { itemCode: "ITEM-A", itemPromptHy: "Question A", hint1Hy: "Hint A" },
    validation: { errors: [], warnings: [] } }, error: null });
  await pending;
  assert.match(h.node("previewPanel").innerHTML, /ITEM-A/);
  assert.match(h.node("previewPanel").innerHTML, /Hint A/);
  assert.deepEqual(h.requests.map(r => r.body.action), ["preview"]);
});
