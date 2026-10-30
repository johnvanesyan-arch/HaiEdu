import {validTeacherTaskPdf} from './teacher-task-sources-handler.mjs';
import {RESPONSE_FILE_LIMIT} from './teacher-task-response.mjs';
const fail=()=>{throw Error('task_file_invalid');};
const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(b){let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
async function inflate(bytes,limit){
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();let length=0,chunks=[];
 try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();fail();}chunks.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(length);let i=0;for(const b of chunks){result.set(b,i);i+=b.length;}return result;
}
// Bounded OOXML container validation. Never execute/extract files or fetch XML
// relationships. Macro/embedded-code containers and unsafe ZIP layouts fail closed.
export async function validateTaskDocument(bytes,format){
 if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>RESPONSE_FILE_LIMIT)fail();
 if(format==='pdf'){if(!validTeacherTaskPdf(bytes))fail();return;}
 if(format!=='docx')fail();
 try{
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=o=>v.getUint16(o,true),u32=o=>v.getUint32(o,true);
  if(u32(0)!==0x04034b50)fail();let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break;}
  if(end<0||u16(end+4)!==0||u16(end+6)!==0||u16(end+8)!==u16(end+10))fail();
  const count=u16(end+10),start=u32(end+16),size=u32(end+12);if(count<3||count>512||start+size!==end)fail();
  let at=start,total=0;const names=new Set(),ranges=[],xml=new Map();
  for(let n=0;n<count;n++){
   if(at+46>end||u32(at)!==0x02014b50)fail();const flags=u16(at+8),method=u16(at+10),crc=u32(at+16),compressed=u32(at+20),plain=u32(at+24),nl=u16(at+28),el=u16(at+30),cl=u16(at+32),local=u32(at+42);
   if(flags&~0x080e||![0,8].includes(method)||at+46+nl+el+cl>end||u16(at+34)!==0||(u32(at+38)>>>16&0xf000)===0xa000)fail();
   const name=decode(bytes.slice(at+46,at+46+nl));if(!name||name.length>512||name.startsWith('/')||name.includes('\\')||name.includes('\0')||name.split('/').some(p=>p==='.'||p==='..')||names.has(name.toLowerCase())||/^(?:word\/)?(?:vba|activex|embeddings)(?:\/|project)/i.test(name))fail();names.add(name.toLowerCase());
   total+=plain;if(total>30*1024*1024||local+30>start||u32(local)!==0x04034b50||u16(local+6)!==flags||u16(local+8)!==method)fail();
   const ln=u16(local+26),le=u16(local+28),data=local+30+ln+le;if(decode(bytes.slice(local+30,local+30+ln))!==name||data+compressed>start)fail();
   if(!(flags&8)&&(u32(local+14)!==crc||u32(local+18)!==compressed||u32(local+22)!==plain))fail();
   let last=data+compressed;if(flags&8){const skip=u32(last)===0x08074b50?4:0;if(last+skip+12>start||u32(last+skip)!==crc||u32(last+skip+4)!==compressed||u32(last+skip+8)!==plain)fail();last+=skip+12;}ranges.push([local,last]);const body=bytes.slice(data,data+compressed),out=method===0?body:await inflate(body,plain);if(out.length!==plain||crc32(out)!==crc)fail();
   if(['[Content_Types].xml','_rels/.rels','word/document.xml'].includes(name)){if(plain>2*1024*1024)fail();const value=decode(out);if(/<!DOCTYPE|<!ENTITY/i.test(value))fail();xml.set(name,value);}
   at+=46+nl+el+cl;
  }
  ranges.sort((a,b)=>a[0]-b[0]);if(at!==end||ranges.some((r,i)=>i>0&&r[0]<ranges[i-1][1]))fail();
  const types=xml.get('[Content_Types].xml')??'',rels=xml.get('_rels/.rels')??'',doc=xml.get('word/document.xml')??'';
  if(!/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml/.test(types)||/macroenabled|vbaproject|activex|oleobject/i.test(types)||!/(?:Target=["']\/?word\/document\.xml["'])/.test(rels)||!/<(?:[A-Za-z_][\w.-]*:)?document\b/.test(doc)||!/(?:schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main|purl\.oclc\.org\/ooxml\/wordprocessingml\/main)/.test(doc))fail();
 }catch{fail();}
}
