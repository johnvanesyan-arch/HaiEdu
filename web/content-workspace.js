import { signOutAccount } from './account-signout.mjs';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

export const contentSupabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
export const $ = (id) => document.getElementById(id);

const CONTENT_DASHBOARD_CACHE_PREFIX = "haiedu:content-dashboard:v1:";
const CONTENT_DASHBOARD_CACHE_TTL_MS = 20_000;
const dashboardLoads = new Map();
const dashboardLoadVersions = new Map();
const dashboardUsers = new Set();
let contentSessionVersion = 0;
let contentSessionUserId;

function syncContentSession(userId, { force = false } = {}) {
  if (!force && userId === contentSessionUserId) return;
  const hadIdentity = contentSessionUserId !== undefined;
  contentSessionUserId = userId;
  if (!hadIdentity && !force) return;
  contentSessionVersion += 1;
  for (const previousUserId of dashboardUsers) clearContentDashboardCache(previousUserId);
  dashboardUsers.clear();
}

function contentDashboardCacheKey(userId) {
  return `${CONTENT_DASHBOARD_CACHE_PREFIX}${userId}`;
}

export function readContentDashboardCache(userId, maxAgeMs = CONTENT_DASHBOARD_CACHE_TTL_MS) {
  if (!userId) return null;
  dashboardUsers.add(userId);
  try {
    const raw = sessionStorage.getItem(contentDashboardCacheKey(userId));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.savedAt || Date.now() - Number(entry.savedAt) > maxAgeMs || !entry.dashboard) {
      sessionStorage.removeItem(contentDashboardCacheKey(userId));
      return null;
    }
    return entry.dashboard;
  } catch {
    return null;
  }
}

export function writeContentDashboardCache(userId, dashboard) {
  if (!userId || !dashboard) return;
  try {
    sessionStorage.setItem(contentDashboardCacheKey(userId), JSON.stringify({ savedAt: Date.now(), dashboard }));
  } catch {
    /* cache is an optimization only */
  }
}

export function clearContentDashboardCache(userId) {
  if (userId) {
    dashboardLoadVersions.set(userId, (dashboardLoadVersions.get(userId) ?? 0) + 1);
    dashboardLoads.delete(userId);
  }
  try {
    if (userId) sessionStorage.removeItem(contentDashboardCacheKey(userId));
  } catch { /* best-effort cleanup */ }
}

export async function loadContentDashboard(session, { force = false } = {}) {
  const userId = session?.user?.id;
  if (!userId) throw new Error("unauthorized");
  // A pending getSession read must not restore a previous account after an auth event.
  if (contentSessionUserId === undefined) syncContentSession(userId);
  if (userId !== contentSessionUserId) throw new Error("content_session_ended");
  dashboardUsers.add(userId);
  if (!force) {
    const cached = readContentDashboardCache(userId);
    if (cached) return cached;
  }
  if (dashboardLoads.has(userId)) return dashboardLoads.get(userId);
  const loadVersion = dashboardLoadVersions.get(userId) ?? 0;
  const request = invokeContent("get-content-quality-dashboard", {})
    .then((dashboard) => {
      if (loadVersion !== (dashboardLoadVersions.get(userId) ?? 0)) throw new Error("content_dashboard_load_invalidated");
      writeContentDashboardCache(userId, dashboard);
      return dashboard;
    })
    .finally(() => { if (dashboardLoads.get(userId) === request) dashboardLoads.delete(userId); });
  dashboardLoads.set(userId, request);
  return request;
}

export function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

export async function invokeContent(name, body = {}) {
  const version = contentSessionVersion;
  let result;
  try {
    result = await contentSupabase.functions.invoke(name, { body });
  } catch (error) {
    if (version !== contentSessionVersion) throw new Error("content_session_ended");
    throw error;
  }
  const { data, error } = result;
  if (version !== contentSessionVersion) throw new Error("content_session_ended");
  if (error) {
    const response = error.context;
    const payload = response instanceof Response ? await response.clone().json().catch(() => null) : null;
    if (version !== contentSessionVersion) throw new Error("content_session_ended");
    if (name === "get-content-quality-dashboard" && (!payload?.error || payload.error === "content_quality_dashboard_failed" || payload.error.endsWith("_query_failed"))) {
      throw new Error("Չհաջողվեց թարմացնել հարցերի և QA-ի տվյալները։ Սեղմեք «Թարմացնել»․ կրկին QA գործարկելու կարիք չկա, եթե հարցը չեք փոխել։");
    }
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
  let currentUserId = null;
  let showPromise = null;

  async function show(session, { force = false } = {}) {
    const userId = session?.user?.id ?? null;
    if (!userId) {
      version += 1;
      clearContentDashboardCache(currentUserId);
      currentUserId = null;
      gate?.classList.add("hidden");
      authPanel?.classList.remove("hidden");
      if (authMessage) authMessage.textContent = "";
      $("signOutBtn")?.classList.add("hidden");
      return;
    }
    if (!force && userId === currentUserId && !gate?.classList.contains("hidden")) return;
    if (!force && showPromise && userId === currentUserId) return showPromise;

    if (userId !== currentUserId) clearContentDashboardCache(currentUserId);
    currentUserId = userId;
    const current = ++version;
    gate?.classList.add("hidden");
    authPanel?.classList.add("hidden");
    if (authMessage) authMessage.textContent = "";
    $("signOutBtn")?.classList.remove("hidden");

    showPromise = (async () => {
      try {
        const dashboard = await loadContentDashboard(session, { force });
        if (current !== version) return;
        await render(dashboard, session);
        if (current !== version) return;
        if (authMessage) authMessage.textContent = "";
        gate?.classList.remove("hidden");
      } catch {
        if (current !== version) return;
        if (authMessage) authMessage.textContent = "Այս բաժինը հասանելի չէ այս հաշվին կամ տվյալները ժամանակավորապես չեն բեռնվում։";
        authPanel?.classList.remove("hidden");
      }
    })().finally(() => {
      if (current === version) showPromise = null;
    });
    return showPromise;
  }

  $("signOutBtn")?.addEventListener("click", async () => {
    await signOutAccount(contentSupabase, { redirect: "./account-access", onSignedOut: () => clearContentDashboardCache(currentUserId) });
  });
  contentSupabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") return void show(null);
    if (!session) return;
    if (["USER_UPDATED", "MFA_CHALLENGE_VERIFIED"].includes(event)) return void show(session, { force: true });
    if (session.user?.id !== currentUserId || gate?.classList.contains("hidden")) void show(session);
  });
  const initialVersion = version;
  const { data } = await contentSupabase.auth.getSession();
  if (initialVersion === version) await show(data.session);
}

contentSupabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") return syncContentSession(null, { force: true });
  if (session?.user?.id) syncContentSession(session.user.id);
});
