import{a,b as g}from"/_assets/shared-Q6S2FGUP.js";var m="task-text-v1",x=l=>l.replace(/[\\#*\[\]()\-.]/g,"\\$&");function h(l){let s=/\\([\\#*\[\]()\-.])|(?<!!)\[((?:\\[\\#*\[\]()\-.]|[^\]\\\n]){1,300})\]\(([^\s()]{1,2048})\)|\*\*([^*\n]{1,1000})\*\*/g,n="",t=0;for(let e of l.matchAll(s))n+=a(l.slice(t,e.index)),n+=e[1]?a(e[1]):e[2]&&g(e[3])?`<a href="${a(e[3])}" target="_blank" rel="noopener noreferrer">${a(e[2].replace(/\\([\\#*\[\]()\-.])/g,"$1"))}</a>`:e[4]?`<strong>${a(e[4])}</strong>`:a(e[0]),t=e.index+e[0].length;return n+a(l.slice(t))}function T(l,s){let n=typeof l=="string"?l:"";if(s!==m)return`<div class="wa-text">${a(n)}</div>`;let t=[],e=[],c=null,u=1,p=()=>{e.length&&(t.push(c==="ul"?`<ul>${e.map(r=>`<li>${h(r)}</li>`).join("")}</ul>`:c==="ol"?`<ol start="${u}">${e.map(r=>`<li>${h(r)}</li>`).join("")}</ol>`:`<p>${e.map(h).join("<br>")}</p>`),e=[],c=null)};for(let r of n.replaceAll(`\r
`,`
`).replaceAll("\r",`
`).split(`
`)){if(!r.trim()){p();continue}let $=/^(#{1,2}) (.+)$/.exec(r),i=/^(?:- (.*)|(\d{1,3})\. (.*))$/.exec(r);if($){p();let f=$[1].length+4;t.push(`<h${f}>${h($[2])}</h${f}>`);continue}let o=i?i[2]?"ol":"ul":"p";c!==o&&(p(),c=o,o==="ol"&&(u=Number(i[2]))),e.push(i?i[1]??i[3]:r)}return p(),`<div class="task-text" data-task-text-format="${m}">${t.join("")}</div>`}function A(l,s,n,t,e){if(t==="link"){if(!g(e))return null;let o=(l.slice(s,n).replaceAll(`
`," ").replace(/\\([\\#*\[\]()\-.])/g,"$1")||"Հղում").replace(/[\[\]\\]/g,"\\$&"),f=e.replaceAll("(","%28").replaceAll(")","%29");return{text:l.slice(0,s)+`[${o}](${f})`+l.slice(n),start:s+1,end:s+1+o.length}}let c=s===0?0:l.lastIndexOf(`
`,s-1)+1,u=n>s&&l[n-1]===`
`?n-1:n,p=l.indexOf(`
`,u),r=p<0?l.length:p,i=l.slice(c,r).split(`
`).map((o,f)=>t==="heading"?"# "+o:t==="bullet"?"- "+o:t==="number"?f+1+". "+o:o).join(`
`);return{text:l.slice(0,c)+i+l.slice(r),start:c,end:c+i.length}}export{m as a,x as b,T as c,A as d};
