import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

test("guide filter actions align with dropdowns and fit responsive layouts", { timeout: 30_000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Static catalog fixture: real markup, styles and sidebar; no auth or API.
    const html = (await readFile(new URL("../../web/content-guides.html", import.meta.url), "utf8"))
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
      .replace('class="hidden guide-console catalog-mode"', 'class="guide-console catalog-mode"')
      .replace("</body>", '<script src="./role-layout.js"></script></body>');
    const assets = Object.fromEntries(await Promise.all(["styles.css", "content-guides.css", "ux.css", "role-layout.css", "role-layout.js"]
      .map(async (name) => [`/${name}`, await readFile(new URL(`../../web/${name}`, import.meta.url), "utf8")])));
    await page.route("**/*", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/content-guides.html") return route.fulfill({ contentType: "text/html", body: html });
      if (assets[path]) return route.fulfill({ contentType: path.endsWith(".js") ? "text/javascript" : "text/css", body: assets[path] });
      return route.fulfill({ status: 204, body: "" });
    });
    await page.goto("https://reviewer-fixture.test/content-guides.html");
    for (const width of [1920, 1280, 800, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const layout = await page.evaluate(() => {
        const bounds = (selector) => {
          const { top, bottom, left, right, height } = document.querySelector(selector).getBoundingClientRect();
          return { top, bottom, left, right, height };
        };
        return { refresh: bounds("#refreshGuidesBtn"), clear: bounds("#clearGuideFiltersBtn"),
          status: bounds("#statusFilter"), card: bounds(".guide-filters"),
          pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
      });
      if (width > 760 || Math.abs(layout.refresh.top - layout.clear.top) <= 1) {
        assert.ok(Math.abs(layout.refresh.bottom - layout.clear.bottom) <= 1, `action alignment at ${width}px`);
      }
      if (width > 760 && layout.refresh.top < layout.status.bottom) {
        assert.ok(Math.abs(layout.refresh.bottom - layout.status.bottom) <= 1, `dropdown alignment at ${width}px`);
      } else {
        assert.ok(layout.refresh.top >= layout.status.bottom + 9, `separate action row at ${width}px`);
      }
      for (const action of [layout.refresh, layout.clear]) {
        assert.ok(action.height >= 44, `touch target at ${width}px`);
        assert.ok(action.left >= layout.card.left && action.right <= layout.card.right, `contained action at ${width}px`);
      }
      assert.ok(layout.pageWidth <= layout.viewportWidth + 1, `no page overflow at ${width}px`);
    }
    await page.locator("#refreshGuidesBtn").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "clearGuideFiltersBtn");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test("reviewer validation identifies all failing questions and safely renders their codes", { timeout: 30_000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const script = await readFile(new URL("../../web/content-guides.js", import.meta.url), "utf8");
    const html = (await readFile(new URL("../../web/content-guides.html", import.meta.url), "utf8"))
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
      .replace("</body>", '<div id="validationPanel"></div><script type="module" src="./content-guides.js"></script></body>');
    await page.addInitScript(() => { window.__haieduSupabaseClient = { auth: {
      getSession: async () => ({ data: { session: null } }), onAuthStateChange() {} } }; });
    await page.route("**/*", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/content-guides.html") return route.fulfill({ contentType: "text/html", body: html });
      if (path === "/account-signout.mjs") return route.fulfill({ contentType: "text/javascript", body: await readFile(new URL("../../web/account-signout.mjs", import.meta.url), "utf8") });
      if (path === "/content-guides.js") return route.fulfill({ contentType: "text/javascript", body: script + "\nwindow.__renderValidation = renderValidation;" });
      if (path === "/config.js") return route.fulfill({ contentType: "text/javascript", body: 'export const SUPABASE_URL="fixture", SUPABASE_PUBLISHABLE_KEY="fixture";' });
      if (route.request().url() === "https://esm.sh/@supabase/supabase-js@2") return route.fulfill({ contentType: "text/javascript", body: "export function createClient() {}" });
      return route.fulfill({ contentType: "text/css", body: "" });
    });
    await page.goto("https://reviewer-fixture.test/content-guides.html");
    await page.waitForFunction(() => Boolean(window.__renderValidation));
    await page.evaluate(() => window.__renderValidation({ checkedVariantCount: 2, errors: ["worked_example_reuses_live_task"], warnings: [],
      variantFailures: [{ variantId: "fixture", itemCode: '<img src=x onerror="window.__unsafe=true">', errors: ["worked_example_reuses_live_task"] }] }));
    assert.match(await page.locator("#validationPanel").innerText(), /Ստուգվել է 2/);
    assert.equal(await page.locator("#validationPanel details").count(), 1);
    await page.locator("#validationPanel summary").click();
    assert.match(await page.locator("#validationPanel details").innerText(), /<img src=x/);
    assert.equal(await page.locator("#validationPanel img").count(), 0);
    assert.equal(await page.evaluate(() => Boolean(window.__unsafe)), false);
    await page.evaluate(() => window.__renderValidation({ checkedVariantCount: 2, errors: [], warnings: ["source_title_missing"], variantFailures: [] }));
    assert.equal(await page.locator("#validationPanel details").count(), 0);
    assert.equal(await page.locator("#validationPanel").evaluate((element) => element.classList.contains("has-errors")), false);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
