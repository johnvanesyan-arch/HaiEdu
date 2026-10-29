import {taskHttpsUrl} from './teacher-task-definition.mjs';
export const RESPONSE_FILE_LIMIT=10*1024*1024;
export const RESPONSE_MIME={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
export const taskUuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function validTaskResponse(c,{draft=false}={}){
 if(!c||typeof c!=='object'||Array.isArray(c))return false;
 const keys={text:['kind','text'],link:['kind','url'],document:['kind','fileId']}[c.kind];if(!keys||Object.keys(c).length!==2||Object.keys(c).some(k=>!keys.includes(k)))return false;
 if(c.kind==='text')return typeof c.text==='string'&&c.text.length<=20000&&(draft||Boolean(c.text.trim()));
 if(c.kind==='link')return typeof c.url==='string'&&c.url.length<=2048&&(draft||taskHttpsUrl(c.url));
 return draft&&c.fileId===null||taskUuid(c.fileId);
}
