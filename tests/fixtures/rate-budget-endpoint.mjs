import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {actor,token} from './session-rate-budget.mjs';
// Actual recursively loaded Edge/shared sources and real SQL. Provider Auth and
// existing live-session gate are explicit doubles; no remote services are used.
export function rateEndpoint(name,admin,{active=true,authenticated=true,mode='enforce-v1'}={}) {
  let handler;const root=path.resolve('supabase/functions'),cache=new Map(),messages=[];
  const bearer=token(1,{aal:'aal2',iss:'https://isolated.invalid/auth/v1',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600});
  admin.auth={...admin.auth,getUser:async()=>authenticated?{data:{user:{id:actor(1)}},error:null}:{data:{user:null},error:{status:401}},
    getClaims:async()=>authenticated?{data:{claims:JSON.parse(Buffer.from(bearer.split('.')[1],'base64url'))},error:null}:{data:null,error:{status:401}}};
  const context=vm.createContext({Response,Request,Headers,atob,URL,TextDecoder,TextEncoder,AbortController,setTimeout,clearTimeout,crypto,
    console:{error:(...x)=>messages.push(x),warn:(...x)=>messages.push(x)},
    Deno:{env:{get:n=>n==='HAIEDU_RATE_BUDGETS_MODE'?mode:n==='SUPABASE_URL'?'https://isolated.invalid':'isolated-only'},serve:fn=>{handler=fn;}}});
  function load(file){
    if(file===path.join(root,'_shared/auth.ts'))return {hasActiveLiveSession:async()=>active};
    if(!file.startsWith(root+path.sep))throw Error('Fixture import outside Edge source');
    if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const code=ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022});
    const require=specifier=>specifier.startsWith('npm:@supabase/supabase-js')?{createClient:()=>admin}:load(path.resolve(path.dirname(file),specifier));
    const fn=vm.runInContext('(function(require,module,exports){'+code+'\n})',context,{filename:file});fn(require,module,module.exports);return module.exports;
  }
  load(path.join(root,name,'index.ts'));if(typeof handler!=='function')throw Error('No endpoint captured: '+name);
  return {messages,async call(body={},method='POST') {return handler(new Request('https://isolated.invalid/functions/v1/'+name,{method,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));}};
}
