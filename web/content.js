import { signOutAccount } from './account-signout.mjs';
import {rememberReviewItem} from './content-review-resume.mjs';
import * as reviewNavigation from './content-list-navigation.mjs';
import {arrangementEditorMarkup,bindArrangementEditor,collectArrangementEditor} from './arrangement-editor.mjs';
import {arrangementMarkup} from './arrangement-ui.mjs';
import {typedEditorMarkup,bindTypedEditor,collectTypedEditor} from './typed-fields-editor.mjs';
import {typedFieldsMarkup} from './typed-fields-ui.mjs';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { clearContentDashboardCache, loadContentDashboard } from "./content-workspace.js";
import { renderLearningStimulus } from "./learning-stimulus.mjs";
import {decodeLearningAudio} from './learning-audio.mjs';

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const contentMode = document.body.dataset.contentMode || "legacy";
let itemTab = "preview";
let dashboard = null;
let selectedId = null;
let selectedDetail = null;
let detailLoadToken = 0;
let editorDirty = false;
let workflowBusy = false;
let workflowAction = "";
let qaRerunRequired = false;
let workflowNeedsRefresh = false;
let navigationRestored = false;
let activeSession = null;
let bootstrapPromise = null;
let disposePreviewStimulus;

function updateReviewNavigation() {
  if (!document.body.dataset.reviewNavigation || contentMode !== 'item') return;
  const context = reviewNavigation.readNavigation(activeSession?.user?.id);
  const requested = new URLSearchParams(location.search).get('id');
  const allowed = new Set((dashboard?.items ?? []).filter(item => context?.source !== 'review' || !item.retiredAt).map(item => item.id));
  const ids = context?.ids.filter(id => allowed.has(id)) ?? [];
  const index = ids.indexOf(requested);
  $('reviewListNavigation')?.classList.toggle('hidden', !context);
  document.querySelectorAll('.content-back-row a').forEach(link => link.classList.toggle('hidden', !!context));
  if (!context) return;
  $('returnToReviewList').href = reviewNavigation.returnHref(context);
  $('returnToReviewList').textContent = context.source === 'bank' ? '← Վերադառնալ ընտրված բանկին' : '← Վերադառնալ ստուգման հերթին';
  $('reviewListPosition').textContent = index < 0 ? 'Հարցն այլևս ընտրված ցանկում չէ' : `${index + 1} / ${ids.length} · ընտրված ցանկ`;
  for (const [control,offset] of [['previousReviewItem',-1],['nextReviewItem',1]]) {
    const button = $(control), id = index < 0 ? null : ids[index + offset];
    button.disabled = workflowBusy || !selectedDetail || !id;
    button.onclick = () => { if (!workflowBusy && selectedDetail && id) location.assign(reviewNavigation.itemHref(id,context.source,context)); };
  }
}
function setWorkflowBusy(value, action = "") {
  workflowBusy = value;
  workflowAction = value ? action : "";
  updateReviewNavigation();
  updateEditorDirtyUi();
}
function openBankItem(row) {
  if (!document.body.dataset.reviewNavigation) return location.assign(`./content-item.html?id=${encodeURIComponent(row.dataset.id)}&from=bank`);
  window.dispatchEvent(new Event('haiedu:content-scope-now'));
  if (row.hidden) return;
  const ids = [...document.querySelectorAll('#itemRows tr[data-id]')].filter(r => !r.hidden).map(r => r.dataset.id);
  if (!ids.includes(row.dataset.id)) return;
  const context = reviewNavigation.saveNavigation(activeSession?.user?.id,'bank',ids,reviewNavigation.captureFields(reviewNavigation.bankFields));
  location.assign(reviewNavigation.itemHref(row.dataset.id,'bank',context));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

function setMessage(text, bad = false) {
  const target = $("consoleMessage");
  if (!target) return;
  target.textContent = text || "";
  target.classList.toggle("bad", Boolean(bad));
  const feedback = $("actionStatusFeedback");
  if (feedback) {
    if (feedback.textContent !== target.textContent) feedback.textContent = target.textContent;
    feedback.classList.toggle("bad", Boolean(bad));
  }
  target.classList.toggle("hidden", !!$("actionStatusPanel"));
}

function itemTypeLabel(value) {
  return ({
    single_choice: "Ընտրովի պատասխան",
    typed_fields: "Մուտքագրվող պատասխան / բացթողումներ",
    matching: "Համապատասխանեցում / խմբավորում",
    ordering: "Հերթականության որոշում",
    true_false: "Ճիշտ / սխալ",
    numeric: "Թվային պատասխան",
    quantity: "Թվային պատասխան և միավոր",
  })[value] || value || "—";
}

function difficultyBandLabel(value) {
  return ({
    foundation: "Հիմքային",
    core: "Հիմնական",
    challenge: "Առաջադեմ",
  })[value] || value || "—";
}

function lifecycleLabel(value) {
  return ({
    draft: "Սևագիր",
    review: "Ստուգման փուլ",
    published: "Հրապարակված",
    archived: "Արխիվացված",
  })[value] || value || "—";
}

function reviewDecisionLabel(value) {
  return ({
    approved: "Հաստատված",
    submitted: "Ուղարկված է ստուգման",
    changes_requested: "Փոփոխություն է պահանջվում",
  })[value] || value || "—";
}

function reviewTypeLabel(value) {
  return value === "content" ? "բովանդակային ստուգում" : (value || "—");
}

function purposeLabel(value) {
  return ({
    diagnostic: "Ախտորոշիչ",
    practice: "Վարժանք",
    mastery_check: "Յուրացման ստուգում",
    chapter_review: "Բաժնի կրկնություն",
  })[value] || value || "—";
}

function smeValidationLabel(value) {
  return ({
    provisional_no_sme_review: "Սպասում է մասնագիտական (SME) ստուգման",
    sme_reviewed: "✓ Մասնագիտական (SME) ստուգումը գրանցված է",
  })[value] || "Մասնագիտական (SME) կարգավիճակը կառավարվում է առանձին գործընթացով";
}

const CONTENT_ERROR_HY = {
  account_or_session_inactive: "Հաշիվը կամ սեսիան ակտիվ չէ։ Նորից մուտք գործեք։",
  changes_request_failed: "Չհաջողվեց գրանցել փոփոխության պահանջը։",
  content_admin_required: "Այս բաժինը հասանելի է միայն բովանդակության ստուգողին կամ հարթակի ադմինիստրատորին։",
  content_revision_failed: "Չհաջողվեց պահպանել հարցի նոր տարբերակը։",
  invalid_action: "Այս գործողությունը չի աջակցվում։",
  invalid_difficulty: "Դժվարության արժեքը վավեր չէ։",
  invalid_json: "Ուղարկված տվյալները վավեր չեն։",
  invalid_misconception_code: "Սխալ պատկերացման կապակցման կոդը վավեր չէ այս հմտության համար։",
  item_approval_failed: "Չհաջողվեց հաստատել հարցը։",
  item_id_required: "Հարցը չի նույնականացվել։ Վերադարձեք ցանկ և նորից բացեք այն։",
  item_restore_failed: "Չհաջողվեց վերականգնել հարցը։",
  item_retirement_failed: "Չհաջողվեց արխիվացնել հարցը։",
  metadata_update_failed: "Չհաջողվեց պահպանել հարցի մետատվյալները։",
  method_not_allowed: "Այս հարցումը չի աջակցվում։",
  misconception_mapping_failed: "Չհաջողվեց պահպանել սխալ պատկերացումների կապակցումները։",
  qa_record_failed: "Տեխնիկական QA-ի արդյունքը չհաջողվեց պահպանել։",
  replacement_cannot_be_same_item: "Հարցը չի կարող ինքն իրեն փոխարինել։",
  replacement_not_active_published: "Փոխարինող հարցը պետք է լինի գործող և հրապարակված։",
  replacement_qa_not_passed: "Փոխարինող հարցի ընթացիկ տարբերակը դեռ չի անցել տեխնիկական QA-ն։",
  replacement_skill_mismatch: "Փոխարինող հարցը պետք է պատկանի նույն հմտությանը։",
  retirement_reason_required: "Արխիվացման պատճառը պարտադիր է։",
  review_submit_failed: "Չհաջողվեց գրանցել հարցի ստուգման իրադարձությունը։",
  revision_payload_required: "Պահպանվող տարբերակի տվյալները բացակայում են։",
  server_not_configured: "Սերվերի կարգավորումը թերի է։ Դիմեք հարթակի ադմինիստրատորին։",
  authoring_review_unavailable: "Հարցի նախագծային նյութերը չհաջողվեց բեռնել։ Թարմացրեք էջը կամ դիմեք բովանդակության պատասխանատուին։",
  sme_validation_managed_separately: "Մասնագիտական (SME) կարգավիճակը կառավարվում է առանձին գործընթացով։",
  technical_qa_must_pass_before_approval: "Հաստատելուց առաջ ընթացիկ տարբերակը պետք է անցնի տեխնիկական QA-ն։",
  technical_qa_must_pass_before_review: "Ստուգման հաջորդ փուլից առաջ ընթացիկ տարբերակը պետք է անցնի տեխնիկական QA-ն։",
  template_code_required: "Հարցի ձևանմուշի կոդը բացակայում է։",
  unauthorized: "Սեսիան վավեր չէ։ Նորից մուտք գործեք։",
  variant_materialization_failed: "Չհաջողվեց ստեղծել գեներացված հարցի տարբերակը։",
  variant_preview_failed: "Չհաջողվեց նախադիտել գեներացված հարցի տարբերակը։",
  variant_seed_required: "Գեներացված հարցի seed-ը բացակայում է։",
  version_increment_failed: "Չհաջողվեց թարմացնել հարցի տարբերակի համարը։",
  version_snapshot_failed: "Չհաջողվեց պահպանել հարցի տարբերակի պատմական պատճենը։",
};

function contentErrorHy(...values) {
  const raw = values.filter(Boolean).map(String).join(" · ");
  for (const [code, label] of Object.entries(CONTENT_ERROR_HY)) {
    if (raw.includes(code)) return label;
  }
  return values.find(Boolean) ? String(values.find(Boolean)) : "Գործողությունը չհաջողվեց։";
}

async function invoke(name, body = {}) {
  const { data, error, response } = await supabase.functions.invoke(name, { body });
  if (error) {
    const response = error.context;
    const payload = response instanceof Response ? await response.clone().json().catch(() => null) : null;
    if (payload?.requiresQaRerun) {
      const problems = Array.isArray(payload.errors)
        ? payload.errors.map(qaMessageHy).filter(Boolean).join(" ")
        : "";
      const workflowError = new Error(
        `Հարցերի ընտանիքը փոխվել է վերջին QA-ից հետո։ Կրկին գործարկեք QA-ն, ուսումնասիրեք ընթացիկ խնդիրները և միայն դրանից հետո հաստատեք հարցը։${problems ? ` ${problems}` : ""}`,
      );
      workflowError.requiresQaRerun = true;
      throw workflowError;
    }
    throw new Error(contentErrorHy(payload?.detail, payload?.error, data?.detail, data?.error, error.message));
  }
  if (data?.error) throw new Error(contentErrorHy(data.detail, data.error));
  return name==='get-learning-audio'?decodeLearningAudio(data,response,body.action):data;
}

function renderStats(stats) {
  const host = $("stats");
  if (!host) return;
  const cards = [
    ["Հարցեր", stats.totalItems], ["Հրապարակված", stats.published], ["Ստուգման հերթ", stats.reviewQueue],
    ["Հաստատված", stats.approved], ["QA խնդիր", stats.qaFailed], ["Արխիվացված", stats.retired],
  ];
  host.innerHTML = cards.map(([label, value]) => `<article class="card quality-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
}

function populateSkillFilter(items) {
  const select = $("skillFilter");
  if (!select) return;
  const current = select.value;
  const skills = [...new Map(items.map((i) => [i.skill.code, i.skill])).values()].filter((s) => s.code);
  select.innerHTML = `<option value="">Բոլոր հմտությունները</option>${skills.map((s) => `<option value="${esc(s.code)}">${esc(s.code)}</option>`).join("")}`;
  if (skills.some((s) => s.code === current)) select.value = current;
}

function filteredItems() {
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const skill = $("skillFilter")?.value || "";
  const review = $("reviewFilter")?.value || "";
  const qa = $("qaFilter")?.value || "";
  return (dashboard?.items ?? []).filter((item) => {
    const hay = `${item.code} ${item.skill?.code} ${item.skill?.nameHy} ${item.promptHy}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (skill && item.skill?.code !== skill) return false;
    if (review && item.reviewStatus !== review) return false;
    if (qa === "pass" && item.latestQa?.passed !== true) return false;
    if (qa === "fail" && item.latestQa?.passed !== false) return false;
    if (qa === "missing" && item.latestQa) return false;
    return true;
  });
}

function renderRows() {
  const body = $("itemRows");
  if (!body) return;
  const items = filteredItems();
  if ($("resultCount")) $("resultCount").textContent = `${items.length} հարց`;
  body.innerHTML = items.map((item) => {
    const qa = !item.latestQa ? '<span class="qa-missing">QA չկա</span>' : item.latestQa.passed ? '<span class="qa-pass">QA անցած</span>' : '<span class="qa-fail">QA խնդիր</span>';
    if (contentMode === "bank") {
      const context = [item.curriculum?.grade?.labelHy || (item.curriculum?.grade?.number ? `${item.curriculum.grade.number}-րդ դասարան` : ""), item.curriculum?.subject?.nameHy || item.curriculum?.subject?.nameEn || "", item.curriculum?.unit?.titleHy || item.curriculum?.unit?.code || ""].filter(Boolean).join(" · ") || "Չկապակցված";
      const review = ({ unreviewed:"Չստուգված", needs_review:"Ստուգման է սպասում", in_review:"Ստուգման փուլում", changes_requested:"Փոփոխություն է պահանջվում", approved:"Հաստատված" })[item.reviewStatus] || item.reviewStatus;
      return `<tr data-id="${item.id}" class="${item.retiredAt ? "retired-row" : ""}">
        <td><strong>${esc(item.code)}</strong><div class="subtle tiny">${esc(itemTypeLabel(item.type))}</div></td>
        <td>${esc(context)}</td>
        <td>${esc(item.skill?.code || "—")}</td>
        <td><span class="review-chip">${esc(review)}</span></td>
        <td>${qa}</td>
        <td>v${esc(item.versionNo)}</td>
      </tr>`;
    }
    return `<tr data-id="${item.id}" class="${item.id === selectedId ? "selected" : ""} ${item.retiredAt ? "retired-row" : ""}">
      <td><strong>${esc(item.code)}</strong><div class="subtle tiny">${esc(item.type)}</div></td>
      <td>${esc(item.skill?.code)}</td>
      <td>${esc(item.difficulty)} <span class="difficulty-chip">${esc(difficultyBandLabel(item.difficultyBand))}</span></td>
      <td>${esc(item.itemFamily)}</td>
      <td><span class="review-chip">${esc(item.reviewStatus)}</span></td>
      <td>${qa}</td>
      <td>v${esc(item.versionNo)}</td>
      <td><span class="life-chip">${item.retiredAt ? "Արխիվացված" : esc(lifecycleLabel(item.lifecycleStatus))}</span></td>
    </tr>`;
  }).join("");
  body.querySelectorAll("tr[data-id]").forEach((row) => {
    row.tabIndex = 0;
    row.setAttribute("role", "link");
    const open = () => {
      if (contentMode === "bank") openBankItem(row);
      else selectItem(row.dataset.id);
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      open();
    });
  });
}
function renderLoadingDetail() {
  disposePreviewStimulus?.();disposePreviewStimulus=null;
  if ($("detailPanel")) $("detailPanel").innerHTML = `<h2>Բեռնվում է…</h2><p class="subtle">Հարցի աշխատանքային էջը բեռնվում է։</p>`;
}

async function selectItem(id) {
  if (id !== selectedId && editorDirty) {
    const discard = confirm("Այս հարցում կան չպահպանված փոփոխություններ։ Չեղարկե՞լ դրանք և բացել մեկ այլ հարց։");
    if (!discard) {
      renderRows();
      return;
    }
  }
  editorDirty = false;
  if (selectedId !== id) { qaRerunRequired = false; workflowNeedsRefresh = false; }
  setMessage("");
  selectedId = id;
  document.body.dataset.contentItemId = id;
  selectedDetail = null;
  updateReviewNavigation();
  if ($("itemRows")) renderRows();
  renderLoadingDetail();
  const token = ++detailLoadToken;
  try {
    const data = await invoke("manage-content-quality", { action: "get_item_detail", itemId: id });
    if (token !== detailLoadToken || selectedId !== id) return;
    selectedDetail = data.detail;
    renderDetail();
    if (document.body.dataset.reviewNavigation && contentMode === 'item' && selectedDetail?.item?.id === id && activeSession?.user?.id) {
      rememberReviewItem(activeSession.user.id, id, reviewNavigation.readNavigation(activeSession.user.id));
    }
  } catch (err) {
    if (token !== detailLoadToken) return;
    $("detailPanel").innerHTML = `<h2>Չհաջողվեց բեռնել</h2><p class="message bad">${esc(err.message)}</p>`;
  } finally {
    if (token === detailLoadToken) updateReviewNavigation();
  }
}

function optionRowsHtml(options, disabled) {
  return (options ?? []).map((o) => `<div class="option-editor-row" data-option-row>
    <label class="option-key-field">Կոդ<input class="option-key" value="${esc(o.key)}" ${disabled ? "disabled" : ""} /></label>
    <label>Տարբերակի տեքստ<textarea class="option-hy" rows="2" ${disabled ? "disabled" : ""}>${esc(o.contentHy ?? "")}</textarea></label>
    <label>Անգլերեն<input class="option-en" value="${esc(o.contentEn ?? "")}" ${disabled ? "disabled" : ""} /></label>
    <button type="button" class="ghost remove-option-btn" ${disabled ? "disabled" : ""}>Հեռացնել</button>
  </div>`).join("");
}

function misconceptionRowsHtml(detail, disabled) {
  const available = detail.availableMisconceptions ?? [];
  const rows = detail.misconceptions ?? [];
  return rows.map((m) => {
    const choices = available.some((x) => x.code === m.code)
      ? available
      : m.code
        ? [{ code: m.code, title_hy: m.titleHy || "Ընթացիկ կապակցում", existingOnly: true }, ...available]
        : available;
    return `<div class="misconception-editor-row" data-misconception-row>
    <label>Կոդ<select class="misconception-code" ${disabled ? "disabled" : ""}>${choices.map((x) => `<option value="${esc(x.code)}" ${x.code === m.code ? "selected" : ""}>${esc(x.code)} — ${esc(x.title_hy)}${x.existingOnly ? " · ընթացիկ" : ""}</option>`).join("")}</select></label>
    <label>Պատասխանի կոդ<input class="misconception-response" value="${esc(m.responseKey ?? "*")}" ${disabled ? "disabled" : ""} /></label>
    <label class="wide">Նշում<input class="misconception-note" value="${esc(m.mappingNote ?? "")}" ${disabled ? "disabled" : ""} /></label>
    <button type="button" class="ghost remove-misconception-btn" ${disabled ? "disabled" : ""}>Հեռացնել</button>
  </div>`;
  }).join("");
}

function answerEditorHtml(detail, disabled) {
  const item = detail.item;
  const key = detail.answerKey ?? {};
  if (['matching','ordering'].includes(item.type)) return arrangementEditorMarkup(detail,disabled);
  if (item.type === 'typed_fields') return typedEditorMarkup(detail,disabled);
  if (item.type === "single_choice") {
    return `<div class="answer-grid"><label>Ճիշտ տարբերակ<select id="answerSingleChoice" ${disabled ? "disabled" : ""}></select></label></div>`;
  }
  if (item.type === "true_false") {
    return `<div class="answer-grid"><label>Ճիշտ պատասխան<select id="answerTrueFalse" ${disabled ? "disabled" : ""}><option value="true" ${key.answer === true ? "selected" : ""}>Ճիշտ է</option><option value="false" ${key.answer === false ? "selected" : ""}>Սխալ է</option></select></label></div>`;
  }
  const quantity = item.type === "quantity";
  return `<div class="answer-grid">
    <label>Ճիշտ արժեք<input id="answerNumeric" type="number" step="any" value="${esc(key.answer ?? "")}" ${disabled ? "disabled" : ""} /></label>
    <label>Թույլատրելի շեղում<input id="answerTolerance" type="number" min="0" step="any" value="${esc(key.tolerance ?? 0)}" ${disabled ? "disabled" : ""} /></label>
    ${quantity ? `<label>Հիմնական միավոր<input id="answerCanonicalUnit" value="${esc(key.canonicalUnit ?? "")}" ${disabled ? "disabled" : ""} /></label><label>Ընդունվող միավորներ<input id="answerAcceptedUnits" value="${esc((key.acceptedUnits ?? []).join(", "))}" placeholder="m, cm, mm" ${disabled ? "disabled" : ""} /></label>` : ""}

  </div>`;
}

function learnerPreviewHtml(detail) {
  const item = detail.item;
  const options = item.type === "single_choice"
    ? (detail.options ?? []).map((option) => `<div class="learner-preview-option"><strong>${esc(option.key)}.</strong> ${esc(option.contentHy || "")}</div>`).join("")
    : item.type === "true_false"
      ? '<div class="learner-preview-option">Ճիշտ</div><div class="learner-preview-option">Սխալ</div>'
      : ['matching','ordering'].includes(item.type) ? arrangementMarkup(item.type,item.config.responseDefinition,null,true) : item.type === 'typed_fields' ? typedFieldsMarkup(item.config.responseDefinition,null,true) : '<div class="learner-preview-option subtle">Սովորողը այստեղ մուտքագրում է իր պատասխանը։</div>';
  return `<section class="detail-section learner-preview" data-item-tab="preview"><h3>Սովորողի տեսքը</h3><p class="learner-preview-prompt">${esc(item.promptHy || "Հարցի տեքստ չկա")}</p><div id="learnerPreviewStimulus"></div><div class="learner-preview-options">${options}</div></section>`;
}

function authoringReviewHtml(detail) {
  const draft = detail.authoringReview;
  if (!draft) return "";
  const source = draft.source;
  const inherited = draft.version !== detail.item.versionNo;
  const paragraphs = text => String(text || "").split(/\n\n+/).map(p => `<p style="white-space:pre-wrap">${esc(p)}</p>`).join("");
  return `<section class="detail-section authoring-review-context" data-item-tab="preview">
    <h3>Նախագծային նյութեր՝ ստուգողի համար</h3>
    <p class="subtle">Լեզու՝ <strong>${esc(draft.locale)}</strong> · սկզբնական նախագիծ՝ v${esc(draft.version)}։ Այս բաժինը սովորողներին չի ցուցադրվում։</p>
    ${inherited ? '<p class="editor-warning">Ստորև սկզբնական նախագծի նշումներն են։ Հարցի խմբագրումից հետո համեմատեք դրանք ընթացիկ տեքստի և ճիշտ պատասխանի հետ։</p>' : ''}
    ${source ? `${draft.sourceRegistered ? '<p class="subtle">Գրանցված աղբյուրը կապակցված է։ Ստորև պահպանված է սկզբնական նախագծային նյութը։</p>' : `<div class="editor-warning"><strong>${source.kind === 'listening' ? 'Լսելու առաջադրանք․ ձայնագրության ստուգումն ու գրանցումը դեռ ավարտված չեն։' : 'Ընթերցանության նյութ․ աղբյուրի ստուգումն ու գրանցումը դեռ ավարտված չեն։'}</strong><p>Ստուգեք հարցը ստորև ներկայացված նյութի հետ։ Հաստատումը հնարավոր կլինի համապատասխան աղբյուրը գրանցելուց և հարցին կապակցելուց հետո։</p></div>`}<h4>${source.format === 'summary' ? 'Տպագիր սցենարի ամփոփում' : source.kind === 'listening' ? 'Սցենարի նախագիծ' : 'Տեքստի նախագիծ'} · ${esc(source.title)}</h4>${paragraphs(source.text)}` : ''}
    ${draft.hint ? `<h4>Հուշման նախագիծ</h4>${paragraphs(draft.hint)}` : ''}
    ${draft.feedback ? `<h4>Պատասխանի հիմնավորում</h4>${paragraphs(draft.feedback)}` : ''}
    ${draft.optionFeedback?.length ? `<h4>Տարբերակների բացատրություններ</h4><ul>${draft.optionFeedback.map(o => `<li><strong>${esc(o.key)}</strong> — ${esc(o.text)}</li>`).join('')}</ul>` : ''}
    ${draft.fieldFeedback?.length ? `<h4>Դաշտերի բացատրություններ</h4><ul>${draft.fieldFeedback.map(f => `<li><strong>${esc(f.id)}</strong> — ${esc(f.text)}</li>`).join('')}</ul>` : ''}
    <p class="subtle">${esc(draft.sourceReference || '')}</p>
  </section>`;
}

function activateItemTab(tab) {
  itemTab = tab;
  document.body.dataset.contentActiveTab = tab;
  const panel = $("detailPanel");
  if (!panel) return;
  panel.querySelectorAll("[data-item-tab]").forEach((section) => { section.hidden = section.dataset.itemTab !== tab; });
  panel.querySelectorAll("[data-item-tab-button]").forEach((button) => {
    const active = button.dataset.itemTabButton === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function wireItemTabs() {
  const panel = $("detailPanel");
  if (!panel) return;
  panel.querySelectorAll("[data-item-tab-button]").forEach((button) => button.addEventListener("click", () => activateItemTab(button.dataset.itemTabButton)));
  activateItemTab(itemTab);
}

window.addEventListener("haiedu:content-tab-refresh", () => activateItemTab(itemTab));

const QA_MESSAGE_HY = {
  missing_item_code: "Հարցի կոդը բացակայում է։",
  empty_prompt: "Հարցի տեքստը բացակայում է։",
  authoring_source_registration_pending: "Նախագծային աղբյուրը դեռ գրանցված և հարցին կապակցված չէ։ Նախադիտման բաժնում կարող եք ստուգել տեքստը կամ սցենարը։",
  invalid_difficulty: "Դժվարության արժեքը պետք է լինի 1-ից 5 միջակայքում։",
  difficulty_band_mismatch: "Դժվարության մակարդակը չի համապատասխանում թվային դժվարությանը։",
  missing_answer_key: "Ճիշտ պատասխանը նշված չէ։",
  insufficient_options: "Ընտրովի հարցը պետք է ունենա առնվազն երկու պատասխանային տարբերակ։",
  answer_not_in_options: "Նշված ճիշտ պատասխանը չկա պատասխանային տարբերակների մեջ։",
  true_false_answer_not_boolean: "Ճիշտ/սխալ հարցի պատասխանը պետք է լինի «ճիշտ է» կամ «սխալ է»։",
  numeric_answer_not_number: "Թվային հարցի ճիշտ պատասխանը թվային արժեք չէ։",
  numeric_tolerance_missing: "Թվային հարցի թույլատրելի շեղումը նշված չէ կամ վավեր չէ։",
  quantity_unit_metadata_missing: "Չափման հարցի համար չափման միավորների տվյալները ամբողջական չեն։",
  canonical_unit_not_in_accepted_units: "Հիմնական չափման միավորը ներառված չէ ընդունվող միավորների ցանկում։",
  unsupported_item_type: "Այս հարցի տեսակը տեխնիկական QA-ն դեռ չի սպասարկում։",
  arrangement_contract_invalid: "Համապատասխանեցման կամ հերթականության տվյալները վավեր չեն։ Ստուգեք կոդերը, տարբերակները և ճիշտ պատասխանները։",
  typed_fields_contract_invalid: "Պատասխանի դաշտերը կամ ընդունվող տարբերակները վավեր չեն։ Ստուգեք կայուն կոդերը, պիտակները և գնահատման կանոնները։",
  source_reference_missing: "Հարցի աղբյուրի հղումը կամ նշումը բացակայում է։",
  item_family_unspecified: "Հարցերի ընտանիքը նշված չէ։",
  misconception_mapping_missing: "Հարցի համար սխալ պատկերացման կապակցում նշված չէ։",
  misconception_mapping_incomplete: "Սխալ պատկերացումների կապակցումները ամբողջական չեն։",
  duplicate_prompt_in_skill: "Նույն հմտության մեջ հայտնաբերվել է նույն կամ կրկնվող հարցի ձևակերպում։",
  generated_variant_seed_missing: "Գեներացված հարցի seed-ը բացակայում է։",
  generated_variant_preview_failed: "Չհաջողվեց վերարտադրել գեներացված հարցի նախադիտումը։",
  generated_variant_generator_qa_failed: "Գեներացված հարցի աղբյուրային ձևանմուշը չի անցել գեներատորի QA-ն։",
  generated_prompt_not_reproducible: "Գեներացված հարցի ձևակերպումը չի վերարտադրվում նույն ձևանմուշից և seed-ից։",
  generated_answer_not_reproducible: "Գեներացված հարցի ճիշտ պատասխանը չի վերարտադրվում նույն ձևանմուշից և seed-ից։",
  generated_parameters_not_reproducible: "Գեներացված հարցի պարամետրերը չեն վերարտադրվում նույն ձևանմուշից և seed-ից։",
  generated_fingerprint_not_reproducible: "Գեներացված հարցի բովանդակային մատնահետքը չի համընկնում վերարտադրված տարբերակին։",
  answer_position_distribution_imbalanced: "Այս հարցի ընտանիքում ճիշտ պատասխանների դիրքերը անհամաչափ են բաշխված։ Վերանայեք տարբերակների հերթականությունը։",
  answer_position_distribution_check_failed: "Չհաջողվեց ստուգել ճիշտ պատասխանների դիրքերի բաշխումը։ Կրկին գործարկեք QA-ն։",
  shuffle_disabled_without_option_order_rationale: "Տարբերակների խառնումն անջատված է, սակայն հաստատուն հերթականության պատճառը նշված չէ։",
  evidence_purpose_missing: "Հարցի ապացուցողական նպատակը նշված չէ։",
  evidence_purpose_invalid: "Հարցի ապացուցողական նպատակը թույլատրելի չէ։",
  family_evidence_blueprint_invalid: "Հարցերի ընտանիքի ապացուցողական սխեման վավեր չէ։",
  family_evidence_blueprint_check_failed: "Չհաջողվեց ստուգել հարցերի ընտանիքի ապացուցողական սխեման։",
  family_evidence_purpose_missing: "Ընտանիքի առնվազն մեկ հարց չունի ապացուցողական նպատակ։",
  family_evidence_purpose_invalid: "Ընտանիքի առնվազն մեկ հարց ունի անթույլատրելի ապացուցողական նպատակ։",
  family_evidence_blueprint_incomplete: "Ընտանիքում բացակայում է պարտադիր ապացուցողական նպատակներից առնվազն մեկը։",
  family_evidence_purpose_duplicate: "Այս ընտանիքում յուրաքանչյուր պարտադիր ապացուցողական նպատակը պետք է օգտագործվի մեկ անգամ։",
}

function qaMessageHy(code) {
  return QA_MESSAGE_HY[code] || `Տեխնիկական QA հաղորդագրություն՝ ${code}`;
}

function renderDetail() {
  disposePreviewStimulus?.();disposePreviewStimulus=null;
  const item = dashboard?.items?.find((i) => i.id === selectedId);
  const detail = selectedDetail;
  if (!item || !detail) return;

  const editable = detail.editing?.contentEditable === true;
  const disabled = !editable;
  const qaErrors = item.latestQa?.errors ?? [];
  const qaWarnings = (item.latestQa?.warnings ?? []).filter(
    (warning) => !["content_review_not_approved", "sme_review_pending"].includes(warning),
  );
  const qaPassed = item.latestQa?.passed === true;
  const contentReviewApproved = item.reviewStatus === "approved";
  const smeReviewPending = item.validationState === "provisional_no_sme_review";
  const reviewStatusLabel = ({
    unreviewed: "Չստուգված",
    needs_review: "Ստուգման է սպասում",
    in_review: "Ստուգման փուլում",
    changes_requested: "Փոփոխություն է պահանջվում",
    approved: "Հաստատված",
  })[item.reviewStatus] || item.reviewStatus || "—";

  const purposes = (detail.pools ?? []).map((p) => `${purposeLabel(p.purpose)}${p.protected ? " (պաշտպանված)" : ""}${p.enabled ? "" : " · փուլային"}`).join(" · ") || purposeLabel(detail.item.config?.sprint11dBucket) || "—";
  const generatedWarning = detail.editing?.reason === "generated_variant_requires_template_edit"
    ? `<div class="editor-warning"><strong>Գեներացված տարբերակ։</strong> Այս հարցը վերարտադրվում է ձևանմուշից և seed-ից, ուստի հարցի և պատասխանի ուղղակի խմբագրումն արգելափակված է։ Փոխեք կամ վերագեներացրեք սկզբնական ձևանմուշը․ մետատվյալների և ստուգման գործողությունները հասանելի են։</div>`
    : detail.item.retiredAt ? `<div class="editor-warning"><strong>Արխիվացված հարց։</strong> Խմբագրելուց առաջ վերականգնեք այն։</div>` : "";

  $("detailPanel").innerHTML = `
    <div class="detail-heading">
      <div><p class="eyebrow">${esc(item.skill?.code)}</p><h2>${esc(item.code)}</h2></div>
      <span class="review-chip">v${esc(item.versionNo)}</span>
    </div>
    <div class="immutable-summary"><span><strong>Տեսակ՝</strong> ${esc(itemTypeLabel(item.type))}</span><span><strong>Հմտություն՝</strong> ${esc(item.skill?.code)}</span><span><strong>Նպատակ՝</strong> ${esc(purposes)}</span></div>
    <section id="actionStatusPanel" class="action-status-panel" aria-labelledby="actionStatusTitle">
      <div class="action-status-heading"><div><p class="eyebrow">ՀԱՐՑԻ ԸՆԹԱՑԻԿ ՎԻՃԱԿԸ</p><h3 id="actionStatusTitle" role="status" aria-live="polite"></h3><p id="actionStatusHint"></p></div><button id="actionStatusDetails" type="button" class="ghost hidden"></button></div>
      <div id="unsavedChangesNotice" class="hidden">Չպահպանված փոփոխություններ կան։</div>
      <div class="action-status-steps">
        <div id="saveStatusStep" class="action-status-step"><strong>1. Պահպանել</strong><p id="saveStatusReason"></p><button id="saveRevisionBtn" type="button" aria-describedby="saveStatusReason">Պահպանել նոր տարբերակը</button></div>
        <div id="qaStatusStep" class="action-status-step"><strong>2. Տեխնիկական QA</strong><p id="qaStatusReason"></p><button id="runQaBtn" type="button" class="secondary" aria-describedby="qaStatusReason">Գործարկել QA</button></div>
        <div id="reviewStatusStep" class="action-status-step"><strong>3. Բովանդակային ստուգում</strong><p id="reviewStatusReason"></p><button id="approveBtn" type="button" aria-describedby="reviewStatusReason">Հաստատել</button></div>
      </div>
      <p id="actionStatusGovernance" class="subtle tiny"></p>
      <p id="actionStatusFeedback" class="message" role="status" aria-live="polite"></p>
    </section>
    ${generatedWarning}
    <nav class="item-tab-nav" aria-label="Հարցի աշխատանքային բաժիններ">
      <button type="button" class="item-tab-button" data-item-tab-button="preview">Նախադիտում</button>
      <button type="button" class="item-tab-button" data-item-tab-button="content">Բովանդակություն</button>
      <button type="button" class="item-tab-button" data-item-tab-button="metadata">Մետատվյալներ</button>
      <button type="button" class="item-tab-button" data-item-tab-button="review">QA և ստուգում</button>
      <button type="button" class="item-tab-button" data-item-tab-button="history">Պատմություն</button>
    </nav>
    ${learnerPreviewHtml(detail)}
    ${authoringReviewHtml(detail)}

    <section class="detail-section editor-section" data-item-tab="content">
      <div class="section-heading"><div><h3>Հարցի բովանդակություն</h3><p class="subtle tiny">Հարցի կոդը, հմտությունը և հարցի տեսակը այստեղ չեն փոխվում։</p></div></div>
      <label>Հարցի տեքստ<textarea id="editPromptHy" rows="4" ${disabled ? "disabled" : ""}>${esc(detail.item.promptHy ?? "")}</textarea></label>
      <label>Անգլերեն հարց <span class="subtle tiny">ըստ ցանկության</span><textarea id="editPromptEn" rows="3" ${disabled ? "disabled" : ""}>${esc(detail.item.promptEn ?? "")}</textarea></label>
      ${editable ? '<button type="button" id="chooseAudioBtn" class="secondary">Ընտրել ձայնագրություն</button><div id="audioCatalog" role="status"></div><button type="button" id="chooseTaskSetBtn" class="secondary">Ընտրել ընդհանուր նյութով առաջադրանքաշար</button><div id="taskSetCatalog" role="status"></div>' : ''}
    </section>

    ${item.type === "single_choice" ? `<section class="detail-section editor-section" data-item-tab="content"><div class="section-heading"><div><h3>Պատասխանի տարբերակներ</h3><p class="subtle tiny">Տարբերակների կոդերը պետք է լինեն եզակի, և յուրաքանչյուր տարբերակ պետք է ունենա տեքստ՝ հարցի լեզվով։</p></div>${editable ? `<button type="button" id="addOptionBtn" class="ghost">Ավելացնել տարբերակ</button>` : ""}</div><div id="optionEditor">${optionRowsHtml(detail.options, disabled)}</div></section>` : ""}

    <section class="detail-section editor-section" data-item-tab="content"><h3>Ճիշտ պատասխան</h3>${answerEditorHtml(detail, disabled)}</section>

    <section class="detail-section editor-section" data-item-tab="metadata">
      <h3>Մետատվյալներ</h3>
      <div class="metadata-grid">
        <label>Դժվարություն<select id="metaDifficulty" ${disabled ? "disabled" : ""}>${[1,2,3,4,5].map((n)=>`<option value="${n}" ${n===item.difficulty?"selected":""}>${n}</option>`).join("")}</select></label>
        <label class="wide">Աղբյուրի հղում / նշում<input id="metaSource" value="${esc(item.sourceReference ?? "")}" ${disabled ? "disabled" : ""} /></label>
        <div class="wide metadata-governance-field"><span>Մասնագիտական (SME) կարգավիճակ</span><strong>${esc(smeValidationLabel(item.validationState))}</strong><small>Այս կարգավիճակը Content Reviewer-ը չի փոխում։ Այն գրանցվում է առանձին SME գործընթացով։</small></div>
      </div>
    </section>

    <details class="detail-section editor-section editor-advanced" data-item-tab="metadata">
      <summary>Ընդլայնված · ընտանիք և սխալ պատկերացումների կապակցումներ</summary>
      <label>Հարցերի ընտանիք<input id="metaFamily" value="${esc(item.itemFamily)}" ${disabled ? "disabled" : ""} /></label>
      <div class="section-heading"><div><h3>Սխալ պատկերացումների կապակցում</h3><p class="subtle tiny">Կապակցումները սահմանափակված են ${esc(item.skill?.code)} հմտության գործող սխալ պատկերացումներով։</p></div>${editable && (detail.availableMisconceptions ?? []).length ? `<button type="button" id="addMisconceptionBtn" class="ghost">Ավելացնել կապակցում</button>` : ""}</div>
      <div id="misconceptionEditor">${misconceptionRowsHtml(detail, disabled) || `<p class="subtle tiny">Կապակցումներ չկան։</p>`}</div>
    </details>

    <details id="contentAdvanced" class="detail-section editor-section editor-advanced" data-item-tab="content">
      <summary>Ընդլայնված · տեխնիկական տվյալներ</summary>
      <p class="subtle tiny">Սովորական խմբագրման համար այս դաշտերը փոխելու կարիք չկա։ Բաժինը փակելիս դաշտերի արժեքները չեն փոխվում։</p>
      <label>Խթանիչ տվյալներ (JSON)<textarea id="editStimulus" class="code-field" rows="6" spellcheck="false" ${disabled ? "disabled" : ""}>${esc(JSON.stringify(detail.item.stimulus ?? {}, null, 2))}</textarea></label>
      ${!['matching','ordering','typed_fields'].includes(item.type) ? `<label>Հետադարձ կապի կոդ<input id="answerFeedbackCode" value="${esc(detail.answerKey?.feedbackCode ?? "")}" ${disabled ? "disabled" : ""} /></label>` : ''}
    </details>

    ${editable ? `<section class="detail-section save-revision-section" data-item-tab="content"><label>Փոփոխության ամփոփում<input id="changeSummary" placeholder="Օրինակ՝ հստակեցվել է ձևակերպումը և ուղղվել է B տարբերակը" /></label><p class="subtle tiny">Պահպանումը ատոմային է։ Հարցն անմիջապես վերադառնում է <strong>ստուգման սպասող</strong> վիճակին․ հրապարակումից կամ ակտիվացումից առաջ ընթացիկ տարբերակի QA-ն և հաստատումը պետք է նորից կատարվեն։</p></section>` : ""}

    <section id="technicalQaSection" class="detail-section" data-item-tab="review">
      <h3>Տեխնիկական QA</h3>
      <p><strong>${!item.latestQa ? "Ընթացիկ տարբերակի համար QA դեռ չի գործարկվել։" : qaPassed ? "✓ QA անցած" : "✕ QA չի անցել"}</strong>${item.latestQa ? ` · v${esc(item.latestQa.versionNo)}` : ""}</p>
      ${qaErrors.length ? `<ul class="error-list">${qaErrors.map((x)=>`<li>${esc(qaMessageHy(x))}</li>`).join("")}</ul>` : ""}
      ${qaWarnings.length ? `<ul class="warning-list">${qaWarnings.map((x)=>`<li>${esc(qaMessageHy(x))}</li>`).join("")}</ul>` : ""}

    </section>
    <section class="detail-section governance-status-section" data-item-tab="review">
      <h3>Կառավարման կարգավիճակ</h3>
      <div class="governance-status-grid">
        <div>
          <span>Բովանդակային հաստատում</span>
          <strong class="${contentReviewApproved ? "governance-ok" : "governance-pending"}">${contentReviewApproved ? "✓ Հաստատված" : "Սպասում է"}</strong>
        </div>
        <div>
          <span>Մասնագիտական (SME) ստուգում</span>
          <strong class="${smeReviewPending ? "governance-pending" : "governance-ok"}">${smeReviewPending ? "Սպասում է" : "✓ Գրանցված է"}</strong>
        </div>
      </div>
      <p class="subtle tiny">Այս կարգավիճակները կառավարման փուլեր են և տեխնիկական QA-ի արդյունք չեն։</p>
    </section>
    <section id="contentDecisionSection" class="detail-section" data-item-tab="review">
      <h3>Բովանդակային որոշում</h3>
      <p>Կարգավիճակ՝ <strong>${esc(reviewStatusLabel)}</strong> · տարբերակ <strong>v${esc(item.versionNo)}</strong></p>
      <p class="subtle">${qaPassed
        ? (item.reviewStatus === "approved"
          ? "Այս տարբերակն արդեն հաստատված է։ Նոր բովանդակային փոփոխությունը կստեղծի նոր տարբերակ և նորից կպահանջի QA։"
          : "Եթե հարցը բովանդակային առումով ճիշտ է, կարող եք հաստատել այն։ Եթե փոփոխություն է պետք, խմբագրեք հարցը և պահպանեք նոր տարբերակ։")
        : "Հաստատումը հասանելի կլինի միայն ընթացիկ տարբերակի հաջող QA-ից հետո։"}</p>
      <div class="workflow-actions">
        ${editable ? `<button id="editQuestionBtn" class="secondary">Խմբագրել հարցը</button>` : ""}

      </div>
    </section>
    <section class="detail-section" data-item-tab="history">
      <h3>Կենսափուլ</h3>
      <p>${item.retiredAt ? `Արխիվացված է․ ${esc(item.retiredReason || "—")}` : `Կարգավիճակ՝ ${esc(lifecycleLabel(item.lifecycleStatus))}`}</p>
      <div class="workflow-actions">${item.retiredAt ? `<button id="restoreBtn" class="secondary">Վերականգնել ստուգման համար</button>` : `<button id="retireBtn" class="danger-btn">Արխիվացնել / փոխարինել</button>`}</div>
    </section>
    <section class="detail-section tiny subtle" data-item-tab="history">
      Ձևանմուշ՝ ${esc(detail.template?.code ?? "—")} · ${esc(detail.template?.kind ?? "—")}<br/>
      Տարբերակ՝ ${esc(detail.item.variantKey ?? "—")}${detail.item.variantSeed ? ` · seed ${esc(detail.item.variantSeed)}` : ""}<br/>
      Վերջին տարբերակի գրառում՝ ${item.latestSnapshot ? `v${esc(item.latestSnapshot.versionNo)} · ${esc(item.latestSnapshot.changeSummary || "")}` : "—"}<br/>
      Վերջին ստուգում՝ ${item.latestReview ? `${esc(reviewDecisionLabel(item.latestReview.decision))} · ${esc(reviewTypeLabel(item.latestReview.type))}` : "—"}
    </section>`;

  const stimulusRoot = $("learnerPreviewStimulus");
  try {
    disposePreviewStimulus=renderLearningStimulus(stimulusRoot, detail.item.stimulus,{invoke,context:{itemId:detail.item.id},isCurrent:()=>selectedDetail===detail&&Boolean(activeSession)});
  } catch (err) {
    stimulusRoot.textContent = err.message;
    stimulusRoot.classList.add("message", "bad");
    stimulusRoot.setAttribute("role", "alert");
  }

  $("runQaBtn")?.addEventListener("click", runQaCurrent);
  $("chooseAudioBtn")?.addEventListener("click",async()=>{
    const button=$("chooseAudioBtn"),host=$("audioCatalog");button.disabled=true;host.textContent='Ձայնագրությունները բեռնվում են…';
    try{
      const result=await invoke('get-learning-audio',{action:'catalog',itemId:detail.item.id});
      if(selectedDetail!==detail||!activeSession)return;
      if(!result.versions?.length){host.textContent='Այս բաժնի համար ստուգված ձայնագրություն դեռ չկա։';return;}
      const label=document.createElement('label');label.textContent='Ստուգված ձայնագրություն';
      const select=document.createElement('select');const empty=document.createElement('option');empty.value='';empty.textContent='Ընտրեք ձայնագրությունը';select.append(empty);
      for(const audio of result.versions){const option=document.createElement('option');option.value=audio.id;option.textContent=`${audio.title} · ${Math.round(audio.durationMs/1000)} վ`;select.append(option);}
      select.value=detail.item.stimulus?.audioVersionId||'';
      select.onchange=()=>{if(!select.value)return;const field=$("editStimulus");field.value=JSON.stringify({kind:'audio',schemaVersion:'haiedu-audio-v1',audioVersionId:select.value},null,2);field.dispatchEvent(new Event('input',{bubbles:true}));};
      label.append(select);host.replaceChildren(label);
    }catch{if(selectedDetail===detail)host.textContent='Չհաջողվեց բեռնել ձայնագրությունները։ Կրկին փորձեք։';}
    finally{if(selectedDetail===detail)button.disabled=false;}
  });
  $("chooseTaskSetBtn")?.addEventListener("click",async()=>{
    const button=$("chooseTaskSetBtn"),host=$("taskSetCatalog");button.disabled=true;host.textContent='Առաջադրանքաշարերը բեռնվում են…';
    try{
      const result=await invoke('get-learning-task-set',{action:'catalog',itemId:detail.item.id});
      if(selectedDetail!==detail||!activeSession)return;
      if(!result.versions?.length){host.textContent='Այս հարցի համար ստուգված առաջադրանքաշար դեռ չկա։';return;}
      const label=document.createElement('label');label.textContent='Ընդհանուր նյութով առաջադրանքաշար';
      const select=document.createElement('select'),empty=document.createElement('option');empty.value='';empty.textContent='Ընտրեք առաջադրանքաշարը';select.append(empty);
      for(const set of result.versions){const option=document.createElement('option');option.value=set.id;option.textContent=`${set.title} · ${set.total} հարց`;select.append(option);}
      select.value=detail.item.stimulus?.taskSetVersionId||'';
      select.onchange=()=>{if(!select.value)return;const field=$("editStimulus");field.value=JSON.stringify({kind:'task_set',schemaVersion:'haiedu-task-set-v1',taskSetVersionId:select.value},null,2);field.dispatchEvent(new Event('input',{bubbles:true}));};
      label.append(select);host.replaceChildren(label);
    }catch{if(selectedDetail===detail&&activeSession)host.textContent='Չհաջողվեց բեռնել առաջադրանքաշարերը։ Կրկին փորձեք։';}
    finally{if(selectedDetail===detail&&activeSession)button.disabled=false;}
  });
  $("approveBtn")?.addEventListener("click", approveCurrent);
  $("editQuestionBtn")?.addEventListener("click", () => {
    activateItemTab("content");
    $("editPromptHy")?.focus();
  });
  $("saveRevisionBtn")?.addEventListener("click", saveRevision);
  $("retireBtn")?.addEventListener("click", retireItem);
  $("restoreBtn")?.addEventListener("click", () => action("restore"));
  $("addOptionBtn")?.addEventListener("click", addOptionRow);
  $("addMisconceptionBtn")?.addEventListener("click", addMisconceptionRow);
  wireEditorRows();
  syncSingleChoiceAnswer(detail.answerKey?.answer);
  if (['matching','ordering'].includes(item.type)) bindArrangementEditor($('arrangementEditor'));
  if (item.type === 'typed_fields') bindTypedEditor($('typedFieldsEditor'));
  wireEditorDirtyTracking();
  editorDirty = false;
  updateEditorDirtyUi();
  wireItemTabs();
}

function currentQaPassed(item) {
  return item?.latestQa?.passed === true && !qaRerunRequired &&
    !(item.latestQa.versionNo != null && item.versionNo != null && Number(item.latestQa.versionNo) !== Number(item.versionNo));
}

function questionActionStatus(item, detail) {
  const editable = detail?.editing?.contentEditable === true;
  const archived = Boolean(item?.retiredAt);
  const passed = currentQaPassed(item);
  const stale = qaRerunRequired || (item?.latestQa?.versionNo != null && item?.versionNo != null && Number(item.latestQa.versionNo) !== Number(item.versionNo));
  const approved = item?.reviewStatus === "approved";
  const busy = ({save:"Նոր տարբերակը պահպանվում է…",qa:"Տեխնիկական QA-ն գործարկվում է…",approve:"Հարցը հաստատվում է…",retire:"Հարցն արխիվացվում է…",restore:"Հարցը վերականգնվում է…"})[workflowAction] || "Գործողությունը կատարվում է…";
  const locked = archived ? "Նախ վերականգնեք հարցը «Պատմություն» բաժնում։" : detail?.editing?.reason === "generated_variant_requires_template_edit" ? "Այս հարցը ստեղծվում է ձևանմուշից։ Փոփոխությունը կատարեք սկզբնական ձևանմուշում։" : "Այս հարցի բովանդակությունն այստեղ խմբագրման համար հասանելի չէ։";
  const pending = workflowBusy ? busy : workflowNeedsRefresh ? "Վերջին գործողությունից հետո տվյալները չեն թարմացվել։ Թարմացրեք էջի տվյալները՝ շարունակելու համար։" : !detail ? "Հարցի տվյալները դեռ չեն բեռնվել։" : "";
  const qaIssue = item?.latestQa?.errors?.[0] ? qaMessageHy(item.latestQa.errors[0]) : "Բացեք խնդիրների ցանկը՝ պատճառները տեսնելու համար։";
  const qaReason = editorDirty ? "Նախ պահպանեք փոփոխությունները։ QA-ն ստուգում է միայն պահպանված տարբերակը։" : stale ? "Նախորդ QA-ն այլևս արդիական չէ։ Կրկին գործարկեք QA-ն։" : !item?.latestQa ? "Ընթացիկ տարբերակի համար QA դեռ չի գործարկվել։" : passed ? "Ընթացիկ տարբերակն անցել է QA-ն։ Ստուգումը կարող եք կրկնել։" : `QA չի անցել․ ${qaIssue}${item.latestQa.errors?.length > 1 ? ` Կա ևս ${item.latestQa.errors.length - 1} խնդիր։` : ""}`;
  let next = editorDirty ? "save" : !passed ? "qa" : !approved ? "review" : "done";
  let title = editorDirty ? "Հաջորդ քայլը՝ պահպանել փոփոխությունները" : stale ? "Հաջորդ քայլը՝ կրկին գործարկել QA-ն" : !item?.latestQa ? "Հաջորդ քայլը՝ գործարկել QA-ն" : !passed ? "Հաջորդ քայլը՝ ուսումնասիրել QA-ի խնդիրները" : !approved ? "Հաջորդ քայլը՝ ստուգել և հաստատել հարցը" : "Ընթացիկ տարբերակը բովանդակային հաստատում ունի";
  let hint = editorDirty ? "Պահպանելուց հետո նոր տարբերակի համար կրկին անհրաժեշտ կլինեն QA և բովանդակային հաստատում։" : !passed ? qaReason : approved ? "Նոր խմբագրումը կպահանջի նոր տարբերակ, QA և հաստատում։" : item?.reviewStatus === "changes_requested" ? "«QA և ստուգում» բաժնում ուսումնասիրեք պահանջված փոփոխությունները, ապա որոշեք՝ հարցը պատրաստ է հաստատման, թե խմբագրման կարիք ունի։" : "Ուսումնասիրեք հարցը, պատասխանը և հուշումները։ QA-ի հաջող արդյունքը չի փոխարինում բովանդակային ստուգմանը։";
  let destination = archived ? "history" : editorDirty ? "content" : !passed ? (item?.latestQa && !stale ? "review" : "") : !approved ? "review" : "";
  if (archived) { next="restore"; title="Հարցն արխիվացված է"; hint=locked; }
  if (pending) { next="pending"; title=workflowBusy ? busy : "Հաջորդ քայլը՝ թարմացնել տվյալները"; hint=pending; destination=workflowNeedsRefresh && !workflowBusy ? "refresh" : ""; }
  return {next,title,hint,destination,
    save:{disabled:!!pending || !editable || !editorDirty || archived,reason:pending || (!editable || archived ? locked : editorDirty ? "Կան չպահպանված փոփոխություններ։ Պահպանեք դրանք որպես նոր տարբերակ։" : "Չպահպանված փոփոխություններ չկան։")},
    qa:{disabled:!!pending || editorDirty || archived,reason:pending || (archived ? locked : qaReason)},
    review:{disabled:!!pending || editorDirty || !passed || approved || archived,reason:pending || (archived ? locked : editorDirty ? "Նախ պահպանեք փոփոխությունները և գործարկեք նոր տարբերակի QA-ն։" : !passed ? stale ? "Հաստատումն անհասանելի է․ նախորդ QA-ն այլևս արդիական չէ։" : "Հաստատումն անհասանելի է, քանի դեռ ընթացիկ տարբերակը չի անցել QA-ն։" : approved ? "Այս տարբերակն արդեն հաստատված է։ Կրկնակի հաստատում պետք չէ։" : "QA-ն անցած է։ Բովանդակությունը ստուգելուց հետո կարող եք հաստատել հարցը։")}};
}

function updateEditorDirtyUi() {
  $("unsavedChangesNotice")?.classList.toggle("hidden", !editorDirty);
  const item = dashboard?.items?.find((entry) => entry.id === selectedId);
  const state = questionActionStatus(item, selectedDetail);
  const text = (id, value) => { const node=$(id); if(node && node.textContent !== value) node.textContent=value; };
  if ($("actionStatusPanel")) $("actionStatusPanel").dataset.state=state.next;
  text("actionStatusTitle",state.title);
  text("actionStatusHint",state.hint);
  for (const [key,button,reason,step] of [["save","saveRevisionBtn","saveStatusReason","saveStatusStep"],["qa","runQaBtn","qaStatusReason","qaStatusStep"],["review","approveBtn","reviewStatusReason","reviewStatusStep"]]) {
    if ($(button)) $(button).disabled=state[key].disabled;
    text(reason,state[key].reason);
    $(step)?.classList.toggle("is-next",state.next===key);
  }
  text("runQaBtn",item?.latestQa ? "Կրկին գործարկել QA" : "Գործարկել QA");
  text("approveBtn",item?.reviewStatus === "approved" ? "Հաստատված" : "Հաստատել");
  text("actionStatusGovernance",item?.validationState === "provisional_no_sme_review" ? "Մասնագիտական (SME) ստուգումը դեռ սպասում է առանձին գործընթացի։ Այն տեխնիկական QA-ի սխալ չէ։ Բովանդակային հաստատումը ինքնին չի ակտիվացնում ուսումնական թողարկումը։" : "Բովանդակային հաստատումը ինքնին չի ակտիվացնում ուսումնական թողարկումը։");
  const details=$("actionStatusDetails");
  if(details){
    details.classList.toggle("hidden",!state.destination);
    text("actionStatusDetails",({content:"Բացել խմբագրումը",review:"Բացել QA-ն և ստուգումը",history:"Բացել պատմությունը",refresh:"Թարմացնել տվյալները"})[state.destination] || "");
    details.onclick=()=>{ if(workflowBusy)return; if(state.destination==="refresh"){$("refreshBtn")?.click();return;} activateItemTab(state.destination); const target=state.destination==="content" ? $("editPromptHy") : state.destination==="history" ? $("restoreBtn") : $("technicalQaSection"); target?.scrollIntoView?.({block:"nearest"}); target?.focus?.(); };
  }
  // Freeze fields during a write; editing them then could otherwise be lost on refresh.
  document.querySelectorAll('.editor-section input, .editor-section textarea, .editor-section select, .editor-section button, #changeSummary').forEach(control=>{
    if(workflowBusy && control.dataset.workflowDisabled === undefined){control.dataset.workflowDisabled=String(control.disabled);control.disabled=true;}
    else if(!workflowBusy && control.dataset.workflowDisabled !== undefined){control.disabled=control.dataset.workflowDisabled==="true";delete control.dataset.workflowDisabled;}
  });
  for(const id of ["retireBtn","restoreBtn"]){if($(id)){$(id).disabled=workflowBusy || workflowNeedsRefresh;$(id).setAttribute("aria-describedby","actionStatusHint");}}
  if($("refreshBtn"))$("refreshBtn").disabled=workflowBusy;
}

function markEditorDirty() {
  if (!selectedDetail?.editing?.contentEditable || workflowBusy) return;
  editorDirty = true;
  updateEditorDirtyUi();
}

function wireEditorDirtyTracking() {
  document.querySelectorAll(".editor-section input, .editor-section textarea, .editor-section select").forEach((control) => {
    control.addEventListener("input", markEditorDirty);
    control.addEventListener("change", markEditorDirty);
  });
}

function removeOptionRow(event) {
  event.currentTarget.closest("[data-option-row]")?.remove();
  syncSingleChoiceAnswer();
  markEditorDirty();
}

function updateOptionKey() {
  syncSingleChoiceAnswer();
}

function removeMisconceptionRow(event) {
  event.currentTarget.closest("[data-misconception-row]")?.remove();
  if (!document.querySelector("[data-misconception-row]")) $("misconceptionEditor").innerHTML = `<p class="subtle tiny">Կապակցումներ չկան։</p>`;
  markEditorDirty();
}

function wireEditorRows() {
  // Adding rows rewires existing controls; stable handlers are deduplicated by the browser.
  document.querySelectorAll(".remove-option-btn").forEach((button) => button.addEventListener("click", removeOptionRow));
  document.querySelectorAll(".option-key").forEach((input) => input.addEventListener("input", updateOptionKey));
  document.querySelectorAll(".remove-misconception-btn").forEach((button) => button.addEventListener("click", removeMisconceptionRow));
}

function nextOptionKey() {
  const used = new Set([...document.querySelectorAll(".option-key")].map((x) => x.value.trim()));
  for (let code = 65; code <= 90; code += 1) {
    const key = String.fromCharCode(code);
    if (!used.has(key)) return key;
  }
  return `O${used.size + 1}`;
}

function addOptionRow() {
  const host = $("optionEditor");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = optionRowsHtml([{ key: nextOptionKey(), contentHy: "", contentEn: "" }], false);
  host.appendChild(wrapper.firstElementChild);
  wireEditorRows();
  syncSingleChoiceAnswer();
  markEditorDirty();
}

function syncSingleChoiceAnswer(initialValue) {
  const select = $("answerSingleChoice");
  if (!select) return;
  const previous = initialValue ?? select.value;
  const keys = [...document.querySelectorAll(".option-key")].map((x) => x.value.trim()).filter(Boolean);
  select.innerHTML = keys.map((key) => `<option value="${esc(key)}">${esc(key)}</option>`).join("");
  if (keys.includes(String(previous))) select.value = String(previous);
}

function addMisconceptionRow() {
  const detail = selectedDetail;
  if (!detail?.availableMisconceptions?.length) return;
  const host = $("misconceptionEditor");
  if (host.querySelector("p")) host.innerHTML = "";
  const first = detail.availableMisconceptions[0];
  const wrapper = document.createElement("div");
  wrapper.innerHTML = misconceptionRowsHtml({ ...detail, misconceptions: [{ code: first.code, responseKey: "*", mappingNote: "" }] }, false);
  host.appendChild(wrapper.firstElementChild);
  wireEditorRows();
  markEditorDirty();
}

function collectOptions() {
  return [...document.querySelectorAll("[data-option-row]")].map((row) => ({
    key: row.querySelector(".option-key").value.trim(),
    contentHy: row.querySelector(".option-hy").value.trim(),
    contentEn: row.querySelector(".option-en").value.trim() || null,
  }));
}

function collectMisconceptions() {
  return [...document.querySelectorAll("[data-misconception-row]")].map((row) => ({
    code: row.querySelector(".misconception-code").value,
    responseKey: row.querySelector(".misconception-response").value.trim() || "*",
    mappingNote: row.querySelector(".misconception-note").value.trim() || null,
  }));
}

function collectAnswerKey(type) {
  if (['matching','ordering'].includes(type)) return {answer:collectArrangementEditor($('arrangementEditor')).key,feedbackCode:selectedDetail?.answerKey?.feedbackCode??null};
  if (type === 'typed_fields') return {answer:collectTypedEditor($('typedFieldsEditor')).key,feedbackCode:selectedDetail?.answerKey?.feedbackCode??null};
  const feedbackCode = $("answerFeedbackCode")?.value.trim() || null;
  if (type === "single_choice") return { answer: $("answerSingleChoice").value, feedbackCode };
  if (type === "true_false") return { answer: $("answerTrueFalse").value === "true", feedbackCode };
  const answer = Number($("answerNumeric").value);
  const tolerance = Number($("answerTolerance").value);
  if (!Number.isFinite(answer)) throw new Error("Մուտքագրեք ճիշտ թվային արժեքը։");
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error("Թույլատրելի շեղումը պետք է լինի 0 կամ ավելի մեծ։");
  if (type === "quantity") {
    const canonicalUnit = $("answerCanonicalUnit").value.trim();
    const acceptedUnits = $("answerAcceptedUnits").value.split(",").map((x) => x.trim()).filter(Boolean);
    if (!canonicalUnit) throw new Error("Նշեք հիմնական չափման միավորը։");
    if (!acceptedUnits.includes(canonicalUnit)) throw new Error("Ընդունվող միավորների ցանկը պետք է ներառի հիմնական միավորը։");
    return { answer, tolerance, canonicalUnit, acceptedUnits, feedbackCode };
  }
  return { answer, tolerance, feedbackCode };
}

function buildRevisionPayload(item, defaultSummary = "Content editor revision") {
  let stimulus;
  try { stimulus = JSON.parse($("editStimulus").value || "{}"); }
  catch { const error = new Error("Խթանիչ տվյալների JSON-ը վավեր չէ։ Ուղղեք այն «Ընդլայնված» բաժնում։"); error.fieldId="editStimulus"; throw error; }
  const misconceptions = collectMisconceptions();
  const removedAllMisconceptions = (selectedDetail?.misconceptions?.length ?? 0) > 0 && misconceptions.length === 0;
  if (
    removedAllMisconceptions
    && !window.confirm("Այս փոփոխությունը կհեռացնի հարցի բոլոր սխալ պատկերացումների կապակցումները։ Շարունակե՞լ։")
  ) {
    throw new Error("Սխալ պատկերացումների կապակցումները պահպանվեցին։");
  }

  const payload = {
    ...(['matching','ordering'].includes(item.type) ? {responseDefinition:collectArrangementEditor($('arrangementEditor')).definition} : {}),
    ...(item.type === 'typed_fields' ? {responseDefinition:collectTypedEditor($('typedFieldsEditor')).definition} : {}),
    promptHy: $("editPromptHy").value.trim(),
    promptEn: $("editPromptEn").value.trim() || null,
    stimulus,
    difficulty: Number($("metaDifficulty").value),
    itemFamily: $("metaFamily").value.trim(),
    sourceReference: $("metaSource").value.trim() || null,
    options: item.type === "single_choice" ? collectOptions() : [],
    answerKey: collectAnswerKey(item.type),
    misconceptions,
    confirmEmptyMisconceptions: removedAllMisconceptions,
    changeSummary: $("changeSummary")?.value.trim() || defaultSummary,
  };
  if (!payload.promptHy) throw new Error("Հարցի տեքստը պարտադիր է։");
  if (!payload.itemFamily) { const error=new Error("Հարցերի ընտանիքը պարտադիր է։ Լրացրեք այն մետատվյալների «Ընդլայնված» բաժնում։"); error.fieldId="metaFamily"; throw error; }
  return payload;
}

async function persistCurrentRevision(defaultSummary = "Բովանդակության խմբագրում") {
  const check = sessionCheck;
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item || !selectedDetail?.editing?.contentEditable) return false;
  const payload = buildRevisionPayload(item, defaultSummary);
  await invoke("manage-content-quality", { action: "save_content_revision", itemId: selectedId, payload });
  if (check !== sessionCheck || !activeSession) return false;
  editorDirty = false;
  updateEditorDirtyUi();
  return true;
}

function revealEditorField(id) {
  const control = $(id);
  if (!control) return;
  activateItemTab(control.closest?.("[data-item-tab]")?.dataset.itemTab || "content");
  let details = control.closest?.("details");
  while (details) { details.open = true; details = details.parentElement?.closest("details"); }
  control.focus();
  control.scrollIntoView?.({block:"nearest"});
}

async function saveRevision() {
  let invalidField = null;
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item || !selectedDetail?.editing?.contentEditable || workflowBusy || workflowNeedsRefresh || !editorDirty) return;
  const check = sessionCheck;
  try {
    setWorkflowBusy(true,"save");
    setMessage("Նոր տարբերակը պահպանվում է…");
    if (!(await persistCurrentRevision())) return;
    workflowNeedsRefresh = true;
    clearContentDashboardCache(activeSession?.user?.id);
    if (!(await refresh(selectedId, { force: true }))) return;
    if (check !== sessionCheck || !activeSession) return;
    setMessage(`${item.code}: պահպանվեց որպես նոր տարբերակ։ Այժմ գործարկեք QA-ն, ապա հաստատեք հարցը։`);
  } catch (err) {
    if (check !== sessionCheck || !activeSession) return;
    invalidField = err.fieldId ?? null;
    setMessage(err.message, true);
  } finally {
    if (check === sessionCheck) { setWorkflowBusy(false); if (invalidField) revealEditorField(invalidField); }
  }
}

async function ensureQaPassed({ force = false } = {}) {
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item) throw new Error("Հարց ընտրված չէ։");
  if (!force && item.latestQa?.passed === true) return true;
  const result = await invoke("manage-content-quality", { action: "run_qa", itemId: selectedId });
  return result.qa?.passed === true;
}

async function runQaCurrent() {
  if (workflowBusy || workflowNeedsRefresh) return;
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item) return;
  const check = sessionCheck;
  if (editorDirty) {
    activateItemTab("content");
    setMessage("Նախ պահպանեք փոփոխությունները որպես նոր տարբերակ, ապա գործարկեք QA-ն։", true);
    return;
  }
  try {
    setWorkflowBusy(true,"qa");
    setMessage("Տեխնիկական QA-ն գործարկվում է…");
    const passed = await ensureQaPassed({ force: true });
    if (check !== sessionCheck || !activeSession) return;
    qaRerunRequired = false;
    workflowNeedsRefresh = true;
    clearContentDashboardCache(activeSession?.user?.id);
    if (!(await refresh(selectedId, { force: true }))) return;
    if (check !== sessionCheck || !activeSession) return;
    setMessage(
      passed
        ? `${item.code}: QA-ն հաջողությամբ անցավ։`
        : `${item.code}: QA-ն խնդիրներ գտավ։ Ուղղեք բովանդակությունը, պահպանեք նոր տարբերակ և կրկին գործարկեք QA-ն։`,
      !passed,
    );
  } catch (err) {
    if (check !== sessionCheck || !activeSession) return;
    setMessage(err.message, true);
  } finally {
    if (check === sessionCheck) setWorkflowBusy(false);
  }
}

async function approveCurrent() {
  if (workflowBusy || workflowNeedsRefresh) return;
  const item = dashboard.items.find((i) => i.id === selectedId);
  if (!item) return;
  const check = sessionCheck;
  if (editorDirty) {
    activateItemTab("content");
    setMessage("Նախ պահպանեք փոփոխությունները որպես նոր տարբերակ։ Հաստատումը հնարավոր է միայն պահպանված և QA անցած տարբերակի համար։", true);
    return;
  }
  if (item.latestQa?.passed !== true || !currentQaPassed(item)) {
    activateItemTab("review");
    setMessage("Հաստատելուց առաջ ընթացիկ տարբերակը պետք է հաջողությամբ անցնի տեխնիկական QA-ն։", true);
    return;
  }
  if (item.reviewStatus === "approved") {
    setMessage("Այս տարբերակն արդեն հաստատված է։");
    return;
  }
  try {
    setWorkflowBusy(true,"approve");
    setMessage("Հարցը հաստատվում է…");
    await invoke("manage-content-quality", { action: "approve", itemId: selectedId, reviewType: "content" });
    if (check !== sessionCheck || !activeSession) return;
    workflowNeedsRefresh = true;
    clearContentDashboardCache(activeSession?.user?.id);
    if (!(await refresh(selectedId, { force: true }))) return;
    if (check !== sessionCheck || !activeSession) return;
    setMessage(`${item.code}: հարցը հաստատված է։`);
  } catch (err) {
    if (check !== sessionCheck || !activeSession) return;
    if (err.requiresQaRerun) { qaRerunRequired=true; activateItemTab("review"); }
    setMessage(err.message, true);
  } finally {
    if (check === sessionCheck) setWorkflowBusy(false);
  }
}

async function retireItem() {
  const reason = prompt("Նշեք արխիվացման պատճառը");
  if (!reason?.trim()) return;
  const replacementCode = (prompt("Փոխարինող հարցի կոդը (ըստ ցանկության)", "") ?? "").trim();
  let replacementItemId = null;
  if (replacementCode) {
    const replacement = dashboard.items.find((i) => i.code === replacementCode);
    if (!replacement) return setMessage("Փոխարինող հարցի կոդը չի գտնվել։", true);
    replacementItemId = replacement.id;
  }
  await action("retire", { reason, replacementItemId });
}

async function action(name, extra = {}) {
  if (workflowBusy || workflowNeedsRefresh) return;
  const check = sessionCheck;
  try {
    setWorkflowBusy(true,name);
    setMessage("Գործողությունը կատարվում է…");
    await invoke("manage-content-quality", { action: name, itemId: selectedId, ...extra });
    if (check !== sessionCheck || !activeSession) return;
    workflowNeedsRefresh = true;
    clearContentDashboardCache(activeSession?.user?.id);
    if (!(await refresh(selectedId, { force: true }))) return;
    if (check !== sessionCheck || !activeSession) return;
    setMessage("Պատրաստ է։");
  } catch (err) {
    if (check !== sessionCheck || !activeSession) return;
    setMessage(err.message, true);
  } finally {
    if (check === sessionCheck) setWorkflowBusy(false);
  }
}

async function refresh(reselect = selectedId, { force = false } = {}) {
  const check = sessionCheck;
  try {
    const nextDashboard = await loadContentDashboard(activeSession, { force });
    if (check !== sessionCheck || !activeSession) return false;
    if (editorDirty) {
      setMessage("Թարմացումը չի կիրառվել․ կան չպահպանված փոփոխություններ։ Պահպանեք կամ չեղարկեք դրանք, ապա նորից թարմացրեք։");
      return true;
    }
    dashboard = nextDashboard;
    workflowNeedsRefresh = false;
    window.dispatchEvent(new CustomEvent("haiedu:content-dashboard", { detail: { dashboard, userId: activeSession.user.id } }));
    if (contentMode === "item") {
      const requested = new URLSearchParams(location.search).get("id") || reselect;
      if (!requested || !dashboard.items.some((item) => item.id === requested)) {
        selectedDetail = null; updateReviewNavigation();
        if ($("detailPanel")) $("detailPanel").innerHTML = '<h2>Հարցը չի գտնվել</h2><p class="subtle">Վերադարձեք ստուգման հերթ կամ հարցերի բանկ։</p>';
        return true;
      }
      selectedId = requested;
      await selectItem(requested);
      return true;
    }
    renderStats(dashboard.stats);
    populateSkillFilter(dashboard.items);
    if (contentMode === "bank") {
      selectedId = null;
      if (document.body.dataset.reviewNavigation && !navigationRestored) {
        reviewNavigation.restoreFields(reviewNavigation.readNavigation(activeSession.user.id,'bank'),['searchInput','skillFilter','reviewFilter','qaFilter']);
        navigationRestored = true;
      }
      renderRows();
      if (document.body.dataset.reviewNavigation) window.dispatchEvent(new Event('haiedu:content-scope-now'));
      return true;
    }
    const nextId = dashboard.items.some((i) => i.id === reselect) ? reselect : dashboard.items[0]?.id ?? null;
    selectedId = nextId;
    renderRows();
    if (selectedId) await selectItem(selectedId);
    else if ($("detailPanel")) $("detailPanel").innerHTML = '<h2>Ընտրեք հարց</h2><p class="subtle">Հարցերի բանկը դատարկ է։</p>';
    return true;
  } catch (err) {
    if (check !== sessionCheck || !activeSession) return false;
    setMessage(err.message, true);
    return false;
  }
}
let sessionCheck = 0;
async function showForSession(session, { force = false } = {}) {
  const check = ++sessionCheck;
  setWorkflowBusy(false);
  $("console").classList.add("hidden");
  const userChanged = activeSession && activeSession.user.id !== session?.user?.id;
  if (!session || userChanged) {
    if (document.body.dataset.reviewNavigation) reviewNavigation.clearNavigation(activeSession?.user?.id);
    navigationRestored = false;
    disposePreviewStimulus?.();disposePreviewStimulus=null;
    bootstrapPromise = null;
    clearContentDashboardCache(activeSession?.user?.id);
    detailLoadToken += 1;
    activeSession = null;
    dashboard = null;
    selectedId = null;
    selectedDetail = null;
    editorDirty = false;
    qaRerunRequired = false;
    workflowNeedsRefresh = false;
    delete document.body.dataset.contentItemId;
    if ($("detailPanel")) $("detailPanel").innerHTML = "";
    if ($("itemRows")) $("itemRows").innerHTML = "";
    if ($("consoleMessage")) $("consoleMessage").textContent = "";
  }
  if (!session) {
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
    return;
  }
  activeSession = session;
  $("authPanel").classList.add("hidden");
  $("signOutBtn").classList.remove("hidden");
  const allowed = await refresh(selectedId, { force });
  if (check !== sessionCheck) return;
  if (!allowed) {
    $("authMessage").textContent = "Չհաջողվեց հաստատել այս բաժնի հասանելիությունը։ Թարմացրեք էջը կամ մուտք գործեք համապատասխան հաշվով։";
    $("authPanel").classList.remove("hidden");
    return;
  }
  $("authMessage").textContent = "";
  $("console").classList.remove("hidden");
  if (document.body.dataset.reviewNavigation && contentMode === 'bank') reviewNavigation.restorePosition(reviewNavigation.readNavigation(activeSession.user.id,'bank'), () => check === sessionCheck && !!activeSession);
}

function bootstrapSession(session, options) {
  const pending = showForSession(session, options);
  bootstrapPromise = pending;
  return pending.finally(() => { if (bootstrapPromise === pending) bootstrapPromise = null; });
}

$("signOutBtn")?.addEventListener("click", () => signOutAccount(supabase, { canLeave: () => !workflowBusy && (!editorDirty || confirm("Չպահպանված փոփոխությունները կկորչեն։ Դուրս գա՞լ։")) }));
$("refreshBtn")?.addEventListener("click", () => {
  if (workflowBusy) return;
  if (editorDirty && !confirm("Չեղարկե՞լ չպահպանված փոփոխությունները և թարմացնել հարցերի բանկը։")) return;
  editorDirty = false;
  clearContentDashboardCache(activeSession?.user?.id);
  void refresh(selectedId, { force: true });
});
["searchInput","skillFilter","reviewFilter","qaFilter"].forEach((id) => $(id)?.addEventListener(id === "searchInput" ? "input" : "change", renderRows));

window.addEventListener("beforeunload", (event) => {
  if (!editorDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") return void showForSession(null);
  if (!session) return;
  if (activeSession && activeSession.user.id !== session.user.id) return void bootstrapSession(session);
  if (["USER_UPDATED", "MFA_CHALLENGE_VERIFIED"].includes(event)) {
    clearContentDashboardCache(session.user.id);
    return void bootstrapSession(session, { force: true });
  }
  if ($("console").classList.contains("hidden") && !bootstrapPromise) {
    void bootstrapSession(session);
  }
});
const initialSessionCheck = sessionCheck;
const { data: { session } } = await supabase.auth.getSession();
if (initialSessionCheck === sessionCheck && session) {
  await bootstrapSession(session);
} else if (initialSessionCheck === sessionCheck) {
  await showForSession(null);
}
