import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let routed = false;

function markRoleRoutingPending() {
  document.body?.setAttribute("data-role-routing", "pending");
}

function revealStudentRoute() {
  document.body?.removeAttribute("data-role-routing");
}

export async function routeSession(session) {
  if (routed) return { redirected: true, role: null };

  if (!session?.user) {
    revealStudentRoute();
    return { redirected: false, role: null };
  }

  // Hide student-only content again during any authenticated role transition.
  // This also protects a later sign-in on the student entry page from flashing
  // student UI before a staff role is redirected.
  markRoleRoutingPending();

  const { data } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", session.user.id)
    .maybeSingle();

  // Preserve the existing fallback behavior if profile resolution is unavailable.
  // The route remains usable rather than trapping the user behind a blank shell.
  if (!data) {
    revealStudentRoute();
    return { redirected: false, role: null };
  }

  if (data.account_status !== "active") {
    routed = true;
    window.location.replace("./privacy.html");
    return { redirected: true, role: String(data.role ?? "") };
  }

  const destinations = {
    teacher: "./teacher.html",
    content_admin: "./content.html",
    admin: "./admin.html",
  };
  const role = String(data.role ?? "");
  const destination = destinations[role];
  if (destination) {
    routed = true;
    window.location.replace(destination);
    return { redirected: true, role };
  }

  revealStudentRoute();
  return { redirected: false, role };
}

supabase.auth.onAuthStateChange((_event, session) => {
  void routeSession(session);
});

export const roleRoutingReady = (async () => {
  const { data } = await supabase.auth.getSession();
  return routeSession(data.session);
})();
