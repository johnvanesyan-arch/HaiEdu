import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";

// Offline DOM regression, not an authentication or production acceptance test.
// The real browser and production script are used; only the role-gate changes
// normally made by each dashboard's authenticated controller are simulated.
const source = await readFile(
  process.env.ROLE_LAYOUT_SOURCE ?? new URL("../../web/role-layout.js", import.meta.url),
  "utf8",
);
const schoolViews = ["overviewPanel", "yearPanel", "teachersPanel", "teacherPanel", "pendingPanel"];
const platformViews = ["overviewSection", "schoolsSection", "accountsSection", "archiveSection", "deletionsSection", "auditSection"];
const terminalSurfaces = ["authPanel", "denied", "signedOut", "mfaPanel"];
const options = { timeout: 20_000 };
let browser;

before(async () => { browser = await chromium.launch({ headless: true }); }, { timeout: 30_000 });
after(async () => { await browser?.close(); });

async function fixture(t, workspace = "school", initialView = "") {
  const context = await browser.newContext({ serviceWorkers: "block" });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const views = workspace === "school" ? schoolViews : platformViews;
  const panels = views.map((id) => `<section id="${id}" class="${workspace === "school" ? "hidden" : ""}">${id}</section>`).join("");
  const html = `<!doctype html><html><head><style>.hidden,[hidden]{display:none!important}</style></head>
    <body data-role-workspace="${workspace}"><main>
      <header class="school-admin-header">
        <button id="probe" type="button">Responsiveness probe</button><output id="probeCount">0</output>
        <button id="signOutBtn" type="button">Original sign out</button>
      </header>
      ${terminalSurfaces.map((id) => `<section id="${id}" class="hidden">${id}</section>`).join("")}
      ${workspace === "platform" ? `<div id="console" class="hidden">${panels}</div>` : panels}
    </main></body></html>`;
  const documentURL = `https://role-layout.test/${workspace === "school" ? "school-admin" : "admin"}.html`;
  // Even the main document comes from this route. No external server is used.
  await context.route("**/*", (route) => {
    const request = route.request();
    if (request.isNavigationRequest() && request.url().split("#")[0] === documentURL) {
      return route.fulfill({ status: 200, contentType: "text/html", body: html });
    }
    return route.abort("blockedbyclient");
  });
  await page.addInitScript(() => {
    const NativeMutationObserver = window.MutationObserver;
    window.__nativeMutationObserver = NativeMutationObserver;
    window.__layoutProbe = { deliveries: 0, runaway: false };
    window.MutationObserver = class extends NativeMutationObserver {
      constructor(callback) {
        super((records, observer) => {
          // A timer cannot stop a starving microtask queue. Disconnect inside
          // native delivery so the broken source fails instead of hanging CI.
          if (++window.__layoutProbe.deliveries > 64) {
            window.__layoutProbe.runaway = true;
            observer.disconnect();
            return;
          }
          callback(records, observer);
        });
      }
    };
  });
  await page.goto(`${documentURL}${initialView ? `#${initialView}` : ""}`);
  await page.evaluate(() => {
    document.getElementById("probe").addEventListener("click", () => {
      const output = document.getElementById("probeCount");
      output.textContent = String(Number(output.textContent) + 1);
    });
  });
  await page.addScriptTag({ content: source });
  return { page, errors, views, workspace };
}

async function assertResponsive({ page, errors }) {
  const result = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const first = window.__layoutProbe.deliveries;
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { ...window.__layoutProbe, settled: first === window.__layoutProbe.deliveries };
  });
  assert.equal(result.runaway, false, `MutationObserver exceeded its delivery budget: ${JSON.stringify(result)}`);
  assert.equal(result.settled, true, "Role-layout mutations must settle between timer tasks");
  const priorCount = Number(await page.locator("#probeCount").textContent());
  await page.locator("#probe").click();
  assert.equal(Number(await page.locator("#probeCount").textContent()), priorCount + 1, "Browser input must remain usable");
  assert.deepEqual(errors, [], "The production script must not throw in the fixture");
}

async function authorize(state) {
  const gateIds = state.workspace === "school" ? state.views : ["console"];
  await state.page.evaluate((ids) => {
    for (const id of ids) document.getElementById(id).classList.remove("hidden");
  }, gateIds);
  await assertResponsive(state);
  assert.equal(await state.page.locator(".hm-role-sidebar-loading").count(), 0);
  assert.equal(await state.page.locator(".hm-workspace-loading").count(), 0);
}

async function assertSelected({ page, views, workspace }, selected) {
  const visibility = await page.evaluate((ids) => ids.map((id) => {
    const element = document.getElementById(id);
    return { id, hidden: element.hidden, visible: getComputedStyle(element).display !== "none" };
  }), views);
  assert.deepEqual(visibility, views.map((id) => ({ id, hidden: id !== selected, visible: id === selected })));
  const expectedHref = selected === views[0]
    ? `./${workspace === "school" ? "school-admin" : "admin"}.html`
    : `#${selected}`;
  const current = page.locator('.hm-role-nav a[aria-current="page"]');
  assert.equal(await current.count(), 1);
  assert.equal(await current.getAttribute("href"), expectedHref);
}

for (const selected of schoolViews) {
  test(`school role activation settles on ${selected}`, options, async (t) => {
    const state = await fixture(t, "school", selected === schoolViews[0] ? "" : selected);
    assert.equal(await state.page.locator(".hm-workspace-loading").count(), 1);
    await authorize(state);
    await assertSelected(state, selected);
  });
}

test("school hash navigation keeps timers and input responsive", options, async (t) => {
  const state = await fixture(t);
  await authorize(state);
  for (const selected of ["yearPanel", "teachersPanel", "teacherPanel", "pendingPanel", "yearPanel"]) {
    await state.page.locator(`.hm-role-nav a[href="#${selected}"]`).click();
    await assertResponsive(state);
    await assertSelected(state, selected);
  }
  // Unknown and empty hashes must both return to the existing default view.
  for (const hash of ["unknown-view", ""]) {
    await state.page.evaluate((value) => { window.location.hash = value; }, hash);
    await state.page.waitForFunction(() => !document.getElementById("overviewPanel").hidden);
    await assertResponsive(state);
    await assertSelected(state, "overviewPanel");
  }
});

test("closed gates and terminal auth surfaces keep protected sections closed", options, async (t) => {
  const state = await fixture(t);
  const { page } = state;
  const assertClosed = async () => {
    const visible = await page.evaluate((ids) => ids.filter((id) => getComputedStyle(document.getElementById(id)).display !== "none"), schoolViews);
    assert.deepEqual(visible, []);
    assert.equal(await page.locator(".hm-role-nav").count(), 0);
  };
  await assertResponsive(state);
  await assertClosed();
  for (const id of terminalSurfaces) {
    await page.evaluate((value) => document.getElementById(value).classList.remove("hidden"), id);
    await assertResponsive(state);
    await assertClosed();
    assert.equal(await page.locator(".hm-role-sidebar").count(), 0);
    assert.equal(await page.locator(".hm-workspace-loading").count(), 0);
    await page.evaluate((value) => document.getElementById(value).classList.add("hidden"), id);
    await assertResponsive(state);
  }
  await authorize(state);
  await page.evaluate((ids) => {
    document.getElementById("signOutBtn").addEventListener("click", () => {
      for (const id of ids) document.getElementById(id).classList.add("hidden");
      document.getElementById("signedOut").classList.remove("hidden");
    });
  }, schoolViews);
  await page.locator(".hm-sidebar-signout").click();
  await assertResponsive(state);
  await assertClosed();
  assert.equal(await page.locator("#signedOut").isVisible(), true);
  assert.equal(await page.locator(".hm-workspace-loading").count(), 0);
});

test("platform views settle without redundant visibility writes", options, async (t) => {
  const state = await fixture(t, "platform");
  const { page } = state;
  await authorize(state);
  for (const selected of platformViews) {
    if (selected !== platformViews[0]) {
      await page.locator(`.hm-role-nav a[href="#${selected}"]`).click();
    }
    await assertResponsive(state);
    await assertSelected(state, selected);
    await page.evaluate(() => {
      window.__hiddenWrites = 0;
      const observer = new window.__nativeMutationObserver((records) => { window.__hiddenWrites += records.length; });
      observer.observe(document.getElementById("console"), { attributes: true, subtree: true, attributeFilter: ["hidden"] });
      window.__visibilityObserver = observer;
      // A legitimate shell attribute change asks the layout to resync.
      document.getElementById("console").classList.toggle("fixture-shell-state");
    });
    await assertResponsive(state);
    assert.equal(await page.evaluate(() => window.__hiddenWrites), 0, "An unchanged platform view must not rewrite hidden attributes");
    await page.evaluate(() => window.__visibilityObserver.disconnect());
  }
});
