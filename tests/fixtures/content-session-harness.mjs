import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
export function node(){const classes=new Set();return{value:'',textContent:'',innerHTML:'',dataset:{},listeners:new Map(),classList:{add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v)),contains:v=>classes.has(v),toggle:(v,b)=>b?classes.add(v):classes.delete(v)},addEventListener(t,f){this.listeners.set(t,f);},focus(){},setAttribute(){},getAttribute(){return null;},scrollTo(){}};}
export function moduleSource(path){return readFileSync(path,'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');}
export async function itemHarness(){const nodes=new Map(),calls=[],loads=[],events=[];let authListener;const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const auth={getSession:async()=>({data:{session:null}}),onAuthStateChange:f=>{authListener=f;},signOut:async()=>{authListener('SIGNED_OUT',null);}};
 const api=await vm.runInNewContext(`(async()=>{${moduleSource('web/content.js')}
  collectOptions=()=>[{key:'A',contentHy:'A'},{key:'B',contentHy:'B'}];collectMisconceptions=()=>[];collectAnswerKey=()=>({answer:'A'});
  renderRows=()=>{};renderStats=()=>{};populateSkillFilter=()=>{};renderLoadingDetail=()=>{};renderDetail=()=>{};
  return{saveRevision,showForSession,refresh,selectItem,prepare(){activeSession={user:{id:'QA-user'}};selectedId='QA-item';dashboard={items:[{id:'QA-item',code:'QA-P3',type:'single_choice',latestQa:{passed:true},reviewStatus:'needs_review'}]};selectedDetail={editing:{contentEditable:true},misconceptions:[],item:{id:'QA-item'}};editorDirty=true;},snapshot:()=>({activeSession,selectedId,selectedDetail,dashboard,editorDirty,workflowBusy})};})()`,{
 document:{body:{dataset:{contentMode:'item'}},getElementById:get,querySelectorAll:()=>[]},window:{__haieduSupabaseClient:{auth,functions:{invoke(name,{body}){const r=deferred();calls.push({name,body,...r});return r.promise;}}},addEventListener(){},dispatchEvent:e=>events.push(e),confirm:()=>true},location:{search:'?id=QA-item'},URLSearchParams,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},clearContentDashboardCache(){},loadContentDashboard(){const r=deferred();loads.push(r);return r.promise;}});
 api.prepare();for(const [id,value]of Object.entries({editPromptHy:'Unsaved QA edit',editPromptEn:'',editStimulus:'{}',metaDifficulty:'2',metaFamily:'application',metaSource:'QA fixture',changeSummary:'QA revision'}))get(id).value=value;
 return{api,get,calls,loads,events,authEvent:(event,session={user:{id:'QA-user'}})=>authListener(event,session),logout:()=>authListener('SIGNED_OUT',null)};
}
export async function guideHarness(){const nodes=new Map(),calls=[];let authListener;const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const auth={getSession:async()=>({data:{session:null}}),onAuthStateChange:f=>{authListener=f;}};
 const source=moduleSource('web/content-guides.js');
 const api=await vm.runInNewContext(`(async()=>{${source};renderStats=()=>{};populateFilters=()=>{};renderRows=()=>{};renderEditor=()=>{};
 contentFromEditor=()=>({});referencesFromEditor=()=>({});
 return{selectGuide,refreshCatalog,showForSession,runWorkflow,prepare(){selectedId='skill:QA-guide';catalog=[{guideScope:'skill',guideSourceId:'QA-guide'}];detail={guide:{guideScope:'skill',guideSourceId:'QA-guide'}};editorDirty=false;},snapshot:()=>({catalog,selectedId,detail,editorDirty})};})()`,{document:{getElementById:get,querySelectorAll:()=>[],querySelector:()=>null},window:{__haieduSupabaseClient:{auth,functions:{invoke(name,{body}){const r=deferred();calls.push({name,body,...r});return r.promise;}}},location:{href:'https://isolated.invalid/content-guides?id=skill%3AQA-guide',search:'?id=skill%3AQA-guide'},history:{replaceState(){},pushState(){}},addEventListener(){},scrollTo(){}},URL,URLSearchParams,setTimeout,confirm:()=>true});
 api.prepare();return{api,get,calls,logout:()=>api.showForSession(null),authEvent:(event,session)=>authListener(event,session)};
}
export function cacheHarness({sessionRead}={}){let now=1000;const authListeners=[],requests=[],storage=new Map(),nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const source=moduleSource('web/content-workspace.js');
 const api=vm.runInNewContext(`(()=>{${source};return{loadContentDashboard,readContentDashboardCache,clearContentDashboardCache,mountContentWorkspace};})()`,{window:{__haieduSupabaseClient:{functions:{invoke(name,{body}){const r=deferred();requests.push({name,body,...r});return r.promise;}},auth:{onAuthStateChange:f=>{authListeners.push(f);},getSession:()=>sessionRead??Promise.resolve({data:{session:{user:{id:'QA-user'}}}}),signOut:async()=>{authListeners.forEach(f=>f('SIGNED_OUT',null));}}}},document:{getElementById:get},sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},Date:{now:()=>now},Response,location:{replace(){}}});
 return{api,requests,storage,get,advance:n=>{now+=n;},logout:()=>authListeners.forEach(f=>f('SIGNED_OUT',null))};
}
