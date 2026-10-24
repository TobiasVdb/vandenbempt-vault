/** Aggregate activity only: no cookies, persistent visitor IDs, email or URL queries. */
export function createTracker({endpoint='./api/events',enabled=true}={}){
  const disabled=!enabled||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
  let chapter=-1,last=performance.now(),visible=!document.hidden,activeMs=0,pending={};
  const session=crypto.randomUUID();let sequence=0;
  function accrue(){const now=performance.now();if(visible)activeMs+=Math.min(30000,now-last);last=now;visible=!document.hidden;}
  function send(){
    if(disabled)return;accrue();const body=JSON.stringify({session,sequence:++sequence,events:pending,activeMs:Math.round(activeMs)});pending={};activeMs=0;
    if(!navigator.sendBeacon?.(endpoint,new Blob([body],{type:'application/json'})))fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  }
  if(!disabled){pending.page_view=1;setInterval(send,15000);addEventListener('pagehide',send);document.addEventListener('visibilitychange',()=>{accrue();if(document.hidden)send();});}
  return {action(name){if(!disabled)pending[name]=(pending[name]||0)+1;},chapter(index){if(index!==chapter){chapter=index;this.action(`chapter_${index}`);}},flush:send};
}
