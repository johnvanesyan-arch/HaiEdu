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
  const nodes = Object.fromEntries(["evidenceUnit", "evidenceMessage", "evidenceMetrics", "evidenceFlagList", "refreshEvidenceBtn"]
    .map(id => [id, { value: "", textContent: "", innerHTML: "", addEventListener() {} }]));
  const reads = [];
  let authListener;
  const source = readFileSync("web/content-evidence-page.js", "utf8").replace(/^import .*;\n/gm, "");
  const api = await vm.runInNewContext(`(async () => { ${source}
    return { loadEvidence, analytics: () => currentAnalytics };
  })()`, {
    $: id => nodes[id], esc: value => String(value),
    mountContentWorkspace: async () => {},
    contentSupabase: { auth: { onAuthStateChange(callback) { authListener = callback; } } },
    invokeContent(name, body) {
      const request = deferred();
      reads.push({ name, body, ...request });
      return request.promise;
    },
  });
  return { api, nodes, reads, logout() { authListener("SIGNED_OUT", null); }, select(value) { nodes.evidenceUnit.value = value; return api.loadEvidence(); } };
}

function analytics(code, count) {
  return { unitCode: code, integrity: { exposureCount: count, distinctStudents: count ? 1 : 0 }, items: [] };
}

test("sign-out discards pending evidence and clears protected metrics", async () => {
  const h = await harness();
  const pending = h.select("UNIT-A");
  h.logout();
  h.reads[0].resolve({ analytics: analytics("UNIT-A", 39) });
  await pending;
  assert.equal(h.api.analytics(), null);
  assert.equal(h.nodes.evidenceMetrics.innerHTML, "");
  assert.equal(h.nodes.evidenceFlagList.innerHTML, "");
  assert.equal(h.nodes.evidenceMessage.textContent, "");
});

test("clearing a selection invalidates the pending result and loading message", async () => {
  const h = await harness();
  const pending = h.select("UNIT-A");
  await h.select("");
  assert.equal(h.nodes.evidenceMessage.textContent, "");
  h.reads[0].resolve({ analytics: analytics("UNIT-A", 39) });
  await pending;
  assert.equal(h.api.analytics(), null);
  assert.equal(h.nodes.evidenceMetrics.innerHTML, "");
  assert.match(h.nodes.evidenceFlagList.innerHTML, /Ընտրեք բաժին/);
});

test("a late A result cannot replace a newer B result across curriculum units", async () => {
  const h = await harness();
  const a = h.select("UNIT-A"), b = h.select("UNIT-B");
  h.reads[1].resolve({ analytics: analytics("UNIT-B", 7) });
  await b;
  h.reads[0].resolve({ analytics: analytics("UNIT-A", 39) });
  await a;
  assert.equal(h.api.analytics().unitCode, "UNIT-B");
  assert.match(h.nodes.evidenceMetrics.innerHTML, /<strong>7<\/strong>/);
  assert.doesNotMatch(h.nodes.evidenceMetrics.innerHTML, /<strong>39<\/strong>/);
});

test("a stale failure cannot clear the newer successful unit", async () => {
  const h = await harness();
  const a = h.select("UNIT-A"), b = h.select("UNIT-B");
  h.reads[1].resolve({ analytics: analytics("UNIT-B", 7) });
  await b;
  h.reads[0].reject(new Error("pilot_analytics_failed"));
  await a;
  assert.equal(h.api.analytics().unitCode, "UNIT-B");
  assert.equal(h.nodes.evidenceMessage.textContent, "");
});

test("latest explicit refresh wins even when the unit code is unchanged", async () => {
  const h = await harness();
  const old = h.select("UNIT-A"), fresh = h.select("UNIT-A");
  h.reads[1].resolve({ analytics: analytics("UNIT-A", 40) });
  await fresh;
  h.reads[0].resolve({ analytics: analytics("UNIT-A", 39) });
  await old;
  assert.equal(h.api.analytics().integrity.exposureCount, 40);
});

test("a new selected unit removes old metrics while its read is pending", async () => {
  const h = await harness();
  const a = h.select("UNIT-A");
  h.reads[0].resolve({ analytics: analytics("UNIT-A", 39) });
  await a;
  const b = h.select("UNIT-B");
  assert.equal(h.api.analytics(), null);
  assert.equal(h.nodes.evidenceMetrics.innerHTML, "");
  assert.equal(h.nodes.evidenceFlagList.innerHTML, "");
  assert.match(h.nodes.evidenceMessage.textContent, /բեռնվում/);
  h.reads[1].resolve({ analytics: analytics("UNIT-B", 0) });
  await b;
  assert.equal(h.api.analytics().unitCode, "UNIT-B");
  assert.match(h.nodes.evidenceMetrics.innerHTML, /<strong>0<\/strong>/);
});

test("current failure is Armenian, clears metrics and allows a fresh retry", async () => {
  const h = await harness();
  const failed = h.select("UNIT-B");
  h.reads[0].reject(new Error("pilot_analytics_failed"));
  await failed;
  assert.equal(h.api.analytics(), null);
  assert.equal(h.nodes.evidenceMetrics.innerHTML, "");
  assert.equal(h.nodes.evidenceMessage.textContent, "Չհաջողվեց բեռնել փորձնական տվյալները։");
  const retry = h.select("UNIT-B");
  h.reads[1].resolve({ analytics: analytics("UNIT-B", 0) });
  await retry;
  assert.equal(h.api.analytics().unitCode, "UNIT-B");
  assert.equal(h.nodes.evidenceMessage.textContent, "");
  assert.deepEqual(h.reads.map(r => r.name), ["get-pilot-item-analytics", "get-pilot-item-analytics"]);
});
