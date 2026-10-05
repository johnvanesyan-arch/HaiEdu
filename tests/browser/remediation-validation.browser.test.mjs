import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

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
