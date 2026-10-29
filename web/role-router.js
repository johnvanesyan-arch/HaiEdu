import { signOutAccount } from './account-signout.mjs';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { roleDestination } from "./account-roles.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let routed = false;
let routePromise = null;
let routePromiseKey = null;
let lastRouteKey = null;
let lastRouteResult = null;
let lastRouteAt = 0;

function markRoleRoutingPending() {
  document.body?.setAttribute("data-role-routing", "pending");
}

function revealStudentRoute() {
  document.body?.removeAttribute("data-role-routing");
}

function blockStudentRoute() {
  document.body?.setAttribute("data-role-routing", "blocked");
  const panel = document.getElementById("roleBlockedPanel");
  if (panel) panel.classList.remove("hidden");
}

export async function routeSession(session) {
  if (routed) return { redirected: true, role: null };
  const key = session?.user?.id ?? "signed-out";
  if (routePromise && routePromiseKey === key) return routePromise;
  if (lastRouteKey === key && lastRouteResult && Date.now() - lastRouteAt < 1500) return lastRouteResult;

  routePromiseKey = key;
  routePromise = (async () => {
  if (!session?.user) {
    revealStudentRoute();
    document.getElementById("roleBlockedPanel")?.classList.add("hidden");
    return { redirected: false, role: null };
  }

  // Hide student-only content again during any authenticated role transition.
  // This also protects a later sign-in on the student entry page from flashing
  // student UI before a staff role is redirected.
  markRoleRoutingPending();

  const { data, error } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data || !roleDestination(data.role)) {
    blockStudentRoute();
    return { redirected: false, blocked: true, role: null };
  }

  if (data.account_status !== "active") {
    routed = true;
    window.location.replace("./privacy.html");
    return { redirected: true, role: String(data.role ?? "") };
  }

  const role = String(data.role ?? "");
  const destination = roleDestination(role);
  if (role !== "student") {
    routed = true;
    window.location.replace(destination);
    return { redirected: true, role };
  }

  revealStudentRoute();
  return { redirected: false, role };
  })();

  try {
    const result = await routePromise;
    lastRouteKey = key;
    lastRouteResult = result;
    lastRouteAt = Date.now();
    return result;
  } finally {
    if (routePromiseKey === key) {
      routePromise = null;
      routePromiseKey = null;
    }
  }
}

document.getElementById("blockedSignOutBtn")?.addEventListener("click", async () => {
  await signOutAccount(supabase, { redirect: "./account-access" });
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
  void routeSession(session);
});

export const roleRoutingReady = (async () => {
  const { data } = await supabase.auth.getSession();
  return routeSession(data.session);
})();
