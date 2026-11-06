import {learnerAccess,publishLearnerAccess as publish} from './learner-access.mjs';
import { createClient } from './supabase-browser.bundle.mjs';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { readLearningSelection, resolveNavigationContext } from './learning-navigation.mjs';
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const access=learnerAccess(supabase);
let version=0,timer;
const owned=['home','course'].includes(document.body.dataset.studentPage);
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,0);}
async function refresh() {
  const request = ++version;
  try {
    const {data,error,stale}=await access.read();
    if(stale||request!==version)return;
    if(data?.accessStatus==='signed_out'){publish(data);return;}
    if (error) { publish({contexts:[],accessStatus:'unavailable'}); return; }
    const extension = document.body.dataset.learningExtension;
    if (extension) {
      let selection;
      try { selection = readLearningSelection(location.search); } catch { selection = {}; }
      const context = resolveNavigationContext(data.contexts ?? [], selection, extension);
      if (!context || context.extensionKey !== extension) { publish(); location.replace('./index.html?course=required'); return; }
    }
    publish(data);
  } catch { if(request === version) publish({contexts:[],accessStatus:'unavailable'}); }
}
if(!owned){
 access.subscribe(({reason,session})=>{
  clearTimeout(timer);++version;
  if(['SIGNED_OUT','SIGNED_IN','session','pagehide'].includes(reason))publish({contexts:[],accessStatus:session?'loading':'signed_out'});
  if(reason!=='pagehide')schedule();
 });
 schedule();
}
