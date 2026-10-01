import { $, esc, curriculumContext, mountContentWorkspace, qaLabel, reviewLabel } from "./content-workspace.js";

function priority(item) {
  if (item.reviewStatus === "changes_requested") return 0;
  if (item.latestQa?.passed === false) return 1;
  if (item.reviewStatus === "needs_review") return 2;
  if (item.reviewStatus === "unreviewed") return 3;
  if (item.reviewStatus === "in_review") return 4;
  return 9;
}

function needsAction(item) {
  return !item.retiredAt && (priority(item) < 9);
}

function render(dashboard) {
  const stats = dashboard.stats ?? {};
  const changes = (dashboard.items ?? []).filter((item) => !item.retiredAt && item.reviewStatus === "changes_requested").length;
  const unreviewed = (dashboard.items ?? []).filter((item) => !item.retiredAt && item.reviewStatus === "unreviewed").length;
  const cards = [
    ["Ստուգման հերթ", stats.reviewQueue ?? 0, "content-review.html", "Ստուգման կամ որոշման սպասող հարցեր"],
    ["Փոփոխություն է պահանջվում", changes, "content-review.html?queue=changes_requested", "Վերադարձված հարցեր, որոնք պետք է ուղղվեն"],
    ["QA խնդիրներ", stats.qaFailed ?? 0, "content-review.html?queue=qa_failed", "Ընթացիկ տարբերակի տեխնիկական խնդիրներ"],
    ["Չստուգված", unreviewed, "content-review.html?queue=unreviewed", "Դեռ մարդկային ստուգում չանցած բովանդակություն"],
  ];
  $("homeAttentionStats").innerHTML = cards.map(([label,value,href,copy]) => `<a class="card content-action-card" href="./${href}"><span>${esc(label)}</span><strong>${esc(value)}</strong><p>${esc(copy)}</p></a>`).join("");

  const priorityItems = (dashboard.items ?? []).filter(needsAction).sort((a,b) => priority(a)-priority(b) || String(a.code).localeCompare(String(b.code))).slice(0,8);
  $("priorityList").innerHTML = priorityItems.length ? priorityItems.map((item) => {
    const qa = qaLabel(item);
    return `<a class="content-priority-row" href="./content-item.html?id=${encodeURIComponent(item.id)}&from=review">
      <div><strong>${esc(item.code)}</strong><small>${esc(curriculumContext(item))} · ${esc(item.skill?.code || "—")}</small></div>
      <div class="content-status-line"><span class="content-chip ${item.reviewStatus === "changes_requested" ? "warn" : ""}">${esc(reviewLabel(item.reviewStatus))}</span><span class="content-chip ${qa.key === "fail" ? "fail" : qa.key === "pass" ? "good" : ""}">${esc(qa.text)}</span></div>
    </a>`;
  }).join("") : '<p class="subtle">Առաջնահերթ ստուգման հարց չկա։</p>';

  $("bankTotal").textContent = String(stats.totalItems ?? 0);
  $("bankApproved").textContent = String(stats.approved ?? 0);
  $("bankPublished").textContent = String(stats.published ?? 0);
  $("bankRetired").textContent = String(stats.retired ?? 0);
}

await mountContentWorkspace(render);
