import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = "./remediation.css?v=5.1";
document.head.appendChild(styleLink);

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

const practicePanel = $("practicePanel");
const sessionMode = $("sessionMode");
const itemCode = $("itemCode");
const submitBtn = $("submitBtn");
const answerArea = $("answerArea");
const feedback = $("feedback");
const helpControls = $("helpControls");
const helpBtn = $("helpBtn");
const helpPanel = $("helpPanel");
const helpTitle = $("helpTitle");
const helpStrategy = $("helpStrategy");
const helpContent = $("helpContent");
const helpNote = $("helpNote");

let lastHelpContext = null;
let helpRequestId = 0;
let loading = false;
let helpOpenedForCurrentItem = false;

function setText(el, value) {
  if (el.textContent !== value) el.textContent = value;
}

function resetHelp() {
  helpRequestId += 1;
  helpOpenedForCurrentItem = false;
  helpPanel.classList.add("hidden");
  setText(helpTitle, "Օգնություն");
  setText(helpStrategy, "");
  setText(helpContent, "");
  setText(helpNote, "");
  setText(helpBtn, "Հուշում");
  helpBtn.disabled = loading;
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
  const answerSubmitted = !feedback.classList.contains("hidden");
  const preSubmit = !answerSubmitted;
  const draftAnswerPresent = preSubmit && hasDraftAnswer();
  const incorrectAnswered = answerSubmitted && feedback.classList.contains("bad");
  const currentCode = itemCode.dataset.itemCode?.trim() || itemCode.textContent.trim();
  const hasQuestion = Boolean(currentCode && currentCode !== "—");

  helpControls.classList.toggle(
    "hidden",
    !(practiceVisible && isHelpEnabledMode && hasQuestion && ((preSubmit && !draftAnswerPresent) || incorrectAnswered)),
  );

  const helpContext = JSON.stringify([practiceVisible, sessionMode.textContent.trim(), currentCode]);
  if (helpContext !== lastHelpContext) {
    lastHelpContext = helpContext;
    resetHelp();
  }

  if (!helpOpenedForCurrentItem && incorrectAnswered) {
    setText(helpBtn, "Բացատրել սխալը");
  } else if (!helpOpenedForCurrentItem && preSubmit) {
    setText(helpBtn, "Հուշում");
  }
}

async function requestHelp() {
  syncHelpVisibility();
  if (loading || helpBtn.disabled || helpControls.classList.contains("hidden")) return;
  const requestId = helpRequestId;
  loading = true;
  helpBtn.disabled = true;
  setText(helpBtn, "Բեռնվում է…");

  let rendered = false;
  const isCurrent = () => {
    // Recheck the DOM as well as the request owner: an item can change before
    // its MutationObserver notification has been delivered.
    syncHelpVisibility();
    return requestId === helpRequestId && !helpControls.classList.contains("hidden");
  };
  try {
    const { data, error } = await supabase.functions.invoke("get-remediation-help", { body: {} });
    if (!isCurrent()) return;
    if (error) throw error;
    if (!data) throw new Error("Օգնությունը հիմա հասանելի չէ։");

    helpOpenedForCurrentItem = true;
    helpPanel.classList.remove("hidden");
    setText(helpTitle, data.titleHy ?? "Օգնություն");
    setText(helpStrategy, data.strategyHy ?? "");
    setText(helpContent, data.contentHy ?? "");
    setText(helpNote, data.noteHy ?? "");
    helpBtn.disabled = false;
    if (Number(data.level) === 1) {
      setText(helpBtn, "Հաջորդ հուշումը");
    } else if (Number(data.level) === 2) {
      setText(helpBtn, "Տեսնել նման օրինակ");
    } else {
      setText(helpBtn, "Օրինակը տեսել եք");
    }
    if (!data.moreHelpAvailable) helpBtn.disabled = true;
    rendered = true;
  } catch (error) {
    if (!isCurrent()) return;
    helpPanel.classList.remove("hidden");
    setText(helpTitle, "Օգնությունը չբեռնվեց");
    setText(helpStrategy, "");
    setText(helpContent, error?.message ?? "Օգնությունը հիմա հասանելի չէ։");
    setText(helpNote, "");
    helpBtn.disabled = false;
    setText(helpBtn, "Կրկին փորձել");
    rendered = true;
  } finally {
    // Keep a single help request in flight, including across item changes.
    // A stale completion releases the control but never paints its old result.
    loading = false;
    if (!rendered) {
      helpBtn.disabled = false;
      syncHelpVisibility();
    }
  }
}

helpBtn.addEventListener("click", requestHelp);

// Pre-submit help is available only before the learner enters an answer.
// This prevents an accidental hint click from converting an already-entered
// independent response into assisted evidence. Clearing the draft answer
// makes help available again. Post-error remediation remains available.
answerArea.addEventListener("input", syncHelpVisibility);
answerArea.addEventListener("change", syncHelpVisibility);

// Observe only application state elements. Do not observe the help UI itself,
// because syncHelpVisibility mutates it. Observing our own mutations created a
// MutationObserver feedback loop that starved timers and made the page appear frozen.
const observer = new MutationObserver(syncHelpVisibility);
observer.observe(practicePanel, { attributes: true, attributeFilter: ["class"] });
observer.observe(sessionMode, { childList: true, characterData: true, subtree: true });
observer.observe(itemCode, { attributes: true, attributeFilter: ["data-item-code"], childList: true, characterData: true, subtree: true });
observer.observe(submitBtn, { attributes: true, attributeFilter: ["disabled"] });
observer.observe(feedback, { attributes: true, attributeFilter: ["class"] });

syncHelpVisibility();
