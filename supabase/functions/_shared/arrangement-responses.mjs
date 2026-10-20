// Explicit, subject-neutral matching and exact-sequence capabilities.
export const ARRANGEMENT_VERSIONS = Object.freeze({matching:'haiedu-matching-v1',ordering:'haiedu-ordering-v1'});
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => object(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const check = (ok,code='arrangement_contract_invalid') => {if(!ok)throw new Error(code);};
const unique = xs => new Set(xs).size === xs.length;
export function validateArrangementDefinition(type,def) {
 check(Object.hasOwn(ARRANGEMENT_VERSIONS,type));
 check(exact(def,type==='matching'?['schemaVersion','locale','cardinality','sources','targets']:['schemaVersion','locale','segments']));
 check(def.schemaVersion===ARRANGEMENT_VERSIONS[type]);
 check(typeof def.locale==='string' && def.locale.length<=35 && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(def.locale));
 for(const name of type==='matching'?['sources','targets']:['segments']) {
  const rows=def[name];check(Array.isArray(rows)&&rows.length>=2&&rows.length<=12);
  check(rows.every(row=>exact(row,['id','label'])&&typeof row.id==='string'&&/^[a-z][a-z0-9_]{0,39}$/.test(row.id)&&typeof row.label==='string'&&row.label.replace(/[ \t\r\n]/g,'').length>0&&[...row.label].length<=2000));
  check(unique(rows.map(row=>row.id)));
 }
 if(type==='matching')check(['one_to_one','many_to_one'].includes(def.cardinality)&&(def.cardinality!=='one_to_one'||def.targets.length>=def.sources.length));
 return def;
}
export function validateArrangementResponse(type,def,response) {
 validateArrangementDefinition(type,def);
 const valid=ok=>check(ok,'arrangement_response_invalid'),part=type==='matching'?'pairs':'sequence';
 valid(exact(response,['schemaVersion',part])&&response.schemaVersion===ARRANGEMENT_VERSIONS[type]);
 if(type==='matching') {
  valid(exact(response.pairs,def.sources.map(x=>x.id)));
  const values=Object.values(response.pairs),targets=new Set(def.targets.map(x=>x.id));
  valid(values.every(x=>typeof x==='string'&&(x===''||targets.has(x))));
  valid(def.cardinality!=='one_to_one'||unique(values.filter(Boolean)));
 }else {
  valid(Array.isArray(response.sequence)&&response.sequence.length===def.segments.length);
  const ids=new Set(def.segments.map(x=>x.id));
  valid(response.sequence.every(x=>typeof x==='string'&&(x===''||ids.has(x)))&&unique(response.sequence.filter(Boolean)));
 }
 return response;
}
export function validateArrangementKey(type,def,key) {
 validateArrangementDefinition(type,def);
 check(exact(key,type==='matching'?['schemaVersion','pairs']:['schemaVersion','acceptedSequences'])&&key.schemaVersion===ARRANGEMENT_VERSIONS[type]);
 try {
  if(type==='matching') {
   validateArrangementResponse(type,def,key);check(Object.values(key.pairs).every(Boolean));
  }else {
   check(Array.isArray(key.acceptedSequences)&&key.acceptedSequences.length>=1&&key.acceptedSequences.length<=20);
   for(const sequence of key.acceptedSequences){validateArrangementResponse(type,def,{schemaVersion:key.schemaVersion,sequence});check(sequence.every(Boolean));}
   check(unique(key.acceptedSequences.map(x=>JSON.stringify(x))));
  }
 }catch{throw new Error('arrangement_contract_invalid');}
 return key;
}
