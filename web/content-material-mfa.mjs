// Used only by unit-material review. Supabase verifies the factor and issues the AAL2 session.
export async function ensureMaterialMfa(client,isCurrent){
 const {data:level,error:levelError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
 if(levelError)throw levelError;if(!isCurrent())return false;if(level?.currentLevel==='aal2')return true;
 const {data,error}=await client.auth.mfa.listFactors();if(error)throw error;if(!isCurrent())return false;
 let factors=(data?.totp??data?.all??[]).filter(f=>f.status==='verified'&&(!f.factor_type||f.factor_type==='totp')),enrollment=null;
 if(!factors.length){const r=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'HaiEdu բովանդակության ստուգում'});if(r.error)throw r.error;enrollment=r.data;factors=[enrollment];}
 if(!isCurrent()){if(enrollment)await client.auth.mfa.unenroll({factorId:enrollment.id}).catch(()=>{});return false;}
 const dialog=document.createElement('dialog');dialog.className='material-mfa';dialog.setAttribute('aria-label','Բազմագործոն հաստատում');
 dialog.innerHTML='<h2>Բազմագործոն հաստատում</h2><p>Մուտքագրեք ձեր հաստատող հավելվածի կոդը։</p><div data-enrollment></div><label>Հաստատման եղանակ<select></select></label><label>Հաստատման կոդ<input inputmode="numeric" autocomplete="one-time-code" maxlength="8"></label><p role="status"></p><div class="material-actions"><button type="button" data-verify>Հաստատել</button><button type="button" data-cancel class="ghost">Չեղարկել</button></div>';
 const select=dialog.querySelector('select'),input=dialog.querySelector('input'),status=dialog.querySelector('[role=status]'),verify=dialog.querySelector('[data-verify]'),cancel=dialog.querySelector('[data-cancel]');
 for(const [i,f]of factors.entries()){const o=document.createElement('option');o.value=f.id;o.textContent=f.friendly_name||`Հաստատման եղանակ ${i+1}`;select.append(o);}
 if(enrollment){const box=dialog.querySelector('[data-enrollment]'),p=document.createElement('p');p.textContent='Սկանավորեք QR կոդը հաստատող հավելվածով կամ մուտքագրեք բանալին։';box.append(p);const qr=String(enrollment.totp?.qr_code??'');if(/^data:image\/(?:svg\+xml|png)(?:;[^,]+)?,/i.test(qr)){const img=document.createElement('img');img.src=qr;img.alt='Հաստատող հավելվածի QR կոդ';box.append(img);}const secret=document.createElement('code');secret.textContent=enrollment.totp?.secret??'';box.append(secret);}
 document.body.append(dialog);dialog.showModal();input.focus();let busy=false,done=false;
 return new Promise(resolve=>{
  async function finish(ok){if(done)return;done=true;dialog.close();dialog.remove();if(!ok&&enrollment&&isCurrent())await client.auth.mfa.unenroll({factorId:enrollment.id}).catch(()=>{});resolve(ok&&isCurrent());}
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)void finish(false);});cancel.onclick=()=>finish(false);
  dialog.addEventListener('material-session-ended',()=>finish(false));
  verify.onclick=async()=>{if(busy||done)return;if(!isCurrent())return finish(false);const code=input.value.trim();if(!/^\d{6,8}$/.test(code)){status.textContent='Մուտքագրեք հավելվածում երևացող կոդը։';return;}busy=true;verify.disabled=cancel.disabled=true;status.textContent='Կոդը ստուգվում է…';try{const r=await client.auth.mfa.challengeAndVerify({factorId:select.value,code});if(r.error)throw r.error;return finish(true);}catch{if(!done){status.textContent='Կոդը չի հաստատվել։ Փորձեք նորից։';busy=false;verify.disabled=cancel.disabled=false;}}};
 });
}
