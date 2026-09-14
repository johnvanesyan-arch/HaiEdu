import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

const practicePanel = $("practicePanel");
const sessionMode = $("sessionMode");
const itemCode = $("itemCode");
const submitBtn = $("submitBtn");
const helpControls = $("helpControls");
const helpBtn = $("helpBtn");
const helpPanel = $("helpPanel");
const helpTitle = $("helpTitle");
const helpStrategy = $("helpStrategy");
const helpContent = $("helpContent");
const helpNote = $("helpNote");

let lastItemCode = null;
let loading = false;

function resetHelp() {
  helpPanel.classList.add("hidden");
  helpTitle.textContent = "Օգնություն";
  helpStrategy.textContent = "";
  helpContent.textContent = "";
  helpNote.textContent = "";
  helpBtn.textContent = "Օգնություն";
  helpBtn.disabled = false;
}

function syncHelpVisibility() {
  const practiceVisible = !practicePanel.classList.contains("hidden");
  const isPractice = sessionMode.textContent.trim() === "Վարժանք";
  const unanswered = !submitBtn.disabled;
  const hasQuestion = itemCode.textContent.trim() && itemCode.textContent.trim() !== "—";
  helpControls.classList.toggle("hidden", !(practiceVisible && isPractice && unanswered && hasQuestion));

  const currentCode = itemCode.textContent.trim();
  if (currentCode !== lastItemCode) {
    lastItemCode = currentCode;
    resetHelp();
  }
}

async function requestHelp() {
  if (loading) return;
  loading = true;
  helpBtn.disabled = true;
  helpBtn.textContent = "Բեռնվում է…";

  const { data, error } = await supabase.functions.invoke("get-remediation-help", { body: {} });
  loading = false;

  if (error) {
    helpPanel.classList.remove("hidden");
    helpTitle.textContent = "Օգնությունը չբեռնվեց";
    helpStrategy.textContent = "";
    helpContent.textContent = error.message;
    helpNote.textContent = "";
    helpBtn.disabled = false;
    helpBtn.textContent = "Կրկին փորձել";
    return;
  }

  helpPanel.classList.remove("hidden");
  helpTitle.textContent = data.titleHy ?? "Օգնություն";
  helpStrategy.textContent = data.strategyHy ?? "";
  helpContent.textContent = data.contentHy ?? "";
  helpNote.textContent = data.noteHy ?? "";
  helpBtn.disabled = false;
  helpBtn.textContent = data.moreHelpAvailable ? "Ավելի շատ օգնություն" : "Օրինակը տեսել եք";
  if (!data.moreHelpAvailable) helpBtn.disabled = true;
}

helpBtn.addEventListener("click", requestHelp);

const observer = new MutationObserver(syncHelpVisibility);
observer.observe(practicePanel, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "disabled"] });
syncHelpVisibility();
