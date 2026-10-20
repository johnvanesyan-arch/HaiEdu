import {matchingDefinition,matchingKey,orderingDefinition,orderingKey} from '../fixtures/arrangement-db.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";
import { dashboardFixture } from "../fixtures/content-dashboard-endpoint.mjs";

// Native browser regression with real UI modules and offline auth/network doubles.
// This covers DOM/event lifecycle, not live backend authorization or content workflows.
const sources = new Map(await Promise.all(["content.js", "content-review-workflow.js", "learning-stimulus.mjs", "learning-navigation.mjs", "typed-fields-editor.mjs", "typed-fields-contract.mjs", "typed-fields-ui.mjs", "arrangement-ui.mjs", "arrangement-editor.mjs", "arrangement-contract.mjs"].map(async (name) => [name, await readFile(new URL(`../../web/${name}`, import.meta.url), "utf8")])));
const origin = "https://content-lifecycle.test";
let browser;
before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{}) }); }, { timeout: 30_000 });
after(async () => { await browser?.close(); });

async function fixture(t, moduleName = "content-review-workflow.js", initial = "active") {
  const context = await browser.newContext({ serviceWorkers: "block" });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(({ initial }) => {
    const session = { user: { id: "fixture-user" } };
    const listeners = [], timers = new Map();
    const nativeTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    window.__contentProbe = { requests: [], timers, observerDeliveries: 0, runaway: false };
    window.setTimeout = (callback, delay, ...args) => {
      const id = nativeTimeout(() => { timers.delete(id); callback(...args); }, delay);
      timers.set(id, delay);
      return id;
    };
    window.clearTimeout = (id) => { timers.delete(id); nativeClearTimeout(id); };
    const NativeMutationObserver = window.MutationObserver;
    window.__nativeMutationObserver = NativeMutationObserver;
    window.MutationObserver = class extends NativeMutationObserver {
      constructor(callback) {
        super((records, observer) => {
          if (++window.__contentProbe.observerDeliveries > 64) {
            window.__contentProbe.runaway = true;
            observer.disconnect();
            return;
          }
          callback(records, observer);
        });
      }
    };
    let resolveInitial;
    const initialRead = new Promise((resolve) => { resolveInitial = resolve; });
    window.__completeInitial = () => resolveInitial({ data: { session } });
    window.__authEvent = (event, next = session) => listeners.forEach((callback) => callback(event, next));
    window.__haieduSupabaseClient = {
      auth: {
        getSession: () => initial === "pending" ? initialRead : Promise.resolve({ data: { session: initial === "active" ? session : null } }),
        onAuthStateChange: (callback) => { listeners.push(callback); window.__authSubscriptions = listeners.length; },
      },
      functions: {
        invoke: async (name, { body }) => {
          window.__contentProbe.requests.push({ name, body });
          return { data: { item: { reviewStatus: "approved" }, reviews: [] }, error: null };
        },
      },
    };
  }, { initial });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    let body, contentType = "text/javascript";
    if (url.origin === origin && url.pathname === "/content-item.html") {
      contentType = "text/html";
      body = `<!doctype html><html><head><style>.hidden{display:none}</style></head>
        <body data-content-mode="item" data-content-item-id="fixture-item"><main>
          <button id="probe">Probe</button><output id="probeCount">0</output>
          <button id="signOutBtn">Sign out</button><button id="refreshBtn">Refresh</button><section id="authPanel"><p id="authMessage"></p></section>
          <section id="console"><section id="detailPanel"><h2>Loading</h2></section><p id="consoleMessage"></p></section>
        </main><script type="module" src="./${moduleName}"></script></body></html>`;
    } else if (url.origin === origin && sources.has(url.pathname.slice(1))) {
      body = sources.get(url.pathname.slice(1));
      if (url.pathname === "/content.js") body += `
window.__editorFixture = { wireEditorRows, addOptionRow, selectItem, collect:()=>buildRevisionPayload(selectedDetail.item),
 preview(detail) {
   dashboard = {items:[{id:"fixture-item", ...detail.item, skill:{code:"QA-SKILL"}}, {id:"second-item", ...detail.item, skill:{code:"QA-SECOND-SKILL"}}]};
   selectedId = "fixture-item"; selectedDetail = detail; renderDetail();
 }
};`;
      body += "\nwindow.__moduleReady = true;";
    } else if (url.origin === origin && url.pathname === "/config.js") {
      body = 'export const SUPABASE_URL="https://fixture.invalid", SUPABASE_PUBLISHABLE_KEY="fixture-only";';
    } else if (url.origin === origin && url.pathname === "/content-workspace.js") {
      body = "export function clearContentDashboardCache() {} export async function loadContentDashboard() { if(window.__failDashboard) throw new Error('QA տվյալները չհաջողվեց թարմացնել'); return window.__dashboardResponse || {items: [], stats: {}}; }";
    } else if (url.href === "https://esm.sh/@supabase/supabase-js@2") {
      body = "export function createClient() { return window.__haieduSupabaseClient; }";
    } else return route.abort("blockedbyclient");
    await route.fulfill({ status: 200, contentType, headers: { "access-control-allow-origin": "*" }, body });
  });
  // A deliberately pending module-level session read must not block the harness.
  await page.goto(`${origin}/content-item.html?id=fixture-item`, { waitUntil: "commit" });
  await page.waitForSelector("#probe");
  await page.waitForFunction(() => window.__authSubscriptions > 0);
  await page.evaluate(() => {
    document.getElementById("probe").addEventListener("click", () => {
      const count = document.getElementById("probeCount");
      count.textContent = String(Number(count.textContent) + 1);
    });
  });
  if (initial !== "pending") await page.waitForFunction(() => window.__moduleReady);
  return { page, errors };
}

async function assertSettled({ page, errors }) {
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => ({ pendingTimers: window.__contentProbe.timers.size, runaway: window.__contentProbe.runaway }));
  assert.equal(result.runaway, false, "Native mutation delivery exceeded its bound");
  assert.equal(result.pendingTimers, 0, "Content UI work must settle instead of polling indefinitely");
  const previous = Number(await page.locator("#probeCount").textContent());
  await page.locator("#probe").click();
  assert.equal(Number(await page.locator("#probeCount").textContent()), previous + 1);
  assert.deepEqual(errors, []);
}

test("review detail loading settles, then enhances one DOM update once", { timeout: 20_000 }, async (t) => {
  const state = await fixture(t);
  await assertSettled(state);
  assert.equal(await state.page.evaluate(() => window.__contentProbe.requests.length), 0);
  await state.page.evaluate(() => {
    document.getElementById("detailPanel").innerHTML = '<div class="detail-heading">Fixture item</div><section id="contentDecisionSection"></section>';
  });
  await state.page.waitForSelector("#reviewHistorySection");
  await assertSettled(state);
  assert.equal(await state.page.evaluate(() => window.__contentProbe.requests.length), 1);
});

test("review initialization cannot resume from a late session after logout", { timeout: 20_000 }, async (t) => {
  const state = await fixture(t, "content-review-workflow.js", "pending");
  await state.page.evaluate(() => { window.__authEvent("SIGNED_OUT", null); window.__completeInitial(); });
  await state.page.waitForFunction(() => window.__moduleReady);
  await assertSettled(state);
  assert.equal(await state.page.evaluate(() => window.__contentProbe.requests.length), 0);
});

test("review mutations after logout do not restart protected reads", { timeout: 20_000 }, async (t) => {
  const state = await fixture(t);
  await state.page.evaluate(() => {
    window.__authEvent("SIGNED_OUT", null);
    document.getElementById("detailPanel").innerHTML = '<div class="detail-heading">Late stale detail</div><section id="contentDecisionSection"></section>';
  });
  await assertSettled(state);
  assert.equal(await state.page.evaluate(() => window.__contentProbe.requests.length), 0);
  assert.equal(await state.page.locator("#reviewHistorySection").count(), 0);
});

test("adding editor rows keeps native option and removal handlers singular", { timeout: 20_000 }, async (t) => {
  const state = await fixture(t, "content.js", "none");
  const { page } = state;
  await page.evaluate(() => {
    document.getElementById("console").classList.remove("hidden");
    document.getElementById("detailPanel").innerHTML = `
      <div id="optionEditor">
        <div data-option-row><input class="option-key" value="A"><button class="remove-option-btn">Remove A</button></div>
        <div data-option-row><input class="option-key" value="B"><button class="remove-option-btn">Remove B</button></div>
      </div><select id="answerSingleChoice"><option>A</option><option selected>B</option></select>
      <div id="misconceptionEditor"><div data-misconception-row><button class="remove-misconception-btn">Remove mapping</button></div></div>`;
    window.__editorFixture.wireEditorRows();
    window.__editorFixture.addOptionRow();
    window.__editorFixture.addOptionRow();
    window.__answerWrites = 0;
    new window.__nativeMutationObserver((records) => { window.__answerWrites += records.length; })
      .observe(document.getElementById("answerSingleChoice"), { childList: true });
    window.__mappingWrites = 0;
    new window.__nativeMutationObserver((records) => { window.__mappingWrites += records.length; })
      .observe(document.getElementById("misconceptionEditor"), { childList: true });
  });
  await page.locator(".option-key").first().fill("Z");
  assert.equal(await page.evaluate(() => window.__answerWrites), 1);
  assert.equal(await page.locator("#answerSingleChoice").inputValue(), "B");
  await page.evaluate(() => { window.__answerWrites = 0; });
  await page.locator(".remove-option-btn").first().click();
  assert.equal(await page.evaluate(() => window.__answerWrites), 1);
  assert.equal(await page.locator("#answerSingleChoice").inputValue(), "B");
  await page.locator(".remove-misconception-btn").click();
  assert.equal(await page.evaluate(() => window.__mappingWrites), 2, "One row removal and one empty-state insertion are expected");
  await assertSettled(state);
});

const mediaDetail = (stimulus) => ({
  item: { code: "QA-MEDIA", type: "single_choice", promptHy: "Փորձի մասին հարց", stimulus,
    config: {}, versionNo: 1, difficulty: 2, reviewStatus: "needs_review" },
  options: [{key: "A", contentHy: "Առաջին տարբերակ"}, {key: "B", contentHy: "Երկրորդ տարբերակ"}],
  answerKey: {answer: "A"}, editing: {contentEditable: false},
});

for (const failedRefresh of [false, true]) {
  test(`passed QA enables one approval after ${failedRefresh ? 'a failed read and explicit refresh' : 'a successful read'} in a large bank`, { timeout: 20_000 }, async (t) => {
    const state = await fixture(t, 'content.js', 'active'), { page } = state;
    // The real dashboard handler produces the 382-item response. Only transport
    // and auth are doubles; approval below never touches production.
    const response = await dashboardFixture().call();
    assert.equal(response.status, 200);
    response.body.items[0].id = 'fixture-item';
    await page.evaluate(({ dashboard, failedRefresh, detail }) => {
      window.__editorFixture.preview(detail);
      window.__dashboardResponse = dashboard;
      window.__workflowActions = [];
      window.__haieduSupabaseClient.functions.invoke = async (_name, { body }) => {
        window.__workflowActions.push(body.action);
        if (body.action === 'run_qa') {
          window.__failDashboard = failedRefresh;
          return { data: { qa: { passed: true } }, error: null };
        }
        if (body.action === 'approve') {
          await new Promise(resolve => { window.__finishApproval = resolve; });
          dashboard.items[0].reviewStatus = 'approved';
          return { data: { approved: true, versionNo: 2 }, error: null };
        }
        return { data: { detail }, error: null };
      };
    }, { dashboard: response.body, failedRefresh, detail: { ...mediaDetail({}), item: { ...mediaDetail({}).item, versionNo: 2 }, editing: { contentEditable: true } } });
    await page.getByRole('button', { name: 'QA և ստուգում', exact: true }).click();
    assert.equal(await page.locator('#approveBtn').isDisabled(), true);
    await page.locator('#runQaBtn').click();
    if (failedRefresh) {
      await page.waitForFunction(() => document.getElementById('consoleMessage').textContent === 'QA տվյալները չհաջողվեց թարմացնել');
      assert.equal(await page.locator('#approveBtn').isDisabled(), true);
      await page.evaluate(() => { window.__failDashboard = false; });
      await page.locator('#refreshBtn').click();
    }
    await page.waitForFunction(() => document.getElementById('approveBtn')?.disabled === false);
    await page.locator('#approveBtn').click();
    await page.locator('#approveBtn').click();
    assert.deepEqual(await page.evaluate(() => window.__workflowActions.filter(action => action === 'approve')), ['approve']);
    await page.evaluate(() => window.__finishApproval());
    await page.waitForFunction(() => document.getElementById('approveBtn')?.textContent === 'Հաստատված');
    assert.equal(await page.locator('#approveBtn').isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__workflowActions.filter(action => action === 'run_qa').length), 1);
    await assertSettled(state);
  });
}

test("reviewer renders the same source image and alternative text on desktop and mobile", { timeout: 20_000 }, async (t) => {
  const state = await fixture(t, "content.js", "active");
  const {page} = state;
  const bytes = await readFile(new URL("../../web/assets/textbook/physics7-2023/figure-24.png", import.meta.url));
  await page.route("https://www.haiedu.am/assets/textbook/**", route => route.fulfill({status: 200, contentType: "image/png", body: bytes}));
  const stimulus = {kind: "image", url: "https://www.haiedu.am/assets/textbook/physics7-2023/figure-24.png", altHy: "Ջրի և գազի անոթները տաքացնելիս"};
  for (const width of [1280, 360]) {
    await page.setViewportSize({width, height: 900});
    await page.evaluate(detail => window.__editorFixture.preview(detail), mediaDetail(stimulus));
    const img = page.locator("#learnerPreviewStimulus img");
    await img.evaluate(el => el.decode());
    assert.equal(await img.getAttribute("alt"), stimulus.altHy);
    assert.equal(await img.getAttribute("src"), stimulus.url);
    assert.equal(await img.evaluate(el => el.getBoundingClientRect().right <= innerWidth), true);
    assert.equal(await page.locator(".learner-preview-option").count(), 2);
  }
  await assertSettled(state);
});

test("reviewer clears old media and isolates invalid stimuli without losing the question", { timeout: 20_000 }, async (t) => {
  const state = await fixture(t, "content.js", "active"), {page} = state;
  for (const stimulus of [{kind:"image",url:"javascript:window.__injected=true",altHy:"Նկար"}, {kind:"image",url:"http://insecure.test/image.png",altHy:"Նկար"}, {kind:"image",url:"https://example.test/image.png"}, {kind:"unsupported"}]) {
    await page.evaluate(detail => window.__editorFixture.preview(detail), mediaDetail(stimulus));
    assert.equal(await page.locator("#learnerPreviewStimulus img").count(), 0);
    assert.equal(await page.locator("#learnerPreviewStimulus[role=alert]").count(), 1);
    assert.equal(await page.locator(".learner-preview-option").count(), 2);
  }
  await page.evaluate(detail => window.__editorFixture.preview(detail), mediaDetail({kind:"text",contentHy:"Դիտման տվյալներ"}));
  assert.equal(await page.locator("#learnerPreviewStimulus").textContent(), "Դիտման տվյալներ");
  await page.evaluate(detail => window.__editorFixture.preview(detail), mediaDetail({}));
  assert.equal(await page.locator("#learnerPreviewStimulus").textContent(), "");
  assert.equal(await page.locator("#learnerPreviewStimulus[role=alert]").count(), 0);
  assert.equal(await page.evaluate(() => Boolean(window.__injected)), false);
  await assertSettled(state);
});

test("late item or account responses cannot restore a previous stimulus", { timeout: 20_000 }, async (t) => {
  const state = await fixture(t, "content.js", "active"), {page} = state;
  await page.evaluate(detail => {
    window.__editorFixture.preview(detail);
    window.__pendingDetails = {};
    window.__haieduSupabaseClient.functions.invoke = (_name,{body}) => new Promise(resolve => {window.__pendingDetails[body.itemId] = resolve;});
    window.__editorFixture.selectItem("fixture-item");
    window.__editorFixture.selectItem("second-item");
  }, mediaDetail({}));
  await page.evaluate(detail => window.__pendingDetails["second-item"]({data:{detail},error:null}), mediaDetail({kind:"text",contentHy:"Նոր հարցի տվյալներ"}));
  await page.waitForFunction(() => document.getElementById("learnerPreviewStimulus")?.textContent === "Նոր հարցի տվյալներ");
  await page.evaluate(detail => window.__pendingDetails["fixture-item"]({data:{detail},error:null}), mediaDetail({kind:"text",contentHy:"Հին հարցի տվյալներ"}));
  assert.equal(await page.locator("#learnerPreviewStimulus").textContent(), "Նոր հարցի տվյալներ");
  await page.evaluate(() => {window.__editorFixture.selectItem("fixture-item"); window.__authEvent("SIGNED_OUT",null);});
  await page.evaluate(detail => window.__pendingDetails["fixture-item"]({data:{detail},error:null}), mediaDetail({kind:"text",contentHy:"Անջատված հաշվի տվյալներ"}));
  assert.equal(await page.locator("#learnerPreviewStimulus").count(), 0);
  await assertSettled(state);
});

for(const [type,definition,key] of [['matching',matchingDefinition,matchingKey],['ordering',orderingDefinition,orderingKey]]) {
 test(`${type} reviewer edits structured definitions and keys without exposing them in the learner preview`,async t=>{
  const state=await fixture(t,'content.js','active'),{page}=state;
  const detail={...mediaDetail({}),item:{...mediaDetail({}).item,type,itemFamily:'application',config:{responseDefinition:definition}},options:[],answerKey:{answer:key},editing:{contentEditable:true}};
  await page.evaluate(detail=>window.__editorFixture.preview(detail),detail);
  assert.equal(await page.locator('[data-arrangement] select').count(),type==='matching'?2:3);
  assert.deepEqual(await page.locator('[data-arrangement] select').evaluateAll(xs=>xs.map(x=>x.value)),type==='matching'?['','']:['','','']);
  await page.getByRole('button',{name:'Բովանդակություն',exact:true}).click();
  const rows=page.locator('[data-arr-group="'+(type==='matching'?'sources':'segments')+'"] [data-arrangement-editor-row]');
  await rows.first().locator('[data-arr-label]').fill('Revised synthetic label');
  const payload=await page.evaluate(()=>window.__editorFixture.collect());assert.equal(payload.responseDefinition[type==='matching'?'sources':'segments'][0].label,'Revised synthetic label');assert.deepEqual(payload.answerKey.answer,key);
  assert.equal(await page.locator('#approveBtn').isDisabled(),true);
  const group=type==='matching'?'targets':'segments';await page.locator('[data-add-arrangement="'+group+'"]').click();
  assert.equal(await page.locator('[data-arr-group="'+group+'"] [data-arrangement-editor-row]').count(),4);
  await page.locator('[data-arr-group="'+group+'"] [data-remove-arrangement]').last().click();
  assert.deepEqual((await page.evaluate(()=>window.__editorFixture.collect())).answerKey.answer,key);
  await assertSettled(state);
 });
}
