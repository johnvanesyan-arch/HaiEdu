import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const activation = readFileSync("supabase/migrations/0032_sprint_11d_activate_reviewed_bank.sql", "utf8");
const analyticsMigration = readFileSync("supabase/migrations/0033_sprint_11e_pilot_item_analytics.sql", "utf8");
const endpoint = readFileSync("supabase/functions/get-pilot-item-analytics/index.ts", "utf8");
const ui = readFileSync("web/content-pilot-analytics.js", "utf8");
const html = readFileSync("web/content.html", "utf8");

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test("11D activation is fail-closed and enforces 12/4/8 capacity", () => {
  has(activation, /11D_activation_gate_not_satisfied/, "activation must fail if review/QA gate is incomplete");
  has(activation, /r\.practice_n<>12 or r\.diagnostic_n<>4 or r\.mastery_n<>8/, "every skill must end at 12/4/8");
  has(activation, /11D_cross_purpose_overlap/, "purpose overlap must be rejected");
  has(activation, /form_version=1.*status='retired'/s, "Diagnostic v1 must be retired");
  has(activation, /form_version=2.*status='active'/s, "Diagnostic v2 must be active");
});

test("11E analytics preserves the operational-not-psychometric boundary", () => {
  has(analyticsMigration, /pilot_operational_evidence_not_validated_psychometrics/, "evidence must be explicitly labelled as non-psychometric");
  has(analyticsMigration, /exactRepeatRate/, "integrity report must include exact-repeat rate");
  has(analyticsMigration, /protectedPoolLeakCount/, "integrity report must detect protected-pool leakage");
  has(analyticsMigration, /response_time_ms/, "item evidence must include response time");
  has(analyticsMigration, /help_used/, "item evidence must include help usage");
  has(analyticsMigration, /abandoned_unanswered_count/, "item evidence must include meaningful abandonment signal");
  has(analyticsMigration, /replacementItemId/, "historical provenance must expose replacement identity");
});

test("11E endpoint is admin-only and service-authoritative", () => {
  has(endpoint, /\["admin", "content_admin"\]/, "pilot analytics must be limited to content administrators");
  has(endpoint, /hasActiveLiveSession/, "endpoint must enforce live-session gate");
  has(endpoint, /service_get_pilot_item_analytics/, "endpoint must use the server-side analytics RPC");
});

test("content console surfaces integrity and per-item pilot evidence", () => {
  has(html, /content-pilot-analytics\.js/, "content console must load pilot analytics UI");
  has(ui, /Assessment-integrity monitor/, "integrity summary must be visible");
  has(ui, /Exact-repeat rate/, "exact-repeat rate must be shown");
  has(ui, /Protected-pool leaks/, "protected-pool leak count must be shown");
  has(ui, /Pilot evidence/, "selected items must show per-item evidence");
  has(ui, /not validated psychometrics/, "UI must preserve evidence caveat");
});

test("pilot item evidence rendering is idempotent under MutationObserver", () => {
  has(ui, /function itemEvidenceSignature/, "item evidence must have a stable render signature");
  has(ui, /existing\?\.dataset\.itemId === itemId && existing\.dataset\.signature === signature/, "observer-driven rerenders must stop when evidence is unchanged");
  has(ui, /section\.dataset\.signature = signature/, "rendered evidence must retain its signature");
});
