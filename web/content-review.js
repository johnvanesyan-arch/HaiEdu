import { $, esc, contentSupabase, curriculumContext, mountContentWorkspace, qaLabel, reviewLabel } from "./content-workspace.js";

let dashboard = null;
let dashboardUserId = null;
let queue = new URLSearchParams(location.search).get("queue") || "all";

function matchesQueue(item) {
  if (item.retiredAt) return false;
  if (queue === "changes_requested") return item.reviewStatus === "changes_requested";
  if (queue === "qa_failed") return item.latestQa?.passed === false;
  if (queue === "unreviewed") return item.reviewStatus === "unreviewed";
  if (queue === "needs_review") return ["needs_review","in_review"].includes(item.reviewStatus);
  return ["unreviewed","needs_review","in_review","changes_requested"].includes(item.reviewStatus) || item.latestQa?.passed === false;
}

function rank(item) {
  if (item.reviewStatus === "changes_requested") return 0;
  if (item.latestQa?.passed === false) return 1;
  if (item.reviewStatus === "needs_review") return 2;
  if (item.reviewStatus === "unreviewed") return 3;
  return 4;
}

function renderRows() {
  const query = $("queueSearch").value.trim().toLocaleLowerCase("hy");
  const items = (dashboard?.items ?? []).filter(matchesQueue).filter((item) => {
    if (!query) return true;
    return [item.code,item.promptHy,item.skill?.code,item.skill?.nameHy,curriculumContext(item)].join(" ").toLocaleLowerCase("hy").includes(query);
  }).sort((a,b) => rank(a)-rank(b) || String(a.code).localeCompare(String(b.code)));
  $("queueCount").textContent = `${items.length} հարց`;
  $("queueList").innerHTML = items.length ? items.map((item) => {
    const qa = qaLabel(item);
    return `<article class="content-list-row">
      <div class="content-list-main"><strong>${esc(item.code)}</strong><p>${esc(item.promptHy || "Հարցի տեքստ չկա")}</p></div>
      <div class="content-list-meta"><span>${esc(curriculumContext(item))}</span><span>Հմտություն՝ ${esc(item.skill?.code || "—")} · v${esc(item.versionNo)}</span><div class="content-status-line"><span class="content-chip">${esc(reviewLabel(item.reviewStatus))}</span><span class="content-chip ${qa.key === "fail" ? "fail" : qa.key === "pass" ? "good" : ""}">${esc(qa.text)}</span></div></div>
      <a class="button-link" href="./content-item.html?id=${encodeURIComponent(item.id)}&from=review">Բացել հարցը</a>
    </article>`;
  }).join("") : '<div class="card content-work-card"><strong>Այս հերթում հարց չկա։</strong><p class="subtle">Փոխեք հերթը կամ որոնման պայմանը։</p></div>';
  document.querySelectorAll("[data-queue]").forEach((button) => button.classList.toggle("active", button.dataset.queue === queue));
}

function render(data, session) {
  dashboardUserId = session?.user?.id ?? null;
  dashboard = data;
  renderRows();
}

document.querySelectorAll("[data-queue]").forEach((button) => button.addEventListener("click", () => {
  queue = button.dataset.queue;
  const url = new URL(location.href);
  if (queue === "all") url.searchParams.delete("queue"); else url.searchParams.set("queue", queue);
  history.replaceState({}, "", url);
  renderRows();
}));
$("queueSearch").addEventListener("input", renderRows);
contentSupabase.auth.onAuthStateChange((event, session) => {
  const nextUserId = event === "SIGNED_OUT" ? null : session?.user?.id;
  if (event !== "SIGNED_OUT" && (!nextUserId || nextUserId === dashboardUserId)) return;
  dashboardUserId = nextUserId;
  dashboard = null;
  $("queueList").innerHTML = "";
  $("queueCount").textContent = "";
});
await mountContentWorkspace(render);
