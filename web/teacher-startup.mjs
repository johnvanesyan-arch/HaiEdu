import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {createTeacherHomeStartup} from './teacher-home-startup.mjs';
// One tiny head entry, without an SDK dependency or rendering side effects.
// A missing/unsupported startup read leaves the existing SDK flow unchanged.
if(!window.__haieduTeacherHomeStartup){
 const inactive=Object.freeze({claim:()=>null,cancel:()=>{}});
 window.__haieduTeacherHomeStartup=inactive;
 let startup=null;
 try{
  const detach=()=>{window.removeEventListener('pagehide',startup.cancel);if(window.__haieduTeacherHomeStartup===startup)window.__haieduTeacherHomeStartup=inactive;};
  startup=createTeacherHomeStartup({url:SUPABASE_URL,key:SUPABASE_PUBLISHABLE_KEY,storage:localStorage,tabStorage:sessionStorage,location,onCancel:detach});
  if(startup){window.__haieduTeacherHomeStartup=startup;window.addEventListener('pagehide',startup.cancel,{once:true});}
 }catch{ /* Storage restrictions and invalid sessions use the regular SDK flow. */ }
}
