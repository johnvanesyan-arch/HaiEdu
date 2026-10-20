// Saved-source preview only. Runtime delivery already resolves the source on the server.
export function mountTaskSetPreview({root,reference,invoke,context,isCurrent,render}){
 let live=true,dispose;
 const current=()=>live&&isCurrent();
 root.textContent='Ընդհանուր նյութը բեռնվում է…';
 void invoke('get-learning-task-set',{action:'preview',itemId:context.itemId}).then(data=>{
  if(!current())return;
  if(data.taskSet?.id!==reference.taskSetVersionId||!data.stimulus||data.stimulus.kind==='task_set')throw new Error('Ընդհանուր նյութը հասանելի չէ։');
  root.replaceChildren();
  const label=document.createElement('p'),source=document.createElement('div');
  label.textContent=`${data.taskSet.title} · Հարց ${data.taskSet.position}/${data.taskSet.total}`;
  root.append(label,source);dispose=render(source,data.stimulus,{invoke,context,isCurrent:current});
 }).catch(()=>{if(current()){root.textContent='Ընդհանուր նյութը հասանելի չէ։ Պահպանեք փոփոխությունները և կրկին բացեք նախադիտումը։';root.setAttribute('role','alert');}});
 return ()=>{live=false;dispose?.();root.replaceChildren();};
}
