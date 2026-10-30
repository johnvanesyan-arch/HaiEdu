// Display only the account's own aggregate counts; never student names/content.
export function taskPrivacyRows(counts){
 if(!counts||typeof counts!=='object')return[];
 const fields=[['drafts','Իմ կազմած առաջադրանքների սևագրեր'],['copies','Սևագրերի պատճեններ'],
 ['deliveries','Իմ կազմած և ուղարկած առաջադրանքներ'],['sources','Կցված PDF ֆայլեր'],
 ['privateFeedback','Ստուգման անձնական սևագրեր'],['publishedFeedback','Իմ ուղարկած ստուգումներ'],
 ['received','Ուսուցչի կազմած և ինձ տրված առաջադրանքներ'],['workDrafts','Իմ պատասխանների սևագրեր'],
 ['submissions','Իմ ներկայացրած տարբերակներ'],['responseFiles','Իմ պատասխանի ֆայլեր'],
 ['receivedFeedback','Ինձ ուղարկած ստուգումներ'],['pendingFileRemoval','Ջնջման սպասող ֆայլեր']];
 return fields.filter(([k])=>Number.isSafeInteger(counts[k])&&counts[k]>0).map(([k,label])=>[label,counts[k]]);
}
export function erasurePresentation(request){
 const open=Boolean(request&&['pending','processing'].includes(request.status)),started=Boolean(request?.execution_started_at);
 return{open,started,canCancel:open&&!started,canReject:open&&!started,
  action:started?'Շարունակել ջնջումը':'Ջնջել վերջնականապես',
  progress:'Վերջնական ջնջումը սկսված է և դեռ ընթացքի մեջ է։ Այն այլևս չեք կարող չեղարկել։'};
}
