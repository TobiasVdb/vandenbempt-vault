import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createMenuBackdrop} from '../runtime/game/menu-backdrop.js';
import {createPlumeEffect} from '../runtime/game/plume-effect.js';
import {createFlightSystems} from '../runtime/flight-systems.js';
import {decorateCraft} from '../runtime/game/craft.js';
import {batchCraftDetails} from '../runtime/game/craft-batching.js';
import {convexHull} from '../runtime/game/physics.js';
import {createStartMenuScene} from '../runtime/game/start-menu-scene.js';
import {createRenderBudget} from '../runtime/game/render-budget.js';
import {createCrewScene,createCrewHatch} from '../runtime/game/crew-scene.js';
import {createDescent,storyFraming} from './story.js';
import {createFallAir} from './atmosphere.js';

export async function loadSpacecraft(){
  const gltf=await new GLTFLoader().loadAsync(new URL('../runtime/ships/aster.glb',import.meta.url).href),root=gltf.scene;
  root.updateMatrixWorld(true);
  const collision=root.getObjectByName('collision');
  if(!collision?.geometry)throw new Error('The spacecraft collision hull is missing.');
  const points=[],attribute=collision.geometry.attributes.position;
  for(let i=0;i<attribute.count;i++){const p=new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(collision.matrixWorld);points.push([p.x,p.y]);}
  const hull=convexHull(points);collision.visible=false;batchCraftDetails(root,gltf.animations);
  const marker=root.getObjectByName('thruster_main');
  if(!marker)throw new Error('The engine anchor is missing.');
  const anchor=root.worldToLocal(marker.getWorldPosition(new THREE.Vector3()));
  return {template:root,hull,anchor,animations:gltf.animations};
}

function createRenderer(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const budget=createRenderBudget();
  return {renderer,resize(width,height){renderer.setPixelRatio(budget.resize(width,height,devicePixelRatio));renderer.setSize(width,height,false);},sample(dt){const ratio=budget.sample(dt*1000);if(ratio!==null)renderer.setPixelRatio(ratio);}};
}

export function createCinema(canvas,source){
  const surface=createRenderer(canvas),{renderer}=surface,scene=new THREE.Scene();scene.background=new THREE.Color('#07121b');
  const camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,90);
  scene.add(new THREE.HemisphereLight('#aec9de','#182736',2));
  const key=new THREE.DirectionalLight('#ffe4bd',3.6),rim=new THREE.DirectionalLight('#76b7dc',2.4);scene.add(key,key.target,rim,rim.target);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;scene.environmentIntensity=.5;room.dispose();pmrem.dispose();
  const texture=new THREE.TextureLoader().load(new URL('../runtime/assets/menu-mountains-v1.png',import.meta.url).href);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const backdrop=createMenuBackdrop(scene,{texture}),ship=source.template.clone(true),appearance=decorateCraft(ship);
  scene.add(ship);const system=createFlightSystems(ship,source.animations);system.playTrigger('Engine_start');
  const descent=createDescent(source.hull),plume=createPlumeEffect(scene,{capacity:700,widthScale:2}),anchor=new THREE.Vector3(),axis=new THREE.Vector3(),orientation=new THREE.Quaternion(),air=createFallAir(scene,ship);
  const crew=createCrewScene(scene),hatch=createCrewHatch(ship,{hull:source.hull}),pad=new THREE.Group();scene.add(pad);
  const final=descent.sample(1),towerPosition={x:final.x+1.12,y:.16,z:.15};
  ship.position.set(final.x,final.y,0);ship.rotation.set(0,storyFraming(1,1).yaw,final.angle);
  const parkedEntry=hatch.world(),parkedDock=hatch.dock();ship.position.set(0,0,0);ship.rotation.set(0,0,0);
  // Park the tower at the eventual hatch height while the spacecraft is still airborne.
  const parkedHatch={...hatch,world:()=>parkedEntry.clone(),dock:()=>parkedDock.clone()};
  function parkTower(){crew.start({rising:false,hatch:parkedHatch,tower:towerPosition,bubbles:false});}
  parkTower();
  const deck=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.16,.16,64),new THREE.MeshStandardMaterial({color:'#34444c',metalness:.35,roughness:.7}));deck.position.y=.08;pad.add(deck);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.98,.012,6,80),new THREE.MeshBasicMaterial({color:'#b7d6c4'}));ring.rotation.x=Math.PI/2;ring.position.y=.166;pad.add(ring);
  const groundMaterial=new THREE.MeshStandardMaterial({color:'#132933',roughness:.95,transparent:true,depthWrite:false});
  groundMaterial.onBeforeCompile=shader=>{shader.vertexShader='varying float apronDepth;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\napronDepth=position.y;');shader.fragmentShader='varying float apronDepth;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=1.0-smoothstep(1.0,6.0,abs(apronDepth));\n#include <opaque_fragment>');};
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,12),groundMaterial);ground.rotation.x=-Math.PI/2;scene.add(ground);
  const exhaust=new THREE.PointLight('#efab66',0,5,2);scene.add(exhaust);
  let previous=0,engine=true,landing=false;
  return {
    environment:environment.texture,
    resize(width,height){surface.resize(width,height);},
    update(progress,dt,{paused=false,reducedMotion=false,landingBlend=0,screenX}={}){
      const width=canvas.clientWidth,height=canvas.clientHeight,aspect=width/height,state=descent.sample(progress),view=storyFraming(progress,aspect);
      const side=screenX??view.screenX,screenY=reducedMotion?(aspect<1?.24:.48):view.screenY+view.entry*1.8;
      ship.position.set(state.x,state.y,0);ship.rotation.set(0,view.yaw,state.angle);
      const burning=state.thrust>.005&&state.status==='flying';
      if(burning!==engine){system.playTrigger(burning?'Engine_start':'Engine_stop');engine=burning;}
      if(!paused)system.update(dt);appearance.update(1,state.rcsTurn,state.damage);
      const landingSpan=aspect<1?8.5:10,span=view.span+(landingSpan-view.span)*landingBlend;
      camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
      const freeX=state.x-(side-.5)*view.span*aspect,freeY=state.y-(screenY-.5)*view.span;
      const x=freeX+(-(aspect<1?-.08:.18)*landingSpan*aspect-freeX)*landingBlend,y=freeY+(3.4-freeY)*landingBlend;
      camera.position.set(x,y,14);camera.lookAt(x,y,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      key.position.set(state.x-3,state.y+5,5);key.target.position.copy(ship.position);rim.position.set(state.x+3,state.y+1,-3);rim.target.position.copy(ship.position);
      ship.updateMatrixWorld(true);ship.localToWorld(anchor.copy(source.anchor));
      if(Math.abs(progress-previous)>.025||progress<previous-.001)plume.reset();previous=progress;
      // Cold ready-state venting applies no thrust. Landing burns use measured engine power.
      axis.set(0,-1,0).applyQuaternion(ship.getWorldQuaternion(orientation));
      const vent={x:anchor.x,y:anchor.y,z:anchor.z,angle:Math.atan2(axis.x,-axis.y),vx:state.vx,vy:state.vy,density:1,throttle:burning?state.thrust:.24,fireHeat:burning?1:0,firing:burning,power:state.tuning.thrust*state.thrust};
      if(!paused&&!reducedMotion){plume.emit('descent',vent,dt,descent.level);plume.update(dt,descent.level,camera,renderer,burning?[vent]:[]);}
      exhaust.position.copy(anchor);exhaust.intensity=burning?state.thrust*3:0;
      if(state.status==='landed'&&!landing){crew.start({rising:false,hatch,tower:towerPosition,ride:state.ride});landing=true;}
      if(state.status!=='landed'&&landing){crew.reset();parkTower();landing=false;}
      crew.update(landing&&!paused?dt:0,camera,descent.level);
      air.update(dt,state,camera,{paused,reducedMotion});
      backdrop.update(camera);texture.repeat.multiplyScalar(.94);texture.offset.x+=.03+(view.screenX-.5)*.025;texture.offset.y+=progress*.025;
      surface.sample(dt);renderer.render(scene,camera);
      canvas.dataset.altitude=state.y.toFixed(2);canvas.dataset.engine=state.thrust.toFixed(3);canvas.dataset.flightState=state.status;canvas.dataset.angle=state.angle.toFixed(3);canvas.dataset.cameraY=y.toFixed(3);canvas.dataset.landingLocked=String(landingBlend===1);canvas.dataset.drawCalls=String(renderer.info.render.calls);
      return state;
    },
  };
}

export function createDemo(canvas,source,environment,{reducedMotion=false}={}){
  const surface=createRenderer(canvas),{renderer}=surface;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const menu=createStartMenuScene({environment,reducedMotion:false});
  let width=0,height=0;
  function reset(){menu.attach('aster',source,null,{});menu.setPaused(reducedMotion);}
  reset();
  return {
    reset,
    resume(){menu.setPaused(false);},
    update(dt,input,paused=false){
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(w!==width||h!==height){width=w;height=h;surface.resize(w,h);menu.resize(w,h);}
      menu.setPaused(paused);const sample=menu.update(dt,renderer,input);surface.sample(dt);renderer.render(menu.scene,menu.camera);
      canvas.dataset.pilot=sample.pilot;canvas.dataset.altitude=sample.altitude.toFixed(2);canvas.dataset.throttle=sample.throttle.toFixed(3);canvas.dataset.legs=String(sample.legs);canvas.dataset.status=sample.status;
      return sample;
    },
  };
}
