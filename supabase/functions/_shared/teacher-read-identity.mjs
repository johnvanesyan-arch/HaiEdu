const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
// Subject/role-neutral read identity. SDK verification checks project JWKS (or Auth for legacy
// symmetric keys). Only public signing keys may be cached. Every caller still
// checks live Auth user/session and current authorization in SQL before/after data.
export async function verifyReadIdentity(admin,token,projectUrl,now=()=>Date.now()){
 try{
  const {data,error}=await admin.auth.getClaims(token);
  if(error)throw error;
  const c=data?.claims,aud=Array.isArray(c?.aud)?c.aud:[c?.aud];
  if(!uuid(c?.sub)||!uuid(c?.session_id)||c.iss!==projectUrl.replace(/\/$/,'')+'/auth/v1'||
   !aud.includes('authenticated')||!Number.isFinite(c.exp)||c.exp*1000<=now()||
   (c.nbf!==undefined&&(!Number.isFinite(c.nbf)||c.nbf*1000>now())))return null;
  return {id:c.sub,sessionId:c.session_id};
 }catch(error){
  // Invalid credentials remain 401. Transport, JWKS and provider failures are
  // availability failures, never proof that a credential or enrollment expired.
  const status=Number(error?.status);
  if(['AuthInvalidJwtError','AuthSessionMissingError'].includes(error?.name)||[400,401,403,422].includes(status))return null;
  const kind=error?.name==='AuthRetryableFetchError'||error instanceof TypeError?'transport':status===429?'rate_limit':'verification';
  console.warn('auth_verification_unavailable',{kind,status:Number.isInteger(status)&&status>=0&&status<=599?status:null});
  throw Object.assign(new Error('auth_verification_unavailable'),{code:'auth_verification_unavailable'});
 }
}
// Existing teacher consumers retain their exported contract.
export const verifyTeacherReadIdentity=verifyReadIdentity;
