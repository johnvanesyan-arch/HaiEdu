import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {mountResourceLibrary} from './supplementary-resources.mjs';
const client=window.__haieduSupabaseClient ||= createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
mountResourceLibrary({root:document.getElementById('resourceRoot'),client,staff:document.body.dataset.resourceStaff==='true',onRole:role=>{
 const back=document.getElementById('resourceStaffBack');if(back){back.href=role==='teacher'?'./teacher.html':'./content.html';back.textContent=role==='teacher'?'Ուսուցչի էջ':'Բովանդակության էջ';}
}});
