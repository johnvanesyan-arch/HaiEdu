// HTML text and quoted attributes only. URL authorization is a separate check.
const entities={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>entities[char]);

// Match the existing frozen task-text and server task-definition URL contract.
// This client check adds no entitlement or permission to open a resource.
export function isSafeHttpsUrl(value){
 if(typeof value!=='string'||value.length>2048||/[\s\u0000-\u001f\u007f]/.test(value))return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&Boolean(u.hostname)&&u.hostname!=='localhost'&&!u.hostname.endsWith('.localhost');}catch{return false;}
}

export function externalLinkMarkup(value,label){
 return isSafeHttpsUrl(value)?`<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`:`<span>${escapeHtml(value)}</span>`;
}

export function isSafeInternalHref(value,base){
 if(typeof value!=='string'||!value||/[\s\u0000-\u001f\u007f]/.test(value))return false;
 try{const origin=new URL(base),url=new URL(value,origin);return ['http:','https:'].includes(url.protocol)&&url.origin===origin.origin&&!url.username&&!url.password;}catch{return false;}
}
