const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
// SDK verification checks the signature using project JWKS (or Auth for legacy
// symmetric keys). Only public signing keys may be cached. Every caller still
// checks live Auth user/session and current authorization in SQL before/after data.
export async function verifyTeacherReadIdentity(admin,token,projectUrl,now=()=>Date.now()){
 try{
  const {data,error}=await admin.auth.getClaims(token);
  const c=data?.claims,aud=Array.isArray(c?.aud)?c.aud:[c?.aud];
  if(error||!uuid(c?.sub)||!uuid(c?.session_id)||c.iss!==projectUrl.replace(/\/$/,'')+'/auth/v1'||
   !aud.includes('authenticated')||!Number.isFinite(c.exp)||c.exp*1000<=now()||
   (c.nbf!==undefined&&(!Number.isFinite(c.nbf)||c.nbf*1000>now())))return null;
  return {id:c.sub,sessionId:c.session_id};
 }catch{return null;}
}
