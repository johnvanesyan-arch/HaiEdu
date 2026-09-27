import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const uxSupabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const path = location.pathname.toLowerCase();
const isStudentPage = /(?:^|\/)(?:index\.html|mastery\.html|join\.html)?$/.test(path) || path.endsWith("/");
const terminalAuthMessageKey = "amp-terminal-auth-message";

const terminology = [
  [/Mastery check/gi, "Յուրացման ստուգում"],
  [/mastery check/gi, "յուրացման ստուգում"],
  [/mastery-ի/gi, "յուրացման մակարդակի"],
  [/mastery-ն/gi, "յուրացման մակարդակը"],
  [/mastery/gi, "յուրացման մակարդակ"],
  [/Chapter I/g, "Գլուխ I"],
  [/adaptive practice/gi, "հարմարեցվող վարժանք"],
  [/remediation/gi, "ամրապնդող վարժանք"],
  [/join code/gi, "միանալու կոդ"],
];

const friendlyErrors = new Map([
  ["Invalid login credentials", "Էլ. հասցեն կամ գաղտնաբառը սխալ է։"],
  ["Email not confirmed", "Էլ. հասցեն դեռ հաստատված չէ։"],
  ["User already registered", "Այս էլ. հասցեով հաշիվ արդեն կա։"],
  ["Failed to fetch", "Կապի խնդիր առաջացավ։ Ստուգեք ինտերնետը և կրկին փորձեք։"],
  ["Edge Function returned a non-2xx status code", "Չհաջողվեց բեռնել տվյալները։ Եթե հաշիվը ջնջվել կամ կասեցվել է, նորից մուտք գործեք։"],
]);

function localizeText(text) {
  let next = String(text ?? "");
  for (const [from, to] of friendlyErrors) next = next.replaceAll(from, to);
  if (isStudentPage) for (const [pattern, replacement] of terminology) next = next.replace(pattern, replacement);
  return next;
}

function localizeNode(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const original = node.nodeValue;
    const next = localizeText(original);
    if (next !== original) node.nodeValue = next;
  }
}

function ensureSkipLink() {
  if (document.querySelector(".skip-link")) return;
  const main = document.querySelector("main");
  if (!main) return;
  if (!main.id) main.id = "mainContent";
  main.tabIndex = -1;
  const link = document.createElement("a");
  link.className = "skip-link";
  link.href = `#${main.id}`;
  link.textContent = "Անցնել հիմնական բովանդակությանը";
  document.body.prepend(link);
}

function ensureGlobalStatus() {
  let status = document.getElementById("uxGlobalStatus");
  if (!status) {
    status = document.createElement("div");
    status.id = "uxGlobalStatus";
    status.className = "ux-status hidden";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    document.body.appendChild(status);
  }
  return status;
}

function announce(text, error = false) {
  const status = ensureGlobalStatus();
  status.textContent = text;
  status.classList.toggle("error", error);
  status.classList.remove("hidden");
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => status.classList.add("hidden"), 5000);
}

function isTerminalAuthError(error) {
  // A network failure, timeout, rate limit or unknown server error is not proof
  // that a stored session is invalid. Keep authorization decisions on the server.
  return new Set([
    "user_not_found", "user_banned", "session_not_found", "session_expired",
    "refresh_token_not_found", "refresh_token_already_used", "bad_jwt",
  ]).has(error?.code);
}

async function handleTerminalAuthFailure() {
  let session;
  let error;
  try {
    const { data: sessionData } = await uxSupabase.auth.getSession();
    session = sessionData?.session;
    if (!session) return false;

    const result = await uxSupabase.auth.getUser();
    if (!result.error && result.data?.user) return false;
    error = result.error;
    if (!isTerminalAuthError(error)) {
      announce("Մուտքի ստուգումը ժամանակավորապես անհասանելի է։ Ստուգեք կապը և թարմացրեք էջը։", true);
      return false;
    }

    // A delayed failure for an older token must not erase a refreshed session
    // or another account that signed in while this request was pending.
    const { data: current } = await uxSupabase.auth.getSession();
    if (!current?.session || current.session.user?.id !== session.user?.id
      || current.session.access_token !== session.access_token) return false;
  } catch {
    announce("Մուտքի ստուգումը ժամանակավորապես անհասանելի է։ Ստուգեք կապը և թարմացրեք էջը։", true);
    return false;
  }

  try {
    await uxSupabase.auth.signOut({ scope: "local" });
  } catch {
    try {
      localStorage.removeItem(`sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`);
    } catch { /* best-effort local cleanup */ }
  }

  sessionStorage.setItem(terminalAuthMessageKey, error.code === "user_not_found"
    ? "Հաշիվը այլևս հասանելի չէ։ Մուտք գործեք այլ հաշվով։"
    : "Մուտքի աշխատաշրջանն այլևս վավեր չէ։ Կրկին մուտք գործեք։");
  if (!location.pathname.endsWith("/index.html") && location.pathname !== "/") {
    location.replace("./index.html");
  } else {
    location.reload();
  }
  return true;
}

function showTerminalAuthMessage() {
  const message = sessionStorage.getItem(terminalAuthMessageKey);
  if (!message) return;
  sessionStorage.removeItem(terminalAuthMessageKey);
  const authMessage = document.getElementById("authMessage");
  if (authMessage) {
    authMessage.textContent = message;
    authMessage.style.color = "#8a3342";
    authMessage.setAttribute("role", "alert");
    return;
  }
  announce(message, true);
}

function normalizeDecimal(value) {
  return String(value ?? "")
    .replace(/[−–—]/g, "-")
    .replace(/[٫,]/g, ".")
    .replace(/\s+/g, "")
    .replace(/[^0-9.+-]/g, "");
}

function setFieldError(input, message) {
  input.setAttribute("aria-invalid", "true");
  let error = input.parentElement?.querySelector(":scope > .field-error");
  if (!error && input.parentElement) {
    error = document.createElement("span");
    error.className = "field-error";
    error.id = `${input.id || "field"}-error`;
    input.parentElement.appendChild(error);
  }
  if (error) {
    error.textContent = message;
    input.setAttribute("aria-describedby", error.id);
  }
}

function clearFieldError(input) {
  input.removeAttribute("aria-invalid");
  const error = input.parentElement?.querySelector(":scope > .field-error");
  if (error) error.remove();
  if (input.getAttribute("aria-describedby")?.endsWith("-error")) input.removeAttribute("aria-describedby");
}

function configureInput(input) {
  if (!(input instanceof HTMLInputElement)) return;
  if (input.type === "email") {
    input.required = true;
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.inputMode = "email";
  }
  if (input.type === "password") {
    input.required = true;
    input.minLength = 6;
  }
  if (["joinCode", "joinClassCode"].includes(input.id)) {
    input.required = true;
    input.minLength = 8;
    input.maxLength = 8;
    input.pattern = "[A-Za-z0-9]{8}";
    input.autocapitalize = "characters";
    input.spellcheck = false;
    input.setAttribute("aria-label", "Դասարանին միանալու 8-նիշ կոդ");
    if (!input.dataset.uxJoinBound) {
      input.dataset.uxJoinBound = "true";
      input.addEventListener("input", () => {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
        clearFieldError(input);
      });
    }
  }
  if (input.id === "numericAnswer") {
    input.required = true;
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.placeholder = "Մուտքագրեք թիվը";
    input.setAttribute("aria-label", "Թվային պատասխան");
    if (!input.dataset.uxNumericBound) {
      input.dataset.uxNumericBound = "true";
      input.addEventListener("input", () => {
        const normalized = normalizeDecimal(input.value);
        if (normalized !== input.value) input.value = normalized;
        clearFieldError(input);
        syncAnswerSubmit();
      });
    }
  }
  if (input.id === "unitAnswer") {
    input.required = true;
    input.autocomplete = "off";
    input.placeholder = "Մուտքագրեք միավորը";
    input.setAttribute("aria-label", "Չափման միավոր");
    if (!input.dataset.uxUnitBound) {
      input.dataset.uxUnitBound = "true";
      input.addEventListener("input", () => {
        input.value = input.value.trimStart();
        clearFieldError(input);
        syncAnswerSubmit();
      });
    }
  }
}

function validateKnownInput(input) {
  clearFieldError(input);
  if (input.type === "email" && !input.validity.valid) {
    setFieldError(input, "Մուտքագրեք վավեր էլ. հասցե։");
    return false;
  }
  if (input.type === "password" && input.value.length < 6) {
    setFieldError(input, "Գաղտնաբառը պետք է ունենա առնվազն 6 նիշ։");
    return false;
  }
  if (["joinCode", "joinClassCode"].includes(input.id) && !/^[A-Z0-9]{8}$/.test(input.value.trim().toUpperCase())) {
    setFieldError(input, "Կոդը պետք է պարունակի ճիշտ 8 տառ կամ թիվ։");
    return false;
  }
  if (input.id === "numericAnswer") {
    const value = normalizeDecimal(input.value);
    input.value = value;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
      setFieldError(input, "Մուտքագրեք միայն թիվ, օրինակ՝ 2 կամ 2.5։");
      return false;
    }
  }
  if (input.id === "unitAnswer" && !input.value.trim()) {
    setFieldError(input, "Մուտքագրեք չափման միավորը։");
    return false;
  }
  return true;
}

function syncAnswerSubmit() {
  const form = document.getElementById("answerForm");
  const submit = document.getElementById("submitBtn");
  if (!form || !submit) return;
  const next = document.getElementById("nextBtn");
  const responseAccepted = next && !next.classList.contains("hidden") && next.disabled === false;
  if (responseAccepted) return;

  const radios = [...form.querySelectorAll('input[type="radio"][name="answer"]')];
  if (radios.length) {
    submit.disabled = !radios.some((radio) => radio.checked);
    return;
  }
  const numeric = document.getElementById("numericAnswer");
  const unit = document.getElementById("unitAnswer");
  if (numeric) {
    const numericOk = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalizeDecimal(numeric.value));
    const unitOk = !unit || Boolean(unit.value.trim());
    submit.disabled = !(numericOk && unitOk);
  }
}

function configureAnswerArea() {
  const area = document.getElementById("answerArea");
  if (!area) return;
  if (area.querySelector('input[type="radio"]')) {
    area.setAttribute("role", "radiogroup");
    area.setAttribute("aria-label", "Պատասխանի տարբերակներ");
  } else {
    area.removeAttribute("role");
    area.removeAttribute("aria-label");
  }
  area.querySelectorAll("input").forEach(configureInput);
  syncAnswerSubmit();
}

function configureMessages() {
  document.querySelectorAll(".message, .feedback, #dashboardLoading, #stateText, #consoleMessage, #classMessage").forEach((el) => {
    if (!el.hasAttribute("aria-live")) el.setAttribute("aria-live", "polite");
    if (!el.hasAttribute("role")) el.setAttribute("role", "status");
  });
  const prompt = document.getElementById("prompt");
  if (prompt) {
    prompt.setAttribute("aria-live", "polite");
    prompt.setAttribute("aria-atomic", "true");
  }
}

function configureProgress() {
  document.querySelectorAll(".progress-bar, .session-progress-bar, .mini-progress-bar").forEach((bar) => {
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    const match = String(bar.style.width || "0").match(/([\d.]+)/);
    bar.setAttribute("aria-valuenow", String(Math.max(0, Math.min(100, Number(match?.[1] ?? 0)))));
  });
}

function configureInteractiveRows() {
  document.querySelectorAll("tr[data-id]").forEach((row) => {
    if (row.tabIndex < 0) row.tabIndex = 0;
    row.setAttribute("role", "button");
    if (!row.dataset.uxKeyBound) {
      row.dataset.uxKeyBound = "true";
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          row.click();
        }
      });
    }
  });
}

function configureDrawer() {
  const drawer = document.getElementById("studentDrawer");
  const panel = drawer?.querySelector(".student-drawer-panel");
  if (!drawer || !panel) return;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "studentDrawerName");
  panel.tabIndex = -1;
  if (!drawer.dataset.uxEscBound) {
    drawer.dataset.uxEscBound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !drawer.classList.contains("hidden")) document.getElementById("closeDrawerBtn")?.click();
    });
  }
}

function configurePage() {
  document.querySelectorAll("input").forEach(configureInput);
  configureAnswerArea();
  configureMessages();
  configureProgress();
  configureInteractiveRows();
  configureDrawer();
  localizeNode(document.body);
}

function validateBeforeAction(event) {
  const target = event.target.closest("button");
  if (!target) return;
  const controlled = new Set(["signInBtn", "signUpBtn", "joinBtn", "joinClassBtn"]);
  if (!controlled.has(target.id)) return;
  const scope = target.closest("section, article, main") || document;
  const inputs = [...scope.querySelectorAll("input")].filter((input) => !input.disabled && (input.required || ["emailInput", "passwordInput", "joinCode", "joinClassCode"].includes(input.id)));
  const valid = inputs.every(validateKnownInput);
  if (!valid) {
    event.preventDefault();
    event.stopImmediatePropagation();
    inputs.find((input) => input.getAttribute("aria-invalid") === "true")?.focus();
  }
}

document.addEventListener("click", validateBeforeAction, true);
document.addEventListener("change", (event) => {
  if (event.target.matches('#answerForm input[type="radio"]')) syncAnswerSubmit();
});
document.addEventListener("invalid", (event) => {
  if (event.target instanceof HTMLInputElement) {
    event.preventDefault();
    validateKnownInput(event.target);
  }
}, true);

window.addEventListener("offline", () => announce("Ինտերնետ կապը կորել է։ Պատասխանները մի ուղարկեք մինչև կապը վերականգնվի։", true));
window.addEventListener("online", () => announce("Ինտերնետ կապը վերականգնվել է։"));
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection", event.reason);
  announce("Տեխնիկական խնդիր առաջացավ։ Կրկին փորձեք կամ թարմացրեք էջը։", true);
});

ensureSkipLink();
ensureGlobalStatus();
configurePage();
showTerminalAuthMessage();
void handleTerminalAuthFailure();

const observer = new MutationObserver((records) => {
  let shouldConfigure = false;
  for (const record of records) {
    if (record.type === "childList" || record.type === "characterData" || record.attributeName === "style" || record.attributeName === "class") {
      shouldConfigure = true;
      break;
    }
  }
  if (shouldConfigure) queueMicrotask(configurePage);
});
observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style"] });
