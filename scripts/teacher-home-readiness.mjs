// Read-only benchmark instrumentation. This is not shipped in the application.
export function installTeacherHomeReadiness(){
 if(new URL(location.href).searchParams.get('view')!=='home'||window.__haieduTeacherHomeTiming)return;
 const timing=window.__haieduTeacherHomeTiming={version:'visible-home-today-v1',readyAtEpochMs:null};
 let observer,frame=null,settled=false;
 const ready=()=>{
  const panel=document.getElementById('dashboardPanel'),button=document.querySelector('[data-today-refresh]'),time=document.querySelector('[data-today-time]');
  const box=panel?.getBoundingClientRect();
  return Boolean(panel&&!panel.classList.contains('hidden')&&box.width>0&&box.height>0&&getComputedStyle(panel).visibility==='visible'&&button&&!button.matches(':disabled')&&!button.closest('[aria-disabled="true"]')&&time?.textContent.includes('Ստուգված է՝'));
 };
 const check=()=>{
  if(settled||frame!==null||!ready())return;
  frame=requestAnimationFrame(()=>{
   frame=null;if(!ready())return;
   settled=true;timing.readyAtEpochMs=performance.timeOrigin+performance.now();observer.disconnect();
  });
 };
 observer=new MutationObserver(check);observer.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});check();
}
