// PR419's combined list is a read. Admit only the browser's exact inbox shape;
// actor/context overrides and every write action remain outside the QA guard.
export function studentWorkReadAllowed({actor,method,fn,body}){
 return actor.endsWith('_student')&&method==='POST'&&fn==='get-student-work'
  &&body&&typeof body==='object'&&!Array.isArray(body)
  &&Object.keys(body).sort().join(',')==='action,payload'&&body.action==='inbox'
  &&body.payload&&typeof body.payload==='object'&&!Array.isArray(body.payload)
  &&Object.keys(body.payload).join(',')==='state'&&['current','history'].includes(body.payload.state);
}
