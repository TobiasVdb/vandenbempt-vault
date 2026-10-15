(()=>{
 const $=id=>document.getElementById(id);
 let token='',data=null,loading=false,createdId=null;
 const api=async(path,credential,method='GET',body)=>{
  const response=await fetch('/api/nyc-trip/'+path,{method,headers:{Authorization:`Bearer ${credential}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(response.status===401?'Code ongeldig, verlopen of ingetrokken.':response.status===503?'De tripservice moet nog worden ingesteld of is tijdelijk onbereikbaar.':'Het verzoek is mislukt.');
  return response.status===204?null:response.json();
 };
 function clock(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(new Date());const get=type=>Number(parts.find(p=>p.type===type).value);return {year:get('year'),month:get('month'),date:get('day'),minute:get('hour')*60+get('minute')};}
 const time=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(Math.floor(minute%60)).padStart(2,'0')}`;
 function render(){
  if(!data)return;
  $('device-label').textContent=data.label;
  const fix=data.fixes[0];$('position').hidden=false;
  if(!fix){$('freshness').textContent='Nog geen gedeelde GPS-positie.';$('accuracy').textContent='De reiziger moet locatie delen zelf aanzetten.';$('next-stop').textContent='';$('track-map').replaceChildren();$('map-link').hidden=true;return;}
  const age=Math.max(0,Math.floor((Date.now()-new Date(fix.captured_at))/1000));
  $('freshness').textContent=`${!data.sharing?'Delen gepauzeerd · ':age>120?'Verouderde positie · ':''}${age<60?`${age} seconden`:age<3600?`${Math.floor(age/60)} minuten`:`${Math.floor(age/3600)} uur`} geleden`;
  $('freshness').classList.toggle('stale',age>120||!data.sharing);
  $('accuracy').textContent=`GPS ±${Math.round(fix.accuracy)} m · ${new Intl.DateTimeFormat('nl-BE',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(fix.captured_at))} New York`;
  const now=clock(),day=now.year===2026&&now.month===10?data.schedule.days.find(d=>d.date===now.date):null;
  const next=day?.stops.find(stop=>stop.start>now.minute);
  $('next-stop').textContent=next?`Volgende volgens planning: ${next.name} · ${time(next.start)}`:'Buiten de dagplanning. De GPS-positie is echt; de planning zegt niets over aanwezigheid.';
  const stops=day?.stops??[],points=[...data.fixes,...stops];
  const minLng=Math.min(...points.map(p=>p.longitude)),maxLng=Math.max(...points.map(p=>p.longitude)),minLat=Math.min(...points.map(p=>p.latitude)),maxLat=Math.max(...points.map(p=>p.latitude));
  const scale=Math.min(540/Math.max(.005,(maxLng-minLng)*.76),380/Math.max(.005,maxLat-minLat));
  const project=p=>[300+(p.longitude-(minLng+maxLng)/2)*.76*scale,220-(p.latitude-(minLat+maxLat)/2)*scale];
  const node=(name,attrs)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,value));return el;};
  const svg=$('track-map');svg.replaceChildren();
  if(stops.length)svg.append(node('polyline',{class:'planned',points:stops.map(project).map(p=>p.join(',')).join(' ')}));
  svg.append(node('polyline',{class:'gps-track',points:[...data.fixes].reverse().map(project).map(p=>p.join(',')).join(' ')}));
  stops.forEach((stop,index)=>{const [x,y]=project(stop),circle=node('circle',{cx:x,cy:y,r:3});const title=node('title',{});title.textContent=`${time(stop.start)} ${stop.name}`;circle.append(title);svg.append(circle);if(index===0||stop===next){const text=node('text',{x:Math.min(430,x+9),y:Math.max(15,y-9)});text.textContent=stop.name;svg.append(text);}});
  const [x,y]=project(fix);svg.append(node('circle',{cx:x,cy:y,r:8}));
  $('map-link').hidden=false;$('map-link').href=`https://www.openstreetmap.org/?mlat=${fix.latitude}&mlon=${fix.longitude}#map=16/${fix.latitude}/${fix.longitude}`;
 }
 async function refresh(){
  if(!token||loading||document.visibilityState!=='visible')return;
  loading=true;
  const requestedToken=token;
  try{const result=await api('follow',requestedToken);if(token!==requestedToken)return;data=result;$('status').textContent='Privé volgen · wordt iedere 15 seconden bijgewerkt.';render();}
  catch(error){$('status').textContent=error.message+' Eventueel getoonde positie wordt niet bijgewerkt.';}
  finally{loading=false;}
 }
 $('follow-form').onsubmit=event=>{event.preventDefault();token=$('follow-code').value.trim();$('follow-code').value='';data=null;$('position').hidden=true;void refresh();};
 $('follow-stop').onclick=()=>{token='';data=null;$('position').hidden=true;$('status').textContent='Volgen gesloten. Er is geen volgcode bewaard.';};
 $('pair-form').onsubmit=async event=>{
  event.preventDefault();const credential=$('admin-token').value.trim();$('admin-token').value='';const button=event.submitter;button.disabled=true;
  try{const result=await api('devices',credential,'POST',{label:$('device-name').value});createdId=result.id;$('pair-code').value=result.pairingCode;$('read-code').value=result.readToken;$('pair-result').hidden=false;$('status').textContent='Koppeling aangemaakt. Bewaar de volgcode privé.';}
  catch(error){$('status').textContent=error.message;}finally{button.disabled=false;}
 };
 $('revoke').onclick=async()=>{
  const credential=$('admin-token').value.trim();$('admin-token').value='';
  if(!credential){$('status').textContent='Vul de beheersleutel opnieuw in om deze koppeling in te trekken.';return;}
  try{await api('devices/'+createdId,credential,'DELETE');$('pair-result').hidden=true;$('pair-code').value='';$('read-code').value='';$('status').textContent='Koppeling en posities gewist.';}catch(error){$('status').textContent=error.message;}
 };
 setInterval(()=>{render();void refresh();},15000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
})();
