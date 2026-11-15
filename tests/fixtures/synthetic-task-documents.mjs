// In-memory fictional document bytes, shared by isolated test runners.
import {deflateRawSync} from 'node:zlib';
export const pdf=new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
export function docxBytes(extra={}){
 const entries={'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>','_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>','word/document.xml':'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>A classroom answer.</w:t></w:r></w:p></w:body></w:document>',...extra};
 const chunks=[],central=[];let offset=0;
 for(const [name,value]of Object.entries(entries)){const n=Buffer.from(name),b=Buffer.from(value),data=deflateRawSync(b);let crc=0xffffffff;for(const v of b){crc^=v;for(let k=0;k<8;k++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}crc=(crc^0xffffffff)>>>0;
  const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);l.writeUInt16LE(8,8);l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(b.length,22);l.writeUInt16LE(n.length,26);chunks.push(l,n,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(b.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=l.length+n.length+data.length;
 }
 const c=Buffer.concat(central),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50);e.writeUInt16LE(Object.keys(entries).length,8);e.writeUInt16LE(Object.keys(entries).length,10);e.writeUInt32LE(c.length,12);e.writeUInt32LE(offset,16);return new Uint8Array(Buffer.concat([...chunks,c,e]));
}
