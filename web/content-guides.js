import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let catalog = [];
let selectedId = null;
let detail = null;
let loadToken = 0;
let editorDirty = false;

const statusLabels = {
  draft: "Սևագիր",
  review: "Ստուգման փուլում",
  published: "Հրապարակված",
  archived: "Արխիվացված",
};

const errorLabels = {
  mfa_required: "Այս գործողության համար հաստատեք բազմագործոն մուտքը (MFA)։",
  stale_authoring_version: "Ուղեցույցը meanwhile փոխվել է։ Թարմացրեք տվյալները և նորից փորձեք։",
  draft_required_before_review: "Նախ պահպանեք սևագիրը, ապա ուղարկեք ստուգման։",
  review_required_before_publish: "Հրապարակելուց առաջ ուղեցույցը պետք է անցնի ստուգման փուլ։",
  published_content_must_match_review: "Հրապարակվող բովանդակությունը չի համընկնում ստուգված տարբերակին։ Փոփոխությունները նորից պահպանեք որպես սևագիր և ուղարկեք ստուգման։",
  published_guide_required_before_archive: "Արխիվացվում է միայն հրապարակված ուղեցույցը։",
  skill_fallback_still_required: "Այս հմտության ուղեցույցը դեռ անհրաժեշտ պահուստային ուղի է և չի կարող արխիվացվել։",
  skill_fallback_missing: "Այս ձևանմուշի համար հրապարակված հմտության պահուստային ուղեցույց չկա։",
  change_rationale_required: "Նշեք փոփոխության պատճառը։",
  guide_validation_failed: "Ստուգումը սխալներ է գտել։ Ուղղեք դրանք և նորից փորձեք։",
  account_or_session_inactive: "Հաշիվը կամ սեսիան ակտիվ չէ։ Նորից մուտք գործեք։",
  content_authoring_role_required: "Այս բաժինը հասանելի է միայն բովանդակության ստուգողին կամ հարթակի ադմինիստրատորին։",
};

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

function messageFor(error) {
  const code = String(error?.code || error?.message || error || "");
  for (const [key, label] of Object.entries(errorLabels)) {
    if (code.includes(key)) return label;
  }
  return code || "Գործողությունը չհաջողվեց։";
}

function setMessage(text, bad = false) {
  $("guideMessage").textContent = text || "";
  $("guideMessage").classList.toggle("bad", Boolean(bad));
}

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke("manage-remediation-guides", { body });
  if (error) {
    const context = error.context;
    let payload = null;
    try { payload = context ? await context.json() : null; } catch { payload = null; }
    const thrown = new Error(payload?.detail || payload?.error || error.message);
    thrown.code = payload?.error || error.message;
    thrown.validation = payload?.validation;
    throw thrown;
  }
  if (data?.error) {
    const thrown = new Error(data.detail || data.error);
    thrown.code = data.error;
    thrown.validation = data.validation;
    throw thrown;
  }
  return data;
}

function uniqueBy(items, key, label) {
  const values = new Map();
  for (const item of items) {
    const id = key(item);
    if (id) values.set(String(id), label(item));
  }
  return [...values.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), "hy"));
}

function fillSelect(id, values, allLabel = "Բոլորը") {
  const select = $(id);
  const current = select.value;
  select.innerHTML = `<option value="">${esc(allLabel)}</option>${values.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("")}`;
  if (values.some(([value]) => String(value) === current)) select.value = current;
}

function populateFilters() {
  fillSelect("subjectFilter", uniqueBy(catalog, (g) => g.subjectId, (g) => g.subjectNameHy));
  fillSelect("gradeFilter", uniqueBy(catalog, (g) => g.gradeId, (g) => g.gradeLabelHy || `${g.gradeNumber}-րդ դասարան`));
  fillSelect("skillFilter", uniqueBy(catalog, (g) => g.skillId, (g) => `${g.skillCode} — ${g.skillNameHy}`));
  const programmes = [];
  const units = [];
  for (const guide of catalog) {
    for (const programme of guide.programmes ?? []) programmes.push(programme);
    for (const unit of guide.units ?? []) units.push(unit);
  }
  fillSelect("programmeFilter", uniqueBy(programmes, (p) => p.id, (p) => p.versionLabel || p.id));
  fillSelect("unitFilter", uniqueBy(units, (u) => u.id, (u) => `${u.code || ""} ${u.titleHy || ""}`.trim()));
}

function filteredGuides() {
  const query = $("guideSearch").value.trim().toLocaleLowerCase("hy");
  const subject = $("subjectFilter").value;
  const grade = $("gradeFilter").value;
  const programme = $("programmeFilter").value;
  const unit = $("unitFilter").value;
  const skill = $("skillFilter").value;
  const scope = $("scopeFilter").value;
  const status = $("statusFilter").value;
  return catalog.filter((guide) => {
    const haystack = [guide.subjectNameHy, guide.skillCode, guide.skillNameHy, guide.itemTemplateCode,
      guide.specializationCode, guide.content?.titleHy].join(" ").toLocaleLowerCase("hy");
    if (query && !haystack.includes(query)) return false;
    if (subject && guide.subjectId !== subject) return false;
    if (grade && guide.gradeId !== grade) return false;
    if (programme && !(guide.programmes ?? []).some((p) => p.id === programme)) return false;
    if (unit && !(guide.units ?? []).some((u) => u.id === unit)) return false;
    if (skill && guide.skillId !== skill) return false;
    if (scope && guide.guideScope !== scope) return false;
    if (status && guide.lifecycleStatus !== status) return false;
    return true;
  });
}

function renderStats(actor) {
  const counts = Object.fromEntries(Object.keys(statusLabels).map((status) => [status, catalog.filter((g) => g.lifecycleStatus === status).length]));
  $("guideStats").innerHTML = Object.entries(statusLabels).map(([status, label]) => `<article class="card guide-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(counts[status])}</strong></article>`).join("");
  $("assuranceLevel").textContent = actor?.aal === "aal2" ? "AAL2 · հաստատված" : "AAL1 · լրացուցիչ հաստատում";
}

function renderRows() {
  const guides = filteredGuides();
  $("guideCount").textContent = `${guides.length} ուղեցույց`;
  $("guideRows").innerHTML = guides.map((guide) => {
    const id = `${guide.guideScope}:${guide.guideSourceId}`;
    const code = guide.guideScope === "template" ? guide.itemTemplateCode : guide.skillCode;
    const scope = guide.guideScope === "template" ? "Ձևանմուշ" : "Հմտություն";
    return `<tr data-guide-id="${esc(id)}" class="${selectedId === id ? "selected" : ""}">
      <td><span class="guide-chip">${scope}</span></td>
      <td><strong>${esc(code)}</strong><div class="subtle small">${esc(guide.content?.titleHy || guide.skillNameHy)}</div></td>
      <td>${esc(guide.specializationCode || "Ընդհանուր")}</td>
      <td><span class="status-chip" data-status="${esc(guide.lifecycleStatus)}">${esc(statusLabels[guide.lifecycleStatus] || guide.lifecycleStatus)}</span></td>
      <td>հեղ. ${esc(guide.authoringVersion)} · գործ. ${esc(guide.runtimeVersion)}</td>
    </tr>`;
  }).join("");
  document.querySelectorAll("#guideRows tr[data-guide-id]").forEach((row) => row.addEventListener("click", () => selectGuide(row.dataset.guideId)));
}

function validationLabel(code) {
  const translations = {
    source_title_missing: "Աղբյուրի վերնագիրը նշված չէ։",
    source_locator_missing: "Աղբյուրի էջը կամ բաժինը նշված չէ։",
    source_url_missing: "Աղբյուրի հղումը նշված չէ։",
    preview_variant_missing: "Նախադիտման համար գործող հարցի տարբերակ չի գտնվել։",
    invalid_placeholder_syntax: "Տեղապահի գրությունը սխալ է։ Օգտագործեք {{parameterName}} ձևը։",
    skill_guide_placeholders_not_allowed: "Հմտության մակարդակի ուղեցույցում տեղապահեր չեն թույլատրվում։",
    worked_example_duplicates_live_item: "Նմանատիպ օրինակը կրկնում է գործող հարցը։",
    hint_1_obvious_answer_leakage: "Առաջին հուշումը ակնհայտորեն հայտնում է պատասխանը։",
    hint_2_obvious_answer_leakage: "Երկրորդ հուշումը ակնհայտորեն հայտնում է պատասխանը։",
    misconception_code_required: "Հմտության ուղեցույցի սխալ պատկերացման կոդը պարտադիր է։",
  };
  if (translations[code]) return translations[code];
  if (code.startsWith("missing_")) return "Պարտադիր դաշտը լրացված չէ։";
  if (code.startsWith("placeholder_not_allowed:")) return `Չթույլատրված տեղապահ՝ ${code.split(":")[1]}։`;
  if (code.startsWith("variant_parameter_missing:")) return `Ընտրված հարցում չկա ${code.split(":")[1]} պարամետրը։`;
  if (code.startsWith("answer_like_")) return "Պատասխան հիշեցնող տեղապահ կամ պարամետր չի թույլատրվում։";
  if (code.startsWith("worked_example_reuses_live_numeric_value:")) return `Նմանատիպ օրինակը կրկին օգտագործում է գործող թվային պարամետրը՝ ${code.split(":")[1]}։`;
  return code;
}

function renderValidation(validation) {
  const errors = validation?.errors ?? [];
  const warnings = validation?.warnings ?? [];
  const items = [
    ...errors.map((code) => `<li><strong>Սխալ.</strong> ${esc(validationLabel(code))}</li>`),
    ...warnings.map((code) => `<li><strong>Նշում.</strong> ${esc(validationLabel(code))}</li>`),
  ];
  $("validationPanel").classList.toggle("has-errors", Boolean(errors.length));
  $("validationPanel").innerHTML = `<strong>${errors.length ? "Հրապարակման ստուգումը չի անցել" : "Պարտադիր սխալ չի հայտնաբերվել"}</strong>${items.length ? `<ul>${items.join("")}</ul>` : ""}`;
}

function contentFromEditor() {
  const guide = detail.guide;
  return {
    skillId: guide.skillId,
    itemTemplateId: guide.itemTemplateId,
    misconceptionCode: $("specializationCode").value.trim(),
    triggerErrorCode: $("specializationCode").value.trim() || null,
    titleHy: $("guideTitleHy").value.trim(),
    strategyHy: $("guideStrategyHy").value.trim(),
    hint1Hy: $("guideHint1Hy").value.trim(),
    hint2Hy: $("guideHint2Hy").value.trim(),
    workedExampleHy: $("guideWorkedExampleHy").value.trim(),
    allowedParameterKeys: $("allowedParameterKeys").value.split(",").map((x) => x.trim()).filter(Boolean),
    metadata: detail.guide.content?.metadata ?? {},
  };
}

function referencesFromEditor() {
  return {
    sourceTitle: $("sourceTitle").value.trim(),
    sourceLocator: $("sourceLocator").value.trim(),
    sourceUrl: $("sourceUrl").value.trim(),
    notes: $("sourceNotes").value.trim(),
  };
}

function renderHistory(history) {
  return `<ul class="history-list">${(history ?? []).map((entry) => `<li>
    <div class="history-head"><strong>Տարբերակ ${esc(entry.authoring_version)} · ${esc(statusLabels[entry.lifecycle_status] || entry.lifecycle_status)}</strong><span class="subtle small">${esc(new Date(entry.created_at).toLocaleString("hy-AM"))}</span></div>
    <p>${esc(entry.change_rationale)}</p>
    <p class="subtle small">Դեր՝ ${esc(entry.actor_role)} · ${esc(entry.actor_aal)}${entry.published_runtime_version ? ` · գործող տարբերակ ${esc(entry.published_runtime_version)}` : ""}</p>
  </li>`).join("")}</ul>`;
}

function renderEditor() {
  const guide = detail.guide;
  const content = guide.content ?? {};
  const refs = guide.referenceMetadata ?? {};
  const variants = detail.variants ?? [];
  const isTemplate = guide.guideScope === "template";
  const canReview = guide.lifecycleStatus === "draft";
  const canPublish = guide.lifecycleStatus === "review";
  const canArchive = guide.lifecycleStatus === "published" && detail.fallback?.available;
  const code = isTemplate ? guide.itemTemplateCode : guide.skillCode;

  $("guideEditor").innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">${isTemplate ? "ՀԱՐՑԻ ՁԵՎԱՆՄՈՒՇ" : "ՀՄՏՈՒԹՅԱՆ ՈՒՂԵՑՈՒՅՑ"}</p><h2>${esc(code)}</h2></div><span class="status-chip" data-status="${esc(guide.lifecycleStatus)}">${esc(statusLabels[guide.lifecycleStatus])}</span></div>
    <p class="subtle">${esc(guide.subjectNameHy)} · ${esc(guide.gradeLabelHy || `${guide.gradeNumber}-րդ դասարան`)} · ${esc(guide.skillNameHy)}</p>
    <div class="editor-summary"><span><strong>Հեղինակային տարբերակ</strong><br>${esc(guide.authoringVersion)}</span><span><strong>Գործող տարբերակ</strong><br>${esc(guide.runtimeVersion)}</span><span><strong>Պահուստային ուղի</strong><br>${detail.fallback?.available ? "Առկա է" : "Պաշտպանված է"}</span></div>

    <section class="guide-form-section">
      <h3>Ուղեցույցի բովանդակություն</h3>
      <label>Հայերեն վերնագիր<input id="guideTitleHy" value="${esc(content.titleHy)}" /></label>
      <label>Ռազմավարություն<textarea id="guideStrategyHy" rows="3">${esc(content.strategyHy)}</textarea></label>
      <label>Հուշում 1<textarea id="guideHint1Hy" rows="3">${esc(content.hint1Hy)}</textarea></label>
      <label>Հուշում 2<textarea id="guideHint2Hy" rows="3">${esc(content.hint2Hy)}</textarea></label>
      <label>Նմանատիպ լուծված օրինակ<textarea id="guideWorkedExampleHy" rows="4">${esc(content.workedExampleHy)}</textarea></label>
      <div class="guide-form-grid">
        <label>${isTemplate ? "Սխալի կոդ (ըստ ցանկության)" : "Սխալ պատկերացման կոդ"}<input id="specializationCode" value="${esc(isTemplate ? (content.triggerErrorCode || "") : content.misconceptionCode)}" /></label>
        <label>Թույլատրելի սկզբնական պարամետրեր<input id="allowedParameterKeys" value="${esc((content.allowedParameterKeys ?? []).join(", "))}" ${isTemplate ? "" : "disabled"} placeholder="sourceValue, sourceUnit" /></label>
      </div>
    </section>

    <section class="guide-form-section">
      <h3>Աղբյուր և հղումներ</h3>
      <div class="guide-form-grid">
        <label>Աղբյուրի վերնագիր<input id="sourceTitle" value="${esc(refs.sourceTitle)}" /></label>
        <label>Էջ / բաժին<input id="sourceLocator" value="${esc(refs.sourceLocator)}" /></label>
        <label class="wide">Աղբյուրի հղում<input id="sourceUrl" type="url" value="${esc(refs.sourceUrl)}" /></label>
        <label class="wide">Նշումներ<textarea id="sourceNotes" rows="2">${esc(refs.notes)}</textarea></label>
      </div>
    </section>

    <section class="guide-form-section">
      <h3>Իրական հարցով նախադիտում</h3>
      <label>Հարցի տարբերակ<select id="previewVariant">${variants.map((variant) => `<option value="${esc(variant.id)}">${esc(variant.code || variant.variant_key)}</option>`).join("")}</select></label>
      <button id="previewGuideBtn" type="button" class="ghost">Ստուգել և նախադիտել</button>
      <div id="validationPanel" class="validation-panel"><strong>Գործարկեք նախադիտումը։</strong></div>
      <div id="previewPanel" class="preview-panel hidden"></div>
    </section>

    <section class="guide-form-section">
      <h3>Կենսափուլի գործողություններ</h3>
      <label>Փոփոխության պատճառ<textarea id="changeRationale" rows="2" placeholder="Ինչ է փոխվել և ինչու"></textarea></label>
      <div class="guide-actions">
        <button id="saveDraftBtn" type="button">Պահպանել որպես սևագիր</button>
        <button id="submitReviewBtn" type="button" class="ghost" ${canReview ? "" : "disabled"}>Ուղարկել ստուգման</button>
        <button id="publishGuideBtn" type="button" class="ghost" ${canPublish ? "" : "disabled"}>Հրապարակել (MFA)</button>
        <button id="archiveGuideBtn" type="button" class="danger" ${canArchive ? "" : "disabled"}>Արխիվացնել (MFA)</button>
      </div>
      ${guide.lifecycleStatus === "published" && !detail.fallback?.available ? `<p class="subtle small">Արխիվացումը արգելափակված է, քանի դեռ բոլոր գործող հարցերի համար անվտանգ պահուստային ուղի չկա։</p>` : ""}
    </section>

    <section class="guide-form-section"><h3>Անփոփոխ պատմություն</h3>${renderHistory(detail.history)}</section>`;

  ["guideTitleHy","guideStrategyHy","guideHint1Hy","guideHint2Hy","guideWorkedExampleHy","specializationCode","allowedParameterKeys","sourceTitle","sourceLocator","sourceUrl","sourceNotes"]
    .forEach((id) => $(id)?.addEventListener("input", () => { editorDirty = true; }));
  $("previewGuideBtn").addEventListener("click", previewGuide);
  $("saveDraftBtn").addEventListener("click", () => runWorkflow("save_draft"));
  $("submitReviewBtn").addEventListener("click", () => runWorkflow("submit_review"));
  $("publishGuideBtn").addEventListener("click", () => runWorkflow("publish"));
  $("archiveGuideBtn").addEventListener("click", () => runWorkflow("archive"));
}

async function selectGuide(id, force = false) {
  if (!force && id !== selectedId && editorDirty && !confirm("Չպահպանված փոփոխությունները չեղարկե՞լ։")) {
    renderRows();
    return;
  }
  editorDirty = false;
  selectedId = id;
  renderRows();
  const [guideScope, guideSourceId] = id.split(":");
  const token = ++loadToken;
  $("guideEditor").innerHTML = `<h2>Բեռնվում է…</h2><p class="subtle">Ուղեցույցի պատմությունը և հարցերի տարբերակները ստացվում են։</p>`;
  try {
    const response = await invoke({ action: "get", guideScope, guideSourceId });
    if (token !== loadToken) return;
    detail = response;
    renderEditor();
  } catch (error) {
    if (token !== loadToken) return;
    $("guideEditor").innerHTML = `<h2>Չհաջողվեց բեռնել</h2><p class="message bad">${esc(messageFor(error))}</p>`;
  }
}

async function previewGuide() {
  try {
    setMessage("Ուղեցույցը ստուգվում է…");
    const guide = detail.guide;
    const response = await invoke({
      action: "preview",
      guideScope: guide.guideScope,
      guideSourceId: guide.guideSourceId,
      variantId: $("previewVariant").value,
      content: contentFromEditor(),
      referenceMetadata: referencesFromEditor(),
    });
    renderValidation(response.validation);
    const preview = response.preview;
    $("previewPanel").classList.remove("hidden");
    $("previewPanel").innerHTML = `<strong>Նախադիտում · ${esc(preview.itemCode || "հարց չկա")}</strong>
      <p class="subtle small"><strong>Հարց.</strong> ${esc(preview.itemPromptHy || "—")}</p>
      <div class="preview-card"><strong>${esc(preview.titleHy)}</strong><p>${esc(preview.strategyHy)}</p></div>
      <div class="preview-card"><strong>Հուշում 1</strong><p>${esc(preview.hint1Hy)}</p></div>
      <div class="preview-card"><strong>Հուշում 2</strong><p>${esc(preview.hint2Hy)}</p></div>
      <div class="preview-card"><strong>Նմանատիպ օրինակ</strong><p>${esc(preview.workedExampleHy)}</p></div>`;
    setMessage(response.validation.errors.length ? "Ստուգումը սխալներ է գտել։" : "Նախադիտումը պատրաստ է։", Boolean(response.validation.errors.length));
  } catch (error) {
    setMessage(messageFor(error), true);
  }
}

async function ensureAal2() {
  const { data: level, error: levelError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (levelError) throw levelError;
  if (level?.currentLevel === "aal2") return true;
  const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
  if (factorError) throw factorError;
  const verified = [...(factors?.totp ?? []), ...(factors?.phone ?? [])].filter((factor) => factor.status === "verified");
  if (!verified.length) throw new Error("mfa_required");
  const code = prompt("Մուտքագրեք authenticator հավելվածի 6-նիշ կոդը։", "");
  if (!code?.trim()) return false;
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: verified[0].id, code: code.trim() });
  if (error) throw error;
  await supabase.auth.refreshSession();
  return true;
}

async function runWorkflow(action) {
  try {
    if (["publish", "archive"].includes(action) && !(await ensureAal2())) return;
    const rationale = $("changeRationale").value.trim();
    if (rationale.length < 3) throw new Error("change_rationale_required");
    setMessage("Գործողությունը կատարվում է…");
    const guide = detail.guide;
    await invoke({
      action,
      guideScope: guide.guideScope,
      guideSourceId: guide.guideSourceId,
      expectedAuthoringVersion: guide.authoringVersion,
      variantId: $("previewVariant").value,
      content: contentFromEditor(),
      referenceMetadata: referencesFromEditor(),
      changeRationale: rationale,
    });
    editorDirty = false;
    await refreshCatalog(selectedId);
    setMessage("Գործողությունը հաջողությամբ ավարտվեց։");
  } catch (error) {
    if (error.validation && $("validationPanel")) renderValidation(error.validation);
    setMessage(messageFor(error), true);
  }
}

async function refreshCatalog(reselect = selectedId) {
  const response = await invoke({ action: "list" });
  catalog = response.guides ?? [];
  renderStats(response.actor);
  populateFilters();
  renderRows();
  if (reselect && catalog.some((g) => `${g.guideScope}:${g.guideSourceId}` === reselect)) {
    await selectGuide(reselect, true);
  } else if (catalog[0]) {
    await selectGuide(`${catalog[0].guideScope}:${catalog[0].guideSourceId}`, true);
  } else {
    selectedId = null;
    $("guideEditor").innerHTML = `<h2>Ուղեցույց չկա</h2><p class="subtle">Հրապարակված կամ սևագիր ուղեցույցներ չեն գտնվել։</p>`;
  }
}

let sessionCheck = 0;
async function showForSession(session) {
  const check = ++sessionCheck;
  $("guideConsole").classList.add("hidden");
  if (!session) {
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
    return;
  }
  $("authPanel").classList.add("hidden");
  $("signOutBtn").classList.remove("hidden");
  try {
    await refreshCatalog();
    if (check !== sessionCheck) return;
    $("authMessage").textContent = "";
    $("guideConsole").classList.remove("hidden");
  } catch (error) {
    if (check !== sessionCheck) return;
    $("authMessage").textContent = messageFor(error);
    $("authPanel").classList.remove("hidden");
  }
}

$("signOutBtn").addEventListener("click", () => supabase.auth.signOut());
$("refreshGuidesBtn").addEventListener("click", () => {
  if (editorDirty && !confirm("Չպահպանված փոփոխությունները չեղարկե՞լ և թարմացնել ցանկը։")) return;
  editorDirty = false;
  refreshCatalog().catch((error) => setMessage(messageFor(error), true));
});
["guideSearch","subjectFilter","gradeFilter","programmeFilter","unitFilter","skillFilter","scopeFilter","statusFilter"]
  .forEach((id) => $(id).addEventListener(id === "guideSearch" ? "input" : "change", renderRows));

window.addEventListener("beforeunload", (event) => {
  if (!editorDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

supabase.auth.onAuthStateChange((_event, session) => setTimeout(() => showForSession(session), 0));
const { data: { session } } = await supabase.auth.getSession();
await showForSession(session);
