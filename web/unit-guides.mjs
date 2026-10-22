import {escapeHtml as esc} from './learning-navigation.mjs';

// teaching-guide-v1 is an explicit content capability, available in any programme.
export function mountUnitGuides({root,supabase,context,isCurrent=()=>true}){
 let disposed=false,request=0,busy=false;
 const valid=n=>!disposed&&isCurrent()&&n===request;
 root.innerHTML='<section class="card unit-guides" aria-labelledby="unitGuidesTitle"><div class="unit-guides-heading"><h2 id="unitGuidesTitle">Ուսումնական ուղեցույցներ</h2><button type="button" class="secondary" data-guides-refresh>Թարմացնել</button></div><p class="subtle">Ուղեցույցները դասերի հերթականությամբ են։ Բացեք վերնագիրը՝ բացատրությունն ու օրինակը կարդալու համար։</p><div data-guides-body aria-live="polite"></div></section>';
 const body=root.querySelector('[data-guides-body]'),refresh=root.querySelector('[data-guides-refresh]');
 async function load(){
  if(disposed||!isCurrent()||busy||document.visibilityState==='hidden')return;
  busy=true;const n=++request;refresh.disabled=true;body.textContent='Ուղեցույցները բեռնվում են…';
  try{
   const {data,error}=await supabase.functions.invoke('get-unit-guides',{body:context});
   if(!valid(n))return;
   if(error||data?.guidesVersion!=='unit-guides-v1'||!Array.isArray(data.guides))throw Error('unavailable');
   if(data.availability==='diagnostic_required'){body.textContent='Ուղեցույցները կբացվեն այս գլխի ախտորոշիչն ավարտելուց հետո։';return;}
   if(data.availability==='assessment_active'){body.textContent='Ուղեցույցները հասանելի չեն ընթացիկ ստուգման ժամանակ։ Նախ ավարտեք ստուգումը։';return;}
   if(data.availability!=='available'||data.guides.some(g=>g.schemaVersion!=='teaching-guide-v1'))throw Error('unsupported');
   if(!data.guides.length){body.textContent='Այս գլխի համար հրապարակված ուղեցույց դեռ չկա։';return;}
   body.innerHTML='<ol class="unit-guide-list">'+data.guides.map(g=>`<li><details class="unit-guide" data-guide-id="${esc(g.id)}"><summary><span lang="${esc(g.locale)}">${esc(g.title)}</span></summary><div class="unit-guide-content"><p lang="${esc(g.locale)}">${esc(g.text)}</p><h3>Օրինակ</h3><p lang="${esc(g.locale)}">${esc(g.workedExample)}</p></div></details></li>`).join('')+'</ol>';
  }catch{if(valid(n))body.textContent='Չհաջողվեց բեռնել ուղեցույցները։ Սեղմեք «Թարմացնել»՝ կրկին փորձելու համար։';}
  finally{if(valid(n)){busy=false;refresh.disabled=false;}}
 }
 function hide(){++request;busy=false;body.replaceChildren();refresh.disabled=false;}
 function visibility(){if(document.visibilityState==='hidden')hide();else load();}
 refresh.addEventListener('click',load);window.addEventListener('focus',load);document.addEventListener('visibilitychange',visibility);
 load();
 return()=>{disposed=true;++request;refresh.removeEventListener('click',load);window.removeEventListener('focus',load);document.removeEventListener('visibilitychange',visibility);root.replaceChildren();};
}
