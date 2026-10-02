import { $, contentSupabase, loadContentDashboard } from "./content-workspace.js";
let data = null;
let initialized = false;
let observerStarted = false;
let applyTimer = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}


function optionHtml(value, label, selected = false) {
  return `<option value="${esc(value)}" ${selected ? "selected" : ""}>${esc(label)}</option>`;
}

function setOptions(select, rows, allLabel, current, labelFn) {
  const values = new Set(rows.map((row) => String(row.id)));
  const next = current && values.has(String(current)) ? String(current) : "";
  select.innerHTML = optionHtml("", allLabel, !next) + rows.map((row) => optionHtml(row.id, labelFn(row), String(row.id) === next)).join("");
  select.value = next;
  return next;
}

function programsFor(gradeId, subjectId) {
  return (data?.catalog?.programs ?? []).filter((program) => {
    if (gradeId && program.gradeId !== gradeId) return false;
    if (subjectId && program.subjectId !== subjectId) return false;
    return true;
  }).sort((a, b) => (a.gradeNumber ?? 99) - (b.gradeNumber ?? 99) || String(a.subjectNameEn ?? "").localeCompare(String(b.subjectNameEn ?? "")) || String(a.versionLabel ?? "").localeCompare(String(b.versionLabel ?? "")));
}

function unitsFor(programIds) {
  const allowed = new Set(programIds);
  return (data?.catalog?.units ?? []).filter((unit) => allowed.has(unit.programId)).sort((a, b) => Number(a.sequenceOrder ?? 0) - Number(b.sequenceOrder ?? 0) || String(a.code).localeCompare(String(b.code)));
}

function rebuildSelectors(source = "") {
  if (!data?.catalog) return;
  const grade = $("gradeFilter");
  const subject = $("subjectFilter");
  const program = $("programFilter");
  const unit = $("unitFilter");
  if (!grade || !subject || !program || !unit) return;

  if (!initialized) {
    const params = new URLSearchParams(location.search);
    const requestedProgram = params.get("program");
    const requestedUnit = params.get("unit");
    const preferredProgram = data.catalog.programs.find((row) => row.id === requestedProgram) ?? programsFor("", "")[0] ?? null;
    if (preferredProgram) {
      grade.dataset.preferred = preferredProgram.gradeId;
      subject.dataset.preferred = preferredProgram.subjectId;
      program.dataset.preferred = preferredProgram.id;
      const preferredUnit = data.catalog.units.find((row) => row.id === requestedUnit && row.programId === preferredProgram.id)
        ?? unitsFor([preferredProgram.id])[0] ?? null;
      unit.dataset.preferred = preferredUnit?.id ?? "";
    }
  }

  if (source === "program" && program.value) {
    const selected = data.catalog.programs.find((row) => row.id === program.value);
    if (selected) {
      grade.value = selected.gradeId;
      subject.value = selected.subjectId;
    }
  }
  if (source === "unit" && unit.value) {
    const selectedUnit = data.catalog.units.find((row) => row.id === unit.value);
    const selectedProgram = selectedUnit ? data.catalog.programs.find((row) => row.id === selectedUnit.programId) : null;
    if (selectedProgram) {
      grade.value = selectedProgram.gradeId;
      subject.value = selectedProgram.subjectId;
      program.value = selectedProgram.id;
    }
  }
  if (source === "grade") {
    program.value = "";
    unit.value = "";
  }
  if (source === "subject") {
    program.value = "";
    unit.value = "";
  }
  if (source === "program") unit.value = "";

  const currentGrade = grade.value || grade.dataset.preferred || "";
  const usedGradeIds = new Set((data.catalog.programs ?? []).map((p) => p.gradeId));
  const gradeRows = (data.catalog.grades ?? []).filter((g) => usedGradeIds.has(g.id));
  const gradeValue = setOptions(grade, gradeRows, "Բոլոր դասարանները", currentGrade, (g) => g.labelHy || `${g.number}-րդ դասարան`);

  const currentSubject = subject.value || subject.dataset.preferred || "";
  const allowedProgramsForSubjects = programsFor(gradeValue, "");
  const usedSubjectIds = new Set(allowedProgramsForSubjects.map((p) => p.subjectId));
  const subjectRows = (data.catalog.subjects ?? []).filter((s) => usedSubjectIds.has(s.id));
  const subjectValue = setOptions(subject, subjectRows, "Բոլոր առարկաները", currentSubject, (s) => s.nameHy || s.nameEn || s.code);

  const currentProgram = program.value || program.dataset.preferred || "";
  const programRows = programsFor(gradeValue, subjectValue);
  const programValue = setOptions(program, programRows, "All programs", currentProgram, (p) => {
    const subjectName = p.subjectNameHy || p.subjectNameEn || "Ծրագիր";
    const gradeName = p.gradeLabelHy || (p.gradeNumber ? `${p.gradeNumber}-րդ դասարան` : "Դասարան");
    return `${gradeName} · ${subjectName} · ${p.versionLabel || "գործող"}`;
  });

  const currentUnit = unit.value || unit.dataset.preferred || "";
  const eligibleProgramIds = programValue ? [programValue] : programRows.map((p) => p.id);
  const unitRows = unitsFor(eligibleProgramIds);
  setOptions(unit, unitRows, "Բոլոր բաժինները / գլուխները", currentUnit, (u) => `${u.code} · ${u.titleHy || u.titleEn || "Բաժին"}`);

  delete grade.dataset.preferred;
  delete subject.dataset.preferred;
  delete program.dataset.preferred;
  delete unit.dataset.preferred;
  initialized = true;
}

function itemInScope(item) {
  const gradeId = $("gradeFilter")?.value || "";
  const subjectId = $("subjectFilter")?.value || "";
  const programId = $("programFilter")?.value || "";
  const unitId = $("unitFilter")?.value || "";
  if (!gradeId && !subjectId && !programId && !unitId) return true;
  const context = item.curriculum;
  if (!context) return false;
  if (gradeId && context.grade?.id !== gradeId) return false;
  if (subjectId && context.subject?.id !== subjectId) return false;
  if (programId && context.program?.id !== programId) return false;
  if (unitId && context.unit?.id !== unitId) return false;
  return true;
}

function contextItems() {
  return (data?.items ?? []).filter(itemInScope);
}

function scopedStats(items) {
  const active = items.filter((item) => !item.retiredAt);
  return [
    ["Հարցեր", items.length],
    ["Հրապարակված", active.filter((item) => item.lifecycleStatus === "published").length],
    ["Ստուգման հերթ", active.filter((item) => ["needs_review", "in_review", "changes_requested", "unreviewed"].includes(item.reviewStatus)).length],
    ["Հաստատված", active.filter((item) => item.reviewStatus === "approved").length],
    ["QA խնդիր", active.filter((item) => item.latestQa && !item.latestQa.passed).length],
    ["Արխիվացված", items.filter((item) => Boolean(item.retiredAt)).length],
  ];
}

function renderScopedStats(items) {
  const host = $("stats");
  if (!host) return;
  host.innerHTML = scopedStats(items).map(([label, value]) => `<article class="card quality-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
}

function updateSkillFilter(items) {
  const select = $("skillFilter");
  if (!select) return false;
  const current = select.value;
  const skills = [...new Map(items.map((item) => [item.skill?.code, item.skill])).values()].filter((skill) => skill?.code).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const valid = skills.some((skill) => skill.code === current);
  select.innerHTML = `<option value="">Բոլոր հմտությունները</option>${skills.map((skill) => `<option value="${esc(skill.code)}">${esc(skill.code)}${skill.nameHy ? ` · ${esc(skill.nameHy)}` : ""}</option>`).join("")}`;
  select.value = valid ? current : "";
  return Boolean(current && !valid);
}

function scopeSummary() {
  const grade = $("gradeFilter");
  const subject = $("subjectFilter");
  const program = $("programFilter");
  const unit = $("unitFilter");
  const labels = [grade, subject, program, unit].filter((select) => select?.value).map((select) => select.options[select.selectedIndex]?.textContent).filter(Boolean);
  return labels.length ? labels.join("  →  ") : "Բոլոր դասարանները · առարկաները · ծրագրերը · բաժինները";
}

function addContextToDetail() {
  const panel = $("detailPanel");
  const selected = document.querySelector("#itemRows tr.selected");
  if (!panel || !selected || !data || !panel.querySelector(".detail-heading")) return;
  const item = data.items.find((row) => row.id === selected.dataset.id);
  const existing = panel.querySelector("#curriculumContextCard");
  if (!item?.curriculum) {
    existing?.remove();
    return;
  }
  if (existing?.dataset.itemId === item.id) return;
  existing?.remove();
  const context = item.curriculum;
  const card = document.createElement("div");
  card.id = "curriculumContextCard";
  card.dataset.itemId = item.id;
  card.className = "curriculum-context-card";
  card.innerHTML = `
    <div><span class="curriculum-context-kicker">Ուսումնական համատեքստ</span><strong>${esc(context.subject?.nameHy || context.subject?.nameEn || "—")} · ${esc(context.grade?.labelHy || (context.grade?.number ? `${context.grade.number}-րդ դասարան` : "—"))}</strong></div>
    <div><span class="curriculum-context-kicker">Ծրագիր</span><span>${esc(context.program?.versionLabel || "—")}</span></div>
    <div><span class="curriculum-context-kicker">Բաժին</span><span>${esc(context.unit?.code || "—")} · ${esc(context.unit?.titleEn || context.unit?.titleHy || "—")}</span></div>`;
  panel.querySelector(".detail-heading")?.insertAdjacentElement("afterend", card);
}

function applyScope({ ensureSelection = false } = {}) {
  if (!data) return;
  const items = contextItems();
  const allowed = new Set(items.map((item) => item.id));
  const skillReset = updateSkillFilter(items);
  if (skillReset) {
    $("skillFilter")?.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  let visibleRendered = 0;
  document.querySelectorAll("#itemRows tr[data-id]").forEach((row) => {
    const visible = allowed.has(row.dataset.id);
    row.hidden = !visible;
    if (visible) visibleRendered += 1;
  });

  renderScopedStats(items);
  if ($("resultCount")) $("resultCount").textContent = `${visibleRendered} ցուցադրված · ${items.length} հարց ընտրված ուսումնական շրջանակում`;
  if ($("curriculumSummary")) $("curriculumSummary").textContent = scopeSummary();
  $("allContentBtn")?.classList.toggle("active", !$("gradeFilter")?.value && !$("subjectFilter")?.value && !$("programFilter")?.value && !$("unitFilter")?.value);

  if (ensureSelection) {
    const selected = document.querySelector("#itemRows tr.selected");
    if (!selected || selected.hidden) {
      const first = [...document.querySelectorAll("#itemRows tr[data-id]")].find((row) => !row.hidden);
      if (first) first.click();
      else if ($("detailPanel")) $("detailPanel").innerHTML = `<h2>Այս շրջանակում հարց չկա</h2><p class="subtle">Ընտրեք այլ դասարան, առարկա, ծրագիր կամ բաժին։</p>`;
    }
  }
  addContextToDetail();
}

function scheduleApply() {
  clearTimeout(applyTimer);
  applyTimer = setTimeout(() => applyScope(), 80);
}

async function refreshData({ ensureSelection = false, rebuild = false, force = false } = {}) {
  try {
    const { data: sessionData } = await contentSupabase.auth.getSession();
    if (!sessionData.session) return;
    data = await loadContentDashboard(sessionData.session, { force });
    if (rebuild || !initialized) rebuildSelectors();
    applyScope({ ensureSelection });
  } catch (err) {
    if ($("curriculumSummary")) $("curriculumSummary").textContent = `Չհաջողվեց բեռնել ուսումնական կատալոգը․ ${err.message}`;
  }
}

function handleContextChange(source) {
  rebuildSelectors(source);
  applyScope({ ensureSelection: document.body.dataset.contentMode !== "bank" });
}

function start() {
  if (observerStarted || !$("gradeFilter") || !$("itemRows")) return;
  observerStarted = true;

  $("gradeFilter").addEventListener("change", () => handleContextChange("grade"));
  $("subjectFilter").addEventListener("change", () => handleContextChange("subject"));
  $("programFilter").addEventListener("change", () => handleContextChange("program"));
  $("unitFilter").addEventListener("change", () => handleContextChange("unit"));
  $("allContentBtn").addEventListener("click", () => {
    ["gradeFilter", "subjectFilter", "programFilter", "unitFilter"].forEach((id) => { if ($(id)) $(id).value = ""; });
    rebuildSelectors();
    applyScope({ ensureSelection: document.body.dataset.contentMode !== "bank" });
  });
  $("refreshBtn")?.addEventListener("click", () => setTimeout(() => refreshData({ rebuild: true, force: true }), 150));

  new MutationObserver(scheduleApply).observe($("itemRows"), { childList: true, subtree: true });
  const detailPanel = $("detailPanel");
  if (detailPanel) new MutationObserver(scheduleApply).observe(detailPanel, { childList: true, subtree: true });

  refreshData({ ensureSelection: document.body.dataset.contentMode !== "bank", rebuild: true });
}

window.addEventListener("haiedu:content-dashboard", (event) => {
  const next = event.detail?.dashboard;
  if (!next) return;
  data = next;
  if (!initialized) rebuildSelectors();
  applyScope();
});

contentSupabase.auth.onAuthStateChange((event, session) => {
  if (!session || event === "TOKEN_REFRESHED") return;
  setTimeout(start, 0);
});
const { data: { session } } = await contentSupabase.auth.getSession();
if (session) start();
