import { createClient } from "./supabase-browser.bundle.mjs";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { focusHint, hintConflictMessage, hintRefreshLabel, invokeForHint } from "./remediation-request.mjs";

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = "./remediation.css?v=5.2";
document.head.appendChild(styleLink);

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

const practicePanel = $("practicePanel");
const sessionMode = $("sessionMode");
const answerForm = $("answerForm");
const answerArea = $("answerArea");
const helpControls = $("helpControls");
const helpBtn = $("helpBtn");
const helpPanel = $("helpPanel");
const helpTitle = $("helpTitle");
const helpStrategy = $("helpStrategy");
const helpContent = $("helpContent");
const helpNote = $("helpNote");

let question = null;
let lastHelpContext = null;
let helpRequestId = 0;
let loading = false;
let refreshNeeded = false;

export function setRemediationQuestion(item, phase = "unanswered") {
  question = item?.remediation?.available ? {
    sessionId: item.session.id,
    sessionItemId: item.sessionItemId,
    level: question?.sessionItemId === item.sessionItemId ? question.level : Number(item.remediation.hintLevelUsed ?? 0),
    phase,
  } : null;
  syncHelpVisibility();
}

function setText(el, value) {
  if (el.textContent !== value) el.textContent = value;
}

function resetHelp() {
  helpRequestId += 1;
  refreshNeeded = false;
  helpPanel.classList.add("hidden");
  setText(helpTitle, "Օգնություն");
  setText(helpStrategy, "");
  setText(helpContent, "");
  setText(helpNote, "");
}

function hasDraftAnswer() {
  const controls = [...answerArea.querySelectorAll("input, select, textarea")];
  return controls.some((control) => {
    if (control instanceof HTMLInputElement && (control.type === "radio" || control.type === "checkbox")) {
      return control.checked;
    }
    return String(control.value ?? "").trim().length > 0;
  });
}

function syncHelpVisibility() {
  const practiceVisible = !practicePanel.classList.contains("hidden");
  const isHelpEnabledMode = ["Վարժանք", "Գլխի կրկնություն"].includes(sessionMode.textContent.trim());
  const helpContext = practiceVisible && isHelpEnabledMode ? question : null;
  if (helpContext !== lastHelpContext) {
    lastHelpContext = helpContext;
    resetHelp();
    updateHelpLabel();
  }
  const preSubmit = helpContext?.phase === "unanswered";
  const draftAnswerPresent = preSubmit && hasDraftAnswer();
  const incorrectAnswered = helpContext?.phase === "incorrect";
  helpControls.classList.toggle("hidden", !(refreshNeeded || (preSubmit && !draftAnswerPresent) || incorrectAnswered));
  helpBtn.disabled = loading || answerForm.dataset.answerSubmitting === "true" || (!refreshNeeded && helpContext?.level >= 3);
}

function showHelp(data) {
  setText(helpTitle, data.titleHy ?? "Օգնություն");
  setText(helpStrategy, data.strategyHy ?? "");
  setText(helpContent, data.contentHy ?? "");
  setText(helpNote, data.noteHy ?? "");
  helpPanel.classList.remove("hidden");
  focusHint(helpPanel);
}

function updateHelpLabel() {
  const level = question?.level;
  setText(helpBtn, refreshNeeded ? hintRefreshLabel
    : level === 1 ? "Հաջորդ հուշումը"
    : level === 2 ? "Տեսնել նման օրինակ"
    : level === 3 ? "Օրինակը տեսել եք"
    : question?.phase === "incorrect" ? "Բացատրել սխալը" : "Հուշում");
}

async function requestHelp() {
  syncHelpVisibility();
  if (loading || helpBtn.disabled || helpControls.classList.contains("hidden")) return;
  const requestId = helpRequestId;
  const item = question;
  const {sessionId, sessionItemId, level, phase} = item;
  const refreshing = refreshNeeded;
  loading = true;
  helpBtn.disabled = true;
  setText(helpBtn, "Բեռնվում է…");

  const isCurrent = () => {
    syncHelpVisibility();
    return requestId === helpRequestId && answerForm.dataset.answerSubmitting !== "true"
      && !helpControls.classList.contains("hidden");
  };
  try {
    const {data, error, stale} = await invokeForHint(supabase,
      refreshing ? "get-session-item" : "get-remediation-help",
      refreshing ? {sessionId} : {sessionId, sessionItemId, hintState:{level, afterAnswer:phase === "incorrect"}},
      isCurrent);
    if (stale || !isCurrent()) return;
    if (error) throw error;
    if (!data) throw new Error("Օգնությունը հիմա հասանելի չէ։");

    if (refreshing) {
      refreshNeeded = false;
      if (data.complete || data.sessionItemId !== sessionItemId) {
        answerForm.dispatchEvent(new CustomEvent("haiedu-hint-refresh", {detail:data}));
        return;
      }
      item.level = Number(data.remediation?.hintLevelUsed ?? 0);
      showHelp({titleHy:"Հարցը թարմացվել է", contentHy:"Կարող եք շարունակել հարցը։"});
    } else {
      item.level = Number(data.level);
      showHelp(data);
    }
    updateHelpLabel();
  } catch (error) {
    if (!isCurrent()) return;
    refreshNeeded ||= error?.code === "hint_state_conflict";
    showHelp({
      titleHy:refreshNeeded ? "Թարմացրեք հարցը" : "Օգնությունը չբեռնվեց",
      contentHy:error?.code === "hint_state_conflict" ? hintConflictMessage : "Չհաջողվեց բեռնել։ Կրկին փորձեք։",
    });
    setText(helpBtn, refreshNeeded ? hintRefreshLabel : "Կրկին փորձել");
  } finally {
    loading = false;
    syncHelpVisibility();
  }
}

helpBtn.addEventListener("click", requestHelp);
answerArea.addEventListener("input", syncHelpVisibility);
answerArea.addEventListener("change", syncHelpVisibility);
let accountId = null;
supabase.auth.onAuthStateChange((event, session) => {
  const actor = session?.user?.id ?? null;
  if (event === "SIGNED_OUT" || (accountId && accountId !== actor)) setRemediationQuestion(null);
  accountId = actor;
});

// Observe only app state. Observing help's own writes creates a feedback loop.
const observer = new MutationObserver(syncHelpVisibility);
observer.observe(practicePanel, { attributes: true, attributeFilter: ["class"] });
observer.observe(sessionMode, { childList: true, characterData: true, subtree: true });
observer.observe(answerForm, { attributes: true, attributeFilter: ["data-answer-submitting"] });
syncHelpVisibility();
