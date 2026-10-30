// Form state deliberately keeps source and required-response choices independent.
const copy=value=>JSON.parse(JSON.stringify(value));
export function newTeacherTaskForm(definition=null){
 const d=definition??{schemaVersion:'teacher-task-v1',title:'',instructions:'',instructionsFormat:'task-text-v1',source:{kind:'text',text:'',format:'task-text-v1'},response:{kind:'text'},assessment:{kind:'feedback'}};
 return{title:d.title,instructions:d.instructions,instructionsFormat:d.instructionsFormat,sourceKind:d.source.kind,text:d.source.text??'',textFormat:d.source.format,sourceUrl:d.source.url??'',attachmentId:d.source.attachmentId??null,responseKind:d.response.kind,allowedFormats:copy(d.response.allowedFormats??['pdf','docx']),assessmentKind:d.assessment.kind,criteria:copy(d.assessment.criteria??[{key:'criterion_1',label:'',maxPoints:4,description:''}])};
}
export function teacherTaskDefinition(form){
 return{schemaVersion:'teacher-task-v1',title:form.title,instructions:form.instructions,...(form.instructionsFormat?{instructionsFormat:form.instructionsFormat}:{}),
 source:form.sourceKind==='text'?{kind:'text',text:form.text,...(form.textFormat?{format:form.textFormat}:{})}:form.sourceKind==='pdf'?{kind:'pdf',attachmentId:form.attachmentId}:{kind:'link',url:form.sourceUrl},
 response:form.responseKind==='document'?{kind:'document',allowedFormats:copy(form.allowedFormats)}:{kind:form.responseKind},
 assessment:form.assessmentKind==='criteria'?{kind:'criteria',criteria:copy(form.criteria)}:{kind:'feedback'}};
}
export function copyTeacherTaskDraft(draft){return newTeacherTaskForm(draft.definition);}
