import { $, esc, mountContentWorkspace } from "./content-workspace.js";

function statsFor(items) {
  const active = items.filter((item) => !item.retiredAt);
  return {
    total: items.length,
    review: active.filter((item) => ["unreviewed","needs_review","in_review","changes_requested"].includes(item.reviewStatus)).length,
    qa: active.filter((item) => item.latestQa?.passed === false).length,
    approved: active.filter((item) => item.reviewStatus === "approved").length,
  };
}

function render(dashboard) {
  const programs = dashboard.catalog?.programs ?? [];
  const units = dashboard.catalog?.units ?? [];
  $("curriculumProgramList").innerHTML = programs.length ? programs.map((program) => {
    const programUnits = units.filter((unit) => unit.programId === program.id);
    const programItems = (dashboard.items ?? []).filter((item) => item.curriculum?.program?.id === program.id);
    const pstats = statsFor(programItems);
    return `<section class="card curriculum-program-card">
      <div class="curriculum-program-head"><div><span class="mode-kicker">${esc(program.gradeLabelHy || (program.gradeNumber ? `${program.gradeNumber}-րդ դասարան` : "Դասարան"))}</span><h2>${esc(program.subjectNameHy || program.subjectNameEn || "Առարկա")}</h2><p class="subtle">Ծրագիր՝ ${esc(program.versionLabel || "—")}</p></div><div class="content-status-line"><span class="content-chip">${pstats.total} հարց</span><span class="content-chip warn">${pstats.review} ստուգման</span><span class="content-chip ${pstats.qa ? "fail" : "good"}">${pstats.qa} QA խնդիր</span></div></div>
      <div class="curriculum-units">${programUnits.map((unit) => {
        const items = programItems.filter((item) => item.curriculum?.unit?.id === unit.id);
        const s = statsFor(items);
        return `<div class="curriculum-unit-row"><div><strong>${esc(unit.code)} · ${esc(unit.titleHy || unit.titleEn || "Բաժին")}</strong></div><span>Հարցեր <strong>${s.total}</strong></span><span>Ստուգման <strong>${s.review}</strong></span><span>QA <strong>${s.qa}</strong></span><span>Հաստատված <strong>${s.approved}</strong></span><a class="ghost button-link" href="./content-bank.html?program=${encodeURIComponent(program.id)}&unit=${encodeURIComponent(unit.id)}">Բացել բանկում</a></div>`;
      }).join("") || '<p class="subtle">Այս ծրագրի համար բաժիններ չկան։</p>'}</div>
    </section>`;
  }).join("") : '<div class="card content-work-card">Ուսումնական ծրագրեր չեն գտնվել։</div>';
}

await mountContentWorkspace(render);
