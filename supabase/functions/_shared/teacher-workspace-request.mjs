const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function isTeacherWorkspaceRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return false;
 const {assignmentId=null,cursor=null,workId=null,recent=[]}=body;
 return !Object.keys(body).some(k=>!['assignmentId','cursor','workId','recent'].includes(k))&&
  (assignmentId===null||uuid(assignmentId))&&(workId===null||uuid(workId))&&Array.isArray(recent)&&recent.length<=4&&recent.every(uuid)&&
  (cursor===null||Boolean(cursor&&!Array.isArray(cursor)&&typeof cursor==='object'&&Object.keys(cursor).length===2&&uuid(cursor.id)&&typeof cursor.submittedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(cursor.submittedAt)&&Number.isFinite(Date.parse(cursor.submittedAt))));
}
