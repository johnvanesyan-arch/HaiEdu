import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let renderToken = 0;
let scheduled = null;
let initialized = false;

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(data?.detail || data?.error || error.message);
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

function selectedItemId() {
  return document.querySelector("#itemRows tr.selected")?.dataset.id ?? null;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function reviewerLabel(review) {
  if (!review?.reviewer) return "System / historical review";
  return review.reviewer.displayName || review.reviewer.role || "Reviewer";
}

function decisionLabel(decision) {
  const labels = {
    changes_requested: "Changes requested",
    submitted: "Submitted for review",
    approved: "Approved",
  };
  return labels[decision] || decision || "Review event";
}

function ensureChangesQueueButton() {
  const filterCard = document.querySelector(".filter-card");
  const refreshButton = $("refreshBtn");
  if (!filterCard || !refreshButton || $("changesQueueBtn")) return;

  const button = document.createElement("button");
  button.id = "changesQueueBtn";
  button.type = "button";
  button.className = "ghost changes-queue-btn";
  button.textContent = "Changes requested";
  button.setAttribute("aria-label", "Show questions with requested changes");
  button.addEventListener("click", () => {
    const filter = $("reviewFilter");
    if (!filter) return;
    filter.value = "changes_requested";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
    button.classList.add("active");
    document.querySelector(".bank-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  filterCard.insertBefore(button, refreshButton);
  $("reviewFilter")?.addEventListener("change", () => {
    button.classList.toggle("active", $("reviewFilter")?.value === "changes_requested");
  });
}

async function refreshChangesQueueCount() {
  ensureChangesQueueButton();
  const button = $("changesQueueBtn");
  if (!button) return;
  try {
    const dashboard = await invoke("get-content-quality-dashboard", {});
    const count = (dashboard.items ?? []).filter((item) => item.reviewStatus === "changes_requested").length;
    button.textContent = `Changes requested (${count})`;
    button.dataset.count = String(count);
    button.classList.toggle("has-items", count > 0);
  } catch {
    button.textContent = "Changes requested";
  }
}

function reviewHistoryHtml(reviews) {
  if (!reviews?.length) return `<p class="subtle tiny">No review history yet.</p>`;
  return `<ol class="review-history-list">${reviews.map((review) => `
    <li class="review-history-entry ${review.decision === "changes_requested" ? "is-change-request" : ""}">
      <div class="review-history-head">
        <strong>${esc(decisionLabel(review.decision))}</strong>
        <span>v${esc(review.versionNo)} · ${esc(formatDate(review.createdAt))}</span>
      </div>
      <div class="subtle tiny">${esc(reviewerLabel(review))} · ${esc(review.reviewType || "content")}</div>
      ${review.notes ? `<p class="review-history-note">${esc(review.notes)}</p>` : ""}
    </li>`).join("")}</ol>`;
}

function injectReviewUi(data, expectedItemId) {
  if (selectedItemId() !== expectedItemId) return;
  const panel = $("detailPanel");
  if (!panel || !panel.querySelector(".detail-heading")) return;

  panel.querySelector("#changeRequestCallout")?.remove();
  panel.querySelector("#reviewHistorySection")?.remove();

  const request = data.currentVersionChangeRequest;
  if (data.item?.reviewStatus === "changes_requested" && request) {
    const callout = document.createElement("section");
    callout.id = "changeRequestCallout";
    callout.className = "change-request-callout";
    callout.setAttribute("role", "status");
    callout.innerHTML = `
      <div class="change-request-title"><strong>Changes requested</strong><span>v${esc(request.versionNo)}</span></div>
      <p>${esc(request.notes || "No change note was provided.")}</p>
      <div class="tiny">Requested by ${esc(reviewerLabel(request))} · ${esc(formatDate(request.createdAt))}</div>
      <div class="tiny change-request-help">Edit the question above, save a new version, then rerun QA and review. This request remains in the review history below.</div>`;
    const anchor = panel.querySelector(".immutable-summary") || panel.querySelector(".detail-heading");
    anchor.insertAdjacentElement("afterend", callout);
  }

  const workflowHeading = [...panel.querySelectorAll(".detail-section h3")].find((h) => h.textContent.trim() === "Review workflow");
  const workflowSection = workflowHeading?.closest(".detail-section");
  if (workflowSection) {
    const history = document.createElement("section");
    history.id = "reviewHistorySection";
    history.className = "detail-section review-history-section";
    history.innerHTML = `
      <div class="section-heading"><div><h3>Review history</h3><p class="subtle tiny">Requested changes, submissions and approvals remain attached to the item across versions.</p></div></div>
      ${reviewHistoryHtml(data.reviews ?? [])}`;
    workflowSection.insertAdjacentElement("afterend", history);
  }
}

async function enhanceSelectedItem() {
  const itemId = selectedItemId();
  const panel = $("detailPanel");
  if (!itemId || !panel?.querySelector(".detail-heading")) return;

  const token = ++renderToken;
  try {
    const data = await invoke("get-content-review-history", { itemId });
    if (token !== renderToken) return;
    injectReviewUi(data, itemId);
  } catch (err) {
    if (token !== renderToken || selectedItemId() !== itemId) return;
    const workflowHeading = [...panel.querySelectorAll(".detail-section h3")].find((h) => h.textContent.trim() === "Review workflow");
    const workflowSection = workflowHeading?.closest(".detail-section");
    if (workflowSection && !$("reviewHistorySection")) {
      const error = document.createElement("section");
      error.id = "reviewHistorySection";
      error.className = "detail-section review-history-section";
      error.innerHTML = `<h3>Review history</h3><p class="message bad">${esc(err.message)}</p>`;
      workflowSection.insertAdjacentElement("afterend", error);
    }
  }
}

function scheduleEnhancement() {
  clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    enhanceSelectedItem();
    refreshChangesQueueCount();
  }, 120);
}

function watchConsole() {
  ensureChangesQueueButton();
  refreshChangesQueueCount();

  const panel = $("detailPanel");
  const rows = $("itemRows");
  if (panel) {
    new MutationObserver(() => {
      if (!panel.querySelector("#reviewHistorySection")) scheduleEnhancement();
    }).observe(panel, { childList: true, subtree: true });
  }
  if (rows) {
    new MutationObserver(scheduleEnhancement).observe(rows, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  scheduleEnhancement();
}

function initWhenReady() {
  if (initialized) return;
  if ($("detailPanel") && $("itemRows") && $("reviewFilter")) {
    initialized = true;
    watchConsole();
    return;
  }
  setTimeout(initWhenReady, 100);
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(initWhenReady, 0);
});
const { data: { session } } = await supabase.auth.getSession();
if (session) initWhenReady();
