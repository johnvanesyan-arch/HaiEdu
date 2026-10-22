import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { hasActiveLiveSession } from '../_shared/auth.ts';
import { createUnitMaterialsHandler } from '../_shared/unit-materials-handler.mjs';
Deno.serve(createUnitMaterialsHandler({
 createAdmin:(url:string,key:string)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),
 hasActiveLiveSession,
 env:{url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')},
}));
