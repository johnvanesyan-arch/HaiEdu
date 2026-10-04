import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// These production acceptance workflows are deliberately main-only. This check
// routes relevant changes to existing QA; it does not turn live QA into a PR
// test, attest the deployed revision, or replace isolated browser acceptance.
export const browserQaTargets = [
  {
    workflow: ".github/workflows/sprint-14-actions-qa.yml",
    entries: ["web/teacher.html", "web/school-admin.html", "scripts/sprint-14-actions.mjs"],
    runner: "scripts/sprint-14-actions.mjs",
  },
  {
    workflow: ".github/workflows/sprint-14d-analytics-qa.yml",
    entries: ["web/account-access.html", "web/school-admin.html", "scripts/sprint-14d-analytics-qa.mjs"],
    runner: "scripts/sprint-14d-analytics-qa.mjs",
  },
];

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
}

// Follow the repository's static local imports, re-exports, literal dynamic
// imports, stylesheet links and CSS imports. Remote CDN modules are not files
// in this repository. Computed imports/URLs still require consumer review.
export function localReferences(filename, source) {
  const refs = [];
  if (filename.endsWith(".html")) {
    for (const [tag] of source.matchAll(/<script\b[^>]*>/gi)) {
      const src = attribute(tag, "src");
      if (src) refs.push(src);
    }
    for (const [tag] of source.matchAll(/<link\b[^>]*>/gi)) {
      if (attribute(tag, "rel")?.toLowerCase().split(/\s+/).includes("stylesheet")) {
        const href = attribute(tag, "href");
        if (href) refs.push(href);
      }
    }
  } else if (/\.[cm]?[jt]s$/.test(filename)) {
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s*)?["']([^"']+)["']/g)) refs.push(match[1]);
    for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) refs.push(match[1]);
  } else if (filename.endsWith(".css")) {
    for (const match of source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) refs.push(match[1]);
  }
  const documentUrl = /\.(?:html|css)$/.test(filename);
  return [...new Set(refs.filter((ref) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(ref)) return false;
    // HTML/CSS URLs such as "widget.js" are local relative files; JavaScript
    // bare specifiers such as "some-package" belong to the package resolver.
    return documentUrl || ref.startsWith("./") || ref.startsWith("../") || ref.startsWith("/");
  })
    .map((ref) => {
      const clean = ref.split(/[?#]/, 1)[0];
      const resolved = ref.startsWith("/")
        ? path.posix.join("web", clean.slice(1))
        : path.posix.normalize(path.posix.join(path.posix.dirname(filename), clean));
      if (resolved === ".." || resolved.startsWith("../")) throw new Error(`Dependency escapes repository: ${filename} -> ${ref}`);
      return resolved;
    }))];
}

export async function collectDependencies(root, entries) {
  const sources = new Map();
  async function visit(filename) {
    if (sources.has(filename)) return;
    const source = await readFile(path.join(root, filename), "utf8");
    sources.set(filename, source);
    for (const dependency of localReferences(filename, source)) await visit(dependency);
  }
  for (const entry of entries) await visit(entry);
  return sources;
}

// Only the small literal subset used by these workflows is accepted. Fail
// closed on new trigger syntax rather than silently skipping its meaning.
export function mainPushPaths(source) {
  if (/^  pull_request(?:_target)?:/m.test(source)) throw new Error("Production acceptance must not receive PR credentials");
  const push = source.match(/^  push:\s*\n([\s\S]*?)(?=^  \S|^\S|(?![\s\S]))/m)?.[1];
  if (!push || !/^    branches:\s*\[main\]\s*$/m.test(push)) throw new Error("Production acceptance must push only from main");
  if (!source.split("\n").some((line) => /^(?:- )?run: test "\$GITHUB_REF" = refs\/heads\/main$/.test(line.trim()))) {
    throw new Error("Reviewed-main execution guard missing");
  }
  if (!/^  group: sprint-14-isolation-qa\s*$/m.test(source) || !/^  cancel-in-progress: false\s*$/m.test(source)) {
    throw new Error("Production fixture workflows must retain their non-cancelling shared concurrency group");
  }
  const pathsBlock = push.match(/^    paths:\s*\n([\s\S]*?)(?=^    \S|(?![\s\S]))/m)?.[1];
  if (!pathsBlock) throw new Error("Main push must declare dependency paths");
  return pathsBlock.split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).map((line) => {
    const item = line.match(/^      - (?:'([^']+)'|"([^"]+)"|([^\s]+))\s*$/);
    if (!item) throw new Error(`Unsupported workflow path syntax: ${line.trim()}`);
    return item[1] ?? item[2] ?? item[3];
  });
}

function globRegex(pattern) {
  let expression = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const character = pattern[i];
    if (character === "*" && pattern[i + 1] === "*") {
      i += 1;
      if (pattern[i + 1] === "/") { i += 1; expression += "(?:.*/)?"; }
      else expression += ".*";
    } else if (character === "*") expression += "[^/]*";
    else if (character === "?") expression += "[^/]";
    else if (/[\[\]{}+]/.test(character)) throw new Error(`Unsupported workflow path glob: ${pattern}`);
    else expression += character.replace(/[.()^$|\\]/g, "\\$&");
  }
  return new RegExp(`${expression}$`);
}

export function pathCovered(filename, patterns) {
  let covered = false;
  for (const pattern of patterns) {
    const negative = pattern.startsWith("!");
    if (globRegex(negative ? pattern.slice(1) : pattern).test(filename)) covered = !negative;
  }
  return covered;
}

export async function checkBrowserQaTriggers(root, targets = browserQaTargets) {
  const results = [];
  for (const target of targets) {
    const workflow = await readFile(path.join(root, target.workflow), "utf8");
    const patterns = mainPushPaths(workflow);
    const commands = workflow.split("\n").map((line) => line.trim().replace(/^- /, ""));
    const waitCommand = commands.indexOf("run: node scripts/wait-for-production-release.mjs");
    const runnerCommand = commands.indexOf(`run: node ${target.runner}`);
    if (waitCommand < 0 || runnerCommand < waitCommand) {
      throw new Error(`${target.workflow} must verify the production frontend revision before live QA`);
    }
    const sources = await collectDependencies(root, target.entries);
    const required = new Set([...sources.keys(), target.workflow, "scripts/wait-for-production-release.mjs", "scripts/stamp-release.mjs", "package.json", "package-lock.json", "vercel.json"]);
    const apiEntries = new Set();
    for (const [filename, source] of sources) {
      if (!filename.startsWith("scripts/")) continue;
      // Literal API targets used by the runner or its imported QA helpers.
      for (const match of source.matchAll(/["'`](?:\/functions\/v1\/)?((?:get|manage|redeem)-[a-z][a-z0-9-]*)["'`]/g)) {
        apiEntries.add(`supabase/functions/${match[1]}/index.ts`);
      }
    }
    // Authentication/context helpers are bundled into these API entrypoints.
    // Follow their real imports so removing shared-code trigger coverage fails.
    for (const filename of (await collectDependencies(root, [...apiEntries])).keys()) required.add(filename);
    const missing = [...required].filter((filename) => !pathCovered(filename, patterns)).sort();
    results.push({ workflow: target.workflow, dependencyCount: required.size, missing });
  }
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  try {
    const results = await checkBrowserQaTriggers(root);
    for (const result of results) {
      if (result.missing.length) {
        console.error(`${result.workflow} omits ${result.missing.join(", ")}`);
        process.exitCode = 1;
      } else console.log(`${result.workflow}: ${result.dependencyCount} dependency paths covered; production QA remains main-only.`);
    }
  } catch (error) {
    console.error(`Browser QA trigger coverage failed: ${error.message}`);
    process.exitCode = 1;
  }
}
