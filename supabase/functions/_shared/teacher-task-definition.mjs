// Shared, subject-neutral contract. Source and required response are independent.
export const TEACHER_TASK_VERSION='teacher-task-v1';
export const TASK_FILE_LIMIT=10*1024*1024;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const string=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function taskHttpsUrl(value){
 if(typeof value!=='string'||value.length>2048)return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&Boolean(u.hostname)&&u.hostname!=='localhost'&&!u.hostname.endsWith('.localhost');}catch{return false;}
}
export function validateTeacherTaskDefinition(d,{draft=false}={}){
 const errors=[];const issue=(field,code)=>errors.push({field,code});
 const shape=(v,keys)=>object(v)&&Object.keys(v).every(k=>keys.includes(k));
 if(!shape(d,['schemaVersion','title','instructions','source','response','assessment']))return{valid:false,errors:[{field:'definition',code:'invalid_shape'}]};
 if(d.schemaVersion!==TEACHER_TASK_VERSION)issue('schemaVersion','unsupported_version');
 if(typeof d.title!=='string'||d.title.length>200||!draft&&!d.title.trim())issue('title','title_required');
 if(typeof d.instructions!=='string'||d.instructions.length>8000||!draft&&!d.instructions.trim())issue('instructions','instructions_required');
 if(!shape(d.source,['kind','text','url','attachmentId'])||!['text','pdf','link'].includes(d.source.kind))issue('source','invalid_source');
 else{
  const s=d.source;
  if(s.kind==='text'&&(s.url!==undefined||s.attachmentId!==undefined||typeof s.text!=='string'||s.text.length>20000||!draft&&!s.text.trim()))issue('source.text','text_required');
  if(s.kind==='pdf'&&(s.text!==undefined||s.url!==undefined||!(draft&&(s.attachmentId===null||s.attachmentId===undefined))&&!uuid(s.attachmentId)))issue('source.attachmentId','pdf_required');
  if(s.kind==='link'&&(s.text!==undefined||s.attachmentId!==undefined||!(draft&&s.url==='')&&!taskHttpsUrl(s.url)))issue('source.url','https_required');
 }
 if(!shape(d.response,['kind','allowedFormats'])||!['text','document','link'].includes(d.response.kind))issue('response','invalid_response');
 else if(d.response.kind==='document'){
  const a=d.response.allowedFormats;if(!Array.isArray(a)||a.length<1||a.length>2||new Set(a).size!==a.length||a.some(v=>!['pdf','docx'].includes(v)))issue('response.allowedFormats','document_formats_required');
 }else if(d.response.allowedFormats!==undefined)issue('response.allowedFormats','unexpected_formats');
 if(!shape(d.assessment,['kind','criteria'])||!['feedback','criteria'].includes(d.assessment.kind))issue('assessment','invalid_assessment');
 else if(d.assessment.kind==='feedback'){
  if(d.assessment.criteria!==undefined)issue('assessment.criteria','unexpected_criteria');
 }else{
  const rows=d.assessment.criteria;
  if(!Array.isArray(rows)||rows.length<1||rows.length>12)issue('assessment.criteria','criteria_required');
  else{const keys=new Set();for(const [i,c]of rows.entries()){
   if(!shape(c,['key','label','maxPoints','description'])||!string(c.key,40)||!/^[a-z][a-z0-9_]*$/.test(c.key)||keys.has(c.key)||(draft?typeof c.label!=='string'||c.label.length>160:!string(c.label,160))||!(draft&&c.maxPoints===null)&&(!Number.isSafeInteger(c.maxPoints)||c.maxPoints<1||c.maxPoints>100)||c.description!==undefined&&(typeof c.description!=='string'||c.description.length>1000))issue('assessment.criteria.'+i,'invalid_criterion');
   if(object(c))keys.add(c.key);
  }}
 }
 return{valid:errors.length===0,errors};
}
