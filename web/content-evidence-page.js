import { $, esc, invokeContent, mountContentWorkspace } from "./content-workspace.js";

let dashboard = null;
let currentAnalytics = null;

function pct(value) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(Number(value) * 100)}%`;
}

function contextForUnit(unit) {
  const program = dashboard?.catalog?.programs?.find((p) => p.id === unit.programId);
  return [program?.gradeLabelHy || (program?.gradeNumber ? `${program.gradeNumber}-րդ դասարան` : ""), program?.subjectNameHy || program?.subjectNameEn || "", unit.code, unit.titleHy || unit.titleEn || ""].filter(Boolean).join(" · ");
}

function populateUnits() {
  const units = [...(dashboard?.catalog?.units ?? [])].sort((a,b) => contextForUnit(a).localeCompare(contextForUnit(b),"hy"));
  $("evidenceUnit").innerHTML = '<option value="">Ընտրեք բաժինը / գլուխը</option>' + units.map((unit) => `<option value="${esc(unit.code)}">${esc(contextForUnit(unit))}</option>`).join("");
}

function flagLabel(flag) {
  return ({
    high_exposure:"Բարձր ցուցադրում",
    unexpectedly_easy:"Սպասվածից հեշտ",
    unexpectedly_hard:"Սպասվածից դժվար",
    frequently_missed:"Հաճախ սխալ",
    high_help_use:"Օգնության բարձր օգտագործում",
    high_exact_repeat:"Կրկնության բարձր ցուցանիշ",
    possible_memorisation_signal:"Հնարավոր մտապահման ազդակ",
    unanswered_signal:"Չպատասխանված / լքված",
  })[flag] || flag;
}

function renderAnalytics() {
  const analytics = currentAnalytics;
  if (!analytics) {
    $("evidenceMetrics").innerHTML = "";
    $("evidenceFlagList").innerHTML = '<div class="card content-work-card"><p class="subtle">Ընտրեք բաժին՝ փորձնական տվյալները տեսնելու համար։</p></div>';
    return;
  }
  const integrity = analytics.integrity ?? {};
  const metrics = [
    ["Սովորողներ", integrity.distinctStudents ?? 0],
    ["Ցուցադրումներ", integrity.exposureCount ?? 0],
    ["Կրկնության տոկոս", pct(integrity.exactRepeatRate ?? 0)],
    ["Պահուստային կրկնություններ", integrity.exactRepeatFallbackCount ?? 0],
    ["Պաշտպանված բանկի արտահոսք", integrity.protectedPoolLeakCount ?? 0],
    ["Ազդանշված հարցեր", integrity.flaggedItemCount ?? 0],
  ];
  $("evidenceMetrics").innerHTML = metrics.map(([label,value]) => `<article class="card evidence-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
  const flagged = (analytics.items ?? []).filter((item) => (item.flags ?? []).length);
  $("evidenceFlagList").innerHTML = flagged.length ? flagged.map((item) => `<article class="evidence-flag-row"><div><strong>${esc(item.itemCode)}</strong><p>${esc((item.flags ?? []).map(flagLabel).join(" · "))}</p></div><a class="ghost button-link" href="./content-item.html?id=${encodeURIComponent(item.itemId)}&from=evidence">Բացել հարցը</a></article>`).join("") : '<div class="card content-work-card"><strong>Գործառնական ազդակ չկա։</strong><p class="subtle">Այս ապացույցները վավերացված հոգեմետրիկ չափումներ չեն։</p></div>';
}

async function loadEvidence() {
  const unitCode = $("evidenceUnit").value;
  if (!unitCode) { currentAnalytics = null; renderAnalytics(); return; }
  $("evidenceMessage").textContent = "Տվյալները բեռնվում են…";
  try {
    const result = await invokeContent("get-pilot-item-analytics", { unitCode });
    currentAnalytics = result.analytics ?? null;
    $("evidenceMessage").textContent = "";
    renderAnalytics();
  } catch (error) {
    $("evidenceMessage").textContent = error.message;
    currentAnalytics = null;
    renderAnalytics();
  }
}

async function render(data) {
  dashboard = data;
  populateUnits();
  renderAnalytics();
}
$("evidenceUnit").addEventListener("change", loadEvidence);
$("refreshEvidenceBtn").addEventListener("click", loadEvidence);
await mountContentWorkspace(render);
