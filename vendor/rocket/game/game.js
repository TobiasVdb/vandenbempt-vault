import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createFlightSystems } from '../flight-systems.js';
import { LEVELS, surfaceAt, missionBrief } from './levels.js';
import { FIXED_STEP, convexHull, worldHull, completed, environmentAt, orbitalTarget } from './physics.js';
import { createControls, translationKeys } from './controls.js';
import { createRace, stepRace, standings, raceResult } from './race.js';
import { loadProfile, saveProfile, sanitizeProfile, flightTuning, settleRace, SKINS, SHIPS } from './progression.js';
import { createGarage } from './garage.js';
import { createWorldEffects } from './world.js';
import { decorateCraft } from './craft.js';
import { createPlumeEffect } from './plume-effect.js';
import { createPlumeObstacles } from './plume-obstacles.js';
import { createDestructionEffect } from './damage-effect.js';
import { damageReadout } from './damage.js';
import { createStartMenuScene } from './start-menu-scene.js';
import { createStartMenu } from './start-menu.js';
import { createOnline } from './online.js';
import { levelAssetFile, prepareLevelModel, resetLevelModel } from './level-assets.js';
import { createRocketAudio } from './rocket-audio.js';
import { createFlightPresentation } from './flight-presentation.js';
import { batchCraftDetails } from './craft-batching.js';
import { createRenderBudget } from './render-budget.js';

const $=id=>document.getElementById(id);
const canvas=$('flight');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fleet=new Map();
const levelModels=new Map();
const botVisuals=new Map();
let storage=null;try{storage=localStorage;}catch{/* Session play remains available when storage is blocked. */}
const saved=loadProfile(storage),profile=saved.profile;
let persistent=saved.persistent,attemptId='',race=null,worldEffects=null;
const controls=createControls();
const menuControls=createControls();
const keyControls={KeyW:'thrust',ArrowUp:'thrust',Space:'thrust',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
const scene=new THREE.Scene();scene.background=new THREE.Color('#211d19');scene.fog=new THREE.Fog('#211d19',58,110);
const camera=new THREE.OrthographicCamera(-28,28,16,-16,.1,150);
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
catch(error){$('menu-status').textContent='WebGL is unavailable. Enable browser hardware acceleration, then reload this page.';throw error;}
const renderBudget=createRenderBudget();renderer.setPixelRatio(renderBudget.resize(innerWidth,innerHeight,devicePixelRatio));renderer.setSize(innerWidth,innerHeight);
const graphics=renderer.getContext(),graphicsInfo=graphics.getExtension('WEBGL_debug_renderer_info');
canvas.dataset.gpuMode=graphicsInfo?(/swiftshader|llvmpipe|software/i.test(graphics.getParameter(graphicsInfo.UNMASKED_RENDERER_WEBGL))?'software':'hardware'):'unknown';
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
const menuScene=createStartMenuScene({environment:environment.texture,reducedMotion});
const garageScene=createStartMenuScene({environment:environment.texture,reducedMotion,parked:true});
const flightCanvasLabel=canvas.getAttribute('aria-label');
const ambient=new THREE.HemisphereLight('#f8dfb5','#433526',1.2);scene.add(ambient);
const sun=new THREE.DirectionalLight('#ffd6a0',1.8);sun.position.set(-14,20,18);scene.add(sun);
const fill=new THREE.DirectionalLight('#bac9e1',.8);fill.position.set(15,4,15);scene.add(fill);
const engineLight=new THREE.PointLight('#ffc17b',0,5,2);scene.add(engineLight);
const cave=new THREE.Group();scene.add(cave);
const scenery=new THREE.Group();scene.add(scenery);
const loader=new GLTFLoader();
const plume=createPlumeEffect(scene,{reducedMotion});
const destruction=createDestructionEffect(scene,{capacity:reducedMotion?32:96,reducedMotion});
const rocketAudio=createRocketAudio();
const flightPresentation=createFlightPresentation();
let selected=null,course=0,level=LEVELS[0],plumeEnvironment=level,state=null;
let mode='menu',elapsed=0,accumulator=0,last=performance.now(),lastEngine=false,cameraX=0,shake=0;
let context=null,soundEnabled=false;
let lastStandings='',frameSeconds=0,frameCount=0;
let online=null,networkRoom=null,joining=false;
function renderScene(world,view){
  const started=performance.now();renderer.render(world,view);
  canvas.dataset.renderMs=(performance.now()-started).toFixed(1);
  canvas.dataset.triangles=String(renderer.info.render.triangles);
}

function disposeGroup(group){
  group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});group.clear();
}
function buildCave(){
  // Cached GLBs retain their geometry when a mission is revisited; only transient weather is disposed.
  cave.clear();disposeGroup(scenery);
  const dark=level.theme==='dark',space=level.theme==='space';
  ambient.intensity=dark?0:space?.25:1.2;sun.intensity=dark?0:space?2.4:1.8;fill.intensity=dark?0:space?.15:.8;scene.environmentIntensity=dark?0:space?.18:.65;
  plumeEnvironment=level;
  const model=levelModels.get(level.id);
  if(!model){worldEffects=null;return;}
  resetLevelModel(model);cave.add(model);
  const structures=createPlumeObstacles(model,o=>o.name.includes('_post_')||o.name.startsWith('wind_mast_'));
  plumeEnvironment={...level,obstacles:structures.boxes};
  worldEffects=createWorldEffects(scene,scenery,level,{reducedMotion,levelModel:model});
  canvas.dataset.levelAsset=levelAssetFile(level,course);
}

async function loadLevel(mission,index){
  const gltf=await loader.loadAsync(`../levels/${levelAssetFile(mission,index)}`);
  levelModels.set(mission.id,prepareLevelModel(gltf.scene,mission));
}

// A fixed particle pool avoids allocations during flight and includes smoke and crash sparks.
const particleCount=300,positions=new Float32Array(particleCount*3),colors=new Float32Array(particleCount*3);
const particles=Array.from({length:particleCount},()=>({life:0,max:1,vx:0,vy:0,vz:0,smoke:false}));
positions.fill(999);
const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));particleGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
const sprite=document.createElement('canvas');sprite.width=32;sprite.height=32;
const paint=sprite.getContext('2d'),gradient=paint.createRadialGradient(16,16,0,16,16,16);
gradient.addColorStop(0,'#fff');gradient.addColorStop(.25,'#fffe');gradient.addColorStop(1,'#fff0');paint.fillStyle=gradient;paint.fillRect(0,0,32,32);
const particleMaterial=new THREE.PointsMaterial({size:.26,map:new THREE.CanvasTexture(sprite),vertexColors:true,transparent:true,depthWrite:false,opacity:.7});
const particleMesh=new THREE.Points(particleGeo,particleMaterial);particleMesh.frustumCulled=false;scene.add(particleMesh);
let particleCursor=0,smokeClock=0;
function emit(x,y,vx,vy,spark=false){
  const i=particleCursor++%particleCount,p=particles[i];
  p.life=p.max=spark ? .45+Math.random()*.7 : .8+Math.random()*.9;p.smoke=!spark;
  p.bubble=level.theme==='water'&&!spark;
  p.vx=vx+(Math.random()-.5)*(spark?5:1.1);p.vy=vy+(Math.random()-.5)*(spark?5:1);p.vz=(Math.random()-.5)*1.4;
  if(p.bubble)p.vy=.6+Math.random();
  positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=.2;
}
function updateParticles(dt){
  for(let i=0;i<particleCount;i++){
    const p=particles[i];if(p.life<=0)continue;p.life-=dt;
    if(p.life<=0){positions[i*3+1]=999;continue;}
    positions[i*3]+=p.vx*dt;positions[i*3+1]+=p.vy*dt;positions[i*3+2]+=p.vz*dt;
    const fade=p.life/p.max;
    p.vy+=(p.bubble ? .4 : p.smoke ? .3 : -4)*dt;
    colors[i*3]=fade*(p.smoke ? .6 : 2);colors[i*3+1]=fade*(p.smoke ? .48 : .85);colors[i*3+2]=fade*(p.smoke ? .36 : .2);
    if(p.bubble){colors[i*3]=fade*.35;colors[i*3+1]=fade*.8;colors[i*3+2]=fade;}
  }
  particleGeo.attributes.position.needsUpdate=true;particleGeo.attributes.color.needsUpdate=true;
}

async function loadShip(id){
  const gltf=await loader.loadAsync(`../ships/${id}.glb`),root=gltf.scene;
  root.updateMatrixWorld(true);
  const collision=root.getObjectByName('collision');
  if(!collision?.geometry)throw new Error(`${id}: collision hull is missing`);
  const points=[],attribute=collision.geometry.getAttribute('position');
  for(let i=0;i<attribute.count;i++){
    const p=new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(collision.matrixWorld);points.push([p.x,p.y]);
  }
  const hull=convexHull(points);
  batchCraftDetails(root,gltf.animations);
  collision.visible=false;root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
  const template=root.clone(true),appearance=decorateCraft(root);
  const marker=root.getObjectByName('thruster_main');
  if(!marker)throw new Error(`${id}: main thruster is missing`);
  const anchor=root.worldToLocal(marker.getWorldPosition(new THREE.Vector3()));
  const system=createFlightSystems(root,gltf.animations);
  const model={root,hull,anchor,system,appearance,template,animations:gltf.animations};root.visible=false;scene.add(root);fleet.set(id,model);
}

function createBotVisual(id,sourceId,color){
  const source=fleet.get(sourceId)||fleet.values().next().value,root=source.template.clone(true),appearance=decorateCraft(root);
  appearance.paint(color);const anchor=source.anchor.clone();
  const model={root,hull:source.hull,appearance,anchor,ship:sourceId,system:createFlightSystems(root,source.animations),lastEngine:false};
  scene.add(root);botVisuals.set(id,model);
}
function removeRemoteVisual(id,model){
  model.appearance.damage.reset();model.system.setPaused(true);scene.remove(model.root);
  const materials=new Set();model.root.traverse(object=>{if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});
  for(const material of materials)material.dispose();
  for(const side of ['left','right'])model.root.getObjectByName(`upper_rotation_${side}`)?.traverse(object=>object.geometry?.dispose());
  for(const direction of ['left','right','up','down'])model.root.getObjectByName(`translation_jet_${direction}`)?.traverse(object=>object.geometry?.dispose());
  botVisuals.delete(id);$(`rival-${id}`)?.remove();
}

function saveProgress(){
  if(!online?.player)persistent=saveProfile(storage,profile);$('wallet').textContent=`${profile.coins} coins`;
  $('save-status').textContent=online?.player?'Coins, upgrades and paint save to your pilot on the server.':persistent?'Progress saves in this browser.':'Browser storage is unavailable. Progress lasts for this session only.';
}
const garage=createGarage({profile,
  async onOpen(){if(mode==='running')togglePause();startMenu.hide();clearInput();mode='garage';document.body.classList.add('at-menu','at-garage');await leaveNetwork();},
  onChange(){saveProgress();updateShipChoices();},
  onClose(){document.body.classList.remove('at-garage');openMenu();$('menu-garage').focus();},
  onPreview(id,color,tuning){const source=fleet.get(id);if(source)garageScene.attach(id,source,color,tuning);canvas.dataset.garageShip=id;canvas.dataset.garagePaint=color||'original';canvas.dataset.garageRcs=String(tuning.rcs);},
  purchase:(kind,key,ship)=>online.buy(kind,key,ship),
  equip:ship=>online.equip(ship),
});
const startMenu=createStartMenu({profile,storage,levels:LEVELS,reducedMotion,
  onPlay:index=>launchFromMenu(index,true),
  onMission:index=>launchFromMenu(index,false),
  onDelete(){
    $('wallet').textContent=`${profile.coins} coins`;
    openMenu();
  },
  onMotion:paused=>{menuControls.clear();menuScene.setPaused(paused);},
  onReset:()=>online.reset(),
});
function leaveNetwork(){networkRoom=null;return online?.leave().catch(error=>$('network-status').textContent=error.message);}
function updateShipChoices(){
  for(const option of $('ship').options){const owned=profile.ownedShips.includes(option.value);option.disabled=!owned||!fleet.has(option.value);option.textContent=`${SHIPS[option.value].name}${owned?'':' · buy in garage'}`;}
  $('ship').value=profile.ship;
}
function openMenu(){
  leaveNetwork();
  clearInput();mode='menu';$('message').hidden=true;startMenu.show();
  canvas.tabIndex=-1;canvas.setAttribute('aria-label','Rocket launch display. Choose Play or Missions to fly.');
  updateShipChoices();const id=$('ship').value,source=fleet.get(id);
  if(source){
    menuScene.attach(id,source,SKINS[profile.skin].color,flightTuning(profile));
    $('menu-craft-name').textContent=$('ship').selectedOptions[0].textContent;
  }
  startMenu.setReady(Boolean(source)&&levelModels.size===LEVELS.length);
  $('menu-garage').disabled=!source;
  online?.refreshLobby();
}
async function launchFromMenu(index,play,roomId=null,joinedRoom=null){
  if(joining)return;joining=true;
  try{
    await online.ready;
    const joined=joinedRoom||await online.join({mission:LEVELS[index].id,...(roomId?{room:roomId}:{})});
    startMenu.hide();canvas.tabIndex=0;canvas.setAttribute('aria-label',flightCanvasLabel);
    $('course').value=String(LEVELS.findIndex(mission=>mission.id===joined.mission));changeCourse();
    networkRoom=joined.id;acceptNetworkRace(joined,online.player.id);showBrief();$('primary').focus();
  }catch(error){$('menu-status').textContent=error.message;$('network-status').textContent=error.message;}
  finally{joining=false;}
}
for(const [index,mission] of LEVELS.entries()){
  const option=document.createElement('option');option.value=String(index);option.textContent=`${String(index+1).padStart(2,'0')} — ${mission.name}`;
  if(index===0)$('course').replaceChildren();$('course').append(option);
}
$('wallet').textContent=`${profile.coins} coins`;
$('save-status').textContent=persistent?'Progress saves in this browser.':'Browser storage is unavailable. Progress lasts for this session only.';

function acceptNetworkRace(snapshot,playerId){
  if(snapshot.id!==networkRoom)return;
  if(race?.id===snapshot.id&&(snapshot.round??0)<(race.round??0))return;
  const own=snapshot.racers.find(racer=>racer.id===playerId);if(!own)return;
  const newAttempt=race?.id===snapshot.id&&own.attemptId&&race.racers[0]?.attemptId!==own.attemptId;
  if(snapshot.mission!==level.id){
    $('course').value=String(LEVELS.findIndex(mission=>mission.id===snapshot.mission));changeCourse();resetFlight();$('mission-scores').hidden=true;
  }else if(newAttempt)resetFlight();
  const ordered=[own,...snapshot.racers.filter(racer=>racer!==own)].map(racer=>({...racer,id:racer.id===playerId?'you':racer.id}));
  flightPresentation.receive(ordered,performance.now()/1000);
  race={...snapshot,level,racers:ordered,finished:Boolean(own.result)};state=own.state;
  for(const racer of ordered.slice(1)){
    const previous=botVisuals.get(racer.id);if(previous&&previous.ship!==racer.ship)removeRemoteVisual(racer.id,previous);
    if(!botVisuals.has(racer.id))createBotVisual(racer.id,racer.ship,racer.color||'#a7bdc7');
    if(!$(`rival-${racer.id}`)){const label=document.createElement('span');label.id=`rival-${racer.id}`;$('rival-labels').append(label);}
    $(`rival-${racer.id}`).textContent=racer.name;
    botVisuals.get(racer.id).root.visible=!racer.waiting&&racer.state.status!=='crashed';
  }
  const active=new Set(ordered.map(racer=>racer.id));
  for(const [id,model] of botVisuals)if(!active.has(id)){
    if(id!=='ash'&&id!=='vesper')removeRemoteVisual(id,model);
    else{model.root.visible=false;const label=$(`rival-${id}`);if(label)label.hidden=true;}
  }
  $('network-status').textContent=snapshot.nextLevelIn!==null&&snapshot.nextLevelIn!==undefined?`Next mission in ${Math.ceil(snapshot.nextLevelIn)}s · all pilots advance together`:own.waiting?'Waiting for a clear launch position.':online.connected?'Live multiplayer · open room':'Reconnecting · controls released';
  if(own.result&&mode!=='ended'&&mode!=='menu')finishOnline(own.result);
  if(own.result?.success&&snapshot.nextLevelIn!==null&&snapshot.nextLevelIn!==undefined){$('primary').textContent=`Next mission in ${Math.ceil(snapshot.nextLevelIn)}s`;$('primary').disabled=true;}
}
function finishOnline(result){
  clearInput();mode='ended';$('pause').disabled=true;
  if(result.success){setMessage(result.rank===1?'RACE WON':`FINISHED #${result.rank}`,result.coins?`Victory. +${result.coins} coins.`:'Flight complete.',`${level.name} · ${formatTime(result.time)} · Result saved to your pilot.`,course===LEVELS.length-1?'Race again →':'Next mission →');playChime();}
  else{setMessage('DID NOT FINISH','Spacecraft destroyed.',`${state.reason} No coins awarded.`,'Try again →');selected.root.visible=false;playCrash();}
}
online=createOnline({storage,getShip:()=>$('ship').value,getMission:()=>level,isReady:()=>fleet.size>0&&levelModels.size===LEVELS.length,
  onProfile(value){
    const loadoutChanged=profile.ship!==(value.ship??profile.ship)||profile.skin!==value.skin||Object.keys(profile.upgrades).some(key=>profile.upgrades[key]!==value.upgrades[key]);
    Object.assign(profile,sanitizeProfile(value));updateShipChoices();
    if(mode==='menu'&&value.ship){
      $('ship').value=value.ship;const source=fleet.get(value.ship);
      if(source&&loadoutChanged){menuScene.attach(value.ship,source,SKINS[profile.skin].color,flightTuning(profile));$('menu-craft-name').textContent=$('ship').selectedOptions[0].textContent;}
    }
    saveProgress();startMenu.refresh();if(garage.isOpen())garage.render();
  },
  onRace:acceptNetworkRace,
  onStatus(connected){if(!connected)clearInput();$('network-status').textContent=connected?'Live multiplayer · open room':'Reconnecting · controls released';},
  onJoin:room=>launchFromMenu(LEVELS.findIndex(mission=>mission.id===room.mission),false,room.id,room),
});
// Network input cadence must not depend on WebGL frame rate or shader compilation.
setInterval(()=>{
  if(!networkRoom)return;
  online.sendInput(mode==='running'?controls.read(level.controls==='translation'):{thrust:false,turn:0});controls.advance(.1);
},100);
let scoresRequest=0;
async function showScores(){
  const sequence=++scoresRequest,container=$('mission-scores');container.hidden=false;container.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='MISSION RECORDS · TOP 5';const loading=document.createElement('p');loading.textContent='Loading records…';container.append(heading,loading);
  try{const scores=await online.scores(level.id);if(sequence!==scoresRequest)return;loading.remove();
    if(!scores.length){loading.textContent='No times yet. Set the first record.';container.append(loading);return;}
    const list=document.createElement('ol');for(const score of scores){const row=document.createElement('li'),time=document.createElement('span');row.textContent=score.name;time.textContent=formatTime(score.time);row.append(time);list.append(row);}container.append(list);
  }catch{if(sequence===scoresRequest)loading.textContent='Records unavailable. Reconnect and try again.';}
}

function setMessage(eyebrow,title,body,button){
  $('message').hidden=false;$('message-eyebrow').textContent=eyebrow;$('message-title').textContent=title;
  $('message-body').textContent=body;$('primary').textContent=button;$('primary').disabled=false;
}
function showBrief(){
  mode='briefing';$('pause').disabled=true;$('pause').firstChild.textContent='Pause ';
  setMessage(`RACE BRIEF / ${String(course+1).padStart(2,'0')} · ${level.reward} COINS`,level.name,missionBrief(level),'Race →');
  if(online)showScores();
}
function resetFlight(brief=false){
  flightPresentation.reset();
  clearInput();lastEngine=false;elapsed=0;accumulator=0;shake=0;
  for(const item of fleet.values()){item.root.visible=false;item.system.reset();item.appearance.damage.reset();item.destroyed=false;item.damageRevision=0;item.leakClock=0;}
  selected=fleet.get($('ship').value);
  if(!selected)return;
  attemptId=crypto.randomUUID();
  race=createRace(level,{hull:selected.hull,tuning:flightTuning(profile),bots:[...botVisuals].filter(([id])=>id==='ash'||id==='vesper').map(([id,model],index)=>({id,name:index===0?'Ash':'Vesper',hull:model.hull,speed:index===0?2.3:2.55,delay:index===0?2.2:3.5}))});
  state=race.racers[0].state;selected.root.visible=true;selected.appearance.paint(SKINS[profile.skin].color);
  for(const model of botVisuals.values()){model.root.visible=true;model.system.reset();model.appearance.damage.reset();model.destroyed=false;model.damageRevision=0;model.leakClock=0;model.lastEngine=false;}
  for(const p of particles)p.life=0;positions.fill(999);particleGeo.attributes.position.needsUpdate=true;
  plume.reset();destruction.reset();
  engineLight.intensity=0;renderShip();
  $('flight-hint').hidden=true;
  if(brief)showBrief();else{mode='running';$('message').hidden=true;$('pause').disabled=false;$('pause').firstChild.textContent='Pause ';canvas.focus({preventScroll:true});}
  updateHud();resize();cameraX=camera.right>=26?0:THREE.MathUtils.clamp(state.x,-26+camera.right,26-camera.right);
}
function changeCourse(){
  course=Number($('course').value);level=LEVELS[course];buildCave();
  const space=level.controls==='translation';document.body.classList.toggle('space-flight',space);
  canvas.setAttribute('aria-label',space?'Flight area. WASD or arrows thrust in four directions. Q and E rotate. P pauses, R restarts.':flightCanvasLabel);
  $('control-legend').textContent=space?'WASD / ARROWS: MOVE · Q / E: ROTATE · OPPOSITE THRUST: BRAKE':'W / SPACE: THRUST · A / D: ROTATE';
  $('course-number').textContent=level.difficulty;$('course-name').textContent=level.name;$('course-description').textContent=level.subtitle;
  resetFlight(true);
}
function begin(){
  if(!selected)return;
  if(online){
    if(mode==='briefing'&&networkRoom||mode==='paused'&&networkRoom){mode='running';$('message').hidden=true;$('mission-scores').hidden=true;$('pause').disabled=false;$('pause').firstChild.textContent='Pause ';canvas.focus({preventScroll:true});return;}
    if(networkRoom&&!completed(state)){restartFlight();return;}
    if(networkRoom&&race.nextLevelIn!==null&&race.nextLevelIn!==undefined)return;
    const next=completed(state)&&course<LEVELS.length-1?course+1:course;
    networkRoom=null;launchFromMenu(next,false);return;
  }
  if(mode==='paused'){mode='running';$('message').hidden=true;$('pause').firstChild.textContent='Pause ';canvas.focus({preventScroll:true});return;}
  if(completed(state)&&course<LEVELS.length-1){$('course').value=String(course+1);changeCourse();}
  resetFlight();
}
async function restartFlight(){
  if(!networkRoom)return launchFromMenu(course,false);
  if(joining)return;joining=true;
  try{
    clearInput();const snapshot=await online.join({room:networkRoom,restart:true});
    acceptNetworkRace(snapshot,online.player.id);
  }catch(error){$('network-status').textContent=error.message;}
  finally{joining=false;}
}
function togglePause(){
  if(!selected||!['running','paused'].includes(mode))return;
  clearInput();
  if(mode==='paused'){begin();return;}
  mode='paused';$('pause').firstChild.textContent='Resume ';
  setMessage('FLIGHT ON HOLD','Take a breather.',networkRoom?'Your controls are released. The shared race continues while you pause.':'Your position, fuel, and flight time are held.','Resume flight →');
}
function clearInput(){controls.clear();menuControls.clear();if(networkRoom)online?.sendInput({thrust:false,turn:0});rocketAudio.update(0);for(const b of document.querySelectorAll('[data-control],[data-menu-control]'))b.classList.remove('active');}
function sendCurrentInput(){if(networkRoom&&mode==='running')online.sendInput(controls.read(level.controls==='translation'));}
function finish(){
  clearInput();mode='ended';$('pause').disabled=true;
  if(completed(state)){
    const result=raceResult(race),coins=settleRace(profile,{attemptId,missionId:level.id,...result,reward:level.reward});saveProgress();
    const allDone=course===LEVELS.length-1;
    setMessage(result.rank===1?'RACE WON':`FINISHED ${result.rank===2?'SECOND':'THIRD'}`,result.rank===1?`Victory. +${coins} coins.`:'The rivals got there first.',`${level.name} · ${formatTime(race.elapsed)} · ${Math.ceil(state.fuel)} fuel left. ${result.rank===1?'Spend your winnings in the garage.':'Finish first to earn coins. Try upgrades or a cleaner racing line.'}`,allDone?'Race again →':'Next mission →');
    playChime();
  }else{
    settleRace(profile,{attemptId,missionId:level.id,success:false,rank:3,reward:level.reward});saveProgress();
    setMessage('DID NOT FINISH','Spacecraft destroyed.',`${state.reason} No coins awarded. Restart and race again.`,'Try again →');
    selected.root.visible=false;shake=reducedMotion?0:.35;
    playCrash();
  }
}
function renderShip(dt=0){
  const pose=networkRoom?flightPresentation.sample('you',performance.now()/1000,dt)||state:state;
  selected.appearance.configure(state.tuning,level.theme==='dark');
  selected.root.position.set(pose.x,pose.y,.4);selected.root.rotation.z=pose.angle;selected.root.updateMatrixWorld(true);selected.appearance.update(state.tuning.rcs,state.rcsTurn,state.damage,level.controls==='translation'?(state.status==='flying'?state.translation:null)||{x:0,y:0}:null);syncDamage(selected,state);
  for(const racer of race.racers.slice(1)){
    const model=botVisuals.get(racer.id);if(!model)continue;
    const pose=networkRoom?flightPresentation.sample(racer.id,performance.now()/1000,dt)||racer.state:racer.state;
    model.appearance.configure(racer.state.tuning,level.theme==='dark');
    model.root.position.set(pose.x,pose.y,.4);model.root.rotation.z=pose.angle;model.root.updateMatrixWorld(true);model.appearance.update(racer.state.tuning.rcs,racer.state.rcsTurn,racer.state.damage,level.controls==='translation'?(racer.state.status==='flying'?racer.state.translation:null)||{x:0,y:0}:null);syncDamage(model,racer.state);
  }
}
function syncDamage(model,flight){
  const detached=model.appearance.damage.update(flight.damage);
  if(detached.length)destruction.shed(detached,flight);
  if(flight.damage.revision!==(model.damageRevision||0)){
    model.damageRevision=flight.damage.revision;
    const hit=flight.damage.lastHit,position=model.root.localToWorld(new THREE.Vector3(hit.x,hit.y,.1));
    for(let i=0;i<(reducedMotion?4:18);i++)emit(position.x,position.y,flight.vx*.3,flight.vy*.3,true);
  }
  if(flight.status==='crashed'&&!model.destroyed){
    destruction.destroy(model.root,flight);model.destroyed=true;
    for(let i=0;i<(reducedMotion?12:70);i++)emit(flight.x,flight.y,(Math.random()-.5)*7,(Math.random()-.5)*7,true);
  }
  model.root.visible=flight.status!=='crashed';
}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;}
function updateHud(){
  if(!state)return;
  const env=environmentAt(state,level);
  $('hull-value').textContent=`${Math.ceil(state.damage.hull)}%`;$('hull').value=state.damage.hull;
  $('damage-readout').textContent=damageReadout(state.damage);
  $('fuel').max=state.tuning.capacity;$('fuel').value=state.fuel;$('fuel-value').innerHTML=`${Math.ceil(state.fuel)}<span>/${state.tuning.capacity}</span>`;
  $('vertical').innerHTML=`${Math.abs(state.vy).toFixed(1)} <small>${state.vy<-.1?'↓':state.vy>.1?'↑':''} m/s</small>`;
  const bottom=Math.min(...worldHull(state,selected.hull).map(p=>p[1]));
  let floor=level.floor.length?surfaceAt(level.floor,state.x):0;
  for(const pad of level.pads)if(Math.abs(state.x-pad.x)<pad.width/2)floor=Math.max(floor,pad.y);
  const space=level.controls==='translation';
  $('altitude-label').textContent=space?'SPEED':level.objective==='orbit'?'ALTITUDE':'CLEARANCE';
  $('altitude').innerHTML=`${(space?Math.hypot(state.vx,state.vy):level.objective==='orbit'?env.altitude:Math.max(0,bottom-floor)).toFixed(1)} <small>${space?'m/s':'m'}</small>`;
  $('timer').textContent=formatTime(race.elapsed);
  $('environment-readout').textContent=`${level.planet} · Gravity ${(env.gravity/4).toFixed(2)}×${level.wind?` · Headwind ${Math.abs(env.wind).toFixed(1)} m/s`:env.cloud?' · Inside cloud':level.theme==='water'?' · Submerged':''}`;
  const order=standings(race),signature=order.map(r=>`${r.id}:${r.finishTime}:${r.state.status}:${Math.ceil(r.state.damage.hull)}:${race.started}`).join('|');
  if(signature!==lastStandings){lastStandings=signature;$('race-order').replaceChildren(...order.map((racer,index)=>{
    const row=document.createElement('li');row.className=racer.id==='you'?'is-you':'';
    row.textContent=`${index+1}. ${racer.name}`;const status=document.createElement('span');status.textContent=racer.finishTime!==null?formatTime(racer.finishTime):racer.state.status==='crashed'?'DNF':race.started?`Racing${racer.state.damage.hull<100?` · ${Math.ceil(racer.state.damage.hull)}%`:''}`:'Ready';row.append(status);return row;
  }));}
  $('environment-readout').textContent+=space?' · VACUUM · MAIN ENGINE OFF':` · T/W ${(state.tuning.thrust*env.engineScale*(state.damage.engine/100)/env.gravity).toFixed(2)}`;
  document.querySelector('.landing-rule').textContent=level.objective==='land'?'LAND UPRIGHT · BELOW 2.2 m/s':level.objective==='rings'?'FLY THROUGH THE GATES · NO LANDING':'CLIMB INTO THIN AIR · BUILD ORBITAL SPEED';
  $('objective-readout').textContent=level.objective==='orbit'?`Air ${Math.round(env.density*100)}% · Speed ${state.vx.toFixed(1)}/${orbitalTarget(state,level).toFixed(1)} m/s · Hold ${state.orbitHold.toFixed(1)}/3 s`:level.objective==='rings'?`Gates ${state.gate}/${level.rings.length} · ${level.reward} coins for first`:`First to land wins · ${level.reward} coins`;
  $('vertical').style.color=state.vy < -2.2?'#f0a377':'';
  const hint=$('flight-hint');hint.hidden=mode!=='running';
  if(mode==='running')hint.textContent=state.fuel<=0?'Propellant depleted. Coast carefully.':state.status==='ready'?'W / Space to start the race. A / D to rotate.':state.notice?state.notice:level.objective==='orbit'?(env.altitude<55?'Climb to 55–100 m. Thin air gives stronger acceleration.':`Turn right into orbit. Aim for ${orbitalTarget(state,level).toFixed(1)} m/s sideways; keep vertical speed below 1.8.`):level.objective==='rings'?(level.id==='rings'?'Climb, pitch nose-right, then fly horizontally through the ring.':`Fly through gate ${state.gate+1} from the left. Cloud banks slow you down.`):Math.abs(state.x-level.pads[1].x)<5?'Slow down. Straighten up. Set down gently.':level.theme==='dark'?'Follow the green beacons. Your engine lights the nearby rock.':'Lean right to cross. Lean left to slow down.';
  if(mode==='running'&&space)hint.textContent=state.fuel<=0?'Propellant depleted. Momentum continues.':`WASD / arrows thrust · Q/E rotate · Opposite thrust brakes · Gate ${Math.min(state.gate+1,level.rings.length)}/${level.rings.length}`;
  // DOM telemetry is also useful for accessibility and repeatable runtime inspection.
  canvas.dataset.flightState=state.status;canvas.dataset.mode=mode;
  canvas.dataset.x=state.x.toFixed(2);canvas.dataset.y=state.y.toFixed(2);canvas.dataset.angle=state.angle.toFixed(3);
  canvas.dataset.mission=level.id;canvas.dataset.coins=String(profile.coins);canvas.dataset.rank=String(standings(race).findIndex(r=>r.id==='you')+1);
  canvas.dataset.plumeParticles=String(plume.count);
  canvas.dataset.shipContacts=String(race.contacts);
  canvas.dataset.vx=state.vx.toFixed(3);canvas.dataset.vy=state.vy.toFixed(3);canvas.dataset.mainThrust=String(state.thrust);canvas.dataset.gates=String(state.gate);
  canvas.dataset.hullIntegrity=state.damage.hull.toFixed(1);canvas.dataset.debris=String(destruction.count);
}

function resize(){
  const w=innerWidth,h=innerHeight;renderer.setPixelRatio(renderBudget.resize(w,h,devicePixelRatio));renderer.setSize(w,h);
  const aspect=w/h,height=Math.max(24,54/aspect);
  // Portrait follows the craft rather than shrinking the whole course into a tiny strip.
  const viewHeight=aspect<1?25:Math.min(height,36),viewWidth=viewHeight*aspect;
  camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
  menuScene.resize(w,h);
  garageScene.resize(w,h);
}
const projected=new THREE.Vector3();
function updateCamera(dt){
  if(!state)return;
  const visual=selected.root.position,half=camera.right,desired=level.objective==='orbit'||level.theme==='space'?visual.x+state.vx*.4:half>=27?0:THREE.MathUtils.clamp(visual.x+state.vx*.65,-26+half,26-half);
  cameraX=THREE.MathUtils.lerp(cameraX,desired,1-Math.exp(-dt*4));
  const y=level.theme==='space'?visual.y:level.objective==='orbit'?Math.max(innerWidth<680?-2.5:0,visual.y-1):visual.y>9?visual.y-7:innerWidth<680?visual.y*.38:0;
  camera.position.set(cameraX+(Math.random()-.5)*shake,y+1+(Math.random()-.5)*shake,50);camera.lookAt(cameraX,y+1,0);camera.updateMatrixWorld();shake=Math.max(0,shake-dt*.5);
  const target=level.objective==='rings'?level.rings[Math.min(state.gate,level.rings.length-1)]:level.pads[1];
  const labels=[level.pads[0],target];
  $('goal-label').querySelector('b').textContent=level.objective==='rings'?'FLY THROUGH':'LAND HERE';
  for(const [index,pad] of labels.entries()){
    const el=index===0?$('launch-label'):$('goal-label');if(!pad){el.hidden=true;continue;}
    projected.set(pad.x,pad.y+2,1).project(camera);
    el.style.left=`${(projected.x+1)*innerWidth/2}px`;el.style.top=`${(1-projected.y)*innerHeight/2}px`;
    el.hidden=Math.abs(projected.x)>1||Math.abs(projected.y)>1;
  }
  for(const [index,racer] of race.racers.slice(1).entries()){
    const el=$(`rival-${racer.id}`),position=botVisuals.get(racer.id).root.position;projected.set(position.x,position.y+1.4+index*.7,0).project(camera);
    el.style.left=`${(projected.x+1)*innerWidth/2}px`;el.style.top=`${(1-projected.y)*innerHeight/2}px`;el.hidden=racer.state.status==='crashed'||Math.abs(projected.x)>1||Math.abs(projected.y)>1;
  }
}

function playChime(){
  if(!soundEnabled)return;
  for(const [i,f] of [523,784].entries()){
    const o=context.createOscillator(),g=context.createGain(),t=context.currentTime+i*.13;o.frequency.value=f;g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(rocketAudio.output);o.start(t);o.stop(t+.5);
  }
}
function playCrash(){
  if(!soundEnabled)return;
  const length=context.sampleRate*.6,buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3)*.06;
  const source=context.createBufferSource();source.buffer=buffer;source.connect(rocketAudio.output);source.start();
}
for(const button of document.querySelectorAll('[data-sound-toggle]'))button.addEventListener('click',async()=>{
  const buttons=document.querySelectorAll('[data-sound-toggle]');for(const item of buttons)item.disabled=true;
  try{soundEnabled=await rocketAudio.toggle();context=rocketAudio.context;for(const item of buttons){item.setAttribute('aria-pressed',String(soundEnabled));item.textContent=soundEnabled?'Sound on':'Sound off';}}
  catch{for(const item of buttons)item.textContent='Audio unavailable · retry';}
  finally{for(const item of buttons)item.disabled=false;}
});
$('primary').addEventListener('click',begin);$('restart').addEventListener('click',restartFlight);$('pause').addEventListener('click',togglePause);
$('home').addEventListener('click',()=>{openMenu();$('menu-play').focus();});
$('ship').addEventListener('change',()=>launchFromMenu(course,false));$('course').addEventListener('change',()=>launchFromMenu(Number($('course').value),false));
window.addEventListener('resize',resize);
window.addEventListener('keydown',e=>{
  if(mode==='garage'&&e.code==='Escape'){e.preventDefault();garage.close();return;}
  if(garage.isOpen()||document.querySelector('dialog[open]')||e.target.closest('select,input,textarea'))return;
  if(e.target.closest('button,a')&&['Space','Enter'].includes(e.code))return;
  if(mode==='menu'){
    if(e.code in keyControls){e.preventDefault();if(!e.repeat)menuControls.press(e.code,keyControls[e.code]);}
    return;
  }
  if(mode==='ended'&&['Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat)begin();return;}
  const flightKeys=level.controls==='translation'?translationKeys:keyControls;
  if(e.code in flightKeys){e.preventDefault();if(mode==='running'&&!e.repeat){controls.press(e.code,flightKeys[e.code]);sendCurrentInput();}}
  if(e.repeat)return;
  if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();togglePause();}
  if(e.code==='KeyR'){e.preventDefault();restartFlight();}
});
window.addEventListener('keyup',e=>{controls.release(e.code);menuControls.release(e.code);sendCurrentInput();});
window.addEventListener('blur',()=>{clearInput();if(mode==='running')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){rocketAudio.update(0);if(mode==='running')togglePause();}});
for(const button of document.querySelectorAll('[data-control]')){
  const control=button.dataset.control;
  button.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='running')return;button.setPointerCapture(e.pointerId);controls.press(`pointer:${e.pointerId}`,control);button.classList.add('active');sendCurrentInput();});
  button.addEventListener('click',e=>{if(e.detail===0&&mode==='running'){controls.press('keyboard-button',control);controls.release('keyboard-button');}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{controls.release(`pointer:${e.pointerId}`);button.classList.remove('active');sendCurrentInput();});
}
for(const button of document.querySelectorAll('[data-menu-control]')){
  const control=button.dataset.menuControl;
  button.addEventListener('pointerdown',e=>{
    if(mode!=='menu'||document.querySelector('dialog[open]'))return;
    e.preventDefault();button.setPointerCapture(e.pointerId);menuControls.press(`menu-pointer:${e.pointerId}`,control);button.classList.add('active');
  });
  button.addEventListener('click',e=>{if(e.detail===0&&mode==='menu'){menuControls.press('menu-button',control);menuControls.release('menu-button');}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{menuControls.release(`menu-pointer:${e.pointerId}`);button.classList.remove('active');});
}

function frame(now){
  requestAnimationFrame(frame);const frameDelta=(now-last)/1000,dt=Math.min(frameDelta,.08);last=now;
  if(document.hidden)return;
  const pixelRatio=renderBudget.sample(frameDelta*1000);if(pixelRatio!==null)renderer.setPixelRatio(pixelRatio);
  canvas.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
  frameSeconds+=frameDelta;frameCount++;
  if(frameSeconds>=1){canvas.dataset.fps=String(Math.round(frameCount/frameSeconds));canvas.dataset.drawCalls=String(renderer.info.render.calls);frameSeconds=0;frameCount=0;}
  if(mode==='garage'){
    rocketAudio.update(0);
    if(!document.hidden){garageScene.update(frameDelta,renderer);renderScene(garageScene.scene,garageScene.camera);}
    canvas.dataset.mode='garage';return;
  }
  if(mode==='menu'){
    if(!document.hidden){
      const canSteer=!document.querySelector('dialog[open]');
      const sample=menuScene.update(frameDelta,renderer,seconds=>{const input=canSteer?menuControls.read():{};menuControls.advance(seconds);return input;});startMenu.update(sample);rocketAudio.update(sample.paused?0:sample.throttle);
      renderScene(menuScene.scene,menuScene.camera);
    }
    canvas.dataset.mode='menu';return;
  }
  if(selected&&state){
    if(networkRoom){
      renderShip(dt);
    }else if(mode==='running'&&!online){
      accumulator+=dt;
      while(accumulator>=FIXED_STEP){stepRace(race,controls.read(level.controls==='translation'),FIXED_STEP);controls.advance(FIXED_STEP);accumulator-=FIXED_STEP;if(race.finished){finish();accumulator=0;break;}}
      renderShip();
    }
    const firing=mode==='running'&&state.thrust>0&&state.status==='flying';
    rocketAudio.update(firing?state.thrust:0,{rcs:mode==='running'&&state.status==='flying'?Math.max(Math.abs(state.rcsTurn),Math.hypot(state.translation?.x||0,state.translation?.y||0)):0,submerged:level.theme==='water'});
    // Flight-path prediction is temporarily disabled while responsiveness is assessed.
    if(mode!=='paused'&&firing!==lastEngine){selected.system.playTrigger(firing?'Engine_start':'Engine_stop');lastEngine=firing;}
    if(mode!=='paused'){selected.system.update(dt);}
    engineLight.intensity=firing?(level.theme==='dark'?18:5):0;engineLight.distance=level.theme==='dark'?12:5;
    const anchor=selected.root.localToWorld(selected.anchor.clone());engineLight.position.copy(anchor);
    if(firing&&!reducedMotion&&level.theme==='water'){
      smokeClock+=dt;while(smokeClock>.025){smokeClock-=.025;emit(anchor.x,anchor.y,Math.sin(state.angle)*3+state.vx*.3,-Math.cos(state.angle)*3+state.vy*.3);}
    }else smokeClock=0;
    if(mode!=='paused'){
      const emitters=race.racers.map(racer=>{
        const model=racer.id==='you'?selected:botVisuals.get(racer.id);
        const position=model.root.localToWorld(model.anchor.clone());
        const burning=mode==='running'&&racer.state.thrust>0&&racer.state.status==='flying';
        const source={x:position.x,y:position.y,z:position.z,angle:model.root.rotation.z,vx:racer.state.vx,vy:racer.state.vy,density:environmentAt(racer.state,level).density,firing:burning,throttle:racer.state.thrust};
        if(burning)plume.emit(racer.id,source,dt,plumeEnvironment);
        return source;
      });
      plume.update(dt,plumeEnvironment,camera,renderer,emitters);
    }
    if(mode!=='paused'){
      for(const racer of race.racers){
        const model=racer.id==='you'?selected:botVisuals.get(racer.id),damage=racer.state.damage;
        if(racer.state.status!=='flying'||damage.hull>=65||!damage.lastHit)continue;
        model.leakClock=(model.leakClock||0)+dt;
        while(model.leakClock>.08){model.leakClock-=.08;const hit=model.root.localToWorld(new THREE.Vector3(damage.lastHit.x,damage.lastHit.y,.1));emit(hit.x,hit.y,racer.state.vx*.4,racer.state.vy*.4+.5);}
      }
      updateParticles(dt);destruction.update(dt,level);
    }
    if(mode!=='paused')worldEffects?.update(state,dt);
    for(const racer of race.racers.slice(1)){
      const model=botVisuals.get(racer.id);if(!model)continue;
      const burning=mode==='running'&&racer.state.thrust>0&&racer.state.status==='flying';
      if(mode!=='paused'&&model.lastEngine!==burning){model.system.playTrigger(burning?'Engine_start':'Engine_stop');model.lastEngine=burning;}
      if(mode!=='paused'){model.system.update(dt);}
    }
    elapsed+=dt;if(elapsed>.08){updateHud();elapsed=0;}
  }
  updateCamera(dt);renderScene(scene,camera);
}
buildCave();resize();requestAnimationFrame(frame);
Promise.allSettled([...['tintin','futurama','comet','wraith','aster'].map(loadShip),...LEVELS.map(loadLevel)]).then(results=>{
  const ids=['tintin','futurama','comet','wraith','aster'];
  results.slice(0,ids.length).forEach((r,i)=>{if(r.status==='rejected'){console.error(r.reason);$('ship').querySelector(`[value="${ids[i]}"]`).disabled=true;}});
  const failedLevels=results.slice(ids.length).filter(result=>result.status==='rejected');
  if(failedLevels.length){for(const result of failedLevels)console.error(result.reason);$('menu-status').textContent='A mission model could not load. Check the local server, rebuild level assets if needed, and reload.';return;}
  if(!fleet.size){$('menu-status').textContent='The fleet could not load. Check the local server and reload this page.';return;}
  if(!fleet.has($('ship').value))$('ship').value=fleet.keys().next().value;
  createBotVisual('ash','futurama','#79b4d4');createBotVisual('vesper','wraith','#bc8fba');
  buildCave();resetFlight(true);openMenu();
  online.ready.then(()=>{const invited=new URL(location.href).searchParams.get('room');if(invited)launchFromMenu(0,false,invited);});
});
