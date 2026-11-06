// A single in-page transition may reuse selector labels already on screen.
// This is not an authorization result: catalog/queue/action reads stay fresh.
export function classNavigationHandoff({actorId,klass,institutionalTeacher,isCurrent}){
 let available=true;
 return ({actorId:nextActor,classId,selection})=>{
  const once=available;available=false;
  if(!once||!isCurrent()||actorId!==nextActor||!institutionalTeacher||!selection||klass?.id!==classId)return null;
  if(klass.assignmentId!==selection.assignmentId||klass.selectedUnit?.curriculumReleaseId!==selection.curriculumReleaseId||klass.selectedUnit?.unitId!==selection.unitId)return null;
  // Do not carry roster, analytics, submissions or permission flags across views.
  const detail=Object.fromEntries(['id','assignmentId','name','subjectName','schoolName','academicYear','isActive','unitOptions','selectedUnit'].map(k=>[k,klass[k]]));
  return {institutionalTeacher:true,classes:[detail]};
 };
}
