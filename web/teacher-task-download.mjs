// Versioned task-file endpoints use PDF or binary DOCX transport. The Supabase
// Functions client decodes octet-stream as Blob and DOCX MIME as lossy text.
const PDF='application/pdf',DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export function taskDownloadBlob(value){
 if(!(value instanceof Blob)||value.size<1||value.size>10*1024*1024)throw Error('task_file_invalid');
 if(value.type==='application/octet-stream')return new Blob([value],{type:DOCX});
 if(value.type!==PDF&&value.type!==DOCX)throw Error('task_file_invalid');
 return value;
}
