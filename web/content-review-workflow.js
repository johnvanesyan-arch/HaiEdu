import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let renderToken = 0;
let scheduled = null;
let initialized = false;
let reviewSessionVersion = 0;
let reviewSessionEnded = false;
let reviewUserId = null;

const REVIEW_HISTORY_ERROR_HY = {
  account_or_session_inactive: "Հաշիվը կամ սեսիան ակտիվ չէ։ Նորից մուտք գործեք։",
  content_admin_required: "Այս բաժինը հասանելի է միայն բովանդակության ստուգողին կամ հարթակի ադմինիստրատորին։",
  content_review_history_failed: "Չհաջողվեց բեռնել հարցի ստուգման պատմությունը։",
  invalid_json: "Ուղարկված տվյալները վավեր չեն։",
  item_id_required: "Հարցը չի նույնականացվել։",
  item_not_found: "Հարցը չի գտնվել։",
  method_not_allowed: "Այս հարցումը չի աջակցվում։",
  review_history_failed: "Չհաջողվեց բեռնել հարցի ստուգման պատմությունը։",
  server_not_configured: "Սերվերի կարգավորումը թերի է։ Դիմեք հարթակի ադմինիստրատորին։",
  unauthorized: "Սեսիան վավեր չէ։ Նորից մուտք գործեք։",
};

function reviewHistoryErrorHy(...values) {
  const raw = values.filter(Boolean).map(String).join(" · ");
  for (const [code, label] of Object.entries(REVIEW_HISTORY_ERROR_HY)) {
    if (raw.includes(code)) return label;
  }
  return values.find(Boolean) ? String(values.find(Boolean)) : "Չհաջողվեց բեռնել հարցի ստուգման պատմությունը։";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const response = error.context;
    const payload = response instanceof Response ? await response.clone().json().catch(() => null) : null;
    throw new Error(reviewHistoryErrorHy(payload?.detail, payload?.error, data?.detail, data?.error, error.message));
  }
  if (data?.error) throw new Error(reviewHistoryErrorHy(data.detail, data.error));
  return data;
}

function selectedItemId() {
  return document.querySelector("#itemRows tr.selected")?.dataset.id
    ?? document.body.dataset.contentItemId
    ?? new URLSearchParams(location.search).get("id")
    ?? null;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("hy-AM", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function reviewerLabel(review) {
  if (!review?.reviewer) return "Համակարգ / պատմական ստուգում";
  return review.reviewer.displayName || review.reviewer.role || "Ստուգող";
}

function decisionLabel(decision) {
  const labels = {
    changes_requested: "Փոփոխություն է պահանջվում",
    submitted: "Ուղարկվել է ստուգման",
    approved: "Հաստատված",
  };
  return labels[decision] || decision || "Ստուգման իրադարձություն";
}

function reviewHistoryHtml(reviews) {
  if (!reviews?.length) return `<p class="subtle tiny">Ստուգման պատմություն դեռ չկա։</p>`;
  return `<ol class="review-history-list">${reviews.map((review) => `
    <li class="review-history-entry ${review.decision === "changes_requested" ? "is-change-request" : ""}">
      <div class="review-history-head">
        <strong>${esc(decisionLabel(review.decision))}</strong>
        <span>v${esc(review.versionNo)} · ${esc(formatDate(review.createdAt))}</span>
      </div>
      <div class="subtle tiny">${esc(reviewerLabel(review))} · ${esc(review.reviewType === "content" ? "բովանդակային ստուգում" : (review.reviewType || "բովանդակային ստուգում"))}</div>
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
    callout.dataset.itemTab = "review";
    callout.innerHTML = `
      <div class="change-request-title"><strong>Փոփոխություն է պահանջվում</strong><span>v${esc(request.versionNo)}</span></div>
      <p>${esc(request.notes || "Փոփոխության նշում չի տրամադրվել։")}</p>
      <div class="tiny">Պահանջել է՝ ${esc(reviewerLabel(request))} · ${esc(formatDate(request.createdAt))}</div>
      <div class="tiny change-request-help">Ուղղեք հարցը, պահպանեք նոր տարբերակը, ապա կրկին գործարկեք QA-ն և ստուգումը։</div>`;
    const anchor = panel.querySelector(".immutable-summary") || panel.querySelector(".detail-heading");
    anchor.insertAdjacentElement("afterend", callout);
  }

  const workflowSection = panel.querySelector("#contentDecisionSection")
    || [...panel.querySelectorAll('.detail-section[data-item-tab="review"]')].find((section) =>
      section.querySelector("h3")?.textContent.trim() === "Բովանդակային որոշում");
  if (workflowSection) {
    const history = document.createElement("section");
    history.id = "reviewHistorySection";
    history.className = "detail-section review-history-section";
    history.dataset.itemTab = "history";
    history.innerHTML = `
      <div class="section-heading"><div><h3>Ստուգման պատմություն</h3><p class="subtle tiny">Փոփոխության պահանջները, ներկայացումները և հաստատումները պահպանվում են տարբերակների միջև։</p></div></div>
      ${reviewHistoryHtml(data.reviews ?? [])}`;
    workflowSection.insertAdjacentElement("afterend", history);
  }
  window.dispatchEvent(new CustomEvent("haiedu:content-tab-refresh"));
}

async function enhanceSelectedItem() {
  if (reviewSessionEnded) return;
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
    const workflowSection = panel.querySelector("#contentDecisionSection")
      || [...panel.querySelectorAll('.detail-section[data-item-tab="review"]')].find((section) =>
        section.querySelector("h3")?.textContent.trim() === "Բովանդակային որոշում");
    if (workflowSection && !$("reviewHistorySection")) {
      const error = document.createElement("section");
      error.id = "reviewHistorySection";
      error.className = "detail-section review-history-section";
      error.dataset.itemTab = "history";
      error.innerHTML = `<h3>Ստուգման պատմություն</h3><p class="message bad">${esc(err.message)}</p>`;
      workflowSection.insertAdjacentElement("afterend", error);
      window.dispatchEvent(new CustomEvent("haiedu:content-tab-refresh"));
    }
  }
}

function scheduleEnhancement() {
  if (reviewSessionEnded) return;
  clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    enhanceSelectedItem();
  }, 120);
}

function watchConsole() {
  const panel = $("detailPanel");
  const rows = $("itemRows");
  if (panel) {
    new MutationObserver(() => {
      if (panel.querySelector(".detail-heading") && !panel.querySelector("#reviewHistorySection")) scheduleEnhancement();
    }).observe(panel, { childList: true, subtree: true });
  }
  if (rows) {
    new MutationObserver(scheduleEnhancement).observe(rows, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  scheduleEnhancement();
}

function initWhenReady() {
  if (reviewSessionEnded) return;
  const panel = $("detailPanel");
  if (!panel) return;
  if (!initialized) {
    initialized = true;
    watchConsole();
  } else scheduleEnhancement();
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    reviewSessionVersion += 1;
    reviewSessionEnded = true;
    reviewUserId = null;
    renderToken += 1;
    clearTimeout(scheduled);
    return;
  }
  if (!session || (event === "TOKEN_REFRESHED" && reviewUserId === session.user.id)) return;
  if (reviewUserId !== session.user.id) {
    renderToken += 1;
    clearTimeout(scheduled);
  }
  reviewUserId = session.user.id;
  reviewSessionEnded = false;
  const version = ++reviewSessionVersion;
  setTimeout(() => { if (version === reviewSessionVersion) initWhenReady(); }, 0);
});
const initialSessionVersion = reviewSessionVersion;
const { data: { session } } = await supabase.auth.getSession();
if (session && initialSessionVersion === reviewSessionVersion) {
  reviewUserId = session.user.id;
  initWhenReady();
}
