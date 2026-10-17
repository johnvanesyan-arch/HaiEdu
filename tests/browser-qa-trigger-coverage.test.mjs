import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  checkBrowserQaTriggers, collectDependencies, localReferences, mainPushPaths, pathCovered,
} from "../scripts/check-browser-qa-triggers.mjs";

function workflow(paths, { before = "", after = "" } = {}) {
  return `name: Test production QA
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
${paths.map((entry) => `      - ${entry}`).join("\n")}
permissions:
  contents: read
concurrency:
  group: sprint-14-isolation-qa
  cancel-in-progress: false
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - run: test "$GITHUB_REF" = refs/heads/main
${before}      - run: node scripts/wait-for-production-release.mjs
${after}      - run: node scripts/qa.mjs
`;
}

async function fixture(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "haiedu-qa-routing-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [filename, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, filename)), { recursive: true });
    await writeFile(path.join(root, filename), content);
  }
  return root;
}

test("dependency scan follows local HTML, module and stylesheet references", () => {
  assert.deepEqual(localReferences("web/page.html", `
    <script src="./page.js?v=3"></script>
    <script src="https://example.test/sdk.js"></script>
    <link rel="stylesheet" href="/base.css">
    <link href="./colors.css" rel="alternate stylesheet">
    <link rel="icon" href="./favicon.ico">
  `), ["web/page.js", "web/base.css", "web/colors.css"]);
  assert.deepEqual(localReferences("web/page.js", `
    import {
      session,
    } from "./auth/session.js";
    export { current } from "./context.js";
    import "./events.js";
    import("./lazy.js");
    import { remote } from "https://example.test/sdk.js";
  `), ["web/auth/session.js", "web/context.js", "web/events.js", "web/lazy.js"]);
  assert.deepEqual(localReferences("web/styles/page.css", `
    @import "../tokens.css";
    @import url("./mobile.css") screen;
    @import url("https://example.test/fonts.css");
  `), ["web/tokens.css", "web/styles/mobile.css"]);
});

test("dependency traversal handles cycles and reports missing local imports", async (t) => {
  const root = await fixture(t, {
    "web/page.html": '<script src="./a.js"></script>',
    "web/a.js": 'import "./b.js";',
    "web/b.js": 'export { value } from "./a.js";',
  });
  assert.deepEqual([...await collectDependencies(root, ["web/page.html"])].map(([name]) => name), ["web/page.html", "web/a.js", "web/b.js"]);
  await writeFile(path.join(root, "web/b.js"), 'import "./missing.js";');
  await assert.rejects(() => collectDependencies(root, ["web/page.html"]), /ENOENT/);
});

test("bare relative HTML and CSS URLs cannot bypass dependency trigger coverage", async (t) => {
  const target = { workflow: ".github/workflows/qa.yml", entries: ["web/page.html"], runner: "scripts/qa.mjs" };
  const patterns = [".github/workflows/qa.yml", "scripts/**", "web/page.html", "web/base.css", "package.json", "package-lock.json", "vercel.json"];
  const root = await fixture(t, {
    [target.workflow]: workflow(patterns),
    "web/page.html": `
      <script src="widget.js"></script>
      <script src="https://example.test/remote.js"></script>
      <script src="//example.test/remote.js"></script>
      <script src="data:text/javascript,void(0)"></script>
      <script src="#fragment"></script>
      <link rel="stylesheet" href="base.css">
    `,
    "web/widget.js": 'import "some-package";',
    "web/base.css": '@import "extra.css"; @import "https://example.test/remote.css";',
    "web/extra.css": "body { color: black; }",
  });
  assert.deepEqual((await checkBrowserQaTriggers(root, [target]))[0].missing, ["web/extra.css", "web/widget.js"]);
  await writeFile(path.join(root, target.workflow), workflow([...patterns, "web/extra.css", "web/widget.js"]));
  assert.deepEqual((await checkBrowserQaTriggers(root, [target]))[0].missing, []);
});

test("path matching respects directories and ordered exclusions", () => {
  assert.equal(pathCovered("web/auth/session.js", ["web/*.js"]), false);
  assert.equal(pathCovered("web/auth/session.js", ["web/**/*.js"]), true);
  assert.equal(pathCovered("web/session.js", ["web/**/*.js"]), true);
  assert.equal(pathCovered("web/role-layout.js", ["web/role-layout.*"]), true);
  assert.equal(pathCovered("web/role-layout.js", ["web/**", "!web/role-layout.*"]), false);
  assert.equal(pathCovered("web/role-layout.js", ["web/**", "!web/role-layout.*", "web/role-layout.js"]), true);
  assert.throws(() => pathCovered("web/a.js", ["web/{a,b}.js"]), /Unsupported/);
});

test("production workflow parser fails closed when branch or serial guards are weakened", () => {
  const original = workflow(["web/**"]);
  assert.deepEqual(mainPushPaths(original), ["web/**"]);
  assert.throws(() => mainPushPaths(original.replace("  workflow_dispatch:", "  pull_request:\n  workflow_dispatch:")), /PR credentials/);
  assert.throws(() => mainPushPaths(original.replace("[main]", "[main, feature]")), /only from main/);
  assert.throws(() => mainPushPaths(original.replace('test "$GITHUB_REF" = refs/heads/main', "echo ready")), /guard missing/);
  assert.throws(() => mainPushPaths(original.replace('- run: test "$GITHUB_REF"', '# - run: test "$GITHUB_REF"')), /guard missing/);
  assert.throws(() => mainPushPaths(original.replace("cancel-in-progress: false", "cancel-in-progress: true")), /non-cancelling/);
});

test("a newly imported shared module and API cannot silently miss the main QA trigger", async (t) => {
  const target = { workflow: ".github/workflows/qa.yml", entries: ["web/page.html", "scripts/qa.mjs"], runner: "scripts/qa.mjs" };
  const patterns = [".github/workflows/qa.yml", "scripts/**", "web/page.html", "web/page.js", "package.json", "package-lock.json", "vercel.json"];
  const root = await fixture(t, {
    [target.workflow]: workflow(patterns),
    "web/page.html": '<script src="./page.js"></script>',
    "web/page.js": 'import "./shared/context.js";',
    "web/shared/context.js": 'export const context = "fixture";',
    "scripts/qa.mjs": 'const endpoint = "/functions/v1/get-school-context";',
    "supabase/functions/get-school-context/index.ts": 'import { auth } from "../_shared/auth.ts";',
    "supabase/functions/_shared/auth.ts": 'export const auth = "fixture";',
  });
  const [missing] = await checkBrowserQaTriggers(root, [target]);
  assert.deepEqual(missing.missing, ["supabase/functions/_shared/auth.ts", "supabase/functions/get-school-context/index.ts", "web/shared/context.js"]);
  await writeFile(path.join(root, target.workflow), workflow([...patterns, "web/shared/**", "supabase/functions/get-school-context/**", "supabase/functions/_shared/**"]));
  assert.deepEqual((await checkBrowserQaTriggers(root, [target]))[0].missing, []);
});

test("live QA must wait for the expected frontend revision before acting", async (t) => {
  const target = { workflow: ".github/workflows/qa.yml", entries: [], runner: "scripts/qa.mjs" };
  const source = workflow(["**"]);
  const root = await fixture(t, { [target.workflow]: source });
  assert.deepEqual((await checkBrowserQaTriggers(root, [target]))[0].missing, []);
  await writeFile(path.join(root, target.workflow), source.replace("      - run: node scripts/wait-for-production-release.mjs\n", ""));
  await assert.rejects(() => checkBrowserQaTriggers(root, [target]), /before live QA/);
  await writeFile(path.join(root, target.workflow), source.replace("- run: node scripts/wait-for-production-release.mjs", "# - run: node scripts/wait-for-production-release.mjs"));
  await assert.rejects(() => checkBrowserQaTriggers(root, [target]), /before live QA/);
  await writeFile(path.join(root, target.workflow), workflow(["**"], { before: "      - run: node scripts/qa.mjs\n" }));
  await assert.rejects(() => checkBrowserQaTriggers(root, [target]), /before live QA/);
});

test("actual acceptance workflows cover their current frontend and runner dependency graphs", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const results = await checkBrowserQaTriggers(root);
  for (const result of results) assert.deepEqual(result.missing, [], `${result.workflow}: omitted dependencies`);
});

test("prepared QA requires activation-only routing; adding activation evidence restores dependency enforcement", async t => {
  const target = { workflow: ".github/workflows/qa.yml", entries: ["web/page.html"], runner: "scripts/qa.mjs", activationEvidence: "docs/activated.json" };
  const source = workflow([target.activationEvidence], { before: `      - run: test -f ${target.activationEvidence}\n` });
  const root = await fixture(t, { [target.workflow]: source, "web/page.html": '<script src="./page.js"></script>', "web/page.js": "" });
  assert.equal((await checkBrowserQaTriggers(root, [target]))[0].prepared, true);
  await writeFile(path.join(root, target.workflow), source.replace("test -f", "echo"));
  await assert.rejects(checkBrowserQaTriggers(root, [target]), /activation-only/);
  await writeFile(path.join(root, target.workflow), source);
  await mkdir(path.join(root, "docs")); await writeFile(path.join(root, target.activationEvidence), '{}');
  const result = (await checkBrowserQaTriggers(root, [target]))[0];
  assert.ok(result.missing.includes("web/page.js"));
  assert.ok(result.missing.includes(target.workflow));
});
