import {escapeHtml as esc} from './learning-navigation.mjs';
import {ARRANGEMENT_VERSIONS,validateArrangementDefinition,validateArrangementResponse} from './arrangement-contract.mjs';
const blank='<option value="">Ընտրեք տարբերակը</option>';
export function arrangementMarkup(type,definition,draft=null,disabled=false) {
 validateArrangementDefinition(type,definition);
 if(draft)validateArrangementResponse(type,definition,draft);
 const matching=type==='matching',choices=matching?definition.targets:definition.segments;
 const rows=matching?definition.sources:definition.segments.map((_,i)=>({id:String(i),label:`Դիրք ${i+1}`}));
 return `<div data-arrangement="${type}"><p>${matching?(definition.cardinality==='one_to_one'?'Յուրաքանչյուր տարբերակ կարող եք օգտագործել մեկ անգամ։':'Նույն տարբերակը կարող եք ընտրել մի քանի անգամ։'):'Ընտրեք հատվածները ճիշտ հերթականությամբ։ Դիրքը փոխելու համար կարող եք նաև օգտվել վերև և ներքև կոճակներից։'}</p>${rows.map((row,i)=>{
  const value=matching?(draft?.pairs[row.id]??''):(draft?.sequence[i]??'');
  return `<div class="arrangement-row"><label><span ${matching?`lang="${esc(definition.locale)}"`:''}>${esc(row.label)}</span><select data-arrangement-field="${esc(row.id)}" lang="${esc(definition.locale)}" ${disabled?'disabled':''}>${blank}${choices.map(x=>`<option value="${esc(x.id)}" ${value===x.id?'selected':''}>${esc(x.label)}</option>`).join('')}</select></label>${matching?'':`<div class="arrangement-moves"><button type="button" data-move="-1" data-position="${i}" aria-label="Դիրք ${i+1}․ տեղափոխել վերև" ${disabled||i===0?'disabled':''}>↑ Վերև</button><button type="button" data-move="1" data-position="${i}" aria-label="Դիրք ${i+1}․ տեղափոխել ներքև" ${disabled||i===rows.length-1?'disabled':''}>↓ Ներքև</button></div>`}</div>`;
 }).join('')}<p class="subtle">Չլրացված մասերը կգնահատվեն 0 միավոր։${matching?'':' Միավորը տրվում է միայն ամբողջությամբ ճիշտ հերթականության համար։'}</p></div>`;
}
export function collectArrangementResponse(root,type,definition) {
 const fields=[...root.querySelectorAll('[data-arrangement-field]')];
 const response=type==='matching'?{schemaVersion:ARRANGEMENT_VERSIONS[type],pairs:Object.fromEntries(fields.map(x=>[x.dataset.arrangementField,x.value]))}:{schemaVersion:ARRANGEMENT_VERSIONS[type],sequence:fields.map(x=>x.value)};
 return validateArrangementResponse(type,definition,response);
}
export function bindArrangement(root,type,definition) {
 const fields=[...root.querySelectorAll('[data-arrangement-field]')],unique=type==='ordering'||definition.cardinality==='one_to_one';
 const sync=()=>{if(unique){const used=new Set(fields.map(x=>x.value).filter(Boolean));for(const field of fields)for(const option of field.options)option.disabled=!!option.value&&used.has(option.value)&&option.value!==field.value;}};
 root.addEventListener('input',sync);
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-move]');if(!button||button.disabled||button.closest('fieldset:disabled'))return;
  const index=Number(button.dataset.position),next=index+Number(button.dataset.move);
  if(!fields[index]||!fields[next])return;
  const value=fields[index].value;fields[index].value=fields[next].value;fields[next].value=value;
  sync();fields[next].focus();root.dispatchEvent(new Event('input',{bubbles:true}));
 });
 sync();
}
