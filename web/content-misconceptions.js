import { signOutAccount } from './account-signout.mjs';
import { $, esc, contentSupabase as supabase, invokeContent, clearContentDashboardCache } from './content-workspace.js';

const endpoint = 'manage-misconception-reviews';
const statusLabel = { draft: 'Սևագիր', active: 'Գործող', retired: 'Արխիվացված' };
const actionLabel = { save_draft: 'Սևագիրը խմբագրվել է', request_changes: 'Փոփոխություն է պահանջվում', approve: 'Սահմանումը հաստատվել է' };
const errors = {
  stale_misconception_review: 'Սահմանումը կամ կապված պատասխանները փոխվել են։ Թարմացրեք ընտրված սահմանումը և նորից ստուգեք։',
  active_definition_read_only: 'Այս սահմանումն այլևս սևագիր չէ։ Գործող սահմանումները հասանելի են միայն դիտելու համար։',
  review_reason_required: 'Նշեք որոշման կամ փոփոխության առնվազն 3 նիշից բաղկացած պատճառը։',
  invalid_definition: 'Վերնագիրը պետք է ունենա 3–240, իսկ նկարագրությունը՝ 5–4000 նիշ։',
  definition_unchanged: 'Պահպանելու համար նախ փոփոխեք սահմանումը։',
  mfa_required: 'Հաստատման համար անհրաժեշտ է բազմագործոն մուտք։',
  inactive_skill: 'Արխիվացված հմտության սահմանումը հնարավոր չէ հաստատել։',
  misconception_mapping_scope_mismatch: 'Կապված հարցի հմտությունը չի համապատասխանում սահմանման հմտությանը։ Անհրաժեշտ է շտկել կապակցումը։',
  misconception_not_found: 'Սահմանումը չի գտնվել։ Թարմացրեք ցանկը։',
};
let userId = null, authEpoch = 0, listEpoch = 0, detailEpoch = 0, offset = 0, total = 0;
let detail = null, selectedId = null, busy = false, stale = false, mfaEpoch = 0, mfaBusy = false;
let enrollment = null;
// Only IDs created by this workspace are retained, never QR codes or secrets.
// A departed identity cannot clean up with another account's session; retry when
// its own session returns. This also survives reloads during enrollment.
const pendingFactorKey = 'haiedu:misconception-review:pending-factors';
let pendingFactors = [];
try { const saved=JSON.parse(sessionStorage.getItem(pendingFactorKey)||'[]'); if(Array.isArray(saved))pendingFactors=saved.filter(f=>typeof f.id==='string'&&typeof f.userId==='string'); } catch {}
function persistFactors(){try{sessionStorage.setItem(pendingFactorKey,JSON.stringify(pendingFactors));}catch{}}
function rememberFactor(f){pendingFactors=pendingFactors.filter(x=>x.id!==f.id);pendingFactors.push(f);persistFactors();}
function forgetFactor(id){pendingFactors=pendingFactors.filter(f=>f.id!==id);persistFactors();}
async function cleanupFactors(owner){
  if(!owner)return;
  for(const factor of pendingFactors.filter(f=>f.userId===owner)){
    const {data}=await supabase.auth.getSession();
    if(data?.session?.user?.id!==owner || userId!==owner)return;
    const {data:factors,error:factorError}=await supabase.auth.mfa.listFactors();
    if(factorError || userId!==owner)return;
    const existing=(factors?.all||factors?.totp||[]).find(f=>f.id===factor.id);
    if(!existing || existing.status==='verified'){forgetFactor(factor.id);continue;}
    const {error}=await supabase.auth.mfa.unenroll({factorId:factor.id});
    if(!error)forgetFactor(factor.id);
  }
}
const ids = ['mcSubject','mcGrade','mcUnit','mcSkill'];
function message(text = '', bad = false) { $('mcMessage').textContent = text; $('mcMessage').classList.toggle('bad',bad); }
function dirty() { return Boolean(detail && $('mcTitle') && ($('mcTitle').value !== detail.definition.title_hy || $('mcDescription').value !== (detail.definition.description_hy || ''))); }
function discardOkay() { return !dirty() || window.confirm('Չպահպանված փոփոխությունները կկորչեն։ Շարունակե՞լ։'); }
function current(a, d = detailEpoch) { return a === authEpoch && d === detailEpoch && Boolean(userId); }
function reviewError(error) { return errors[error.message] || 'Գործողությունը չհաջողվեց։ Ստուգեք կապը և կրկին փորձեք։'; }
function controls() {
  const editable = detail?.definition.status === 'draft' && !stale;
  for (const el of document.querySelectorAll('#mcFilters input,#mcFilters select,#mcFilters button,#mcList button,#mcPrev,#mcNext')) el.disabled = busy;
  $('mcPrev').disabled = busy || offset === 0;
  $('mcNext').disabled = busy || offset + 50 >= total;
  for (const id of ['mcTitle','mcDescription','mcReason','mcAcknowledged']) if ($(id)) $(id).disabled = busy || !editable;
  if ($('mcSave')) $('mcSave').disabled = busy || !editable || !dirty();
  if ($('mcRequest')) $('mcRequest').disabled = busy || !editable || dirty();
  if ($('mcApprove')) $('mcApprove').disabled = busy || !editable || dirty() || !$('mcAcknowledged').checked;
  if ($('mcReloadDetail')) $('mcReloadDetail').disabled = busy;
}
function fillSelect(id, rows, label) {
  const value = $(id).value;
  $(id).innerHTML = '<option value="">Բոլորը</option>' + rows.map(r=>`<option value="${esc(r.id)}">${esc(label(r))}</option>`).join('');
  $(id).value = rows.some(r=>r.id === value) ? value : '';
}
function filters() { return {status:$('mcStatus').value,subjectId:$('mcSubject').value,gradeId:$('mcGrade').value,unitId:$('mcUnit').value,skillId:$('mcSkill').value,search:$('mcSearch').value,offset}; }
async function list(prefetched = null) {
  const epoch = ++listEpoch, a = authEpoch;
  $('mcResultCount').textContent = 'Բեռնվում է…';
  try {
    const result = prefetched || await invokeContent(endpoint,{action:'list',filters:filters()});
    if (a !== authEpoch || epoch !== listEpoch || !userId) return;
    fillSelect('mcSubject',result.filters.subjects,r=>r.name);
    fillSelect('mcGrade',result.filters.grades,r=>r.name || String(r.number));
    fillSelect('mcUnit',result.filters.units,r=>`${r.code} · ${r.titleHy}`);
    fillSelect('mcSkill',result.filters.skills,r=>`${r.code} · ${r.name}`);
    total = result.total;
    $('mcStats').textContent = `Սևագիր՝ ${result.counts?.draft || 0} · Գործող՝ ${result.counts?.active || 0} · Արխիվացված՝ ${result.counts?.retired || 0}`;
    $('mcResultCount').textContent = total ? `${offset+1}–${Math.min(offset+50,total)} / ${total}` : 'Այս զտիչներով սահմանում չի գտնվել։';
    $('mcList').innerHTML = result.definitions.map(d=>`<button type="button" class="mc-row" data-mc-id="${esc(d.id)}" aria-pressed="${d.id===selectedId}"><strong>${esc(d.title_hy)}</strong><small>${esc(d.skill_code)} · ${esc(d.subject_name_hy)} · ${esc(d.grade_label_hy)}</small><small>${esc(d.last_action==='request_changes' && d.status==='draft' ? actionLabel.request_changes : statusLabel[d.status])} · Կապված պատասխաններ՝ ${Number(d.mapping_count)}</small></button>`).join('');
    controls();
  } catch(error) { if(a===authEpoch && epoch===listEpoch) { $('mcResultCount').textContent='Ցանկը չի բեռնվել։'; message(reviewError(error),true); } }
}
function renderDetail(result) {
  detail = result; stale = false;
  const d=result.definition, editable=d.status==='draft';
  $('mcDetail').innerHTML = `<h2>${esc(d.title_hy)}</h2><p class="mc-identity">${esc(d.subject_name_hy)} · ${esc(d.grade_label_hy)} · ${esc(d.skill_code)} · ${esc(d.skill_name_hy)}</p>
    <p class="subtle">${esc(d.units.map(u=>u.titleHy).join(' · '))}</p><p><strong>${esc(statusLabel[d.status])}</strong> · <code>${esc(d.code)}</code></p>
    ${editable ? '<p class="subtle">Ստուգեք սահմանումը և ստորև ներկայացված պատասխանները։ Սահմանման հաստատումը չի հաստատում հարցերը կամ ուսումնական թողարկումը։</p>' : '<p class="subtle">Գործող և արխիվացված սահմանումները այստեղ միայն դիտելու համար են՝ նախկին տվյալների իմաստը պահպանելու նպատակով։</p>'}
    <div class="mc-definition"><label>Վերնագիր<input id="mcTitle" maxlength="240" value="${esc(d.title_hy)}" ${editable?'':'readonly'} /></label>
    <label>Նկարագրություն<textarea id="mcDescription" maxlength="4000" ${editable?'':'readonly'}>${esc(d.description_hy)}</textarea></label></div>
    <h3>Կապված պատասխաններ (${result.mappings.length})</h3>
    ${result.mappings.map(m=>`<article class="mc-mapping"><a href="./content-item.html?id=${encodeURIComponent(m.itemId)}" target="_blank" rel="noopener">${esc(m.itemCode)} · տարբերակ ${Number(m.version)}</a><p>${esc(m.promptHy)}</p><p><strong>Կապված պատասխան՝ ${esc(m.responseKey)}</strong>${m.responseText ? ' · '+esc(m.responseText) : ''}</p>${m.mappingNote?`<p class="subtle">${esc(m.mappingNote)}</p>`:''}${m.retiredAt?'<p class="subtle">Հարցն արխիվացված է։</p>':''}</article>`).join('') || '<p class="subtle">Կապված պատասխաններ դեռ չկան։</p>'}
    ${editable ? `<label>Որոշման կամ փոփոխության պատճառ<textarea id="mcReason" minlength="3" maxlength="2000" placeholder="Նշեք՝ ինչ եք ստուգել կամ ինչն է պետք փոխել։"></textarea></label>
    <label class="mc-check"><input type="checkbox" id="mcAcknowledged" /> <span>Ստուգել եմ սահմանումը և դրա կապը ներկայացված պատասխանների հետ։</span></label>
    <div class="mc-actions"><button type="button" id="mcSave" data-action="save_draft">Պահպանել սևագիրը</button><button type="button" id="mcRequest" data-action="request_changes" class="ghost">Պահանջել փոփոխություն</button><button type="button" id="mcApprove" data-action="approve">Հաստատել սահմանումը</button></div>` : ''}
    <div class="mc-actions"><button type="button" id="mcReloadDetail" class="ghost">Թարմացնել ընտրվածը</button></div>
    <details><summary>Փոփոխությունների և որոշումների պատմություն (${result.history.length})</summary>${result.history.map(e=>`<article class="mc-event"><strong>${esc(actionLabel[e.action])} · ${Number(e.revision_no)}</strong><p>${esc(new Date(e.created_at).toLocaleString('hy-AM'))} · ${esc(e.actor_role==='admin'?'Հարթակի ադմին':'Բովանդակության ստուգող')}</p><p>${esc(e.reason)}</p><p>${esc(e.after_snapshot.title_hy)}</p><p>${esc(e.after_snapshot.description_hy)}</p><details><summary>Նախորդ բովանդակությունը</summary><p>${esc(e.before_snapshot.title_hy)}</p><p>${esc(e.before_snapshot.description_hy)}</p></details></article>`).join('') || '<p class="subtle">Այս էջով որոշում դեռ չի գրանցվել։ Նախկին կարգավիճակը պահպանված է։</p>'}</details>`;
  controls();
}
async function openDetail(id) {
  if (busy || !discardOkay()) return;
  selectedId=id;detail=null;stale=false;
  const d=++detailEpoch,a=authEpoch;
  $('mcDetail').innerHTML='<p>Սահմանումը բեռնվում է…</p>';message();
  for(const row of document.querySelectorAll('[data-mc-id]')) row.setAttribute('aria-pressed',String(row.dataset.mcId===id));
  try { const result=await invokeContent(endpoint,{action:'detail',id}); if(current(a,d)) renderDetail(result); }
  catch(error){if(current(a,d)){$('mcDetail').innerHTML='<p>Սահմանումը չի բեռնվել։</p><button type="button" id="mcReloadDetail" class="ghost">Կրկին փորձել</button>';message(reviewError(error),true);}}
}
async function mutate(action) {
  if(busy || !detail || stale || detail.definition.status!=='draft')return;
  if(action!=='save_draft' && dirty())return message('Նախ պահպանեք սահմանման փոփոխությունները։',true);
  if(action==='approve' && !$('mcAcknowledged').checked)return;
  const reason=$('mcReason').value.trim();if(reason.length<3)return message(errors.review_reason_required,true);
  const a=authEpoch,d=detailEpoch,id=selectedId;
  busy=true;controls();message();
  try{
    if(action==='approve'){
      const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;
      if(!current(a,d))return;
      if(data?.currentLevel!=='aal2'){await showMfa(a);return;}
    }
    const result=await invokeContent(endpoint,{action,id,expectedToken:detail.expectedToken,titleHy:$('mcTitle').value,descriptionHy:$('mcDescription').value,reason});
    if(!current(a,d))return;
    clearContentDashboardCache(userId);renderDetail(result);message(actionLabel[action]);await list();
  }catch(error){if(current(a,d)){if(['stale_misconception_review','active_definition_read_only'].includes(error.message))stale=true;message(reviewError(error),true);}}
  finally{if(a===authEpoch){busy=false;controls();}}
}
async function closeMfa(){
  ++mfaEpoch;const pending=enrollment,verifying=mfaBusy;enrollment=null;mfaBusy=false;
  if($('mcMfa').open)$('mcMfa').close();$('mcMfaBody').replaceChildren();$('mcMfaMessage').textContent='';
  if(!verifying && pending && pending.userId===userId)await cleanupFactors(pending.userId).catch(()=>null);
}
async function showMfa(a){
  const epoch=++mfaEpoch, owner=userId;
  $('mcMfaBody').textContent='Բեռնվում է…';$('mcMfaMessage').textContent='';$('mcMfa').showModal();
  try{
    await cleanupFactors(owner);
    if(a!==authEpoch || epoch!==mfaEpoch)return;
    const {data,error}=await supabase.auth.mfa.listFactors();if(error)throw error;
    if(a!==authEpoch || epoch!==mfaEpoch)return;
    const verified=(data?.totp||[]).filter(f=>f.status==='verified');
    $('mcMfaBody').innerHTML='<p>Հաստատեք մուտքը հաստատող հավելվածի կոդով։ Դրանից հետո կրկին սեղմեք «Հաստատել սահմանումը»։</p>';
    let factors=verified;
    if(!factors.length){
      // Enrol only a new factor owned by this operation; never remove other factors.
      const {data:factor,error:enrollError}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'HaiEdu սահմանումների ստուգում'});if(enrollError)throw enrollError;
      rememberFactor({id:factor.id,userId:owner});
      if(a!==authEpoch || epoch!==mfaEpoch){if(owner===userId)await cleanupFactors(owner);return;}
      enrollment={id:factor.id,userId:owner};factors=[factor];
      const p=document.createElement('p');p.textContent='Սկանավորեք QR կոդը ձեր հաստատող հավելվածով կամ մուտքագրեք գաղտնի բանալին։';$('mcMfaBody').append(p);
      if(/^data:image\/(?:svg\+xml|png)(?:;[^,]+)?,/i.test(factor.totp?.qr_code||'')){const img=document.createElement('img');img.src=factor.totp.qr_code;img.alt='Բազմագործոն մուտքի QR կոդ';$('mcMfaBody').append(img);}
      const secret=document.createElement('code');secret.textContent=factor.totp?.secret||'';$('mcMfaBody').append(secret);
    }
    const form=document.createElement('form');form.innerHTML=`<label>Հաստատման եղանակ<select id="mcFactor">${factors.map(f=>`<option value="${esc(f.id)}">${esc(f.friendly_name||'Հաստատող հավելված')}</option>`).join('')}</select></label><label>6-նիշ կոդ<input id="mcMfaCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required /></label><button type="submit">Հաստատել մուտքը</button>`;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(mfaBusy || a!==authEpoch || epoch!==mfaEpoch)return;mfaBusy=true;form.querySelector('button').disabled=true;
      try{
        const factorId=$('mcFactor').value;
        const {error:verifyError}=await supabase.auth.mfa.challengeAndVerify({factorId,code:$('mcMfaCode').value.trim()});if(verifyError)throw verifyError;
        forgetFactor(factorId);
        if(a!==authEpoch || epoch!==mfaEpoch)return;enrollment=null;await closeMfa();message('Մուտքը հաստատված է։ Այժմ կարող եք հաստատել ընտրված սահմանումը։');
      }catch{if(a===authEpoch && epoch===mfaEpoch)$('mcMfaMessage').textContent='Կոդը չընդունվեց։ Ստուգեք այն և կրկին փորձեք։';}
      finally{if(a===authEpoch && epoch===mfaEpoch){mfaBusy=false;form.querySelector('button').disabled=false;}}
    });$('mcMfaBody').append(form);$('mcMfaCode').focus();
  }catch{if(a===authEpoch && epoch===mfaEpoch)$('mcMfaMessage').textContent='Չհաջողվեց կարգավորել հաստատումը։ Փակեք պատուհանը և կրկին փորձեք։';}
}
function reset(){
  ++authEpoch;++listEpoch;++detailEpoch;userId=null;detail=null;selectedId=null;busy=false;stale=false;offset=0;total=0;
  void closeMfa();$('signOutBtn').classList.add('hidden');$('console').classList.add('hidden');$('authPanel').classList.remove('hidden');$('mcList').replaceChildren();$('mcDetail').replaceChildren();$('mcStats').textContent='';message();
}
async function showSession(session,{force=false}={}){
  const next=session?.user?.id;if(!next){reset();return;}
  if(next===userId&&!force)return;
  reset();userId=next;const a=authEpoch;$('authMessage').textContent='Բեռնվում է…';
  try{
    // Successful protected API authorization is required before revealing the workspace.
    const probe=await invokeContent(endpoint,{action:'list',filters:filters()});
    if(a!==authEpoch || !userId)return;
    if(!probe?.actor)throw new Error('unauthorized');
    $('authPanel').classList.add('hidden');$('console').classList.remove('hidden');$('signOutBtn').classList.remove('hidden');$('authMessage').textContent='';await list(probe);
  }catch{if(a===authEpoch){$('authMessage').textContent='Այս բաժինը հասանելի չէ այս հաշվին կամ տվյալները չեն բեռնվում։';userId=null;}}
}
$('mcFilters').addEventListener('submit',event=>{event.preventDefault();if(!busy){offset=0;void list();}});
$('mcClear').addEventListener('click',()=>{if(busy)return;for(const id of ids)$(id).value='';$('mcSearch').value='';$('mcStatus').value='draft';offset=0;void list();});
$('mcList').addEventListener('click',event=>{const row=event.target.closest('[data-mc-id]');if(row)void openDetail(row.dataset.mcId);});
$('mcDetail').addEventListener('click',event=>{const button=event.target.closest('button');if(button?.dataset.action)void mutate(button.dataset.action);else if(button?.id==='mcReloadDetail' && selectedId)void openDetail(selectedId);});
$('mcDetail').addEventListener('input',event=>{if(['mcTitle','mcDescription'].includes(event.target.id)&&$('mcAcknowledged'))$('mcAcknowledged').checked=false;controls();});
$('mcDetail').addEventListener('change',controls);
$('mcPrev').addEventListener('click',()=>{if(!busy&&offset){offset=Math.max(0,offset-50);void list();}});
$('mcNext').addEventListener('click',()=>{if(!busy&&offset+50<total){offset+=50;void list();}});
$('mcMfaClose').addEventListener('click',()=>{void closeMfa();});
$('mcMfa').addEventListener('cancel',event=>{event.preventDefault();void closeMfa();});
$('signOutBtn').addEventListener('click',async()=>{
  await signOutAccount(supabase,{canLeave:()=>!busy&&discardOkay(),prepare:async()=>{await closeMfa();await cleanupFactors(userId).catch(()=>null);}});
});
$('retryAuth').addEventListener('click',async()=>{const {data}=await supabase.auth.getSession();void showSession(data.session,{force:true});});
window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')reset();else if(session?.user?.id && session.user.id!==userId)void showSession(session);});
const initial=authEpoch;const {data}=await supabase.auth.getSession();if(initial===authEpoch)await showSession(data.session);
