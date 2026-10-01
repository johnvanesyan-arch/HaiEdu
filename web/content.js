import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const contentMode = document.body.dataset.contentMode || "legacy";
let itemTab = "preview";
let dashboard = null;
let selectedId = null;
let selectedDetail = null;
let detailLoadToken = 0;
let editorDirty = false;
let workflowBusy = false;

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

function setMessage(text, bad = false) {
  const target = $("consoleMessage");
  if (!target) return;
  target.textContent = text || "";
  target.classList.toggle("bad", Boolean(bad));
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(data?.detail || data?.error || error.message);
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

function renderStats(stats) {
  const host = $("stats");
  if (!host) return;
  const cards = [
    ["Հարցեր", stats.totalItems], ["Հրապարակված", stats.published], ["Ստուգման հերթ", stats.reviewQueue],
    ["Հաստատված", stats.approved], ["QA խնդիր", stats.qaFailed], ["Արխիվացված", stats.retired],
  ];
  host.innerHTML = cards.map(([label, value]) => `<article class="card quality-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
}

function populateSkillFilter(items) {
  const select = $("skillFilter");
  if (!select) return;
  const current = select.value;
  const skills = [...new Map(items.map((i) => [i.skill.code, i.skill])).values()].filter((s) => s.code);
  select.innerHTML = `<option value="">Բոլոր հմտությունները</option>${skills.map((s) => `<option value="${esc(s.code)}">${esc(s.code)}</option>`).join("")}`;
  if (skills.some((s) => s.code === current)) select.value = current;
}

function filteredItems() {
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const skill = $("skillFilter")?.value || "";
  const review = $("reviewFilter")?.value || "";
  const qa = $("qaFilter")?.value || "";
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
  const body = $("itemRows");
  if (!body) return;
  const items = filteredItems();
  if ($("resultCount")) $("resultCount").textContent = `${items.length} հարց`;
  body.innerHTML = items.map((item) => {
    const qa = !item.latestQa ? '<span class="qa-missing">QA չկա</span>' : item.latestQa.passed ? '<span class="qa-pass">QA անցած</span>' : '<span class="qa-fail">QA խնդիր</span>';
    if (contentMode === "bank") {
      const context = [item.curriculum?.grade?.labelHy || (item.curriculum?.grade?.number ? `${item.curriculum.grade.number}-րդ դասարան` : ""), item.curriculum?.subject?.nameHy || item.curriculum?.subject?.nameEn || "", item.curriculum?.unit?.titleHy || item.curriculum?.unit?.code || ""].filter(Boolean).join(" · ") || "Չկապակցված";
      const review = ({ unreviewed:"Չստուգված", needs_review:"Ստուգման է սպասում", in_review:"Ստուգման փուլում", changes_requested:"Փոփոխություն է պահանջվում", approved:"Հաստատված" })[item.reviewStatus] || item.reviewStatus;
      return `<tr data-id="${item.id}" class="${item.retiredAt ? "retired-row" : ""}">
        <td><strong>${esc(item.code)}</strong><div class="subtle tiny">${esc(item.type)}</div></td>
        <td>${esc(context)}</td>
        <td>${esc(item.skill?.code || "—")}</td>
        <td><span class="review-chip">${esc(review)}</span></td>
        <td>${qa}</td>
        <td>v${esc(item.versionNo)}</td>
      </tr>`;
    }
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
  body.querySelectorAll("tr[data-id]").forEach((row) => row.addEventListener("click", () => {
    if (contentMode === "bank") location.assign(`./content-item.html?id=${encodeURIComponent(row.dataset.id)}&from=bank`);
    else selectItem(row.dataset.id);
  }));
}
function renderLoadingDetail() {
  if ($("detailPanel")) $("detailPanel").innerHTML = `<h2>Բեռնվում է…</h2><p class="subtle">Հարցի աշխատանքային էջը բեռնվում է։</p>`;
}

async function selectItem(id) {
  if (id !== selectedId && editorDirty) {
    const discard = confirm("This question has unsaved changes. Discard them and open another item?");
    if (!discard) {
      renderRows();
      return;
    }
  }
  editorDirty = false;
  selectedId = id;
  document.body.dataset.contentItemId = id;
  selectedDetail = null;
  if ($("itemRows")) renderRows();
  renderLoadingDetail();
  const token = ++detailLoadToken;
  try {
    const data = await invoke("manage-content-quality", { action: "get_item_detail", itemId: id });
    if (token !== detailLoadToken || selectedId !== id) return;
    selectedDetail = data.detail;
    renderDetail();
  } catch (err) {
    if (token !== detailLoadToken) return;
    $("detailPanel").innerHTML = `<h2>Load failed</h2><p class="message bad">${esc(err.message)}</p>`;
  }
}

function optionRowsHtml(options, disabled) {
  return (options ?? []).map((o) => `<div class="option-editor-row" data-option-row>
    <label class="option-key-field">Key<input class="option-key" value="${esc(o.key)}" ${disabled ? "disabled" : ""} /></label>
    <label>Հայերեն<textarea class="option-hy" rows="2" ${disabled ? "disabled" : ""}>${esc(o.contentHy ?? "")}</textarea></label>
    <label>English<input class="option-en" value="${esc(o.contentEn ?? "")}" ${disabled ? "disabled" : ""} /></label>
    <button type="button" class="ghost remove-option-btn" ${disabled ? "disabled" : ""}>Remove</button>
  </div>`).join("");
}

function misconceptionRowsHtml(detail, disabled) {
  const available = detail.availableMisconceptions ?? [];
  const rows = detail.misconceptions ?? [];
  return rows.map((m) => `<div class="misconception-editor-row" data-misconception-row>
    <label>Code<select class="misconception-code" ${disabled ? "disabled" : ""}>${available.map((x) => `<option value="${esc(x.code)}" ${x.code === m.code ? "selected" : ""}>${esc(x.code)} — ${esc(x.title_hy)}</option>`).join("")}</select></label>
    <label>Response key<input class="misconception-response" value="${esc(m.responseKey ?? "*")}" ${disabled ? "disabled" : ""} /></label>
    <label class="wide">Note<input class="misconception-note" value="${esc(m.mappingNote ?? "")}" ${disabled ? "disabled" : ""} /></label>
    <button type="button" class="ghost remove-misconception-btn" ${disabled ? "disabled" : ""}>Remove</button>
  </div>`).join("");
}

function answerEditorHtml(detail, disabled) {
  const item = detail.item;
  const key = detail.answerKey ?? {};
  if (item.type === "single_choice") {
    return `<div class="answer-grid"><label>Correct option<select id="answerSingleChoice" ${disabled ? "disabled" : ""}></select></label><label>Feedback code<input id="answerFeedbackCode" value="${esc(key.feedbackCode ?? "")}" ${disabled ? "disabled" : ""} /></label></div>`;
  }
  if (item.type === "true_false") {
    return `<div class="answer-grid"><label>Correct answer<select id="answerTrueFalse" ${disabled ? "disabled" : ""}><option value="true" ${key.answer === true ? "selected" : ""}>True</option><option value="false" ${key.answer === false ? "selected" : ""}>False</option></select></label><label>Feedback code<input id="answerFeedbackCode" value="${esc(key.feedbackCode ?? "")}" ${disabled ? "disabled" : ""} /></label></div>`;
  }
  const quantity = item.type === "quantity";
  return `<div class="answer-grid">
    <label>Correct value<input id="answerNumeric" type="number" step="any" value="${esc(key.answer ?? "")}" ${disabled ? "disabled" : ""} /></label>
    <label>Tolerance<input id="answerTolerance" type="number" min="0" step="any" value="${esc(key.tolerance ?? 0)}" ${disabled ? "disabled" : ""} /></label>
    ${quantity ? `<label>Canonical unit<input id="answerCanonicalUnit" value="${esc(key.canonicalUnit ?? "")}" ${disabled ? "disabled" : ""} /></label><label>Accepted units<input id="answerAcceptedUnits" value="${esc((key.acceptedUnits ?? []).join(", "))}" placeholder="m, cm, mm" ${disabled ? "disabled" : ""} /></label>` : ""}
    <label class="wide">Feedback code<input id="answerFeedbackCode" value="${esc(key.feedbackCode ?? "")}" ${disabled ? "disabled" : ""} /></label>
  </div>`;
}

function learnerPreviewHtml(detail) {
  const item = detail.item;
  const options = item.type === "single_choice"
    ? (detail.options ?? []).map((option) => `<div class="learner-preview-option"><strong>${esc(option.key)}.</strong> ${esc(option.contentHy || "")}</div>`).join("")
    : item.type === "true_false"
      ? '<div class="learner-preview-option">Ճիշտ</div><div class="learner-preview-option">Սխալ</div>'
      : '<div class="learner-preview-option subtle">Սովորողը այստեղ մուտքագրում է իր պատասխանը։</div>';
  return `<section class="detail-section learner-preview" data-item-tab="preview"><h3>Սովորողի տեսքը</h3><p class="learner-preview-prompt">${esc(item.promptHy || "Հարցի տեքստ չկա")}</p><div class="learner-preview-options">${options}</div></section>`;
}

function activateItemTab(tab) {
  itemTab = tab;
  document.body.dataset.contentActiveTab = tab;
  const panel = $("detailPanel");
  if (!panel) return;
  panel.querySelectorAll("[data-item-tab]").forEach((section) => { section.hidden = section.dataset.itemTab !== tab; });
  panel.querySelectorAll("[data-item-tab-button]").forEach((button) => {
    const active = button.dataset.itemTabButton === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function wireItemTabs() {
  const panel = $("detailPanel");
  if (!panel) return;
  panel.querySelectorAll("[data-item-tab-button]").forEach((button) => button.addEventListener("click", () => activateItemTab(button.dataset.itemTabButton)));
  activateItemTab(itemTab);
}

window.addEventListener("haiedu:content-tab-refresh", () => activateItemTab(itemTab));

function renderDetail() {
  const item = dashboard?.items?.find((i) => i.id === selectedId);
  const detail = selectedDetail;
  if (!item || !detail) return;

  const editable = detail.editing?.contentEditable === true;
  const disabled = !editable;
  const qaErrors = item.latestQa?.errors ?? [];
  const qaWarnings = item.latestQa?.warnings ?? [];
  const purposes = (detail.pools ?? []).map((p) => `${p.purpose}${p.protected ? " (protected)" : ""}${p.enabled ? "" : " · staged"}`).join(" · ") || detail.item.config?.sprint11dBucket || "—";
  const generatedWarning = detail.editing?.reason === "generated_variant_requires_template_edit"
    ? `<div class="editor-warning"><strong>Generated variant.</strong> This concrete item is reproducible from template + seed, so rendered question/answer editing is locked. Edit/regenerate the source template instead; metadata/review actions remain available.</div>`
    : detail.item.retiredAt ? `<div class="editor-warning"><strong>Retired item.</strong> Restore it before editing.</div>` : "";

  $("detailPanel").innerHTML = `
    <div class="detail-heading">
      <div><p class="eyebrow">${esc(item.skill?.code)}</p><h2>${esc(item.code)}</h2></div>
      <span class="review-chip">v${esc(item.versionNo)}</span>
    </div>
    <div class="immutable-summary"><span><strong>Type:</strong> ${esc(item.type)}</span><span><strong>Skill:</strong> ${esc(item.skill?.code)}</span><span><strong>Purpose:</strong> ${esc(purposes)}</span></div>
    ${generatedWarning}
    ${editable ? `<div id="unsavedChangesNotice" class="editor-warning hidden" role="status"><strong>Չպահպանված փոփոխություններ։</strong> Պահպանեք տարբերակը կամ օգտագործեք QA/ստուգման գործողությունները։</div>` : ""}
    <nav class="item-tab-nav" aria-label="Հարցի աշխատանքային բաժիններ">
      <button type="button" class="item-tab-button" data-item-tab-button="preview">Նախադիտում</button>
      <button type="button" class="item-tab-button" data-item-tab-button="content">Բովանդակություն</button>
      <button type="button" class="item-tab-button" data-item-tab-button="metadata">Մետատվյալներ</button>
      <button type="button" class="item-tab-button" data-item-tab-button="review">QA և ստուգում</button>
      <button type="button" class="item-tab-button" data-item-tab-button="history">Պատմություն</button>
    </nav>
    ${learnerPreviewHtml(detail)}

    <section class="detail-section editor-section" data-item-tab="content">
      <div class="section-heading"><div><h3>Question content</h3><p class="subtle tiny">Item code, skill and item type are immutable here.</p></div></div>
      <label>Armenian question<textarea id="editPromptHy" rows="4" ${disabled ? "disabled" : ""}>${esc(detail.item.promptHy ?? "")}</textarea></label>
      <label>English question <span class="subtle tiny">optional</span><textarea id="editPromptEn" rows="3" ${disabled ? "disabled" : ""}>${esc(detail.item.promptEn ?? "")}</textarea></label>
      <label>Stimulus JSON <span class="subtle tiny">advanced</span><textarea id="editStimulus" class="code-field" rows="3" spellcheck="false" ${disabled ? "disabled" : ""}>${esc(JSON.stringify(detail.item.stimulus ?? {}, null, 2))}</textarea></label>
    </section>

    ${item.type === "single_choice" ? `<section class="detail-section editor-section" data-item-tab="content"><div class="section-heading"><div><h3>Պատասխանի տարբերակներ</h3><p class="subtle tiny">Keys must be unique and every option needs Armenian text.</p></div>${editable ? `<button type="button" id="addOptionBtn" class="ghost">Add option</button>` : ""}</div><div id="optionEditor">${optionRowsHtml(detail.options, disabled)}</div></section>` : ""}

    <section class="detail-section editor-section" data-item-tab="content"><h3>Ճիշտ պատասխան</h3>${answerEditorHtml(detail, disabled)}</section>

    <section class="detail-section editor-section" data-item-tab="metadata">
      <h3>Մետատվյալներ</h3>
      <div class="metadata-grid">
        <label>Difficulty<select id="metaDifficulty" ${disabled ? "disabled" : ""}>${[1,2,3,4,5].map((n)=>`<option value="${n}" ${n===item.difficulty?"selected":""}>${n}</option>`).join("")}</select></label>
        <label>Family<input id="metaFamily" value="${esc(item.itemFamily)}" ${disabled ? "disabled" : ""} /></label>
        <label class="wide">Source reference<input id="metaSource" value="${esc(item.sourceReference ?? "")}" ${disabled ? "disabled" : ""} /></label>
        <label class="wide">Validation state<input id="metaValidation" value="${esc(item.validationState ?? "")}" ${disabled ? "disabled" : ""} /></label>
      </div>
    </section>

    <section class="detail-section editor-section" data-item-tab="metadata">
      <div class="section-heading"><div><h3>Սխալ պատկերացումների կապակցում</h3><p class="subtle tiny">Mappings are restricted to active misconceptions for ${esc(item.skill?.code)}.</p></div>${editable && (detail.availableMisconceptions ?? []).length ? `<button type="button" id="addMisconceptionBtn" class="ghost">Add mapping</button>` : ""}</div>
      <div id="misconceptionEditor">${misconceptionRowsHtml(detail, disabled) || `<p class="subtle tiny">No mappings.</p>`}</div>
    </section>

    ${editable ? `<section class="detail-section save-revision-section" data-item-tab="content"><label>Revision summary<input id="changeSummary" placeholder="e.g. Clarified wording and corrected distractor B" /></label><div class="workflow-actions"><button id="saveRevisionBtn">Save as new version</button></div><p class="subtle tiny">Saving is atomic. The item immediately returns to <strong>needs_review</strong>; current-version QA and approval must be run again before publication/activation.</p></section>` : ""}

    <section class="detail-section" data-item-tab="review">
      <h3>Տեխնիկական QA</h3>
      <p><strong>${!item.latestQa ? "Not run for current version" : item.latestQa.passed ? "PASS" : "FAIL"}</strong>${item.latestQa ? ` · v${esc(item.latestQa.versionNo)}` : ""}</p>
      ${qaErrors.length ? `<ul class="error-list">${qaErrors.map((x)=>`<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${qaWarnings.length ? `<ul class="warning-list">${qaWarnings.map((x)=>`<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <div class="workflow-actions"><button id="runQaBtn" class="secondary">Run QA</button></div>
    </section>
    <section class="detail-section" data-item-tab="review">
      <h3>Review workflow</h3>
      <p>Current: <strong>${esc(item.reviewStatus)}</strong> · version <strong>${esc(item.versionNo)}</strong></p>
      <div class="workflow-actions">
        <button id="submitReviewBtn" class="secondary">Submit review</button>
        <button id="approveBtn">Approve</button>
        <button id="changesBtn" class="secondary">Request changes</button>
      </div>
    </section>
    <section class="detail-section" data-item-tab="history">
      <h3>Կենսափուլ</h3>
      <p>${item.retiredAt ? `Retired: ${esc(item.retiredReason || "—")}` : `Status: ${esc(item.lifecycleStatus)}`}</p>
      <div class="workflow-actions">${item.retiredAt ? `<button id="restoreBtn" class="secondary">Restore to review</button>` : `<button id="retireBtn" class="danger-btn">Retire / replace</button>`}</div>
    </section>
    <section class="detail-section tiny subtle" data-item-tab="history">
      Template: ${esc(detail.template?.code ?? "—")} · ${esc(detail.template?.kind ?? "—")}<br/>
      Variant: ${esc(detail.item.variantKey ?? "—")}${detail.item.variantSeed ? ` · seed ${esc(detail.item.variantSeed)}` : ""}<br/>
      Latest snapshot: ${item.latestSnapshot ? `v${esc(item.latestSnapshot.versionNo)} · ${esc(item.latestSnapshot.changeSummary || "")}` : "—"}<br/>
      Latest review: ${item.latestReview ? `${esc(item.latestReview.decision)} · ${esc(item.latestReview.type)}` : "—"}
    </section>`;

  $("runQaBtn")?.addEventListener("click", runQaCurrent);
  $("submitReviewBtn")?.addEventListener("click", submitReviewCurrent);
  $("approveBtn")?.addEventListener("click", approveCurrent);
  $("changesBtn")?.addEventListener("click", () => {
    if (editorDirty) return setMessage("Save or discard the unsaved edits before requesting changes.", true);
    const notes = prompt("Ի՞նչ փոփոխություն է պահանջվում։") ?? "";
    if (notes.trim()) action("request_changes", { reviewType: "content", notes });
  });
  $("saveRevisionBtn")?.addEventListener("click", saveRevision);
  $("retireBtn")?.addEventListener("click", retireItem);
  $("restoreBtn")?.addEventListener("click", () => action("restore"));
  $("addOptionBtn")?.addEventListener("click", addOptionRow);
  $("addMisconceptionBtn")?.addEventListener("click", addMisconceptionRow);
  wireEditorRows();
  syncSingleChoiceAnswer(detail.answerKey?.answer);
  wireEditorDirtyTracking();
  editorDirty = false;
  updateEditorDirtyUi();
  wireItemTabs();
}

function updateEditorDirtyUi() {
  $("unsavedChangesNotice")?.classList.toggle("hidden", !editorDirty);
  if ($("approveBtn")) $("approveBtn").textContent = editorDirty ? "Save, QA & approve" : "Approve";
  if ($("submitReviewBtn")) $("submitReviewBtn").textContent = editorDirty ? "Save, QA & submit" : "Submit review";
  if ($("runQaBtn")) $("runQaBtn").textContent = editorDirty ? "Save & run QA" : "Run QA";
}

function markEditorDirty() {
  if (!selectedDetail?.editing?.contentEditable || workflowBusy) return;
  editorDirty = true;
  updateEditorDirtyUi();
}

function wireEditorDirtyTracking() {
  document.querySelectorAll(".editor-section input, .editor-section textarea, .editor-section select").forEach((control) => {
    control.addEventListener("input", markEditorDirty);
    control.addEventListener("change", markEditorDirty);
  });
}

function wireEditorRows() {
  document.querySelectorAll(".remove-option-btn").forEach((button) => button.addEventListener("click", () => {
    button.closest("[data-option-row]")?.remove();
    syncSingleChoiceAnswer();
    markEditorDirty();
  }));
  document.querySelectorAll(".option-key").forEach((input) => input.addEventListener("input", () => syncSingleChoiceAnswer()));
  document.querySelectorAll(".remove-misconception-btn").forEach((button) => button.addEventListener("click", () => {
    button.closest("[data-misconception-row]")?.remove();
    if (!document.querySelector("[data-misconception-row]")) $("misconceptionEditor").innerHTML = `<p class="subtle tiny">No mappings.</p>`;
    markEditorDirty();
  }));
}

function nextOptionKey() {
  const used = new Set([...document.querySelectorAll(".option-key")].map((x) => x.value.trim()));
  for (let code = 65; code <= 90; code += 1) {
    const key = String.fromCharCode(code);
    if (!used.has(key)) return key;
  }
  return `O${used.size + 1}`;
}

function addOptionRow() {
  const host = $("optionEditor");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = optionRowsHtml([{ key: nextOptionKey(), contentHy: "", contentEn: "" }], false);
  host.appendChild(wrapper.firstElementChild);
  wireEditorRows();
  syncSingleChoiceAnswer();
  markEditorDirty();
}

function syncSingleChoiceAnswer(initialValue) {
  const select = $("answerSingleChoice");
  if (!select) return;
  const previous = initialValue ?? select.value;
  const keys = [...document.querySelectorAll(".option-key")].map((x) => x.value.trim()).filter(Boolean);
  select.innerHTML = keys.map((key) => `<option value="${esc(key)}">${esc(key)}</option>`).join("");
  if (keys.includes(String(previous))) select.value = String(previous);
}

function addMisconceptionRow() {
  const detail = selectedDetail;
  if (!detail?.availableMisconceptions?.length) return;
  const host = $("misconceptionEditor");
  if (host.querySelector("p")) host.innerHTML = "";
  const first = detail.availableMisconceptions[0];
  const wrapper = document.createElement("div");
  wrapper.innerHTML = misconceptionRowsHtml({ ...detail, misconceptions: [{ code: first.code, responseKey: "*", mappingNote: "" }] }, false);
  host.appendChild(wrapper.firstElementChild);
  wireEditorRows();
  markEditorDirty();
}

function collectOptions() {
  return [...document.querySelectorAll("[data-option-row]")].map((row) => ({
    key: row.querySelector(".option-key").value.trim(),
    contentHy: row.querySelector(".option-hy").value.trim(),
    contentEn: row.querySelector(".option-en").value.trim() || null,
  }));
}

function collectMisconceptions() {
  return [...document.querySelectorAll("[data-misconception-row]")].map((row) => ({
    code: row.querySelector(".misconception-code").value,
    responseKey: row.querySelector(".misconception-response").value.trim() || "*",
    mappingNote: row.querySelector(".misconception-note").value.trim() || null,
  }));
}

function collectAnswerKey(type) {
  const feedbackCode = $("answerFeedbackCode")?.value.trim() || null;
  if (type === "single_choice") return { answer: $("answerSingleChoice").value, feedbackCode };
  if (type === "true_false") return { answer: $("answerTrueFalse").value === "true", feedbackCode };
  const answer = Number($("answerNumeric").value);
  const tolerance = Number($("answerTolerance").value);
  if (!Number.isFinite(answer)) throw new Error("Correct numeric value is required.");
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error("Tolerance must be zero or greater.");
  if (type === "quantity") {
    const canonicalUnit = $("answerCanonicalUnit").value.trim();
    const acceptedUnits = $("answerAcceptedUnits").value.split(",").map((x) => x.trim()).filter(Boolean);
    if (!canonicalUnit) throw new Error("Canonical unit is required.");
    if (!acceptedUnits.includes(canonicalUnit)) throw new Error("Accepted units must include the canonical unit.");
    return { answer, tolerance, canonicalUnit, acceptedUnits, feedbackCode };
  }
  return { answer, tolerance, feedbackCode };
}

function buildRevisionPayload(item, defaultSummary = "Content editor revision") {
  let stimulus;
  try { stimulus = JSON.parse($("editStimulus").value || "{}"); }
  catch { throw new Error("Stimulus JSON is not valid JSON."); }

  const payload = {
    promptHy: $("editPromptHy").value.trim(),
    promptEn: $("editPromptEn").value.trim() || null,
    stimulus,
    difficulty: Number($("metaDifficulty").value),
    itemFamily: $("metaFamily").value.trim(),
    sourceReference: $("metaSource").value.trim() || null,
    validationState: $("metaValidation").value.trim(),
    options: item.type === "single_choice" ? collectOptions() : [],
    answerKey: collectAnswerKey(item.type),
    misconceptions: collectMisconceptions(),
    changeSummary: $("changeSummary")?.value.trim() || defaultSummary,
  };
  if (!payload.promptHy) throw new Error("Armenian question text is required.");
  if (!payload.itemFamily) throw new Error("Item family is required.");
  return payload;
}

async function persistCurrentRevision(defaultSummary = "Content editor revision") {
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item || !selectedDetail?.editing?.contentEditable) return false;
  const payload = buildRevisionPayload(item, defaultSummary);
  await invoke("manage-content-quality", { action: "save_content_revision", itemId: selectedId, payload });
  editorDirty = false;
  updateEditorDirtyUi();
  return true;
}

async function saveRevision() {
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item || !selectedDetail?.editing?.contentEditable || workflowBusy) return;
  try {
    workflowBusy = true;
    setMessage("Revision is being saved…");
    await persistCurrentRevision();
    await refresh(selectedId);
    setMessage(`${item.code}: saved as a new version. Run QA, then submit/approve the review.`);
  } catch (err) {
    setMessage(err.message, true);
  } finally {
    workflowBusy = false;
  }
}

async function ensureQaPassed({ force = false } = {}) {
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item) throw new Error("Item is not selected.");
  if (!force && item.latestQa?.passed === true) return true;
  const result = await invoke("manage-content-quality", { action: "run_qa", itemId: selectedId });
  return result.qa?.passed === true;
}

async function runQaCurrent() {
  if (workflowBusy) return;
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item) return;
  try {
    workflowBusy = true;
    const saved = editorDirty ? await persistCurrentRevision("Saved before technical QA") : false;
    setMessage(saved ? "Changes saved. Technical QA is running…" : "Technical QA is running…");
    const passed = await ensureQaPassed({ force: true });
    await refresh(selectedId);
    setMessage(passed ? `${item.code}: QA passed${saved ? " on the saved revision" : ""}.` : `${item.code}: changes were saved, but QA failed. Review the QA errors before approval.`, !passed);
  } catch (err) {
    setMessage(err.message, true);
  } finally {
    workflowBusy = false;
  }
}

async function submitReviewCurrent() {
  if (workflowBusy) return;
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item) return;
  try {
    workflowBusy = true;
    const saved = editorDirty ? await persistCurrentRevision("Saved before review submission") : false;
    setMessage(saved ? "Changes saved. Checking technical QA…" : "Checking technical QA…");
    const passed = await ensureQaPassed({ force: saved || item.latestQa?.passed !== true });
    if (!passed) {
      await refresh(selectedId);
      setMessage(`${item.code}: changes were saved, but QA failed. The item was not submitted for review.`, true);
      return;
    }
    await invoke("manage-content-quality", { action: "submit_review", itemId: selectedId, reviewType: "content" });
    await refresh(selectedId);
    setMessage(`${item.code}: ${saved ? "changes saved, QA passed, and " : ""}submitted for review.`);
  } catch (err) {
    setMessage(err.message, true);
  } finally {
    workflowBusy = false;
  }
}

async function approveCurrent() {
  if (workflowBusy) return;
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item) return;
  try {
    workflowBusy = true;
    const saved = editorDirty ? await persistCurrentRevision("Saved during approval") : false;
    setMessage(saved ? "Changes saved. Checking technical QA before approval…" : "Checking technical QA before approval…");
    const passed = await ensureQaPassed({ force: saved || item.latestQa?.passed !== true });
    if (!passed) {
      await refresh(selectedId);
      setMessage(`${item.code}: the edited version was saved, but QA failed, so it was not approved.`, true);
      return;
    }
    await invoke("manage-content-quality", { action: "approve", itemId: selectedId, reviewType: "content" });
    await refresh(selectedId);
    setMessage(`${item.code}: ${saved ? "changes saved, QA passed, and " : ""}approved.`);
  } catch (err) {
    setMessage(err.message, true);
  } finally {
    workflowBusy = false;
  }
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
    if (contentMode === "item") {
      const requested = new URLSearchParams(location.search).get("id") || reselect;
      if (!requested || !dashboard.items.some((item) => item.id === requested)) {
        if ($("detailPanel")) $("detailPanel").innerHTML = '<h2>Հարցը չի գտնվել</h2><p class="subtle">Վերադարձեք ստուգման հերթ կամ հարցերի բանկ։</p>';
        return true;
      }
      selectedId = requested;
      await selectItem(requested);
      return true;
    }
    renderStats(dashboard.stats);
    populateSkillFilter(dashboard.items);
    if (contentMode === "bank") {
      selectedId = null;
      renderRows();
      return true;
    }
    const nextId = dashboard.items.some((i) => i.id === reselect) ? reselect : dashboard.items[0]?.id ?? null;
    selectedId = nextId;
    renderRows();
    if (selectedId) await selectItem(selectedId);
    else if ($("detailPanel")) $("detailPanel").innerHTML = '<h2>Ընտրեք հարց</h2><p class="subtle">Հարցերի բանկը դատարկ է։</p>';
    return true;
  } catch (err) {
    setMessage(err.message, true);
    return false;
  }
}
let sessionCheck = 0;
async function showForSession(session) {
  const check = ++sessionCheck;
  $("console").classList.add("hidden");
  if (!session) {
    editorDirty = false;
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
    return;
  }
  $("authPanel").classList.add("hidden");
  $("signOutBtn").classList.remove("hidden");
  const allowed = await refresh();
  if (check !== sessionCheck) return;
  if (!allowed) {
    $("authMessage").textContent = "Չհաջողվեց հաստատել այս բաժնի հասանելիությունը։ Թարմացրեք էջը կամ մուտք գործեք համապատասխան հաշվով։";
    $("authPanel").classList.remove("hidden");
    return;
  }
  $("authMessage").textContent = "";
  $("console").classList.remove("hidden");
}

$("signOutBtn")?.addEventListener("click", () => supabase.auth.signOut());
$("refreshBtn")?.addEventListener("click", () => {
  if (editorDirty && !confirm("Discard unsaved changes and refresh the question bank?")) return;
  editorDirty = false;
  refresh();
});
["searchInput","skillFilter","reviewFilter","qaFilter"].forEach((id) => $(id)?.addEventListener(id === "searchInput" ? "input" : "change", renderRows));

window.addEventListener("beforeunload", (event) => {
  if (!editorDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

supabase.auth.onAuthStateChange((_event, session) => setTimeout(() => showForSession(session), 0));
const { data: { session } } = await supabase.auth.getSession();
await showForSession(session);
