import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let analytics = null;
let catalog = null;
let loadToken = 0;
let initialized = false;
let observerStarted = false;

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(data?.detail || data?.error || error.message);
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

function pct(value) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(Number(value) * 100)}%`;
}

function ms(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`;
}

function selectedItemId() {
  return document.querySelector("#itemRows tr.selected")?.dataset.id ?? null;
}

function ensureSummaryHost() {
  if ($("pilotEvidenceSummary")) return $("pilotEvidenceSummary");
  const stats = $("stats");
  if (!stats) return null;
  const section = document.createElement("section");
  section.id = "pilotEvidenceSummary";
  section.className = "card pilot-evidence-card";
  section.setAttribute("aria-live", "polite");
  stats.insertAdjacentElement("afterend", section);
  return section;
}

function currentUnitCode() {
  const unitId = $("unitFilter")?.value || "";
  if (!unitId || !catalog?.units) return null;
  return catalog.units.find((u) => u.id === unitId)?.code ?? null;
}

function poolLabel(pool) {
  if (pool.purpose === "practice") return "Practice";
  if (pool.purpose === "diagnostic") return "Diagnostic";
  if (pool.purpose === "mastery_check") return "Mastery";
  return pool.purpose;
}

function flagLabel(flag) {
  const labels = {
    high_exposure: "High exposure",
    unexpectedly_easy: "Unexpectedly easy",
    unexpectedly_hard: "Unexpectedly hard",
    frequently_missed: "Frequently missed",
    high_help_use: "High help use",
    high_exact_repeat: "High exact-repeat rate",
    possible_memorisation_signal: "Possible memorisation signal",
    unanswered_signal: "Unanswered / abandonment signal",
  };
  return labels[flag] || flag;
}

function renderSummary() {
  const host = ensureSummaryHost();
  if (!host) return;
  if (!analytics) {
    host.innerHTML = `<div class="pilot-evidence-heading"><div><p class="eyebrow">PILOT EVIDENCE</p><h2>Item-quality evidence</h2></div></div><p class="subtle">Choose a unit to load operational pilot evidence.</p>`;
    return;
  }

  const integrity = analytics.integrity ?? {};
  const flagged = (analytics.items ?? []).filter((item) => (item.flags ?? []).length > 0);
  const flaggedPreview = flagged.slice(0, 8);
  host.innerHTML = `
    <div class="pilot-evidence-heading">
      <div>
        <p class="eyebrow">PILOT EVIDENCE · ${esc(analytics.unitCode)}</p>
        <h2>Assessment-integrity monitor</h2>
        <p class="subtle small">Operational pilot evidence only — not validated psychometrics.</p>
      </div>
      <button id="refreshPilotEvidenceBtn" class="ghost" type="button">Refresh evidence</button>
    </div>
    <div class="pilot-metric-grid">
      <div><span>Learners</span><strong>${esc(integrity.distinctStudents ?? 0)}</strong></div>
      <div><span>Exposures</span><strong>${esc(integrity.exposureCount ?? 0)}</strong></div>
      <div><span>Exact-repeat rate</span><strong>${esc(pct(integrity.exactRepeatRate ?? 0))}</strong></div>
      <div><span>Fallback repeats</span><strong>${esc(integrity.exactRepeatFallbackCount ?? 0)}</strong></div>
      <div><span>Protected-pool leaks</span><strong class="${Number(integrity.protectedPoolLeakCount ?? 0) > 0 ? "pilot-alert" : "pilot-ok"}">${esc(integrity.protectedPoolLeakCount ?? 0)}</strong></div>
      <div><span>Flagged items</span><strong>${esc(integrity.flaggedItemCount ?? 0)}</strong></div>
    </div>
    <div class="pilot-pool-row">${(analytics.pools ?? []).map((pool) => `<span><strong>${esc(poolLabel(pool))}</strong> ${esc(pool.enabledItemCount)}${pool.protected ? " · protected" : ""}</span>`).join("")}</div>
    <div class="pilot-flagged-block">
      <strong>Items needing attention</strong>
      ${flaggedPreview.length ? `<div class="pilot-flag-list">${flaggedPreview.map((item) => `<button type="button" class="pilot-flag-item" data-pilot-item-id="${esc(item.itemId)}"><span>${esc(item.itemCode)}</span><small>${esc((item.flags ?? []).map(flagLabel).join(" · "))}</small></button>`).join("")}</div>` : `<p class="subtle small">No operational flags at the current evidence volume.</p>`}
      ${flagged.length > flaggedPreview.length ? `<p class="subtle tiny">Showing 8 of ${esc(flagged.length)} flagged items.</p>` : ""}
    </div>`;

  $("refreshPilotEvidenceBtn")?.addEventListener("click", () => loadAnalytics({ forceCatalog: true }));
  host.querySelectorAll("[data-pilot-item-id]").forEach((button) => button.addEventListener("click", () => focusItem(button.dataset.pilotItemId)));
}

function focusItem(itemId) {
  let row = document.querySelector(`#itemRows tr[data-id="${CSS.escape(itemId)}"]`);
  if (!row || row.hidden) {
    const item = (analytics?.items ?? []).find((x) => x.itemId === itemId);
    if (item && $("searchInput")) {
      $("searchInput").value = item.itemCode;
      $("searchInput").dispatchEvent(new Event("input", { bubbles: true }));
      setTimeout(() => {
        row = document.querySelector(`#itemRows tr[data-id="${CSS.escape(itemId)}"]`);
        row?.click();
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
    return;
  }
  row.click();
  row.scrollIntoView({ behavior: "smooth", block: "center" });
}

function itemEvidenceSignature(item) {
  return [
    item.versionNo,
    item.exposureCount,
    item.distinctStudents,
    item.correctnessRate,
    item.medianResponseTimeMs,
    item.helpUseRate,
    item.exactRepeatRate,
    item.unansweredCount,
    item.abandonedUnansweredCount,
    item.practiceExposures,
    item.diagnosticExposures,
    item.masteryExposures,
    item.replacementItemId ?? "",
    ...(item.flags ?? []),
  ].join("|");
}

function renderItemEvidence() {
  const panel = $("detailPanel");
  const itemId = selectedItemId();
  if (!panel || !itemId || !panel.querySelector(".detail-heading")) return;

  const existing = panel.querySelector("#pilotItemEvidence");
  const item = (analytics?.items ?? []).find((row) => row.itemId === itemId);
  if (!item) {
    existing?.remove();
    return;
  }

  const signature = itemEvidenceSignature(item);
  if (existing?.dataset.itemId === itemId && existing.dataset.signature === signature) return;
  existing?.remove();

  const section = document.createElement("section");
  section.id = "pilotItemEvidence";
  section.dataset.itemId = itemId;
  section.dataset.signature = signature;
  section.className = "detail-section pilot-item-evidence";
  const flags = item.flags ?? [];
  section.innerHTML = `
    <div class="section-heading"><div><h3>Pilot evidence</h3><p class="subtle tiny">Operational evidence only; do not interpret these rates as validated psychometrics.</p></div></div>
    <div class="pilot-item-grid">
      <div><span>Exposures</span><strong>${esc(item.exposureCount)}</strong></div>
      <div><span>Learners</span><strong>${esc(item.distinctStudents)}</strong></div>
      <div><span>Correct</span><strong>${esc(pct(item.correctnessRate))}</strong></div>
      <div><span>Median response</span><strong>${esc(ms(item.medianResponseTimeMs))}</strong></div>
      <div><span>Help use</span><strong>${esc(pct(item.helpUseRate))}</strong></div>
      <div><span>Exact repeats</span><strong>${esc(pct(item.exactRepeatRate))}</strong></div>
      <div><span>Unanswered</span><strong>${esc(item.unansweredCount)}</strong></div>
      <div><span>Abandoned after serve</span><strong>${esc(item.abandonedUnansweredCount)}</strong></div>
    </div>
    <p class="subtle tiny">Purpose exposure: Practice ${esc(item.practiceExposures)} · Diagnostic ${esc(item.diagnosticExposures)} · Mastery ${esc(item.masteryExposures)}</p>
    ${flags.length ? `<div class="pilot-item-flags">${flags.map((flag) => `<span>${esc(flagLabel(flag))}</span>`).join("")}</div>` : `<p class="pilot-ok small">No operational flags for this item.</p>`}
    ${item.replacementItemId ? `<p class="subtle tiny">Historical evidence is retained on this item; replacement item id: ${esc(item.replacementItemId)}</p>` : ""}`;

  const anchor = panel.querySelector("#curriculumContextCard") || panel.querySelector(".immutable-summary") || panel.querySelector(".detail-heading");
  anchor.insertAdjacentElement("afterend", section);
}

async function loadCatalog() {
  const dashboard = await invoke("get-content-quality-dashboard", {});
  catalog = dashboard.catalog ?? null;
}

async function loadAnalytics({ forceCatalog = false } = {}) {
  const token = ++loadToken;
  try {
    if (!catalog || forceCatalog) await loadCatalog();
    const unitCode = currentUnitCode();
    if (!unitCode) {
      analytics = null;
      renderSummary();
      renderItemEvidence();
      return;
    }
    const result = await invoke("get-pilot-item-analytics", { unitCode });
    if (token !== loadToken) return;
    analytics = result.analytics ?? null;
    renderSummary();
    renderItemEvidence();
  } catch (err) {
    if (token !== loadToken) return;
    const host = ensureSummaryHost();
    if (host) host.innerHTML = `<div class="pilot-evidence-heading"><div><p class="eyebrow">PILOT EVIDENCE</p><h2>Evidence unavailable</h2></div></div><p class="message bad">${esc(err.message)}</p>`;
  }
}

function start() {
  if (initialized || !$("console") || !$("detailPanel")) return;
  initialized = true;
  ensureSummaryHost();
  renderSummary();

  $("unitFilter")?.addEventListener("change", () => setTimeout(() => loadAnalytics(), 50));
  $("refreshBtn")?.addEventListener("click", () => setTimeout(() => loadAnalytics({ forceCatalog: true }), 180));

  if (!observerStarted) {
    observerStarted = true;
    new MutationObserver(() => renderItemEvidence()).observe($("detailPanel"), { childList: true, subtree: true });
    new MutationObserver(() => renderItemEvidence()).observe($("itemRows"), { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  setTimeout(() => loadAnalytics({ forceCatalog: true }), 120);
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(start, 0);
});
const { data: { session } } = await supabase.auth.getSession();
if (session) start();
