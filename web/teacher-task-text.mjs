import {escapeHtml as esc} from './learning-navigation.mjs';

// A bounded, versioned text grammar; raw HTML and images are always literal text.
// An absent format remains literal, including definitions frozen before this version.
export const TASK_TEXT_FORMAT='task-text-v1';
export const escapeTaskText=text=>text.replace(/[\\#*\[\]()\-.]/g,'\\$&');
export function taskTextHttps(value){
 if(typeof value!=='string'||value.length>2048||/[\s\u0000-\u001f\u007f]/.test(value))return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&Boolean(u.hostname)&&u.hostname!=='localhost'&&!u.hostname.endsWith('.localhost');}catch{return false;}
}
function inline(text){
 // No recursive parsing: link labels, escaped symbols and bold text are literal.
 const tokens=/\\([\\#*\[\]()\-.])|(?<!!)\[((?:\\[\\#*\[\]()\-.]|[^\]\\\n]){1,300})\]\(([^\s()]{1,2048})\)|\*\*([^*\n]{1,1000})\*\*/g;
 let html='',end=0;
 for(const m of text.matchAll(tokens)){
  html+=esc(text.slice(end,m.index));
  html+=m[1]?esc(m[1]):m[2]&&taskTextHttps(m[3])?`<a href="${esc(m[3])}" target="_blank" rel="noopener noreferrer">${esc(m[2].replace(/\\([\\#*\[\]()\-.])/g,'$1'))}</a>`:m[4]?`<strong>${esc(m[4])}</strong>`:esc(m[0]);
  end=m.index+m[0].length;
 }
 return html+esc(text.slice(end));
}
export function renderTeacherTaskText(value,format){
 const text=typeof value==='string'?value:'';
 if(format!==TASK_TEXT_FORMAT)return `<div class="wa-text">${esc(text)}</div>`;
 const blocks=[];let lines=[],kind=null,start=1;
 const flush=()=>{if(!lines.length)return;blocks.push(kind==='ul'?`<ul>${lines.map(s=>`<li>${inline(s)}</li>`).join('')}</ul>`:kind==='ol'?`<ol start="${start}">${lines.map(s=>`<li>${inline(s)}</li>`).join('')}</ol>`:`<p>${lines.map(inline).join('<br>')}</p>`);lines=[];kind=null;};
 for(const line of text.replaceAll('\r\n','\n').replaceAll('\r','\n').split('\n')){
  if(!line.trim()){flush();continue;}
  const heading=/^(#{1,2}) (.+)$/.exec(line),list=/^(?:- (.*)|(\d{1,3})\. (.*))$/.exec(line);
  if(heading){flush();const level=heading[1].length+4;blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);continue;}
  const next=list?(list[2]?'ol':'ul'):'p';
  if(kind!==next){flush();kind=next;if(next==='ol')start=Number(list[2]);}
  lines.push(list?(list[1]??list[3]):line);
 }
 flush();return `<div class="task-text" data-task-text-format="${TASK_TEXT_FORMAT}">${blocks.join('')}</div>`;
}
// Pure textarea operation preserves the editing selection and pasted content.
export function taskTextEdit(text,start,end,action,url){
 if(action==='link'){
  if(!taskTextHttps(url))return null;
  const label=(text.slice(start,end).replaceAll('\n',' ').replace(/\\([\\#*\[\]()\-.])/g,'$1')||'Հղում').replace(/[\[\]\\]/g,'\\$&');
  const href=url.replaceAll('(','%28').replaceAll(')','%29');
  return {text:text.slice(0,start)+`[${label}](${href})`+text.slice(end),start:start+1,end:start+1+label.length};
 }
 const from=start===0?0:text.lastIndexOf('\n',start-1)+1;
 const last=end>start&&text[end-1]==='\n'?end-1:end;
 const after=text.indexOf('\n',last),to=after<0?text.length:after;
 const selected=text.slice(from,to).split('\n');
 const changed=selected.map((line,i)=>action==='heading'?'# '+line:action==='bullet'?'- '+line:action==='number'?(i+1)+'. '+line:line).join('\n');
 return {text:text.slice(0,from)+changed+text.slice(to),start:from,end:from+changed.length};
}
