const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const historyKey=actor=>'haiedu:teacher-recent:v1:'+actor;
export function recentTeacherClasses(actor,storage=globalThis.sessionStorage){try{return JSON.parse(storage.getItem(historyKey(actor))||'[]').filter(uuid).slice(0,4);}catch{return [];}}
export function rememberTeacherClass(actor,id){if(!actor||!uuid(id))return;try{sessionStorage.setItem(historyKey(actor),JSON.stringify([id,...recentTeacherClasses(actor).filter(v=>v!==id)].slice(0,4)));}catch{}}
export function clearTeacherRecent(actor){try{sessionStorage.removeItem(historyKey(actor));}catch{}}
export function todayRequest(actor,search=globalThis.location.search,storage=globalThis.sessionStorage){const q=new URLSearchParams(search);return {recent:recentTeacherClasses(actor,storage),...(q.get('queueAssignment')?{assignmentId:q.get('queueAssignment')}:{}),...(q.get('todayWork')?{workId:q.get('todayWork')}: {})};}
