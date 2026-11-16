import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {hasActiveLiveSession} from '../_shared/auth.ts';
import {createClientFailureHandler} from '../_shared/client-failure-handler.mjs';

// Keep verify_jwt=true when deploying. This application check also validates the
// live session; an old access token alone is insufficient after logout/revocation.
function admin(signal:AbortSignal) {
  return createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal,redirect:'error'})},
  });
}
Deno.serve(createClientFailureHandler({mode:()=>Deno.env.get('HAIEDU_CLIENT_FAILURE_REPORTS_MODE')??'off',
  authenticate:async(token:string,signal:AbortSignal)=>{
    const client=admin(signal);
    const {data,error}=await client.auth.getUser(token);
    if(error||!data.user||!await hasActiveLiveSession(client,token,data.user.id))return null;
    const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return {id:data.user.id,session:claims.session_id};
  },
  record:async(actor:{id:string;session:string},report:unknown,signal:AbortSignal)=>{
    const {data,error}=await admin(signal).rpc('service_record_client_failure',{p_actor:actor.id,p_session:actor.session,p_report:report});
    return error?'unavailable':data;
  },
}));
