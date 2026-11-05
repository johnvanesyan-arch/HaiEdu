import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
// An unclosed block silently nests every later rule (e.g. inside a phone-only
// @media) instead of failing the build, so every shipped stylesheet must balance.
test('every web stylesheet has balanced blocks outside comments and strings',async()=>{
 const files=(await readdir(new URL('../web/',import.meta.url))).filter(f=>f.endsWith('.css'));
 assert.ok(files.length>10);
 for(const file of files){
  const css=(await readFile(new URL('../web/'+file,import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,'""');
  let depth=0,line=1;
  for(const ch of css){if(ch==='\n')line++;if(ch==='{')depth++;if(ch==='}'){depth--;assert.ok(depth>=0,`${file}: unexpected } near line ${line}`);}}
  assert.equal(depth,0,`${file}: ${depth} unclosed block(s)`);
 }
});
