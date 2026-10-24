import {loadSpacecraft,createCinema,createDemo} from './scene.js';
import {clamp,smooth} from './story.js';
import {createTracker} from './tracker.js';
import {createMenuTelemetry} from '../runtime/game/menu-telemetry.js';

const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)'),tracker=createTracker();
let paused=reduced.matches,cinema,demo,source,config={},demoVisible=false,manual=false,demoStarted=!reduced.matches,controlsReady=false,last=performance.now(),intro=0,progress=0;
const held=new Set(),pointers=new Map(),instruments=createMenuTelemetry();let lastStatus='',lastPilot='',lastLeg=0;
function motionLabel(){$('motion').setAttribute('aria-pressed',String(paused));$('motion').textContent=paused?'Resume motion ▷':'Pause motion Ⅱ';}
motionLabel();$('motion').addEventListener('click',()=>{paused=!paused;motionLabel();});
reduced.addEventListener('change',()=>{paused=reduced.matches;motionLabel();});
function clearControls(){held.clear();pointers.clear();document.querySelectorAll('[data-control]').forEach(button=>button.classList.remove('active'));}
addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{last=performance.now();clearControls();});
const observer=new IntersectionObserver(entries=>{for(const entry of entries){demoVisible=entry.isIntersecting;document.body.classList.toggle('at-demo',entry.isIntersecting);if(!entry.isIntersecting)clearControls();}},{threshold:.12});observer.observe($('demo-window'));
let landingStart=1,landingLength=1;
function resize(){landingStart=$('landing').offsetTop;landingLength=Math.max(1,$('landing').offsetHeight-innerHeight);cinema?.resize(innerWidth,innerHeight);}
addEventListener('resize',resize);document.fonts.ready.then(resize);
function command(){return {thrust:held.has('thrust')||[...pointers.values()].includes('thrust'),turn:Number(held.has('right')||[...pointers.values()].includes('right'))-Number(held.has('left')||[...pointers.values()].includes('left'))};}
function takeControls(){demoStarted=true;demo?.resume();$('demo').focus({preventScroll:true});if(!controlsReady)return;manual=true;$('demo-invite').hidden=true;tracker.action('demo_takeover');}
$('take-controls').addEventListener('click',takeControls);
$('demo').addEventListener('pointerdown',takeControls);
$('demo-reset').addEventListener('click',()=>{clearControls();demo?.reset();lastStatus='';lastLeg=0;tracker.action('demo_reset');});
const keys=new Map([['KeyW','thrust'],['Space','thrust'],['ArrowUp','thrust'],['KeyA','left'],['ArrowLeft','left'],['KeyD','right'],['ArrowRight','right']]);
addEventListener('keydown',event=>{
  if(document.activeElement!==$('demo')||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.code==='KeyR'){event.preventDefault();if(!event.repeat)$('demo-reset').click();return;}
  const control=keys.get(event.code);if(!control)return;event.preventDefault();if(!controlsReady)return;held.add(control);if(!manual)takeControls();
});
addEventListener('keyup',event=>{const control=keys.get(event.code);if(control)held.delete(control);});
for(const button of document.querySelectorAll('[data-control]')){
  button.addEventListener('pointerdown',event=>{event.preventDefault();takeControls();button.setPointerCapture(event.pointerId);pointers.set(event.pointerId,button.dataset.control);button.classList.add('active');});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{pointers.delete(e.pointerId);button.classList.remove('active');});
  button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();held.add(button.dataset.control);demo?.resume();}});
  button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter')held.delete(button.dataset.control);});
  button.addEventListener('blur',()=>held.delete(button.dataset.control));
}
async function configure(){
  let response;for(let attempt=0;attempt<3;attempt++){response=await fetch('./api/config');if(response.status!==503)break;await new Promise(resolve=>setTimeout(resolve,1000));}
  if(!response.ok)throw new Error('Page configuration unavailable.');config=await response.json();
  if(config.steamUrl){$('steam-link').href=config.steamUrl;$('steam-link').removeAttribute('aria-disabled');$('steam-link').textContent='Wishlist on Steam ↗';}
  if(!config.newsletterReady){$('signup-status').textContent='The House of Tobias mailing list opens here soon.';$('newsletter').querySelector('button').disabled=true;$('email').disabled=true;}
}
$('steam-link').addEventListener('click',()=>{if(config.steamUrl)tracker.action('steam_click');});
$('newsletter').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
  const button=form.querySelector('button');button.disabled=true;$('signup-status').classList.remove('error');$('signup-status').textContent='Sending your signup…';
  try{
    const response=await fetch('./api/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value,consent:true})});
    if(!response.ok)throw new Error('Signup unavailable');const result=await response.json();form.reset();$('signup-status').textContent='Thanks — signup received. Welcome aboard.';
    if(result.unsubscribeToken){const link=new URL(location.pathname,location.origin);link.searchParams.set('unsubscribe',result.unsubscribeToken);$('unsubscribe-receipt').href=link.href;$('unsubscribe-receipt').hidden=false;}
    tracker.action('newsletter_signup');
  }catch{$('signup-status').textContent='Couldn’t complete your signup. Please try again shortly.';$('signup-status').classList.add('error');}
  finally{button.disabled=false;}
});
configure().catch(()=>{$('signup-status').textContent='Signup is temporarily unavailable.';$('newsletter').querySelector('button').disabled=true;});
const unsubscribeToken=new URL(location.href).searchParams.get('unsubscribe');
if(unsubscribeToken)$('unsubscribe-dialog').showModal();
$('unsubscribe-close').addEventListener('click',()=>{$('unsubscribe-dialog').close();history.replaceState(null,'',location.pathname+location.hash);});
$('unsubscribe-confirm').addEventListener('click',async()=>{
  $('unsubscribe-confirm').disabled=true;
  try{const response=await fetch('./api/newsletter/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:unsubscribeToken})});if(!response.ok)throw new Error();$('unsubscribe-status').textContent='You’re off the list. Clear skies, pilot.';}
  catch{$('unsubscribe-status').textContent='Couldn’t unsubscribe just now. Try again shortly.';$('unsubscribe-confirm').disabled=false;}
});
try{
  source=await loadSpacecraft();cinema=createCinema($('cinema'),source);demo=createDemo($('demo'),source,cinema.environment,{reducedMotion:reduced.matches});resize();$('load-status').textContent='';
}catch(error){document.body.classList.add('scene-error');$('load-status').textContent='The spacecraft could not load. Reload to try again.';console.error(error);}
let previousChapter=-1;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;
  if(!paused)intro=Math.min(3,intro+dt);
  const target=scrollY<landingStart?.86*clamp(scrollY/landingStart):.86+.14*clamp((scrollY-landingStart)/landingLength);
  progress+=(target-progress)*(1-Math.exp(-dt*6));
  const chapter=clamp(Math.floor(scrollY/Math.max(1,landingStart/4)),0,4);if(chapter!==previousChapter){tracker.chapter(chapter);previousChapter=chapter;}
  const landingBlend=smooth((scrollY-landingStart+innerHeight*.6)/(innerHeight*.6));
  // Frame against the incoming copy, rather than waiting for the flight timeline.
  // This anticipates the next section and cannot lag behind a fast scroll.
  const nextCopy=$('story-two').querySelector('.story-copy').getBoundingClientRect(),lastCopy=$('story-three').querySelector('.story-copy').getBoundingClientRect();
  const incoming=rect=>smooth((innerHeight*1.2-rect.top)/(innerHeight*.65));
  const toLeft=incoming(nextCopy),toRight=incoming(lastCopy),screenX=.74+(.24-.74)*toLeft+(.74-.24)*toRight;
  document.body.classList.toggle('after-landing',scrollY>landingStart+landingLength+innerHeight*.5);
  $('scroll-cue').style.opacity=target>.035?'0':'1';
  if(cinema&&!demoVisible){
    const lead=reduced.matches?.022:.022*smooth(intro/2.8),p=lead+progress*(1-lead),state=cinema.update(p,dt,{paused,reducedMotion:reduced.matches,landingBlend,screenX});
    $('story-status').textContent=state.status==='landed'?'TOUCHDOWN':state.thrust>.02?'LANDING BURN':'ENGINE STANDBY';$('story-altitude').textContent=`${Math.round(state.y)} m / ${Math.round(state.thrust*100)}% THRUST`;
  }
  if(demo&&demoVisible){
    const sample=demo.update(dt,command(),!demoStarted),shown=instruments.update(sample);
    controlsReady=sample.stage!==0||Boolean(sample.crew?.complete);
    $('take-controls').disabled=demoStarted&&!controlsReady;
    const invitation=!demoStarted?'Start flight →':controlsReady?'I can land that ↗':'Boarding crew…';
    if($('take-controls').textContent!==invitation)$('take-controls').textContent=invitation;
    for(const button of document.querySelectorAll('[data-control]'))button.disabled=!controlsReady;
    $('demo-pilot').textContent=sample.pilot==='manual'?'YOU HAVE CONTROL':sample.pilot==='crashed'?'UNSCHEDULED DISASSEMBLY':'AUTOPILOT';
    $('demo-phase').textContent=sample.crewPhase||sample.phase;
    $('demo-altitude').textContent=`${sample.altitude.toFixed(1)} m`;$('demo-engine').textContent=`${Math.round(shown.throttle*100)}%`;$('demo-speed').textContent=`${shown.airspeed.toFixed(1)} m/s`;
    if(sample.pilot==='manual'&&lastPilot!=='manual')$('demo-invite').hidden=true;
    if(sample.status==='crashed'&&lastStatus!=='crashed')tracker.action('demo_crash');
    if(sample.stage>=9&&lastStatus!=='docked'){tracker.action('demo_landing');lastStatus='docked';}else if(sample.stage<9)lastStatus=sample.status;
    if(sample.legs>lastLeg){tracker.action('demo_roundtrip');lastLeg=sample.legs;}
    lastPilot=sample.pilot;
  }
}
requestAnimationFrame(frame);
