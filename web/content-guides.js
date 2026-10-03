import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let catalog = [];
let selectedId = null;
let detail = null;
let loadToken = 0;
let editorDirty = false;
let currentActor = null;
let pendingEnrollmentFactorId = null;
let activeGuideTab = "content";
let previewToken = 0;

const statusLabels = {
  draft: "Սևագիր",
  review: "Ստուգված",
  published: "Հրապարակված",
  archived: "Արխիվացված",
};

const variantBucketLabels = {
  diagnostic: "Ախտորոշիչ",
  practice: "Վարժանք",
  mastery_check: "Յուրացման ստուգում",
  chapter_review: "Բաժնի ամփոփում",
  fixed: "Ֆիքսված հարց",
  other: "Այլ",
};

const difficultyBandLabels = {
  foundation: "Հիմքային",
  core: "Հիմնական",
  challenge: "Առաջադեմ",
};

const errorLabels = {
  mfa_required: "Այս գործողության համար հաստատեք բազմագործոն մուտքը (MFA)։",
  stale_authoring_version: "Ուղեցույցը մինչ այդ փոխվել է։ Թարմացրեք տվյալները և նորից փորձեք։",
  draft_required_before_review: "Նախ պահպանեք սևագիրը, ապա ուղարկեք ստուգման։",
  review_required_before_publish: "Հրապարակելուց առաջ ուղեցույցը պետք է անցնի ստուգման փուլ։",
  published_content_must_match_review: "Հրապարակվող բովանդակությունը չի համընկնում ստուգված տարբերակին։ Փոփոխությունները նորից պահպանեք որպես սևագիր և ուղարկեք ստուգման։",
  unsaved_changes_must_be_saved: "Ստուգված նշելուց առաջ պահպանեք բովանդակության փոփոխությունները։",
  published_guide_required_before_archive: "Արխիվացվում է միայն հրապարակված ուղեցույցը։",
  skill_fallback_still_required: "Այս հմտության ուղեցույցը դեռ անհրաժեշտ պահուստային ուղի է և չի կարող արխիվացվել։",
  skill_fallback_missing: "Այս ձևանմուշի համար հրապարակված հմտության պահուստային ուղեցույց չկա։",
  change_rationale_required: "Նշեք փոփոխության պատճառը։",
  guide_validation_failed: "Ստուգումը սխալներ է գտել։ Ուղղեք դրանք և նորից փորձեք։",
  account_or_session_inactive: "Հաշիվը կամ սեսիան ակտիվ չէ։ Նորից մուտք գործեք։",
  content_authoring_role_required: "Այս բաժինը հասանելի է միայն բովանդակության ստուգողին կամ հարթակի ադմինիստրատորին։",
  mfa_enrollment_cancelled: "Բազմագործոն մուտքի կարգավորումը չավարտվեց։",
  mfa_verification_failed: "Հաստատման կոդը չընդունվեց։ Ստուգեք կոդը և նորից փորձեք։",
  expected_authoring_version_required: "Ուղեցույցի խմբագրվող տարբերակի համարը բացակայում է։ Թարմացրեք էջը և կրկին փորձեք։",
  guide_catalog_failed: "Չհաջողվեց բեռնել ուղեցույցների ցանկը։",
  guide_create_failed: "Չհաջողվեց ստեղծել ուղեցույցի սևագիրը։",
  guide_history_failed: "Չհաջողվեց բեռնել ուղեցույցի տարբերակների պատմությունը։",
  guide_identity_required: "Ուղեցույցը չի նույնականացվել։ Վերադարձեք ցանկ և նորից բացեք այն։",
  guide_not_found: "Ուղեցույցը չի գտնվել։ Թարմացրեք ցանկը։",
  guide_scope_required: "Ուղեցույցի մակարդակը նշված չէ։",
  guide_target_required: "Ուղեցույցի հմտությունը կամ հարցի ձևանմուշը նշված չէ։",
  guide_workflow_failed: "Ուղեցույցի գործողությունը չհաջողվեց։",
  invalid_action: "Այս գործողությունը չի աջակցվում։",
  invalid_json: "Ուղարկված տվյալները վավեր չեն։",
  method_not_allowed: "Այս հարցումը չի աջակցվում։",
  server_not_configured: "Սերվերի կարգավորումը թերի է։ Դիմեք հարթակի ադմինիստրատորին։",
  unauthorized: "Սեսիան վավեր չէ։ Նորից մուտք գործեք։",
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

const academicFilterIds = ["subjectFilter", "gradeFilter", "programmeFilter", "unitFilter", "skillFilter", "templateFilter"];

function matchesAcademicSelection(guide, through = "template") {
  const positions = { subject: 0, grade: 1, programme: 2, unit: 3, skill: 4, template: 5 };
  const max = positions[through] ?? positions.template;
  const subject = $("subjectFilter").value;
  const grade = $("gradeFilter").value;
  const programme = $("programmeFilter").value;
  const unit = $("unitFilter").value;
  const skill = $("skillFilter").value;
  const template = $("templateFilter").value;
  if (max >= 0 && subject && guide.subjectId !== subject) return false;
  if (max >= 1 && grade && guide.gradeId !== grade) return false;
  if (max >= 2 && programme && !(guide.programmes ?? []).some((p) => p.id === programme)) return false;
  if (max >= 3 && unit && !(guide.units ?? []).some((u) => u.id === unit)) return false;
  if (max >= 4 && skill && guide.skillId !== skill) return false;
  if (max >= 5 && template && guide.itemTemplateId !== template) return false;
  return true;
}

function populateFilters() {
  fillSelect("subjectFilter", uniqueBy(catalog, (g) => g.subjectId, (g) => g.subjectNameHy));
  const bySubject = catalog.filter((g) => matchesAcademicSelection(g, "subject"));
  fillSelect("gradeFilter", uniqueBy(bySubject, (g) => g.gradeId, (g) => g.gradeLabelHy || `${g.gradeNumber}-րդ դասարան`));

  const byGrade = catalog.filter((g) => matchesAcademicSelection(g, "grade"));
  const programmes = [];
  for (const guide of byGrade) {
    for (const programme of guide.programmes ?? []) {
      programmes.push({ ...programme, context: `${guide.subjectNameHy} · ${guide.gradeLabelHy || `${guide.gradeNumber}-րդ դասարան`}` });
    }
  }
  fillSelect("programmeFilter", uniqueBy(programmes, (p) => p.id, (p) => `${p.context} · ${p.versionLabel || p.id}`));

  const byProgramme = catalog.filter((g) => matchesAcademicSelection(g, "programme"));
  const units = [];
  for (const guide of byProgramme) {
    for (const unit of guide.units ?? []) units.push(unit);
  }
  fillSelect("unitFilter", uniqueBy(units, (u) => u.id, (u) => `${u.code || ""} ${u.titleHy || ""}`.trim()));

  const byUnit = catalog.filter((g) => matchesAcademicSelection(g, "unit"));
  fillSelect("skillFilter", uniqueBy(byUnit, (g) => g.skillId, (g) => `${g.skillCode} — ${g.skillNameHy}`));

  const bySkill = catalog.filter((g) => matchesAcademicSelection(g, "skill"));
  fillSelect("templateFilter", uniqueBy(
    bySkill.filter((g) => g.itemTemplateId),
    (g) => g.itemTemplateId,
    (g) => g.itemTemplateCode,
  ));
}

function filteredGuides() {
  const query = $("guideSearch").value.trim().toLocaleLowerCase("hy");
  const subject = $("subjectFilter").value;
  const grade = $("gradeFilter").value;
  const programme = $("programmeFilter").value;
  const unit = $("unitFilter").value;
  const skill = $("skillFilter").value;
  const template = $("templateFilter").value;
  const scope = $("scopeFilter").value;
  const status = $("statusFilter").value;
  return catalog.filter((guide) => {
    const haystack = [guide.subjectNameHy, guide.gradeLabelHy, guide.skillCode, guide.skillNameHy, guide.itemTemplateCode,
      guide.specializationCode, guide.content?.titleHy,
      ...(guide.programmes ?? []).map((p) => p.versionLabel),
      ...(guide.units ?? []).flatMap((u) => [u.code, u.titleHy]),
    ].join(" ").toLocaleLowerCase("hy");
    if (query && !haystack.includes(query)) return false;
    if (subject && guide.subjectId !== subject) return false;
    if (grade && guide.gradeId !== grade) return false;
    if (programme && !(guide.programmes ?? []).some((p) => p.id === programme)) return false;
    if (unit && !(guide.units ?? []).some((u) => u.id === unit)) return false;
    if (skill && guide.skillId !== skill) return false;
    if (template && guide.itemTemplateId !== template) return false;
    if (scope && guide.guideScope !== scope) return false;
    if (status && guide.lifecycleStatus !== status) return false;
    return true;
  });
}

function selectedFilterLabels() {
  return academicFilterIds
    .map((id) => $(id))
    .filter((select) => select.value)
    .map((select) => select.options[select.selectedIndex]?.textContent)
    .filter(Boolean);
}

function renderStats(actor) {
  currentActor = actor ?? currentActor;
  const counts = Object.fromEntries(Object.keys(statusLabels).map((status) => [status, catalog.filter((g) => g.lifecycleStatus === status).length]));
  $("guideStats").innerHTML = Object.entries(statusLabels).map(([status, label]) => `<article class="card guide-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(counts[status])}</strong></article>`).join("");
  renderAssurance();
}

function renderAssurance() {
  $("assuranceLevel").textContent = currentActor?.aal === "aal2" ? "AAL2 · հաստատված" : "AAL1 · լրացուցիչ հաստատում";
}

function renderRows() {
  const guides = filteredGuides();
  $("guideCount").textContent = `${guides.length} ուղեցույց`;
  const labels = selectedFilterLabels();
  $("activeScopeSummary").textContent = labels.length
    ? `Ընտրված ուսումնական շրջանակ՝ ${labels.join(" → ")}`
    : "Ցուցադրվում են բոլոր հասանելի ուսումնական շրջանակները։";
  $("guideRows").innerHTML = guides.map((guide) => {
    const id = `${guide.guideScope}:${guide.guideSourceId}`;
    const code = guide.guideScope === "template" ? guide.itemTemplateCode : guide.skillCode;
    const scope = guide.guideScope === "template" ? "Ձևանմուշ" : "Հմտություն";
    const programme = (guide.programmes ?? []).map((entry) => entry.versionLabel).filter(Boolean).join(" · ") || "—";
    const units = (guide.units ?? []).map((entry) => `${entry.code || ""} ${entry.titleHy || ""}`.trim()).filter(Boolean).join(" · ") || "—";
    return `<tr data-guide-id="${esc(id)}" class="${selectedId === id ? "selected" : ""}">
      <td><span class="guide-chip">${scope}</span></td>
      <td><strong>${esc(guide.subjectNameHy)}</strong><div class="subtle small">${esc(guide.gradeLabelHy || `${guide.gradeNumber}-րդ դասարան`)}</div></td>
      <td><strong>${esc(programme)}</strong><div class="subtle small">${esc(units)}</div></td>
      <td><strong>${esc(code)}</strong><div class="subtle small">${esc(guide.content?.titleHy || guide.skillNameHy)}</div></td>
      <td>${esc(guide.specializationCode || "Ընդհանուր")}</td>
      <td><span class="status-chip" data-status="${esc(guide.lifecycleStatus)}">${esc(statusLabels[guide.lifecycleStatus] || guide.lifecycleStatus)}</span></td>
      <td>հեղ. ${esc(guide.authoringVersion)} · գործ. ${esc(guide.runtimeVersion)}</td>
    </tr>`;
  }).join("");
  document.querySelectorAll("#guideRows tr[data-guide-id]").forEach((row) => {
    row.tabIndex = 0;
    row.setAttribute("role", "link");
    row.addEventListener("click", () => openGuide(row.dataset.guideId));
    row.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      openGuide(row.dataset.guideId);
    });
  });
}

function guideIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function updateGuideUrl(id, replace = false) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function setWorkspaceMode(mode) {
  const console = $("guideConsole");
  console.classList.toggle("catalog-mode", mode === "catalog");
  console.classList.toggle("editor-mode", mode === "editor");
}

async function openGuide(id, { replace = false, force = false } = {}) {
  if (!id) return;
  if (!force && id !== selectedId && editorDirty && !confirm("Չպահպանված փոփոխությունները չեղարկե՞լ։")) {
    renderRows();
    return;
  }
  setWorkspaceMode("editor");
  updateGuideUrl(id, replace);
  activeGuideTab = "content";
  await selectGuide(id, true);
  $("guideEditor")?.scrollTo({ top: 0, behavior: "auto" });
}

function returnToGuideList({ replace = false, force = false } = {}) {
  if (!force && editorDirty && !confirm("Չպահպանված փոփոխությունները չեղարկե՞լ և վերադառնալ ցանկին։")) return;
  invalidateGuidePreview();
  ++loadToken;
  editorDirty = false;
  selectedId = null;
  detail = null;
  updateGuideUrl(null, replace);
  setWorkspaceMode("catalog");
  renderRows();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validationLabel(code) {
  const translations = {
    source_title_missing: "Աղբյուրի վերնագիրը նշված չէ։",
    source_locator_missing: "Աղբյուրի էջը կամ բաժինը նշված չէ։",
    source_url_missing: "Աղբյուրի հղումը նշված չէ։",
    source_url_invalid: "Աղբյուրի հղումը պետք է սկսվի http:// կամ https:// ձևով։",
    preview_variant_missing: "Նախադիտման համար գործող հարցի տարբերակ չի գտնվել։",
    invalid_placeholder_syntax: "Տեղապահի գրությունը սխալ է։ Օգտագործեք {{parameterName}} ձևը։",
    skill_guide_placeholders_not_allowed: "Հմտության մակարդակի ուղեցույցում տեղապահեր չեն թույլատրվում։",
    worked_example_duplicates_live_item: "Նմանատիպ օրինակը կրկնում է գործող հարցը։",
    worked_example_too_similar_to_live_item: "Նմանատիպ օրինակը չափազանց նման է գործող հարցին։ Փոխեք արժեքները կամ համատեքստը։",
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
  const specialization = $("specializationCode").value.trim();
  return {
    skillId: guide.skillId,
    itemTemplateId: guide.itemTemplateId,
    misconceptionCode: guide.guideScope === "skill" ? specialization : "",
    triggerErrorCode: guide.guideScope === "template" ? (specialization || null) : null,
    titleHy: $("guideTitleHy").value.trim(),
    strategyHy: $("guideStrategyHy").value.trim(),
    hint1Hy: $("guideHint1Hy").value.trim(),
    hint2Hy: $("guideHint2Hy").value.trim(),
    workedExampleHy: $("guideWorkedExampleHy").value.trim(),
    allowedParameterKeys: $("allowedParameterKeys").value.split(",").map((x) => x.trim()).filter(Boolean),
    metadata: detail.guide.content?.metadata ?? {},
  };
}

function referenceEditorValues(value) {
  const refs = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const firstNonBlank = (...values) => {
    for (const entry of values) {
      const text = String(entry ?? "").trim();
      if (text) return text;
    }
    return "";
  };
  return {
    sourceTitle: firstNonBlank(refs.sourceTitle),
    sourceLocator: firstNonBlank(refs.sourceLocator, refs.textbookLocator, refs.programmeOutcomeLocator),
    sourceUrl: firstNonBlank(refs.sourceUrl),
    notes: firstNonBlank(refs.notes),
    textbookLocator: firstNonBlank(refs.textbookLocator),
    textbookSha256: firstNonBlank(refs.textbookSha256),
    programmeOutcomeLocator: firstNonBlank(refs.programmeOutcomeLocator),
  };
}

function referencesFromEditor() {
  const original = detail?.guide?.referenceMetadata && typeof detail.guide.referenceMetadata === "object"
    ? { ...detail.guide.referenceMetadata }
    : {};
  const presented = referenceEditorValues(original);
  const edited = {
    sourceTitle: $("sourceTitle").value.trim(),
    sourceLocator: $("sourceLocator").value.trim(),
    sourceUrl: $("sourceUrl").value.trim(),
    notes: $("sourceNotes").value.trim(),
  };
  for (const [key, value] of Object.entries(edited)) {
    if (Object.prototype.hasOwnProperty.call(original, key) || value !== presented[key]) {
      original[key] = value;
    }
  }
  return original;
}

function canonicalProvenanceHtml(value) {
  const refs = referenceEditorValues(value);
  const rows = [
    ["Դասագրքի հղում", refs.textbookLocator],
    ["Ծրագրային վերջնարդյունք", refs.programmeOutcomeLocator],
    ["Աղբյուրի SHA-256", refs.textbookSha256],
  ].filter(([, value]) => value);
  if (!rows.length) return "";
  return `<div class="guide-provenance-block">
    <strong>Գրանցված աղբյուրային հետագծելիություն</strong>
    <dl>${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
    <p class="subtle small">Այս տվյալները պահպանվում են անփոփոխ, եթե դուք դրանք հատուկ չեք փոխում։</p>
  </div>`;
}

function renderHistory(history) {
  const entries = history ?? [];
  if (!entries.length) return `<p class="subtle">Տարբերակների պատմություն չկա։</p>`;
  const option = (entry) => `<option value="${esc(entry.authoring_version)}">Տարբերակ ${esc(entry.authoring_version)} · ${esc(statusLabels[entry.lifecycle_status] || entry.lifecycle_status)}</option>`;
  const leftDefault = entries[1]?.authoring_version ?? entries[0].authoring_version;
  const rightDefault = entries[0].authoring_version;
  return `<div class="history-compare-controls">
      <label>Համեմատվող տարբերակ Ա<select id="historyVersionA">${entries.map(option).join("")}</select></label>
      <label>Համեմատվող տարբերակ Բ<select id="historyVersionB">${entries.map(option).join("")}</select></label>
    </div>
    <label class="changed-only-toggle"><input id="historyChangedOnly" type="checkbox" checked /> Ցուցադրել միայն փոփոխված դաշտերը</label>
    <p class="subtle small">Համեմատությունը միայն դիտման համար է և չի փոխում խմբագրվող կամ սովորողին ցուցադրվող տարբերակը։</p>
    <div id="historyComparison" class="history-comparison" data-left="${esc(leftDefault)}" data-right="${esc(rightDefault)}"></div>
    <ul class="history-list">${entries.map((entry) => `<li>
    <div class="history-head"><strong>Տարբերակ ${esc(entry.authoring_version)} · ${esc(statusLabels[entry.lifecycle_status] || entry.lifecycle_status)}</strong><span class="subtle small">${esc(new Date(entry.created_at).toLocaleString("hy-AM"))}</span></div>
    <p>${esc(entry.change_rationale)}</p>
    <p class="subtle small">Դեր՝ ${esc(entry.actor_role)} · ${esc(entry.actor_aal)}${entry.published_runtime_version ? ` · գործող տարբերակ ${esc(entry.published_runtime_version)}` : ""}</p>
  </li>`).join("")}</ul>`;
}

const comparisonFields = [
  ["titleHy", "Հայերեն վերնագիր"],
  ["strategyHy", "Ռազմավարություն"],
  ["hint1Hy", "Հուշում 1"],
  ["hint2Hy", "Հուշում 2"],
  ["workedExampleHy", "Նմանատիպ լուծված օրինակ"],
  ["specialization", "Սխալի / սխալ պատկերացման կոդ"],
  ["allowedParameterKeys", "Թույլատրելի պարամետրեր"],
  ["sourceTitle", "Աղբյուրի վերնագիր"],
  ["sourceLocator", "Էջ / բաժին"],
  ["sourceUrl", "Աղբյուրի հղում"],
  ["textbookLocator", "Դասագրքի հղում"],
  ["programmeOutcomeLocator", "Ծրագրային վերջնարդյունք"],
  ["textbookSha256", "Աղբյուրի SHA-256"],
];

function historyField(entry, key) {
  const content = entry?.content_snapshot ?? {};
  const refs = entry?.reference_metadata ?? {};
  if (key === "specialization") return content.triggerErrorCode || content.misconceptionCode || "—";
  if (key === "allowedParameterKeys") return (content.allowedParameterKeys ?? []).join(", ") || "—";
  if (["sourceTitle", "sourceLocator", "sourceUrl", "textbookLocator", "programmeOutcomeLocator", "textbookSha256"].includes(key)) {
    if (key === "sourceLocator") return refs.sourceLocator || refs.textbookLocator || refs.programmeOutcomeLocator || "—";
    return refs[key] || "—";
  }
  return content[key] || "—";
}

function renderHistoryComparison() {
  const panel = $("historyComparison");
  if (!panel) return;
  const history = detail?.history ?? [];
  const leftVersion = Number($("historyVersionA").value || panel.dataset.left);
  const rightVersion = Number($("historyVersionB").value || panel.dataset.right);
  const left = history.find((entry) => entry.authoring_version === leftVersion);
  const right = history.find((entry) => entry.authoring_version === rightVersion);
  if (!left || !right) {
    panel.innerHTML = `<p class="message bad">Համեմատվող տարբերակները չեն գտնվել։</p>`;
    return;
  }
  const changedOnly = $("historyChangedOnly")?.checked ?? true;
  const fields = comparisonFields.filter(([key]) => !changedOnly || String(historyField(left, key)) !== String(historyField(right, key)));
  if (!fields.length) {
    panel.innerHTML = `<p class="history-empty">Ընտրված տարբերակների միջև փոփոխված դաշտ չկա։</p>`;
    return;
  }
  panel.innerHTML = `<table class="comparison-table">
    <thead><tr><th>Դաշտ</th><th>Տարբերակ ${esc(leftVersion)}</th><th>Տարբերակ ${esc(rightVersion)}</th></tr></thead>
    <tbody>${fields.map(([key, label]) => {
      const leftValue = String(historyField(left, key));
      const rightValue = String(historyField(right, key));
      const changed = leftValue !== rightValue;
      return `<tr><th>${esc(label)}</th><td class="comparison-value${changed ? " changed" : ""}">${esc(leftValue)}</td><td class="comparison-value${changed ? " changed" : ""}">${esc(rightValue)}</td></tr>`;
    }).join("")}</tbody>
  </table>`;
}

function variantBucket(variant) {
  return variant?.variant_parameters?.bucket
    || (String(variant?.variant_key || "").startsWith("fixed:") ? "fixed" : "other");
}

function renderVariantOptions() {
  const select = $("previewVariant");
  if (!select) return;
  const current = select.value;
  const query = $("variantSearch").value.trim().toLocaleLowerCase("hy");
  const bucket = $("variantBucketFilter").value;
  const variants = (detail?.variants ?? []).filter((variant) => {
    if (bucket && variantBucket(variant) !== bucket) return false;
    const haystack = [variant.code, variant.variant_key, variant.prompt_hy].join(" ").toLocaleLowerCase("hy");
    return !query || haystack.includes(query);
  });
  select.innerHTML = variants.length
    ? variants.map((variant) => {
      const prompt = String(variant.prompt_hy || "").replace(/\s+/g, " ").trim();
      const shortPrompt = prompt.length > 95 ? `${prompt.slice(0, 92)}…` : prompt;
      return `<option value="${esc(variant.id)}">${esc(variant.code || variant.variant_key)} · ${esc(variantBucketLabels[variantBucket(variant)] || variantBucket(variant))} · ${esc(shortPrompt)}</option>`;
    }).join("")
    : `<option value="">Համապատասխան հարցի տարբերակ չկա</option>`;
  if (variants.some((variant) => variant.id === current)) select.value = current;
  $("previewGuideBtn").disabled = !select.value;
  renderVariantDetails();
}

function renderVariantDetails() {
  invalidateGuidePreview();
  const panel = $("variantDetails");
  if (!panel) return;
  const variant = (detail?.variants ?? []).find((entry) => entry.id === $("previewVariant").value);
  if (!variant) {
    panel.innerHTML = `<p>Ընտրված զտիչներով իրական հարց չի գտնվել։</p>`;
    return;
  }
  const params = variant.variant_parameters ?? {};
  const parameterEntries = Object.entries(params);
  panel.innerHTML = `<p><strong>${esc(variant.code || variant.variant_key)}</strong> · ${esc(variantBucketLabels[variantBucket(variant)] || variantBucket(variant))}${variant.difficulty_band ? ` · ${esc(difficultyBandLabels[variant.difficulty_band] || variant.difficulty_band)}` : ""}</p>
    <p>${esc(variant.prompt_hy || "—")}</p>
    <div class="variant-parameters"><strong>Սկզբնական պարամետրեր</strong><div class="parameter-chip-list">${parameterEntries.length
      ? parameterEntries.map(([key, value]) => `<span class="parameter-chip"><span>${esc(key)}</span><strong>${esc(value)}</strong></span>`).join("")
      : `<span class="subtle small">Պարամետրեր չկան։</span>`}</div></div>`;
}

function invalidateGuidePreview() {
  ++previewToken;
  const preview = $("previewPanel");
  if (preview) {
    preview.innerHTML = "";
    preview.classList.add("hidden");
  }
  const validation = $("validationPanel");
  if (validation) {
    validation.innerHTML = "Ստուգումը դեռ չի գործարկվել։";
    validation.classList.remove("has-errors");
  }
  setMessage("");
}

function runtimeSummaryHtml(guide) {
  const version = guide.runtimeStatus === "published" ? esc(guide.runtimeVersion || "—") : "Չի հրապարակվել";
  return `<span><strong>Սովորողին ցուցադրվող տարբերակ</strong><br>${version}</span>`;
}

function lifecycleSteps(status) {
  const steps = [
    ["draft", "Սևագիր"],
    ["review", "Ստուգված"],
    ["published", "Հրապարակված"],
  ];
  const activeIndex = steps.findIndex(([key]) => key === status);
  return `<ol class="lifecycle-steps" aria-label="Ուղեցույցի կենսափուլ">${steps.map(([key, label], index) => {
    const state = status === "archived" ? "" : index < activeIndex ? "complete" : index === activeIndex ? "current" : "";
    return `<li class="${state}"${state === "current" ? ` aria-current="step"` : ""}><span>${index + 1}</span>${label}</li>`;
  }).join("")}</ol>${status === "archived" ? `<p class="archive-state-note">Այս ուղեցույցն արխիվացված է և սովորողներին չի ցուցադրվում։</p>` : ""}`;
}

function activateGuideTab(tab) {
  const available = ["content", "preview", "sources", "history"];
  activeGuideTab = available.includes(tab) ? tab : "content";
  document.querySelectorAll("[data-guide-tab-button]").forEach((button) => {
    const active = button.dataset.guideTabButton === activeGuideTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll("[data-guide-tab]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.guideTab !== activeGuideTab);
  });
}

function wireGuideTabs() {
  const buttons = [...document.querySelectorAll("[data-guide-tab-button]")];
  buttons.forEach((button, index) => {
    const key = button.dataset.guideTabButton;
    button.id = `guideTab-${key}`;
    button.setAttribute("aria-controls", `guidePanel-${key}`);
    const panel = document.querySelector(`[data-guide-tab="${key}"]`);
    if (panel) {
      panel.id = `guidePanel-${key}`;
      panel.setAttribute("aria-labelledby", button.id);
      panel.tabIndex = 0;
    }
    button.addEventListener("click", () => activateGuideTab(button.dataset.guideTabButton));
    button.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;
      event.preventDefault();
      activateGuideTab(buttons[next].dataset.guideTabButton);
      buttons[next].focus();
    });
  });
  activateGuideTab(activeGuideTab);
}

function updateLifecycleActionState() {
  if (!detail?.guide) return;
  const status = detail.guide.lifecycleStatus;
  const rationale = $("changeRationale")?.value.trim() || "";
  const rationaleReady = rationale.length >= 3;
  const rationalePanel = $("actionRationale");
  const rationaleLabel = $("changeRationaleLabel");
  const rationaleInput = $("changeRationale");
  const saveButton = $("saveDraftBtn");
  const reviewButton = $("submitReviewBtn");
  const publishButton = $("publishGuideBtn");
  const archiveButton = $("archiveGuideBtn");
  if (saveButton) {
    const showSave = editorDirty || ["published", "archived"].includes(status);
    saveButton.classList.toggle("hidden", !showSave);
    saveButton.disabled = false;
  }
  if (reviewButton) reviewButton.disabled = editorDirty;
  if (publishButton) publishButton.disabled = editorDirty;
  if (archiveButton) archiveButton.disabled = false;

  const showRationale = editorDirty || ["published", "archived"].includes(status);
  rationalePanel?.classList.toggle("hidden", !showRationale);
  if (rationaleLabel && rationaleInput) {
    if (status === "archived") {
      rationaleLabel.textContent = "Վերաբացման պատճառ (պարտադիր)";
      rationaleInput.placeholder = "Օրինակ՝ ուղեցույցը պետք է վերանայել և նորից հրապարակել";
    } else if (status === "published") {
      rationaleLabel.textContent = "Գործողության պատճառ (պարտադիր)";
      rationaleInput.placeholder = "Նշեք նոր սևագիր ստեղծելու կամ արխիվացնելու պատճառը";
    } else {
      rationaleLabel.textContent = "Փոփոխության պատճառ (պարտադիր)";
      rationaleInput.placeholder = "Օրինակ՝ հստակեցվել է երկրորդ հուշումը";
    }
  }

  const state = $("editorSaveState");
  if (!state) return;
  if (status === "review" && editorDirty) state.textContent = "Փոփոխված տարբերակը հրապարակելուց առաջ պահպանեք և նորից նշեք որպես ստուգված։";
  else if (status === "draft" && editorDirty) state.textContent = "Ստուգված նշելուց առաջ պահպանեք փոփոխությունները։";
  else if (editorDirty) state.textContent = "Կան չպահպանված փոփոխություններ։";
  else if (status === "draft") state.textContent = "Սևագիրը պատրաստ է ստուգված նշելու համար։";
  else state.textContent = "Բոլոր փոփոխությունները պահպանված են։";
  state.classList.toggle("has-unsaved", editorDirty);
  state.classList.toggle("needs-rationale", showRationale && !rationaleReady);
}

function markGuideDirty() {
  invalidateGuidePreview();
  editorDirty = true;
  updateLifecycleActionState();
}

function lifecycleActionsHtml(guide) {
  const status = guide.lifecycleStatus;
  const fallbackReady = Boolean(detail.fallback?.available);
  let actions = "";
  if (status === "draft") {
    actions = `<button id="saveDraftBtn" type="button" class="ghost">Պահպանել փոփոխությունները</button><button id="submitReviewBtn" type="button">Նշել որպես ստուգված</button>`;
  } else if (status === "review") {
    actions = `<button id="saveDraftBtn" type="button" class="ghost">Պահպանել փոփոխությունները</button><button id="publishGuideBtn" type="button">Հրապարակել</button>`;
  } else if (status === "published") {
    actions = `<button id="saveDraftBtn" type="button">Պահպանել որպես նոր սևագիր</button>`;
  } else if (status === "archived") {
    actions = `<button id="saveDraftBtn" type="button">Վերաբացել որպես սևագիր</button>`;
  }
  const archiveMenu = status === "published" ? `<details class="guide-more-menu"><summary>Այլ գործողություններ</summary><div class="guide-more-menu-panel">${fallbackReady
    ? `<button id="archiveGuideBtn" type="button" class="danger">Արխիվացնել ուղեցույցը</button><p>Արխիվացումը կպահանջի լրացուցիչ հաստատում։</p>`
    : `<p>Արխիվացումը հասանելի չէ, քանի դեռ գործող հարցերի համար անվտանգ պահուստային ուղի չկա։</p>`}</div></details>` : "";
  return `<div class="guide-action-bar">
    <div id="actionRationale" class="action-rationale"><label><span id="changeRationaleLabel">Փոփոխության պատճառ (պարտադիր)</span><input id="changeRationale" placeholder="Օրինակ՝ հստակեցվել է երկրորդ հուշումը" /></label><span id="editorSaveState" class="editor-save-state" aria-live="polite"></span></div>
    <div class="guide-actions">${actions}${archiveMenu}</div>
  </div>`;
}

function renderEditorLegacy() {
  const guide = detail.guide;
  const content = guide.content ?? {};
  const refs = guide.referenceMetadata ?? {};
  const variants = detail.variants ?? [];
  const isTemplate = guide.guideScope === "template";
  const canReview = guide.lifecycleStatus === "draft";
  const canPublish = guide.lifecycleStatus === "review";
  const canArchive = guide.lifecycleStatus === "published" && detail.fallback?.available;
  const code = isTemplate ? guide.itemTemplateCode : guide.skillCode;
  const variantBuckets = [...new Set(variants.map((variant) => variant.variant_parameters?.bucket || (String(variant.variant_key || "").startsWith("fixed:") ? "fixed" : "other")))];

  $("guideEditor").innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">${isTemplate ? "ՀԱՐՑԻ ՁԵՎԱՆՄՈՒՇ" : "ՀՄՏՈՒԹՅԱՆ ՈՒՂԵՑՈՒՅՑ"}</p><h2>${esc(code)}</h2></div><span class="status-chip" data-status="${esc(guide.lifecycleStatus)}">${esc(statusLabels[guide.lifecycleStatus])}</span></div>
    <p class="subtle">${esc(guide.subjectNameHy)} · ${esc(guide.gradeLabelHy || `${guide.gradeNumber}-րդ դասարան`)} · ${esc(guide.skillNameHy)}</p>
    <div class="editor-summary"><span><strong>Հեղինակային տարբերակ</strong><br>${esc(guide.authoringVersion)}</span>${runtimeSummaryHtml(guide)}<span><strong>Պահուստային ուղի</strong><br>${detail.fallback?.available ? "Առկա է" : "Պաշտպանված է"}</span></div>

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
      <div class="variant-tools">
        <label>Փնտրել հարցի տարբերակ<input id="variantSearch" type="search" placeholder="Հարցի կոդ կամ տեքստ…" /></label>
        <label>Հարցի կիրառման փուլ<select id="variantBucketFilter"><option value="">Բոլորը</option>${variantBuckets.map((bucket) => `<option value="${esc(bucket)}">${esc(variantBucketLabels[bucket] || bucket)}</option>`).join("")}</select></label>
      </div>
      <label>Հարցի տարբերակ<select id="previewVariant"></select></label>
      <div id="variantDetails" class="variant-details subtle small"></div>
      <p class="subtle small">Ախտորոշիչ և յուրացման ստուգման հարցերը կարող են օգտագործվել միայն բովանդակության նախադիտման համար․ այս էջը դրանցում հուշումներ չի ակտիվացնում։</p>
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

    <section class="guide-form-section"><h3>Անփոփոխ պատմություն և տարբերակների համեմատություն</h3>${renderHistory(detail.history)}</section>`;

  ["guideTitleHy","guideStrategyHy","guideHint1Hy","guideHint2Hy","guideWorkedExampleHy","specializationCode","allowedParameterKeys","sourceTitle","sourceLocator","sourceUrl","sourceNotes"]
    .forEach((id) => $(id)?.addEventListener("input", () => { editorDirty = true; }));
  $("previewGuideBtn").addEventListener("click", previewGuide);
  $("variantSearch").addEventListener("input", renderVariantOptions);
  $("variantBucketFilter").addEventListener("change", renderVariantOptions);
  $("previewVariant").addEventListener("change", renderVariantDetails);
  $("saveDraftBtn").addEventListener("click", () => runWorkflow("save_draft"));
  $("submitReviewBtn").addEventListener("click", () => runWorkflow("submit_review"));
  $("publishGuideBtn").addEventListener("click", () => runWorkflow("publish"));
  $("archiveGuideBtn").addEventListener("click", () => runWorkflow("archive"));
  $("historyVersionA")?.addEventListener("change", renderHistoryComparison);
  $("historyVersionB")?.addEventListener("change", renderHistoryComparison);
  if ($("historyVersionA")) $("historyVersionA").value = String(detail.history?.[1]?.authoring_version ?? detail.history?.[0]?.authoring_version ?? "");
  if ($("historyVersionB")) $("historyVersionB").value = String(detail.history?.[0]?.authoring_version ?? "");
  renderVariantOptions();
  renderHistoryComparison();
}

function renderEditor() {
  const guide = detail.guide;
  const content = guide.content ?? {};
  const refs = guide.referenceMetadata ?? {};
  const referenceView = referenceEditorValues(refs);
  const variants = detail.variants ?? [];
  const isTemplate = guide.guideScope === "template";
  const code = isTemplate ? guide.itemTemplateCode : guide.skillCode;
  const variantBuckets = [...new Set(variants.map((variant) => variantBucket(variant)))];
  const archivedDisabled = guide.lifecycleStatus === "archived" ? "disabled" : "";

  $("guideEditor").innerHTML = `
    <button id="backToGuideListBtn" type="button" class="guide-back-button">← Վերադառնալ ուղեցույցների ցանկին</button>
    <header class="guide-editor-header">
      <div>
        <p class="eyebrow">${isTemplate ? "ՀԱՐՑԻ ՁԵՎԱՆՄՈՒՇ" : "ՀՄՏՈՒԹՅԱՆ ՈՒՂԵՑՈՒՅՑ"}</p>
        <h2>${esc(code)}</h2>
        <p class="subtle">${esc(guide.subjectNameHy)} · ${esc(guide.gradeLabelHy || `${guide.gradeNumber}-րդ դասարան`)} · ${esc(guide.skillNameHy)}</p>
      </div>
      <span class="status-chip" data-status="${esc(guide.lifecycleStatus)}">${esc(statusLabels[guide.lifecycleStatus])}</span>
    </header>
    ${lifecycleSteps(guide.lifecycleStatus)}
    <div class="editor-summary">
      <span><strong>Խմբագրվող տարբերակ</strong><br>${esc(guide.authoringVersion)}</span>
      ${runtimeSummaryHtml(guide)}
      <span><strong>Պահուստային ուղի</strong><br>${detail.fallback?.available ? "Առկա է" : "Պաշտպանված է"}</span>
    </div>

    <nav class="guide-tab-nav" aria-label="Ուղեցույցի աշխատանքային բաժիններ" role="tablist">
      <button type="button" data-guide-tab-button="content" role="tab">Բովանդակություն</button>
      <button type="button" data-guide-tab-button="preview" role="tab">Նախադիտում և ստուգում</button>
      <button type="button" data-guide-tab-button="sources" role="tab">Աղբյուրներ</button>
      <button type="button" data-guide-tab-button="history" role="tab">Պատմություն</button>
    </nav>

    <div class="guide-tab-panel" data-guide-tab="content" role="tabpanel">
      <section class="guide-form-section guide-content-fields">
        <div class="section-heading"><div><h3>Ուղեցույցի բովանդակություն</h3><p class="subtle small">Գրեք սովորողին ուղղված կարճ, հստակ և քայլային օգնություն։</p></div></div>
        <label>Հայերեն վերնագիր<input id="guideTitleHy" value="${esc(content.titleHy)}" ${archivedDisabled} /></label>
        <label>Ռազմավարություն<textarea id="guideStrategyHy" rows="3" ${archivedDisabled}>${esc(content.strategyHy)}</textarea></label>
        <label>Հուշում 1<textarea id="guideHint1Hy" rows="3" ${archivedDisabled}>${esc(content.hint1Hy)}</textarea></label>
        <label>Հուշում 2<textarea id="guideHint2Hy" rows="3" ${archivedDisabled}>${esc(content.hint2Hy)}</textarea></label>
        <label>Նմանատիպ լուծված օրինակ<textarea id="guideWorkedExampleHy" rows="5" ${archivedDisabled}>${esc(content.workedExampleHy)}</textarea></label>
      </section>
      <details class="advanced-settings guide-form-section">
        <summary>Ընդլայնված կարգավորումներ</summary>
        <p class="subtle small">Այս դաշտերը փոխեք միայն այն դեպքում, երբ փոխվում է ուղեցույցի կապը հարցի կամ սխալ պատկերացման հետ։</p>
        <div class="guide-form-grid">
          <label>${isTemplate ? "Սխալի կոդ (ըստ ցանկության)" : "Սխալ պատկերացման կոդ"}<input id="specializationCode" value="${esc(isTemplate ? (content.triggerErrorCode || "") : content.misconceptionCode)}" ${archivedDisabled} /></label>
          <label>Թույլատրելի սկզբնական պարամետրեր<input id="allowedParameterKeys" value="${esc((content.allowedParameterKeys ?? []).join(", "))}" ${isTemplate ? archivedDisabled : "disabled"} placeholder="sourceValue, sourceUnit" /></label>
        </div>
      </details>
    </div>

    <div class="guide-tab-panel hidden" data-guide-tab="preview" role="tabpanel">
      <section class="guide-form-section">
        <div class="section-heading"><div><h3>Նախադիտում և ստուգում</h3><p class="subtle small">Տեսեք, թե ընտրված հարցի հետ ինչպես կերևա այս ուղեցույցը սովորողին։</p></div></div>
        <div class="variant-tools">
          <label>Փնտրել հարց<input id="variantSearch" type="search" placeholder="Հարցի կոդ կամ տեքստ…" /></label>
          <label>Հարցի կիրառման փուլ<select id="variantBucketFilter"><option value="">Բոլորը</option>${variantBuckets.map((bucket) => `<option value="${esc(bucket)}">${esc(variantBucketLabels[bucket] || bucket)}</option>`).join("")}</select></label>
        </div>
        <label>Հարց<select id="previewVariant"></select></label>
        <div id="variantDetails" class="variant-details subtle small"></div>
        <p class="subtle small">Ախտորոշիչ և յուրացման ստուգման հարցերը այստեղ օգտագործվում են միայն նախադիտման համար․ հուշումները գնահատման ընթացքում չեն ակտիվանում։</p>
        <button id="previewGuideBtn" type="button">Նախադիտել և ստուգել</button>
        <div id="validationPanel" class="validation-panel"><strong>Ստուգումը դեռ չի գործարկվել։</strong></div>
        <div id="previewPanel" class="preview-panel hidden"></div>
      </section>
    </div>

    <div class="guide-tab-panel hidden" data-guide-tab="sources" role="tabpanel">
      <section class="guide-form-section">
        <div class="section-heading"><div><h3>Աղբյուրներ և նշումներ</h3><p class="subtle small">Գրանցեք այն աղբյուրը, որի հիման վրա կազմվել կամ ստուգվել է ուղեցույցը։</p></div></div>
        ${canonicalProvenanceHtml(refs)}
        <div class="guide-form-grid">
          <label>Աղբյուրի վերնագիր<input id="sourceTitle" value="${esc(referenceView.sourceTitle)}" ${archivedDisabled} /></label>
          <label>Էջ կամ բաժին<input id="sourceLocator" value="${esc(referenceView.sourceLocator)}" ${archivedDisabled} /></label>
          <label class="wide">Աղբյուրի հղում<input id="sourceUrl" type="url" value="${esc(referenceView.sourceUrl)}" ${archivedDisabled} /></label>
          <label class="wide">Նշումներ<textarea id="sourceNotes" rows="4" ${archivedDisabled}>${esc(referenceView.notes)}</textarea></label>
        </div>
      </section>
    </div>

    <div class="guide-tab-panel hidden" data-guide-tab="history" role="tabpanel">
      <section class="guide-form-section history-section">
        <div class="section-heading"><div><h3>Տարբերակների պատմություն</h3><p class="subtle small">Պատմությունը միայն դիտման համար է և չի փոխում հրապարակված տարբերակը։</p></div></div>
        ${renderHistory(detail.history)}
      </section>
    </div>
    ${lifecycleActionsHtml(guide)}`;

  $("backToGuideListBtn")?.addEventListener("click", () => returnToGuideList());
  ["guideTitleHy", "guideStrategyHy", "guideHint1Hy", "guideHint2Hy", "guideWorkedExampleHy", "specializationCode", "allowedParameterKeys", "sourceTitle", "sourceLocator", "sourceUrl", "sourceNotes"]
    .forEach((id) => $(id)?.addEventListener("input", markGuideDirty));
  $("changeRationale")?.addEventListener("input", updateLifecycleActionState);
  $("previewGuideBtn")?.addEventListener("click", previewGuide);
  $("variantSearch")?.addEventListener("input", renderVariantOptions);
  $("variantBucketFilter")?.addEventListener("change", renderVariantOptions);
  $("previewVariant")?.addEventListener("change", renderVariantDetails);
  $("saveDraftBtn")?.addEventListener("click", () => runWorkflow("save_draft"));
  $("submitReviewBtn")?.addEventListener("click", () => runWorkflow("submit_review"));
  $("publishGuideBtn")?.addEventListener("click", () => runWorkflow("publish"));
  $("archiveGuideBtn")?.addEventListener("click", () => runWorkflow("archive"));
  $("historyVersionA")?.addEventListener("change", renderHistoryComparison);
  $("historyVersionB")?.addEventListener("change", renderHistoryComparison);
  $("historyChangedOnly")?.addEventListener("change", renderHistoryComparison);
  if ($("historyVersionA")) $("historyVersionA").value = String(detail.history?.[1]?.authoring_version ?? detail.history?.[0]?.authoring_version ?? "");
  if ($("historyVersionB")) $("historyVersionB").value = String(detail.history?.[0]?.authoring_version ?? "");
  wireGuideTabs();
  renderVariantOptions();
  renderHistoryComparison();
  updateLifecycleActionState();
}

async function selectGuide(id, force = false) {
  if (!force && id !== selectedId && editorDirty && !confirm("Չպահպանված փոփոխությունները չեղարկե՞լ։")) {
    renderRows();
    return;
  }
  invalidateGuidePreview();
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
  const token = ++previewToken;
  const guideId = selectedId;
  const variantId = $("previewVariant")?.value;
  try {
    if (!variantId) {
      setMessage("Նախ ընտրեք իրական հարցի տարբերակ։", true);
      return;
    }
    setMessage("Ուղեցույցը ստուգվում է…");
    const guide = detail.guide;
    const response = await invoke({
      action: "preview",
      guideScope: guide.guideScope,
      guideSourceId: guide.guideSourceId,
      variantId,
      content: contentFromEditor(),
      referenceMetadata: referencesFromEditor(),
    });
    if (token !== previewToken || selectedId !== guideId || $("previewVariant")?.value !== variantId) return;
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
    if (token !== previewToken || selectedId !== guideId || $("previewVariant")?.value !== variantId) return;
    setMessage(messageFor(error), true);
  }
}

let resolveMfaDialog = null;

function setMfaDialogMessage(text, bad = false) {
  $("mfaDialogMessage").textContent = text || "";
  $("mfaDialogMessage").classList.toggle("bad", Boolean(bad));
}

function openMfaDialog(title) {
  $("mfaDialogTitle").textContent = title;
  setMfaDialogMessage("");
  if (!$("mfaDialog").open) $("mfaDialog").showModal();
  return new Promise((resolve) => { resolveMfaDialog = resolve; });
}

async function finishMfaDialog(result) {
  if (!result && pendingEnrollmentFactorId) {
    await supabase.auth.mfa.unenroll({ factorId: pendingEnrollmentFactorId }).catch(() => null);
  }
  pendingEnrollmentFactorId = null;
  if ($("mfaDialog").open) $("mfaDialog").close();
  const resolve = resolveMfaDialog;
  resolveMfaDialog = null;
  resolve?.(result);
}

function markAal2() {
  currentActor = { ...(currentActor ?? {}), aal: "aal2" };
  renderAssurance();
}

async function challengeVerifiedFactor(verifiedFactors) {
  const pending = openMfaDialog("Հաստատեք բազմագործոն մուտքը");
  const body = $("mfaDialogBody");
  body.className = "mfa-dialog-body";
  body.innerHTML = `<p>Հրապարակելու կամ արխիվացնելու համար մուտքագրեք ձեր հաստատող հավելվածի ընթացիկ 6-նիշ կոդը։</p>
    <label>Հաստատման եղանակ<select id="mfaFactorSelect"></select></label>
    <label>6-նիշ կոդ<input id="mfaVerificationCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" /></label>
    <div class="mfa-dialog-actions"><button id="verifyMfaBtn" type="button">Հաստատել</button><button id="cancelMfaBtn" type="button" class="ghost">Չեղարկել</button></div>`;
  const select = $("mfaFactorSelect");
  select.replaceChildren(...verifiedFactors.map((factor, index) => {
    const option = document.createElement("option");
    option.value = factor.id;
    option.textContent = factor.friendly_name || factor.phone || `Հաստատման եղանակ ${index + 1}`;
    return option;
  }));
  $("verifyMfaBtn").addEventListener("click", async () => {
    const code = $("mfaVerificationCode").value.trim();
    if (!/^\d{6,8}$/.test(code)) {
      setMfaDialogMessage("Մուտքագրեք հաստատող հավելվածում երևացող կոդը։", true);
      return;
    }
    $("verifyMfaBtn").disabled = true;
    setMfaDialogMessage("Կոդը ստուգվում է…");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: select.value, code });
    if (error) {
      $("verifyMfaBtn").disabled = false;
      setMfaDialogMessage(messageFor({ code: "mfa_verification_failed" }), true);
      return;
    }
    markAal2();
    await finishMfaDialog(true);
  });
  $("cancelMfaBtn").addEventListener("click", () => finishMfaDialog(false));
  $("mfaVerificationCode").focus();
  return pending;
}

async function enrollTotpFactor(existingFactors) {
  const stale = existingFactors.filter((factor) => factor.status !== "verified");
  for (const factor of stale) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => null);
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "HaiEdu բովանդակության աշխատասեղան",
  });
  if (error) throw error;
  pendingEnrollmentFactorId = data.id;

  const pending = openMfaDialog("Կարգավորեք բազմագործոն մուտքը");
  const body = $("mfaDialogBody");
  body.className = "mfa-dialog-body";
  body.innerHTML = `<ol>
      <li>Բացեք ձեր հաստատող հավելվածը (օրինակ՝ Google Authenticator կամ Microsoft Authenticator)։</li>
      <li>Սկանավորեք ստորև ներկայացված QR կոդը կամ ձեռքով մուտքագրեք գաղտնի բանալին։</li>
      <li>Մուտքագրեք հավելվածում երևացող 6-նիշ կոդը։</li>
    </ol>
    <img id="mfaQrImage" class="mfa-qr" alt="Բազմագործոն մուտքի QR կոդ" />
    <span class="subtle small">Ձեռքով մուտքագրվող գաղտնի բանալի</span>
    <code id="mfaSecret" class="mfa-secret"></code>
    <label>6-նիշ կոդ<input id="mfaEnrollmentCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" /></label>
    <div class="mfa-dialog-actions"><button id="completeMfaEnrollmentBtn" type="button">Ավարտել կարգավորումը</button><button id="cancelMfaBtn" type="button" class="ghost">Չեղարկել</button></div>`;
  const qr = String(data.totp?.qr_code || "");
  if (/^data:image\/(?:svg\+xml|png)(?:;[^,]+)?,/i.test(qr)) $("mfaQrImage").src = qr;
  else $("mfaQrImage").classList.add("hidden");
  $("mfaSecret").textContent = data.totp?.secret || "—";
  $("completeMfaEnrollmentBtn").addEventListener("click", async () => {
    const code = $("mfaEnrollmentCode").value.trim();
    if (!/^\d{6,8}$/.test(code)) {
      setMfaDialogMessage("Մուտքագրեք հաստատող հավելվածում երևացող կոդը։", true);
      return;
    }
    $("completeMfaEnrollmentBtn").disabled = true;
    setMfaDialogMessage("Կարգավորումը հաստատվում է…");
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: data.id, code });
    if (verifyError) {
      $("completeMfaEnrollmentBtn").disabled = false;
      setMfaDialogMessage(messageFor({ code: "mfa_verification_failed" }), true);
      return;
    }
    pendingEnrollmentFactorId = null;
    markAal2();
    await finishMfaDialog(true);
  });
  $("cancelMfaBtn").addEventListener("click", () => finishMfaDialog(false));
  $("mfaEnrollmentCode").focus();
  return pending;
}

async function ensureAal2() {
  const { data: level, error: levelError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (levelError) throw levelError;
  if (level?.currentLevel === "aal2") {
    markAal2();
    return true;
  }
  const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
  if (factorError) throw factorError;
  const allFactors = factors?.all ?? [...(factors?.totp ?? []), ...(factors?.phone ?? [])];
  const verified = allFactors.filter((factor) => factor.status === "verified");
  return verified.length ? challengeVerifiedFactor(verified) : enrollTotpFactor(allFactors);
}

async function configureMfa() {
  try {
    const completed = await ensureAal2();
    if (completed) setMessage("Բազմագործոն մուտքը հաստատված է այս սեսիայի համար։");
  } catch (error) {
    setMessage(messageFor(error), true);
  }
}

async function runWorkflow(action) {
  const check = sessionCheck;
  try {
    const rationaleInput = $("changeRationale");
    const rationale = rationaleInput?.value.trim() || "";
    const rationaleRequired = ["save_draft", "archive"].includes(action);
    if (rationaleRequired && rationale.length < 3) {
      const state = $("editorSaveState");
      if (state) {
        state.textContent = "Գործողությունը շարունակելու համար նշեք առնվազն 3 նիշից բաղկացած պատճառ։";
        state.classList.add("needs-rationale");
      }
      rationaleInput?.focus();
      return;
    }
    if (["publish", "archive"].includes(action) && !(await ensureAal2())) return;
    if (check !== sessionCheck) return;
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
    if (check !== sessionCheck) return;
    editorDirty = false;
    await refreshCatalog(selectedId);
    if (check !== sessionCheck) return;
    setMessage("Գործողությունը հաջողությամբ ավարտվեց։");
  } catch (error) {
    if (check !== sessionCheck) return;
    if (error.validation && $("validationPanel")) renderValidation(error.validation);
    setMessage(messageFor(error), true);
  }
}

async function refreshCatalog(reselect = selectedId) {
  const check = sessionCheck;
  let response;
  try {
    response = await invoke({ action: "list" });
  } catch (error) {
    if (check !== sessionCheck) return;
    throw error;
  }
  if (check !== sessionCheck) return;
  catalog = response.guides ?? [];
  renderStats(response.actor);
  populateFilters();
  renderRows();
  const requested = reselect || guideIdFromUrl();
  if (requested && catalog.some((g) => `${g.guideScope}:${g.guideSourceId}` === requested)) {
    setWorkspaceMode("editor");
    updateGuideUrl(requested, true);
    await selectGuide(requested, true);
  } else if (!catalog.length) {
    selectedId = null;
    setWorkspaceMode("catalog");
    $("guideEditor").innerHTML = `<h2>Ուղեցույց չկա</h2><p class="subtle">Հրապարակված կամ սևագիր ուղեցույցներ չեն գտնվել։</p>`;
  } else {
    selectedId = null;
    detail = null;
    editorDirty = false;
    updateGuideUrl(null, true);
    setWorkspaceMode("catalog");
    renderRows();
  }
}

let sessionCheck = 0;
async function showForSession(session) {
  const check = ++sessionCheck;
  $("guideConsole").classList.add("hidden");
  if (!session) {
    loadToken += 1;
    previewToken += 1;
    catalog = [];
    selectedId = null;
    detail = null;
    editorDirty = false;
    currentActor = null;
    $("guideEditor").innerHTML = "";
    $("guideRows").innerHTML = "";
    $("guideMessage").textContent = "";
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
$("guideSearch").addEventListener("input", renderRows);
academicFilterIds.forEach((id) => $(id).addEventListener("change", () => {
  populateFilters();
  renderRows();
}));
["scopeFilter", "statusFilter"].forEach((id) => $(id).addEventListener("change", renderRows));
$("clearGuideFiltersBtn").addEventListener("click", () => {
  $("guideSearch").value = "";
  [...academicFilterIds, "scopeFilter", "statusFilter"].forEach((id) => { $(id).value = ""; });
  populateFilters();
  renderRows();
});

$("closeMfaDialogBtn").addEventListener("click", () => finishMfaDialog(false));
$("mfaDialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  finishMfaDialog(false);
});

window.addEventListener("popstate", () => {
  if (editorDirty) {
    updateGuideUrl(selectedId, true);
    setMessage("Կան չպահպանված փոփոխություններ։ Ցանկ վերադառնալու համար օգտագործեք էջի «Վերադառնալ ուղեցույցների ցանկին» կոճակը։", true);
    return;
  }
  const requested = guideIdFromUrl();
  if (requested && catalog.some((guide) => `${guide.guideScope}:${guide.guideSourceId}` === requested)) {
    openGuide(requested, { replace: true, force: true });
  } else {
    returnToGuideList({ replace: true, force: true });
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!editorDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") return void showForSession(null);
  if (event === "SIGNED_IN") {
    const check = sessionCheck;
    setTimeout(() => { if (check === sessionCheck) void showForSession(session); }, 0);
  }
  if (event === "MFA_CHALLENGE_VERIFIED") markAal2();
});
const initialSessionCheck = sessionCheck;
const { data: { session } } = await supabase.auth.getSession();
if (initialSessionCheck === sessionCheck) await showForSession(session);
