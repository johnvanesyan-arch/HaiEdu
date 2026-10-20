import {escapeHtml as esc} from './learning-navigation.mjs';
import {ARRANGEMENT_VERSIONS,validateArrangementKey} from './arrangement-contract.mjs';
const names={sources:'Համապատասխանեցվող մասեր',targets:'Ընտրության տարբերակներ',segments:'Դասավորվող հատվածներ'};
function rowMarkup(group,row={},answer='',disabled=false) {
 const off=disabled?'disabled':'';
 return `<fieldset data-arrangement-editor-row><label>Կայուն կոդ<input data-arr-id value="${esc(row.id??'')}" ${off}></label><label>Սովորողին ցուցադրվող տեքստը<textarea data-arr-label ${off}>${esc(row.label??'')}</textarea></label>${group==='sources'?`<label>Ճիշտ տարբերակը<select data-arr-answer data-initial="${esc(answer)}" ${off}></select></label>`:''}${disabled?'':'<button type="button" data-remove-arrangement>Հեռացնել</button>'}</fieldset>`;
}
export function arrangementEditorMarkup(detail,disabled=false) {
 const type=detail.item.type,def=detail.item.config?.responseDefinition,key=detail.answerKey?.answer,off=disabled?'disabled':'';
 return `<div id="arrangementEditor" data-type="${type}"><label>Բովանդակության լեզվի կոդը (օրինակ՝ en կամ hy)<input data-arr-locale value="${esc(def?.locale??'')}" ${off}></label>${type==='matching'?`<label>Տարբերակների օգտագործումը<select data-arr-cardinality ${off}><option value="one_to_one" ${def?.cardinality==='one_to_one'?'selected':''}>Յուրաքանչյուր տարբերակ՝ մեկ անգամ</option><option value="many_to_one" ${def?.cardinality==='many_to_one'?'selected':''}>Նույն տարբերակը՝ մի քանի անգամ</option></select></label>`:''}${(type==='matching'?['sources','targets']:['segments']).map(group=>`<section><h4>${names[group]}</h4><div data-arr-group="${group}">${(def?.[group]??[]).map(row=>rowMarkup(group,row,key?.pairs?.[row.id],disabled)).join('')}</div>${disabled?'':`<button type="button" data-add-arrangement="${group}">Ավելացնել</button>`}</section>`).join('')}${type==='ordering'?`<label>Ընդունվող հերթականությունները<textarea data-arr-sequences ${off}>${esc((key?.acceptedSequences??[]).map(x=>x.join(', ')).join('\n'))}</textarea></label><p>Յուրաքանչյուր հերթականությունը գրեք նոր տողից՝ հատվածների կոդերը բաժանելով ստորակետերով։ Յուրաքանչյուր տողում ներառեք բոլոր հատվածները՝ առանց կրկնության։</p>`:''}</div>`;
}
export function bindArrangementEditor(root) {
 const sync=()=>{
  const targets=[...root.querySelectorAll('[data-arr-group="targets"] [data-arrangement-editor-row]')].map(row=>({id:row.querySelector('[data-arr-id]').value.trim(),label:row.querySelector('[data-arr-label]').value}));
  for(const field of root.querySelectorAll('[data-arr-answer]')){
   const value=field.dataset.initial??field.value;delete field.dataset.initial;
   field.innerHTML='<option value="">Ընտրեք ճիշտ տարբերակը</option>'+targets.map(x=>`<option value="${esc(x.id)}">${esc(x.label||x.id)}</option>`).join('');field.value=value;
  }
 };
 root.addEventListener('input',event=>{if(event.target.closest('[data-arr-group="targets"]'))sync();});
 root.addEventListener('click',event=>{
  const add=event.target.closest('[data-add-arrangement]'),remove=event.target.closest('[data-remove-arrangement]');
  if(add){const group=add.dataset.addArrangement,rows=root.querySelector(`[data-arr-group="${group}"]`);if(rows.children.length>=12)return;rows.insertAdjacentHTML('beforeend',rowMarkup(group));}
  else if(remove)remove.closest('[data-arrangement-editor-row]').remove();else return;
  sync();root.dispatchEvent(new Event('input',{bubbles:true}));
 });sync();
}
export function collectArrangementEditor(root) {
 const type=root.dataset.type,definition={schemaVersion:ARRANGEMENT_VERSIONS[type],locale:root.querySelector('[data-arr-locale]').value.trim()},key={schemaVersion:ARRANGEMENT_VERSIONS[type]};
 for(const group of root.querySelectorAll('[data-arr-group]'))definition[group.dataset.arrGroup]=[...group.children].map(row=>({id:row.querySelector('[data-arr-id]').value.trim(),label:row.querySelector('[data-arr-label]').value}));
 if(type==='matching'){
  definition.cardinality=root.querySelector('[data-arr-cardinality]').value;
  key.pairs=Object.fromEntries([...root.querySelectorAll('[data-arr-group="sources"] [data-arrangement-editor-row]')].map(row=>[row.querySelector('[data-arr-id]').value.trim(),row.querySelector('[data-arr-answer]').value]));
 }else key.acceptedSequences=root.querySelector('[data-arr-sequences]').value.split('\n').filter(x=>x.trim()).map(x=>x.split(',').map(x=>x.trim()));
 try{validateArrangementKey(type,definition,key);}catch{throw new Error('Ստուգեք կոդերը, տեքստերը և ճիշտ պատասխանները։ Յուրաքանչյուր ցանկում անհրաժեշտ է 2–12 մաս։ Հերթականությունը պետք է ներառի բոլոր հատվածները՝ առանց կրկնության։');}
 return {definition,key};
}
