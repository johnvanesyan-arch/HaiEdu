import {escapeHtml as esc} from './learning-navigation.mjs';

// Use explicit API status and programme identities, never display names.
export function partitionClassHistory(rows, isActive = row => row.isActive !== false) {
  return {current: rows.filter(isActive), archived: rows.filter(row => !isActive(row))};
}
export function classHistoryMarkup(rows, render, options) {
  const {current,archived}=partitionClassHistory(rows,options?.isActive);
  return current.map(render).join('')+(archived.length
    ? `<details class="class-history"><summary>Արխիվացված դասարաններ · ${archived.length}</summary>${archived.map(render).join('')}</details>` : '');
}
export function appendClassHistory(root, rows, render, options) {
  const {current,archived}=partitionClassHistory(rows,options?.isActive);
  if(current.length)root.append(render(current));
  if(archived.length){
    const history=document.createElement('details'),summary=document.createElement('summary');
    history.className='class-history';summary.textContent=`Արխիվացված դասարաններ · ${archived.length}`;
    history.append(summary,render(archived));root.append(history);
  }
}
export function analyticsClassOptions(rows,{programmeId='',includeArchived=false,selectedId=''}={}) {
  return rows.filter(row=>(!programmeId||row.subjectProgramIds?.includes(programmeId))
    &&(includeArchived||row.isActive!==false||row.id===selectedId));
}
export function analyticsClassLabel(row) {
  return `${row.label||row.name}${row.isActive===false?' · Արխիվացված':''}`;
}
export function analyticsClassOptionsMarkup(rows) {
  return rows.map(row=>`<option value="${esc(row.id)}">${esc(analyticsClassLabel(row))}</option>`).join('');
}
