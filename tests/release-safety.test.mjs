import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { assertReleaseReady, requiredJobs } from "../scripts/check-release-readiness.mjs";
import { releaseMetadata, stampRelease } from "../scripts/stamp-release.mjs";
import { waitForRelease } from "../scripts/wait-for-production-release.mjs";

const candidate = "0123456789abcdef0123456789abcdef01234567";
const previous = "abcdef0123456789abcdef0123456789abcdef01";
const root = new URL("../", import.meta.url);
const jobs = ["test", "role-layout-browser", "institutional-concurrency", "phase3-postgres-17"];
const successfulJobs = () => Object.fromEntries(jobs.map((name) => [name, { result: "success", outputs: {} }]));

test("release gate accepts success only when all required checks are present", () => {
  assert.equal(assertReleaseReady(successfulJobs()), true);
  for (const name of jobs) {
    const results = successfulJobs();
    delete results[name];
    assert.throws(() => assertReleaseReady(results), /Release blocked:/, `Missing ${name} must block release`);
  }
});

for (const result of ["failure", "skipped", "cancelled", "queued", "neutral", undefined]) {
  test(`release gate rejects ${String(result)} for every required check`, () => {
    for (const name of jobs) {
      const results = successfulJobs();
      results[name] = { result };
      assert.throws(() => assertReleaseReady(results), /Release blocked:/, `${name} must actually succeed`);
    }
  });
}

test("release gate rejects malformed inputs, inherited jobs, and failed new dependencies", () => {
  for (const value of [undefined, null, [], "success", true, 1]) {
    assert.throws(() => assertReleaseReady(value));
  }
  assert.throws(() => assertReleaseReady(Object.create(successfulJobs())), /missing/);
  for (const job of [null, "success", true, { status: "success" }]) {
    assert.throws(() => assertReleaseReady({ ...successfulJobs(), test: job }));
  }
  assert.throws(() => assertReleaseReady({ ...successfulJobs(), "future-check": { result: "failure" } }), /future-check/);
});

test("release gate CLI fails closed when GitHub supplies invalid or incomplete results", () => {
  for (const value of ["", "not json", "{}", JSON.stringify({ test: { result: "success" } })]) {
    const result = spawnSync(process.execPath, [new URL("scripts/check-release-readiness.mjs", root).pathname], {
      encoding: "utf8",
      env: { ...process.env, RELEASE_JOB_RESULTS: value },
    });
    assert.equal(result.status, 1, `Invalid input ${JSON.stringify(value)} must fail the CI step`);
  }
  const result = spawnSync(process.execPath, [new URL("scripts/check-release-readiness.mjs", root).pathname], {
    encoding: "utf8",
    env: { ...process.env, RELEASE_JOB_RESULTS: JSON.stringify(successfulJobs()) },
  });
  assert.equal(result.status, 0, result.stderr);
});

test("CI aggregate includes every actual CI job and consumes GitHub dependency outcomes", async () => {
  const ci = await readFile(new URL(".github/workflows/ci.yml", root), "utf8");
  const jobHeader = ci.match(/^jobs:[ \t]*$/m);
  assert.ok(jobHeader, "The workflow must define jobs");
  const afterHeader = ci.slice(jobHeader.index + jobHeader[0].length);
  const nextTopLevel = afterHeader.search(/^(?!#)\S/m);
  const jobSection = nextTopLevel < 0 ? afterHeader : afterHeader.slice(0, nextTopLevel);
  // The workflow's two-space job keys are distinct from nested services and steps.
  const entries = [...jobSection.matchAll(/^  ([a-zA-Z0-9_-]+):[ \t]*$/gm)];
  const aggregateId = "platform-release-checks";
  const actualJobs = entries.map((entry) => entry[1]).filter((name) => name !== aggregateId);
  assert.ok(actualJobs.length > 0, "CI must contain executable prerequisite jobs");
  const entry = entries.find((item) => item[1] === aggregateId);
  assert.ok(entry, "The stable release check must exist");
  const next = entries.find((item) => item.index > entry.index);
  const aggregate = jobSection.slice(entry.index, next?.index ?? jobSection.length);
  const inlineNeeds = aggregate.match(/^    needs:\s*\[([^\]]+)\]\s*$/m);
  const multilineNeeds = aggregate.match(/^    needs:\s*\n((?:      - [^\n]+\n)+)/m);
  const needs = inlineNeeds
    ? inlineNeeds[1].split(",").map((value) => value.trim().replace(/^["']|["']$/g, ""))
    : [...(multilineNeeds?.[1] ?? "").matchAll(/^      - ([^\n]+)$/gm)].map((item) => item[1].trim());
  assert.deepEqual([...needs].sort(), [...actualJobs].sort(), "A new CI job must be wired into the aggregate");
  assert.deepEqual([...requiredJobs].sort(), [...actualJobs].sort(), "The gate must reject absent results for every CI job");
  assert.match(aggregate, /^    name: Platform release checks\s*$/m);
  assert.match(aggregate, /^    if: \$\{\{\s*always\(\)\s*\}\}\s*$/m, "Failed prerequisites must not skip the aggregate");
  assert.match(aggregate, /RELEASE_JOB_RESULTS:\s*\$\{\{\s*toJSON\(needs\)\s*\}\}/, "Use actual dependency results");
  assert.match(aggregate, /run:\s*node scripts\/check-release-readiness\.mjs\s*$/m);
  assert.doesNotMatch(ci, /continue-on-error:\s*true/, "Neither prerequisite nor aggregate failures may be ignored");
});

test("release metadata identifies the exact Vercel source, with GitHub as the non-Vercel fallback", () => {
  assert.deepEqual(releaseMetadata({ VERCEL_GIT_COMMIT_SHA: candidate, GITHUB_SHA: previous }), {
    schemaVersion: 1, commit: candidate,
  });
  assert.deepEqual(releaseMetadata({ GITHUB_SHA: candidate.toUpperCase() }), {
    schemaVersion: 1, commit: candidate,
  });
  for (const invalid of [undefined, "", candidate.slice(0, 7), `${candidate}0`, ` ${candidate}`, "g".repeat(40)]) {
    assert.throws(() => releaseMetadata({ GITHUB_SHA: invalid }), /full Git commit SHA/);
  }
  assert.throws(() => releaseMetadata({ VERCEL_GIT_COMMIT_SHA: "bad-source", GITHUB_SHA: candidate }), /full Git commit SHA/,
    "An invalid Vercel source cannot silently fall back to an unrelated GitHub commit");
});

test("stamped artifact contains only version and exact commit; Vercel publishes it without caching", async () => {
  const directory = await mkdtemp(join(tmpdir(), "haiedu-release-test-"));
  try {
    const output = join(directory, "release.json");
    await stampRelease(output, { VERCEL_GIT_COMMIT_SHA: candidate, PRIVATE_VALUE: "not-for-public-metadata" });
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), { schemaVersion: 1, commit: candidate });
    const config = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
    assert.match(config.buildCommand, /\bnode scripts\/stamp-release\.mjs\b/);
    const rule = config.headers?.find((item) => item.source === "/release.json");
    assert.ok(rule?.headers.some((header) => header.key.toLowerCase() === "cache-control" && /\bno-store\b/.test(header.value)),
      "Old release metadata must not be served as a cached deployment identity");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function response(metadata, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => metadata };
}

function probeHarness(steps, overrides = {}) {
  let clock = 0;
  let index = 0;
  const calls = [];
  const delays = [];
  const logs = [];
  const options = {
    expectedCommit: candidate,
    url: "https://www.haiedu.am/release.json?existing=retained",
    timeoutMs: 25,
    pollIntervalMs: 10,
    requestTimeoutMs: 7,
    now: () => clock,
    delay: async (milliseconds) => { delays.push(milliseconds); clock += milliseconds; },
    log: (message) => logs.push(message),
    fetchImpl: async (url, init) => {
      calls.push({ url: new URL(url), init });
      const step = steps[Math.min(index++, steps.length - 1)];
      return step({ advance: (milliseconds) => { clock += milliseconds; }, init });
    },
    ...overrides,
  };
  return { options, calls, delays, logs, time: () => clock };
}

test("production probing waits through an old release and accepts only the exact new source", async () => {
  const harness = probeHarness([
    () => response({ schemaVersion: 1, commit: previous }),
    () => response({ schemaVersion: 1, commit: candidate }),
  ]);
  assert.deepEqual(await waitForRelease(harness.options), { schemaVersion: 1, commit: candidate });
  assert.equal(harness.calls.length, 2);
  assert.deepEqual(harness.delays, [10]);
  assert.deepEqual(harness.calls.map((call) => call.url.searchParams.get("release_probe")), ["0", "10"]);
  for (const { url, init } of harness.calls) {
    assert.equal(url.searchParams.get("existing"), "retained");
    assert.equal(init.cache, "no-store");
    assert.equal(init.redirect, "error", "A redirect must not send the probe to an unrelated candidate deployment");
    assert.equal(init.headers["Cache-Control"], "no-cache");
    assert.ok(init.signal instanceof AbortSignal, "Every request needs a bound");
  }
});

test("valid candidate SHA is insufficient if release metadata is malformed or from another schema", async () => {
  const malformed = [null, [], {}, { commit: candidate }, { schemaVersion: 2, commit: candidate },
    { schemaVersion: "1", commit: candidate }, { schemaVersion: 1, commit: candidate.slice(0, 7) },
    { schemaVersion: 1, commit: `${candidate}0` }, { schemaVersion: 1, commit: "g".repeat(40) }];
  const harness = probeHarness([
    ...malformed.map((value) => () => response(value)),
    () => ({ ok: true, json: async () => { throw new SyntaxError("invalid JSON"); } }),
    () => response({ schemaVersion: 1, commit: candidate }),
  ], { timeoutMs: 200 });
  assert.equal((await waitForRelease(harness.options)).commit, candidate);
  assert.equal(harness.calls.length, malformed.length + 2);
  assert.equal(harness.logs.filter((message) => message.startsWith("Production frontend matches")).length, 1);
});

test("HTTP failures and network errors cannot be mistaken for the candidate release", async () => {
  let errorBodyRead = false;
  const harness = probeHarness([
    () => ({ ok: false, status: 503, json: async () => { errorBodyRead = true; return { schemaVersion: 1, commit: candidate }; } }),
    () => { throw new TypeError("connection failed"); },
    () => response({ schemaVersion: 1, commit: candidate }),
  ]);
  assert.equal((await waitForRelease(harness.options)).commit, candidate);
  assert.equal(errorBodyRead, false, "An error response must never identify the live release");
  assert.equal(harness.calls.length, 3);
});

test("unchanged production expires at its bound and does not start another request", async () => {
  const harness = probeHarness([() => response({ schemaVersion: 1, commit: previous })]);
  await assert.rejects(waitForRelease(harness.options), /within 25ms.*Live QA was not started/);
  assert.equal(harness.time(), 25);
  assert.equal(harness.calls.length, 3);
  assert.deepEqual(harness.delays, [10, 10, 5]);
  assert.equal(harness.logs.length, 1, "Repeated identical observations should not flood logs");
});

for (const [description, step] of [
  ["malformed metadata", () => response({ schemaVersion: 1, commit: candidate.slice(0, 7) })],
  ["HTTP errors", () => response({ schemaVersion: 1, commit: candidate }, 503)],
  ["network errors", () => { throw new TypeError("unreachable"); }],
]) {
  test(`persistent ${description} terminate within the total wait bound`, async () => {
    const harness = probeHarness([step]);
    await assert.rejects(waitForRelease(harness.options), /within 25ms.*Live QA was not started/);
    assert.equal(harness.time(), 25);
    assert.equal(harness.calls.length, 3);
    assert.equal(harness.logs.some((message) => message.startsWith("Production frontend matches")), false);
  });
}

for (const elapsed of [25, 26]) {
  test(`candidate response completing at ${elapsed}ms cannot bypass the 25ms deadline`, async () => {
    const harness = probeHarness([({ advance }) => ({
      ok: true,
      json: async () => { advance(elapsed); return { schemaVersion: 1, commit: candidate }; },
    })]);
    await assert.rejects(waitForRelease(harness.options), /within 25ms/);
    assert.equal(harness.calls.length, 1);
    assert.deepEqual(harness.delays, []);
    assert.equal(harness.logs.some((message) => message.startsWith("Production frontend matches")), false);
  });
}

test("a nonresponding request is aborted and cannot leave the release wait unbounded", { timeout: 1000 }, async () => {
  // AbortSignal timers are unref'ed by Node, so keep this bounded test alive until abort delivery.
  const keepAlive = setTimeout(() => {}, 500);
  const harness = probeHarness([({ advance, init }) => new Promise((resolve, reject) => {
    init.signal.addEventListener("abort", () => { advance(8); reject(init.signal.reason); }, { once: true });
  })], { timeoutMs: 10, requestTimeoutMs: 8, pollIntervalMs: 2 });
  try {
    await assert.rejects(waitForRelease(harness.options), /within 10ms.*request failed/);
    assert.equal(harness.calls.length, 1);
    assert.equal(harness.calls[0].init.signal.aborted, true);
    assert.equal(harness.time(), 10);
  } finally {
    clearTimeout(keepAlive);
  }
});

test("invalid expected commit or timing parameters fail before making any request", async () => {
  for (const overrides of [
    { expectedCommit: undefined }, { expectedCommit: candidate.slice(0, 7) },
    { expectedCommit: `${candidate}0` }, { timeoutMs: 0 }, { timeoutMs: -1 },
    { pollIntervalMs: 0 }, { requestTimeoutMs: 0 }, { requestTimeoutMs: 1.5 },
  ]) {
    const harness = probeHarness([], overrides);
    await assert.rejects(waitForRelease(harness.options));
    assert.equal(harness.calls.length, 0);
  }
});
