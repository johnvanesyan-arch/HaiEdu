import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {hasActiveLiveSession} from '../_shared/auth.ts';
import {createSupplementaryResourcesHandler} from '../_shared/supplementary-resources-handler.mjs';
Deno.serve(createSupplementaryResourcesHandler({
 createAdmin:(url:string,key:string)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),
 hasActiveLiveSession,
 env:{url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}
}));
