import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let routed = false;

async function route(session) {
  if (routed || !session?.user) return;
  const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
  if (data && ["teacher", "admin"].includes(String(data.role))) {
    routed = true;
    window.location.replace("./teacher.html");
  }
}

supabase.auth.onAuthStateChange((_event, session) => route(session));
const { data } = await supabase.auth.getSession();
route(data.session);
