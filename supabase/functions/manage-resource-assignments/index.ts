import {createClient} from "npm:@supabase/supabase-js@2";
import {hasActiveLiveSession} from "../_shared/auth.ts";
import {createResourceAssignmentsHandler} from "../_shared/resource-assignments-handler.mjs";
Deno.serve(createResourceAssignmentsHandler({createAdmin:(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),hasActiveLiveSession,env:{url:Deno.env.get("SUPABASE_URL"),key:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}}));
