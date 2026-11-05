import{j as a}from"/_assets/shared-2OPZOLFV.js";var g="task-text-v1",k=e=>e.replace(/[\\#*\[\]()\-.]/g,"\\$&");function m(e){if(typeof e!="string"||e.length>2048||/[\s\u0000-\u001f\u007f]/.test(e))return!1;try{let t=new URL(e);return t.protocol==="https:"&&!t.username&&!t.password&&!!t.hostname&&t.hostname!=="localhost"&&!t.hostname.endsWith(".localhost")}catch{return!1}}function $(e){let t=/\\([\\#*\[\]()\-.])|(?<!!)\[((?:\\[\\#*\[\]()\-.]|[^\]\\\n]){1,300})\]\(([^\s()]{1,2048})\)|\*\*([^*\n]{1,1000})\*\*/g,l="",s=0;for(let n of e.matchAll(t))l+=a(e.slice(s,n.index)),l+=n[1]?a(n[1]):n[2]&&m(n[3])?`<a href="${a(n[3])}" target="_blank" rel="noopener noreferrer">${a(n[2].replace(/\\([\\#*\[\]()\-.])/g,"$1"))}</a>`:n[4]?`<strong>${a(n[4])}</strong>`:a(n[0]),s=n.index+n[0].length;return l+a(e.slice(s))}function x(e,t){let l=typeof e=="string"?e:"";if(t!==g)return`<div class="wa-text">${a(l)}</div>`;let s=[],n=[],c=null,u=1,p=()=>{n.length&&(s.push(c==="ul"?`<ul>${n.map(o=>`<li>${$(o)}</li>`).join("")}</ul>`:c==="ol"?`<ol start="${u}">${n.map(o=>`<li>${$(o)}</li>`).join("")}</ol>`:`<p>${n.map($).join("<br>")}</p>`),n=[],c=null)};for(let o of l.replaceAll(`\r
`,`
`).replaceAll("\r",`
`).split(`
`)){if(!o.trim()){p();continue}let h=/^(#{1,2}) (.+)$/.exec(o),i=/^(?:- (.*)|(\d{1,3})\. (.*))$/.exec(o);if(h){p();let f=h[1].length+4;s.push(`<h${f}>${$(h[2])}</h${f}>`);continue}let r=i?i[2]?"ol":"ul":"p";c!==r&&(p(),c=r,r==="ol"&&(u=Number(i[2]))),n.push(i?i[1]??i[3]:o)}return p(),`<div class="task-text" data-task-text-format="${g}">${s.join("")}</div>`}function T(e,t,l,s,n){if(s==="link"){if(!m(n))return null;let r=(e.slice(t,l).replaceAll(`
`," ").replace(/\\([\\#*\[\]()\-.])/g,"$1")||"Հղում").replace(/[\[\]\\]/g,"\\$&"),f=n.replaceAll("(","%28").replaceAll(")","%29");return{text:e.slice(0,t)+`[${r}](${f})`+e.slice(l),start:t+1,end:t+1+r.length}}let c=t===0?0:e.lastIndexOf(`
`,t-1)+1,u=l>t&&e[l-1]===`
`?l-1:l,p=e.indexOf(`
`,u),o=p<0?e.length:p,i=e.slice(c,o).split(`
`).map((r,f)=>s==="heading"?"# "+r:s==="bullet"?"- "+r:s==="number"?f+1+". "+r:r).join(`
`);return{text:e.slice(0,c)+i+e.slice(o),start:c,end:c+i.length}}export{g as a,k as b,x as c,T as d};
