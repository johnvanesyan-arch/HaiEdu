import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { readLearningSelection, resolveNavigationContext } from './learning-navigation.mjs';
const supabase = window.__haieduSupabaseClient ?? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let version = 0;
function publish(data = { contexts: [] }) {
  window.HaiEduCourseAccess = data;
  window.dispatchEvent(new CustomEvent('haiedu-course-access', { detail: data }));
}
async function refresh() {
  const request = ++version;
  try {
  const { data: auth } = await supabase.auth.getSession();
  if (request !== version) return;
  if (!auth.session) { publish(); return; }
  const { data, error } = await supabase.functions.invoke('get-student-classes', { body: {} });
  if (request !== version) return;
  if (error) { publish({contexts:[],accessStatus:'unavailable'}); return; }
  const extension = document.body.dataset.learningExtension;
  if (extension) {
    let selection;
    try { selection = readLearningSelection(location.search); } catch { selection = {}; }
    const context = resolveNavigationContext(data.contexts ?? [], selection, extension);
    if (!context || context.extensionKey !== extension) { publish(); location.replace('./index.html?course=required'); return; }
  }
  publish(data);
  } catch { if(request === version)publish({contexts:[],accessStatus:'unavailable'}); }
}
supabase.auth.onAuthStateChange((_event, session) => {
  ++version;
  publish();
  if (session) setTimeout(refresh, 0);
});
window.addEventListener('pageshow', refresh);
setTimeout(refresh, 0);
