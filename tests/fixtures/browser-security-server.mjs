import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const rootPath=fileURLToPath(new URL('../../web/',import.meta.url));
const configPath=new URL('../../vercel.json',import.meta.url);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};

// Bounded emulation of this repository's four Vercel header path patterns.
// A hosted preview readback remains a separate check of Vercel's actual behavior.
export function headersForPath(config,pathname){
 const headers={};
 for(const rule of config.headers??[]){
  let match;
  if(rule.source==='/(.*)')match=true;
  else if(rule.source==='/_assets/:path*')match=pathname.startsWith('/_assets/');
  else if(['/release.json','/asset-manifest.json'].includes(rule.source))match=pathname===rule.source;
  else throw Error('Unmodeled Vercel header rule: '+rule.source);
  if(match)for(const h of rule.headers)headers[h.key.toLowerCase()]=h.value;
 }
 return headers;
}

const probes={
 '/__security/enforcement.html':['text/html','<!doctype html><meta charset="utf-8"><title>Enforcement fixture</title><script type="module" src="/__security/enforcement.mjs"></script>'],
 '/__security/enforcement.mjs':['text/javascript',`
  // Run as ordinary page code. DevTools Runtime.evaluate may permit evaluation
  // that the document policy would refuse for application scripts.
  const inline=document.createElement('script');inline.textContent='window.__inlinePolicyProbe=true';document.head.append(inline);
  const button=document.createElement('button');button.setAttribute('onclick','window.__attributeProbe=true');document.body.append(button);button.click();
  let evalError=null,functionError=null;
  try{window.eval('window.__evalProbe=true');}catch(e){evalError=e.name;}
  try{new Function('window.__functionProbe=true')();}catch(e){functionError=e.name;}
  window.__enforcementResults={inline:window.__inlinePolicyProbe===true,attribute:window.__attributeProbe===true,eval:window.__evalProbe===true,dynamicFunction:window.__functionProbe===true,evalError,functionError};
  window.__enforcementReady=true;
 `],
 '/__security/policy.html':['text/html','<!doctype html><meta charset="utf-8"><title>Policy fixture</title><main id="fixture"></main><script type="module" src="/__security/policy.mjs"></script>'],
 '/__security/policy.mjs':['text/javascript',`
  window.__violations=[];
  document.addEventListener('securitypolicyviolation',event=>window.__violations.push({directive:event.effectiveDirective,disposition:event.disposition}));
  const script=document.createElement('script');script.textContent='window.__inlinePolicyProbe=true';document.head.append(script);
  window.__policyReady=true;
 `],
 '/__security/mime.html':['text/html','<!doctype html><meta charset="utf-8"><title>MIME fixture</title><script src="/__security/plain-script"></script><script type="module" src="/__security/ready.mjs"></script>'],
 '/__security/plain-script':['text/plain','window.__wrongMimeExecuted=true;'],
 '/__security/ready.mjs':['text/javascript','window.__mimeReady=true;'],
 '/__security/empty.html':['text/html','<!doctype html><meta charset="utf-8"><title>Browser policy fixture</title><main id="fixture"></main>'],
 '/__security/frame-host.html':['text/html','<!doctype html><meta charset="utf-8"><iframe src="/__security/frame-target.html"></iframe>'],
 '/__security/frame-target.html':['text/html','<!doctype html><meta charset="utf-8"><script type="module" src="/__security/frame-target.mjs"></script>'],
 '/__security/frame-target.mjs':['text/javascript','parent.postMessage("bf13-frame-loaded","*");'],
};

export async function serveSecurityWeb({root=rootPath,routes={},extraHeaders={},cspMode=null}={}){
 if(cspMode!==null&&!['report-only','enforce'].includes(cspMode))throw Error('Unknown fixture CSP mode');
 const config=JSON.parse(await readFile(configPath,'utf8'));
 const requests=[];
 const server=createServer(async(request,response)=>{
  const url=new URL(request.url,'http://fixture.invalid');
  const configured=headersForPath(config,url.pathname);
  if(cspMode){
   const policy=configured['content-security-policy']??configured['content-security-policy-report-only'];
   if(!policy)throw Error('Fixture requires a reviewed CSP policy');
   delete configured['content-security-policy'];delete configured['content-security-policy-report-only'];
   configured[cspMode==='enforce'?'content-security-policy':'content-security-policy-report-only']=policy;
  }
  const headers={...configured,...extraHeaders};
  // A null header is an explicit negative-control fixture, never a deployment change.
  for(const [name,value] of Object.entries(headers))if(value===null)delete headers[name];
  requests.push({path:url.pathname,method:request.method,referrer:request.headers.referer??null});
  const route=routes[url.pathname]??probes[url.pathname];
  if(route){response.writeHead(200,{'Content-Type':route[0],...headers}).end(route[1]);return;}
  let filename;
  try{
   let name=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
   if(!path.extname(name))name+='.html';
   filename=path.resolve(root,name);
   if(!filename.startsWith(path.resolve(root)+path.sep)){response.writeHead(403,headers).end();return;}
   const bytes=await readFile(filename);
   response.writeHead(200,{'Content-Type':mime[path.extname(filename)]??'application/octet-stream',...headers}).end(bytes);
  }catch{response.writeHead(404,headers).end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return{origin:`http://127.0.0.1:${server.address().port}`,requests,config,close:()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})};
}
