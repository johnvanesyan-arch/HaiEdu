import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let dashboard = null;
let selectedId = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

function setMessage(text, bad = false) {
  $("consoleMessage").textContent = text || "";
  $("consoleMessage").classList.toggle("bad", Boolean(bad));
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(data?.detail || data?.error || error.message);
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

function renderStats(stats) {
  const cards = [
    ["Question bank", stats.totalItems], ["Published", stats.published], ["Review queue", stats.reviewQueue],
    ["Approved", stats.approved], ["QA failed", stats.qaFailed], ["Retired", stats.retired],
  ];
  $("stats").innerHTML = cards.map(([label, value]) => `<article class="card quality-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
}

function populateSkillFilter(items) {
  const current = $("skillFilter").value;
  const skills = [...new Map(items.map((i) => [i.skill.code, i.skill])).values()].filter((s) => s.code);
  $("skillFilter").innerHTML = `<option value="">Բոլոր հմտությունները</option>${skills.map((s) => `<option value="${esc(s.code)}">${esc(s.code)}</option>`).join("")}`;
  if (skills.some((s) => s.code === current)) $("skillFilter").value = current;
}

function filteredItems() {
  const q = $("searchInput").value.trim().toLowerCase();
  const skill = $("skillFilter").value;
  const review = $("reviewFilter").value;
  const qa = $("qaFilter").value;
  return (dashboard?.items ?? []).filter((item) => {
    const hay = `${item.code} ${item.skill?.code} ${item.skill?.nameHy} ${item.promptHy}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (skill && item.skill?.code !== skill) return false;
    if (review && item.reviewStatus !== review) return false;
    if (qa === "pass" && item.latestQa?.passed !== true) return false;
    if (qa === "fail" && item.latestQa?.passed !== false) return false;
    if (qa === "missing" && item.latestQa) return false;
    return true;
  });
}

function renderRows() {
  const items = filteredItems();
  $("resultCount").textContent = `${items.length} item`;
  $("itemRows").innerHTML = items.map((item) => {
    const qa = !item.latestQa ? `<span class="qa-missing">missing</span>` : item.latestQa.passed ? `<span class="qa-pass">PASS</span>` : `<span class="qa-fail">FAIL</span>`;
    return `<tr data-id="${item.id}" class="${item.id === selectedId ? "selected" : ""} ${item.retiredAt ? "retired-row" : ""}">
      <td><strong>${esc(item.code)}</strong><div class="subtle tiny">${esc(item.type)}</div></td>
      <td>${esc(item.skill?.code)}</td>
      <td>${esc(item.difficulty)} <span class="difficulty-chip">${esc(item.difficultyBand)}</span></td>
      <td>${esc(item.itemFamily)}</td>
      <td><span class="review-chip">${esc(item.reviewStatus)}</span></td>
      <td>${qa}</td>
      <td>v${esc(item.versionNo)}</td>
      <td><span class="life-chip">${item.retiredAt ? "retired" : esc(item.lifecycleStatus)}</span></td>
    </tr>`;
  }).join("");
  document.querySelectorAll("#itemRows tr[data-id]").forEach((row) => row.addEventListener("click", () => selectItem(row.dataset.id)));
}

function selectItem(id) {
  selectedId = id;
  renderRows();
  renderDetail();
}

function renderDetail() {
  const item = dashboard?.items?.find((i) => i.id === selectedId);
  if (!item) return;
  const qaErrors = item.latestQa?.errors ?? [];
  const qaWarnings = item.latestQa?.warnings ?? [];
  $("detailPanel").innerHTML = `
    <div><p class="eyebrow">${esc(item.skill?.code)}</p><h2>${esc(item.code)}</h2><p class="prompt-preview">${esc(item.promptHy)}</p></div>
    <section class="detail-section">
      <h3>Metadata</h3>
      <div class="metadata-grid">
        <label>Difficulty<select id="metaDifficulty">${[1,2,3,4,5].map((n)=>`<option value="${n}" ${n===item.difficulty?"selected":""}>${n}</option>`).join("")}</select></label>
        <label>Family<input id="metaFamily" value="${esc(item.itemFamily)}" /></label>
        <label class="wide">Source reference<input id="metaSource" value="${esc(item.sourceReference ?? "")}" /></label>
        <div class="wide"><span class="stat-label">Validation</span><div>${esc(item.validationState)}</div></div>
        <div class="wide"><span class="stat-label">Misconception codes</span><div>${(item.misconceptions ?? []).map((m)=>`<code>${esc(m.code)}</code>`).join(" · ") || "—"}</div></div>
      </div>
      <div class="workflow-actions" style="margin-top:10px"><button id="saveRevisionBtn">Պահել որպես նոր version</button></div>
    </section>
    <section class="detail-section">
      <h3>Technical QA</h3>
      <p><strong>${!item.latestQa ? "Not run" : item.latestQa.passed ? "PASS" : "FAIL"}</strong>${item.latestQa ? ` · v${esc(item.latestQa.versionNo)}` : ""}</p>
      ${qaErrors.length ? `<ul class="error-list">${qaErrors.map((x)=>`<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${qaWarnings.length ? `<ul class="warning-list">${qaWarnings.map((x)=>`<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <div class="workflow-actions"><button id="runQaBtn" class="secondary">Run QA</button></div>
    </section>
    <section class="detail-section">
      <h3>Review workflow</h3>
      <p>Current: <strong>${esc(item.reviewStatus)}</strong> · version <strong>${esc(item.versionNo)}</strong></p>
      <div class="workflow-actions">
        <button id="submitReviewBtn" class="secondary">Submit review</button>
        <button id="approveBtn">Approve</button>
        <button id="changesBtn" class="secondary">Request changes</button>
      </div>
    </section>
    <section class="detail-section">
      <h3>Lifecycle</h3>
      <p>${item.retiredAt ? `Retired: ${esc(item.retiredReason || "—")}` : `Status: ${esc(item.lifecycleStatus)}`}</p>
      <div class="workflow-actions">${item.retiredAt ? `<button id="restoreBtn" class="secondary">Restore to review</button>` : `<button id="retireBtn" class="danger-btn">Retire / replace</button>`}</div>
    </section>
    <section class="detail-section tiny subtle">
      Latest snapshot: ${item.latestSnapshot ? `v${esc(item.latestSnapshot.versionNo)} · ${esc(item.latestSnapshot.changeSummary || "")}` : "—"}<br/>
      Latest review: ${item.latestReview ? `${esc(item.latestReview.decision)} · ${esc(item.latestReview.type)}` : "—"}
    </section>`;

  $("runQaBtn")?.addEventListener("click", () => action("run_qa"));
  $("submitReviewBtn")?.addEventListener("click", () => action("submit_review", { reviewType: "content" }));
  $("approveBtn")?.addEventListener("click", () => action("approve", { reviewType: "content" }));
  $("changesBtn")?.addEventListener("click", () => {
    const notes = prompt("Ի՞նչ փոփոխություն է պահանջվում։") ?? "";
    if (notes.trim()) action("request_changes", { reviewType: "content", notes });
  });
  $("saveRevisionBtn")?.addEventListener("click", saveRevision);
  $("retireBtn")?.addEventListener("click", retireItem);
  $("restoreBtn")?.addEventListener("click", () => action("restore"));
}

async function saveRevision() {
  const item = dashboard.items.find((i) => i.id === selectedId);
  try {
    setMessage("Պահվում է…");
    await invoke("manage-content-quality", {
      action: "update_metadata", itemId: selectedId,
      difficulty: Number($("metaDifficulty").value), itemFamily: $("metaFamily").value, sourceReference: $("metaSource").value,
    });
    const summary = prompt("Version change summary", "Metadata revision") ?? "Metadata revision";
    await invoke("manage-content-quality", { action: "snapshot_revision", itemId: selectedId, changeSummary: summary });
    await refresh(selectedId);
    setMessage(`${item.code}: նոր version ստեղծվեց։`);
  } catch (err) { setMessage(err.message, true); }
}

async function retireItem() {
  const reason = prompt("Retirement reason");
  if (!reason?.trim()) return;
  const replacementCode = (prompt("Replacement item code (optional)", "") ?? "").trim();
  let replacementItemId = null;
  if (replacementCode) {
    const replacement = dashboard.items.find((i) => i.code === replacementCode);
    if (!replacement) return setMessage("Replacement item code-ը չի գտնվել։", true);
    replacementItemId = replacement.id;
  }
  await action("retire", { reason, replacementItemId });
}

async function action(name, extra = {}) {
  try {
    setMessage("Գործողությունը կատարվում է…");
    await invoke("manage-content-quality", { action: name, itemId: selectedId, ...extra });
    await refresh(selectedId);
    setMessage("Պատրաստ է։");
  } catch (err) { setMessage(err.message, true); }
}

async function refresh(reselect = selectedId) {
  try {
    dashboard = await invoke("get-content-quality-dashboard", {});
    renderStats(dashboard.stats);
    populateSkillFilter(dashboard.items);
    selectedId = dashboard.items.some((i) => i.id === reselect) ? reselect : dashboard.items[0]?.id ?? null;
    renderRows();
    if (selectedId) renderDetail();
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function showForSession(session) {
  if (!session) {
    $("authPanel").classList.remove("hidden");
    $("console").classList.add("hidden");
    $("signOutBtn").classList.add("hidden");
    return;
  }
  $("authPanel").classList.add("hidden");
  $("console").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  await refresh();
}

$("signInBtn").addEventListener("click", async () => {
  $("authMessage").textContent = "";
  const { error } = await supabase.auth.signInWithPassword({ email: $("emailInput").value.trim(), password: $("passwordInput").value });
  if (error) $("authMessage").textContent = error.message;
});
$("signOutBtn").addEventListener("click", () => supabase.auth.signOut());
$("refreshBtn").addEventListener("click", () => refresh());
["searchInput","skillFilter","reviewFilter","qaFilter"].forEach((id) => $(id).addEventListener(id === "searchInput" ? "input" : "change", renderRows));

supabase.auth.onAuthStateChange((_event, session) => setTimeout(() => showForSession(session), 0));
const { data: { session } } = await supabase.auth.getSession();
await showForSession(session);
