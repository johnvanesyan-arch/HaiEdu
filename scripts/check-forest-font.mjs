import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {collectDependencies} from './check-browser-qa-triggers.mjs';
const root=process.cwd(),dir='web/assets/fonts/',manifest=JSON.parse(await readFile(dir+'forest-font.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const item of [manifest.source,manifest.delivery]){
 if(!/^[a-z0-9-]+\.(ttf|woff2)$/.test(item.file))throw Error('Invalid UI font filename');
 const bytes=await readFile(dir+item.file);if(bytes.length!==item.bytes||hash(bytes)!==item.sha256)throw Error('UI font artifact differs from its verified manifest');
}
if((await readFile(dir+manifest.delivery.file)).subarray(0,4).toString()!=='wOF2')throw Error('Invalid WOFF2 font');
if(!manifest.delivery.file.endsWith(manifest.delivery.sha256.slice(0,12)+'.woff2'))throw Error('UI font filename must identify its content');
if(hash(await readFile('scripts/build-forest-font.py'))!==manifest.toolchain.recipeSha256||hash(await readFile(dir+manifest.license))!==manifest.licenseSha256)throw Error('Font recipe/license differs from verified provenance');
if(manifest.delivery.width!==100||JSON.stringify(manifest.delivery.weightRange)!=='[100,900]'||!manifest.verification.allMatchAtTestedWeights)throw Error('UI font scope verification is incomplete');
const write=process.argv.includes('--write'),url='./assets/fonts/'+manifest.delivery.file;
let css=await readFile('web/forest-tokens.css','utf8');
if(write){css=css.replace(/  src:[^\n]+/,`  src: url("${url}") format("woff2"), url("./assets/fonts/${manifest.fallback}") format("truetype");`);if(!css.includes('font-stretch: normal;'))css=css.replace('  font-weight: 100 900;','  font-weight: 100 900;\n  font-stretch: normal;');await writeFile('web/forest-tokens.css',css);}
if(!css.includes(url)||!css.includes(manifest.fallback)||!css.includes('font-stretch: normal;'))throw Error('Shared UI font declaration is stale');
const tag=`<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin data-haiedu-forest-font="true" />`;
const consumers=[];
for(const name of (await readdir('web')).filter(n=>n.endsWith('.html'))){
 const file='web/'+name,deps=await collectDependencies(root,[file]);if(!deps.has('web/forest-tokens.css'))continue;
 consumers.push(file);let html=await readFile(file,'utf8');const marker=/<link\b[^>]*data-haiedu-forest-font="true"[^>]*>/g;
 if(write){if(marker.test(html))html=html.replace(marker,tag);else html=html.replace(/(<meta\s+charset=[^>]+>)/i,'$1\n  '+tag);await writeFile(file,html);}
 if(!html.includes(tag)||(html.match(/data-haiedu-forest-font="true"/g)??[]).length!==1)throw Error(file+' must preload exactly the verified Forest font');
}
console.log(JSON.stringify({font:manifest.delivery.file,bytes:manifest.delivery.bytes,consumers,verified:true}));
