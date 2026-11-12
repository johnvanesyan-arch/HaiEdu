import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {createTeacherWorkspaceHandler} from '../_shared/teacher-workspace-handler.mjs';
let readAdmin:any=null;
Deno.serve(createTeacherWorkspaceHandler({rateBudgetRoute:"get-teacher-workspace",
 createAdmin:(url:string,key:string)=>readAdmin??=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),
 env:{url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')},
}));
