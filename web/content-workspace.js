import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

export const contentSupabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
export const $ = (id) => document.getElementById(id);

export function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

export async function invokeContent(name, body = {}) {
  const { data, error } = await contentSupabase.functions.invoke(name, { body });
  if (error) {
    const response = error.context;
    const payload = response instanceof Response ? await response.clone().json().catch(() => null) : null;
    throw new Error(payload?.detail || payload?.error || data?.detail || data?.error || error.message);
  }
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

export function curriculumContext(item) {
  const context = item?.curriculum;
  if (!context) return "Չկապակցված ուսումնական համատեքստ";
  return [
    context.grade?.labelHy || (context.grade?.number ? `${context.grade.number}-րդ դասարան` : ""),
    context.subject?.nameHy || context.subject?.nameEn || "",
    context.unit?.titleHy || context.unit?.code || "",
  ].filter(Boolean).join(" · ");
}

export function reviewLabel(status) {
  return ({
    unreviewed: "Չստուգված",
    needs_review: "Ստուգման է սպասում",
    in_review: "Ստուգման փուլում",
    changes_requested: "Փոփոխություն է պահանջվում",
    approved: "Հաստատված",
  })[status] || status || "—";
}

export function qaLabel(item) {
  if (!item?.latestQa) return { text: "QA չի գործարկվել", key: "missing" };
  return item.latestQa.passed
    ? { text: "QA անցած", key: "pass" }
    : { text: "QA խնդիր", key: "fail" };
}

export async function mountContentWorkspace(render, { gateId = "console", authPanelId = "authPanel", authMessageId = "authMessage" } = {}) {
  const gate = $(gateId);
  const authPanel = $(authPanelId);
  const authMessage = $(authMessageId);
  let version = 0;

  async function show(session) {
    const current = ++version;
    gate?.classList.add("hidden");
    authPanel?.classList.add("hidden");
    if (!session) {
      authPanel?.classList.remove("hidden");
      $("signOutBtn")?.classList.add("hidden");
      return;
    }
    $("signOutBtn")?.classList.remove("hidden");
    try {
      const dashboard = await invokeContent("get-content-quality-dashboard", {});
      if (current !== version) return;
      await render(dashboard);
      if (current !== version) return;
      if (authMessage) authMessage.textContent = "";
      gate?.classList.remove("hidden");
    } catch (error) {
      if (current !== version) return;
      if (authMessage) authMessage.textContent = "Այս բաժինը հասանելի չէ այս հաշվին կամ տվյալները ժամանակավորապես չեն բեռնվում։";
      authPanel?.classList.remove("hidden");
    }
  }

  $("signOutBtn")?.addEventListener("click", async () => {
    await contentSupabase.auth.signOut();
    location.replace("./account-access");
  });
  contentSupabase.auth.onAuthStateChange((_event, session) => setTimeout(() => show(session), 0));
  const { data } = await contentSupabase.auth.getSession();
  await show(data.session);
}
