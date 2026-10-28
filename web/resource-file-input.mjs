// Match the existing protected upload contract before creating a draft.
export const MAX_PDF_BYTES=5*1024*1024;
export function resourceFileTitle(name){return String(name).replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').trim().slice(0,200);}
export async function prepareResourceFile(file){
 if(!file||file.size===0)throw Error('resource_file_required');
 if(file.size>MAX_PDF_BYTES)throw Error('resource_too_large');
 const bytes=new Uint8Array(await file.arrayBuffer()),decode=new TextDecoder('latin1');
 if(!/^%PDF-(1\.[0-7]|2\.0)[\r\n\s]/.test(decode.decode(bytes.slice(0,16)))||!/%%EOF\s*$/.test(decode.decode(bytes.slice(-1024))))throw Error('resource_file_invalid');
 // Some browsers leave a PDF's MIME type empty. Validate the bytes first.
 return new File([bytes],file.name,{type:'application/pdf',lastModified:file.lastModified});
}
export async function resourceFileDigest(file){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');}
