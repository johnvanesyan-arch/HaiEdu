import { $, esc, contentSupabase, invokeContent, mountContentWorkspace } from "./content-workspace.js";

let dashboard = null;
let currentAnalytics = null;
let evidenceRequestId = 0;

const EVIDENCE_ERROR_HY = {
  account_or_session_inactive: "Հաշիվը կամ սեսիան ակտիվ չէ։ Նորից մուտք գործեք։",
  content_admin_required: "Այս բաժինը հասանելի է միայն բովանդակության ստուգողին կամ հարթակի ադմինիստրատորին։",
  invalid_unit_code: "Ընտրված բաժնի կոդը վավեր չէ։ Թարմացրեք էջը և կրկին ընտրեք բաժինը։",
  method_not_allowed: "Այս հարցումը չի աջակցվում։",
  pilot_analytics_failed: "Չհաջողվեց բեռնել փորձնական տվյալները։",
  pilot_analytics_unavailable: "Այս բաժնի համար փորձնական տվյալներ դեռ հասանելի չեն։",
  server_not_configured: "Սերվերի կարգավորումը թերի է։ Դիմեք հարթակի ադմինիստրատորին։",
  unauthorized: "Սեսիան վավեր չէ։ Նորից մուտք գործեք։",
};

function evidenceErrorHy(error) {
  const raw = String(error?.message || error || "");
  for (const [code, label] of Object.entries(EVIDENCE_ERROR_HY)) {
    if (raw.includes(code)) return label;
  }
  return raw || "Չհաջողվեց բեռնել փորձնական տվյալները։";
}

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
  })[flag] || `Այլ գործառնական ազդակ (${flag})`;
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
  const requestId = ++evidenceRequestId;
  const unitCode = $("evidenceUnit").value;
  if (!unitCode) {
    $("evidenceMessage").textContent = "";
    currentAnalytics = null;
    renderAnalytics();
    return;
  }
  currentAnalytics = null;
  $("evidenceMetrics").innerHTML = "";
  $("evidenceFlagList").innerHTML = "";
  $("evidenceMessage").textContent = "Տվյալները բեռնվում են…";
  try {
    const result = await invokeContent("get-pilot-item-analytics", { unitCode });
    if (requestId !== evidenceRequestId || $("evidenceUnit").value !== unitCode) return;
    currentAnalytics = result.analytics ?? null;
    $("evidenceMessage").textContent = "";
    renderAnalytics();
  } catch (error) {
    if (requestId !== evidenceRequestId || $("evidenceUnit").value !== unitCode) return;
    $("evidenceMessage").textContent = evidenceErrorHy(error);
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
contentSupabase.auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_OUT") return;
  evidenceRequestId += 1;
  dashboard = null;
  currentAnalytics = null;
  $("evidenceMessage").textContent = "";
  $("evidenceMetrics").innerHTML = "";
  $("evidenceFlagList").innerHTML = "";
});
await mountContentWorkspace(render);
