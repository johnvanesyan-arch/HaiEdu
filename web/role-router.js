import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let routed = false;

async function route(session) {
  if (routed || !session?.user) return;
  const { data } = await supabase.from("profiles").select("role, account_status").eq("id", session.user.id).maybeSingle();
  if (!data) return;

  if (data.account_status !== "active") {
    routed = true;
    window.location.replace("./privacy.html");
    return;
  }

  const destinations = {
    teacher: "./teacher.html",
    content_admin: "./content.html",
    admin: "./admin.html",
  };
  const destination = destinations[String(data.role)];
  if (destination) {
    routed = true;
    window.location.replace(destination);
  }
}

supabase.auth.onAuthStateChange((_event, session) => route(session));
const { data } = await supabase.auth.getSession();
route(data.session);
