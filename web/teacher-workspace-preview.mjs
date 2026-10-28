import {subjectArtwork} from './subject-visuals.mjs';

// A deliberately local, synthetic specimen. No auth, storage, analytics or API calls.
const classes = [
  {id:'english',code:'english',name:'7Ա · Անգլերեն',school:'Օրինակ դպրոց',unit:'Ես աշխարհում',work:[{id:'a',name:'Անի Ա.',prompt:'Describe a friend and their personal style.',response:'My friend is thoughtful and friendly. She likes comfortable clothes. She usually wears jeans and a green jacket.'},{id:'b',name:'Արամ Բ.',prompt:'Describe a friend and their personal style.',response:'My friend likes bright clothes. He is kind and helps our classmates. We have different styles but enjoy working together.'}]},
  {id:'physics',code:'physics',name:'8Բ · Ֆիզիկա',school:'Օրինակ դպրոց',unit:'Փորձի նկարագրություն',work:[{id:'c',name:'Լիլիթ Գ.',prompt:'Նկարագրեք փորձի դիտարկումը։',response:'Նախ գրանցեցինք չափման արդյունքները, ապա համեմատեցինք դրանք նույն պայմաններում։ Տարբերությունը քննարկեցինք դասարանում։'}]},
  {id:'math',code:'mathematics',name:'6Ա · Մաթեմատիկա',school:'Օրինակ դպրոց',unit:'Լուծման բացատրություն',work:[]},
];
const root = document.getElementById('previewContent');
const title = document.getElementById('previewTitle');
const message = document.getElementById('previewMessage');
const scenario = document.getElementById('previewScenario');
const reviewed = new Set();
let selected = classes[0];
let itemId = selected.work[0]?.id;
const labels = {home:'Գլխավոր',classes:'Իմ դասարանները',review:'Գրավորի ստուգում'};
const view = () => Object.hasOwn(labels,location.hash.slice(1)) ? location.hash.slice(1) : 'home';
const pending = () => selected.work.filter(item=>!reviewed.has(item.id));
const classCard = cls => `<article class="card preview-class-card">${subjectArtwork(cls.code)}<h3>${cls.name}</h3><p class="subtle">${cls.school} · հորինված դասարան</p><p>${cls.unit}</p><div class="preview-actions"><button type="button" class="ghost" data-preview-class="${cls.id}">Բացել դասարանը</button></div></article>`;

function render() {
  const current = view();
  message.textContent='';
  title.textContent = current==='home' ? 'Բարի գալուստ, Աննա' : labels[current];
  document.getElementById('previewCrumb').textContent=labels[current];
  document.getElementById('previewSubtitle').textContent=current==='review' ? `${selected.name} · ${selected.unit} · հորինված օրինակ` : 'Ընտրեք դասարանը, ապա շարունակեք աշխատանքը։';
  document.querySelectorAll('[data-preview-view]').forEach(a=>a.toggleAttribute('aria-current',false));
  document.querySelector(`[data-preview-view="${current}"]`).setAttribute('aria-current','page');
  root.removeAttribute('aria-busy');
  if(scenario.value==='loading') {
    root.setAttribute('aria-busy','true');
    root.innerHTML='<section class="card preview-state" role="status"><h2>Տվյալները բեռնվում են…</h2><p>Բեռնման վիճակի օրինակ։ Շարունակելու համար փոխեք ցուցադրվող վիճակը։</p><div class="preview-skeleton" aria-hidden="true"></div></section>';
  } else if(scenario.value==='error') {
    root.innerHTML='<section class="card preview-state" role="alert"><span class="staff-status" data-state="error">Բեռնման սխալ · օրինակ</span><h2>Տվյալները հասանելի չեն</h2><p>Ձեր աշխատանքը չի փոխվել։ Փորձեք կրկին բեռնել այս օրինակը։</p><button type="button" data-preview-retry>Փորձել կրկին</button></section>';
  } else if(scenario.value==='empty') {
    root.innerHTML=`<section class="card preview-state"><h2>${current==='review'?'Ստուգման սպասող աշխատանք չկա':'Դասարանների ցուցակը դատարկ է'}</h2><p>Դատարկ վիճակի օրինակ։ Իրական աշխատասեղանը ցույց է տալիս միայն ձեր հասանելի դասարաններն ու աշխատանքները։</p><button type="button" class="ghost" data-preview-retry>Վերադառնալ տվյալներով օրինակին</button></section>`;
  } else if(scenario.value==='archived') {
    root.innerHTML=`<section class="card preview-archive"><h2>Արխիվացված դասարաններ</h2><p class="subtle">Հին տարիները ծալված են։ Արխիվը չի խառնվում ակտիվ աշխատանքին։</p><details><summary>2025–2026 · 2 հորինված դասարան</summary><div class="preview-class-grid">${classes.slice(0,2).map(cls=>`<article class="card preview-class-card">${subjectArtwork(cls.code)}<h3>${cls.name}</h3><span class="staff-status">Արխիվացված · միայն դիտում</span><p>Այս օրինակում վերականգնում կամ ջնջում չի կատարվում։</p></article>`).join('')}</div></details></section>`;
  } else if(current==='classes') {
    root.innerHTML=`<section aria-label="Հորինված դասարաններ"><div class="preview-class-grid">${classes.map(classCard).join('')}</div></section>`;
  } else if(current==='home') {
    root.innerHTML=`<section class="preview-hero"><div><span class="staff-status">Ընտրված դասարան · հորինված օրինակ</span><h2>${selected.name}</h2><p>${selected.unit}</p><p>Ստուգման է սպասում ${pending().length} աշխատանք՝ միայն այս դասարանում։</p><div class="preview-actions"><a class="button-link" href="#review">Շարունակել ստուգումը</a><a class="button-link ghost" href="#classes">Բոլոր դասարանները</a></div></div>${subjectArtwork(selected.code)}</section><h2>Իմ դասարանները</h2><div class="preview-class-grid">${classes.map(classCard).join('')}</div>`;
  } else renderReview();
}

function renderReview() {
  const queue=pending();
  const item=queue.find(row=>row.id===itemId)||queue[0];
  itemId=item?.id;
  root.innerHTML=`<p class="preview-context"><span class="staff-status" data-state="pending">${queue.length} աշխատանք՝ այս դասարանում</span> <a href="#classes">Փոխել դասարանը</a></p><div class="preview-review-layout"><section class="card preview-queue"><h2>Ստուգման հերթ</h2><p class="subtle">${selected.name} · ${selected.unit}</p><div class="preview-queue-list">${queue.map(row=>`<button type="button" class="ghost" data-preview-item="${row.id}" aria-pressed="${row.id===itemId}">${row.name} · ներկայացված օրինակ</button>`).join('')||'<p>Սպասող աշխատանք չկա։</p>'}</div></section><section class="card preview-response">${item?`<span class="staff-status" data-state="pending">Ներկայացված · օրինակ</span><h2>${item.name} · գրավոր աշխատանք</h2><p>${item.prompt}</p><blockquote lang="${selected.code==='english'?'en':'hy'}">${item.response}</blockquote><details open><summary>Գնահատման չափանիշներ · օրինակ</summary><ul><li>Համապատասխանություն առաջադրանքին</li><li>Մտքի հստակություն և հիմնավորում</li><li>Լեզվի կիրառում՝ ըստ առաջադրանքի</li></ul><p class="subtle">Իրական ստուգման չափանիշները գալիս են հաստատված առաջադրանքից։</p></details><form id="previewFeedbackForm"><label for="previewFeedback">Մեկնաբանություն<textarea id="previewFeedback" required maxlength="2000" placeholder="Փորձեք գրել կարճ, օգտակար մեկնաբանություն…"></textarea></label><p id="previewDraftState" class="subtle">Միայն նախադիտում․ չի պահպանվում և չի ուղարկվում։</p><button type="submit">Փորձարկել հաստատումը</button></form>`:'<span class="staff-status" data-state="ready">Հերթը դատարկ է</span><h2>Այս օրինակի ստուգումն ավարտված է</h2><p>Ընտրեք մեկ այլ հորինված դասարան կամ վերագործարկեք նախադիտումը։</p><div class="preview-actions"><a class="button-link ghost" href="#classes">Բացել դասարանները</a><button class="ghost" type="button" data-preview-reset>Վերագործարկել օրինակը</button></div>'}</section></div>`;
}

root.addEventListener('click', event=>{
  const button=event.target.closest('button');
  if(!button) return;
  if(button.hasAttribute('data-preview-retry')) {scenario.value='ready';render();}
  if(button.hasAttribute('data-preview-reset')) {reviewed.clear();render();}
  if(button.dataset.previewClass) {selected=classes.find(cls=>cls.id===button.dataset.previewClass);itemId=selected.work[0]?.id;location.hash='review';if(view()==='review')render();}
  if(button.dataset.previewItem) {itemId=button.dataset.previewItem;render();document.getElementById('previewFeedback')?.focus();}
});
root.addEventListener('input',event=>{
  if(event.target.id==='previewFeedback') document.getElementById('previewDraftState').textContent='Փորձնական սևագիր․ չի պահպանվում և չի ուղարկվում։';
});
root.addEventListener('submit',event=>{
  if(event.target.id!=='previewFeedbackForm')return;
  event.preventDefault();
  if(!itemId||reviewed.has(itemId))return;
  reviewed.add(itemId);
  render();
  message.textContent='Հաստատումը փորձարկվեց միայն այս նախադիտման մեջ։ Ոչինչ չի ուղարկվել կամ պահպանվել։';
  (document.getElementById('previewFeedback')||title).focus();
});
scenario.addEventListener('change',render);
window.addEventListener('hashchange',()=>{render();title.focus({preventScroll:true});});
render();
