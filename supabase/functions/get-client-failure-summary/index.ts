import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {createClientSummaryHandler} from '../_shared/client-failure-summary.mjs';
// This one read-only exporter uses a dedicated capability, not an end-user JWT.
// Deploy with verify_jwt=false only for this route. Neither input nor output can
// select a table, SQL, actor, tenant, time range or arbitrary diagnostic text.
Deno.serve(createClientSummaryHandler({
  mode:()=>Deno.env.get('HAIEDU_CLIENT_FAILURE_REPORTS_MODE')??'off',
  secret:()=>Deno.env.get('HAIEDU_CLIENT_FAILURE_SUMMARY_KEY')??'',
  read:async()=>{
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
      auth:{persistSession:false,autoRefreshToken:false},
      global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(2000),redirect:'error'})},
    });
    const {data,error}=await client.rpc('service_read_client_failure_summary');
    if(error)throw Error('summary_unavailable');return data;
  },
}));
