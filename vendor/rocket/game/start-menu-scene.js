import * as THREE from 'three';
import { createFlightSystems } from '../flight-systems.js';
import { decorateCraft } from './craft.js';
import { createPlumeEffect } from './plume-effect.js';
import { createLaunchSequence, STATION_POSITIONS, LAUNCH_RANGE } from './launch-sequence.js';
import { DEFAULT_HULL } from './physics.js';
import { createPlumeObstacles } from './plume-obstacles.js';
import { createDestructionEffect } from './damage-effect.js';
import { projectStructure, collideMenuTower } from './menu-contact.js';
import { createMenuBackdrop } from './menu-backdrop.js';

export function createStartMenuScene({environment,reducedMotion,random=Math.random,parked=false}){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#0b131b');scene.fog=new THREE.Fog('#0b131b',11,32);scene.environment=environment;scene.environmentIntensity=.65;
  const camera=new THREE.OrthographicCamera(-5,5,2.8,-2.8,.1,70);
  scene.add(new THREE.HemisphereLight('#b5cfdf','#283035',1.1));
  const key=new THREE.DirectionalLight('#ffdfb2',3);key.position.set(-3,7,6);key.target.position.set(0,1,0);scene.add(key,key.target);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-3,near:.1,far:20});key.shadow.bias=-.0005;key.shadow.normalBias=.02;
  key.shadow.camera.updateProjectionMatrix();
  const rim=new THREE.DirectionalLight('#69b7d4',2.2);rim.position.set(3,3,-3);scene.add(rim,rim.target);
  const exhaustLight=new THREE.PointLight('#ffac61',0,6,2);scene.add(exhaustLight);
  const concrete=new THREE.MeshStandardMaterial({color:'#0b151c',roughness:.96});
  const steel=new THREE.MeshStandardMaterial({color:'#53636b',metalness:.75,roughness:.44});
  const darkSteel=new THREE.MeshStandardMaterial({color:'#273943',metalness:.7,roughness:.5});
  const marking=new THREE.MeshStandardMaterial({color:'#d9b476',roughness:.8});
  function block(parent,size,position,material){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(LAUNCH_RANGE*2,LAUNCH_RANGE*2),concrete);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  function buildStation(x,index){
    const station=new THREE.Group();station.name=`showcase_station_${index+1}`;station.position.x=x;scene.add(station);
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.16,.16,64),new THREE.MeshStandardMaterial({color:'#34444c',metalness:.35,roughness:.7}));pad.position.y=.08;pad.receiveShadow=true;station.add(pad);
    const padRing=new THREE.Mesh(new THREE.TorusGeometry(.98,.012,6,80),marking);padRing.rotation.x=Math.PI/2;padRing.position.y=.166;station.add(padRing);
    for(const side of [-1,1]){
      block(station,[.25,.008,.06],[side*.7,.166,.35],marking);
      const light=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),new THREE.MeshBasicMaterial({color:index?'#8bceb2':'#83bdc6',toneMapped:false}));light.position.set(side*.88,.18,.25);station.add(light);
    }
    for(let i=0;i<8;i++)block(station,[.22,.005,.055],[-1.8+i*.45,.006,1.5],i%2?darkSteel:marking);
    for(let i=0;i<=index;i++)block(station,[.09,.008,.28],[(i-index/2)*.16,.166,.72],marking);
    const tower=new THREE.Group();tower.name=`showcase_tower_${index+1}`;tower.position.set(1.12,0,-.75);station.add(tower);
    block(tower,[.7,.12,.7],[0,.06,0],concrete);
    for(const x of [-.19,.19])for(const z of [-.19,.19])block(tower,[.045,2.6,.045],[x,1.36,z],steel);
    function strut(a,b){
      const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,direction.length(),6),steel);
      mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.castShadow=true;tower.add(mesh);
    }
    for(let i=0;i<4;i++){
      const y=.16+i*.62;
      for(const z of [-.19,.19]){strut([-.19,y,z],[.19,y+.62,z]);strut([.19,y,z],[-.19,y+.62,z]);}
      for(const x of [-.19,.19])strut([x,y,-.19],[x,y+.62,.19]);
      block(tower,[.44,.025,.44],[0,y,0],darkSteel);
    }
    block(tower,[.48,.28,.45],[0,2.5,0],darkSteel);
    block(tower,[.3,.09,.012],[0,2.52,.232],new THREE.MeshStandardMaterial({color:'#bdad8a',emissive:'#a28452',emissiveIntensity:.5,metalness:.3,roughness:.3}));
    strut([0,2.65,0],[0,3,0]);
    const beacon=new THREE.Mesh(new THREE.SphereGeometry(.034,10,8),new THREE.MeshBasicMaterial({color:'#e97862',toneMapped:false}));beacon.position.set(0,3,0);tower.add(beacon);
    const arm=new THREE.Group();arm.position.set(-.19,1.66,0);tower.add(arm);
    block(arm,[.8,.045,.16],[-.4,0,0],steel);block(arm,[.8,.025,.025],[-.4,.16,.07],marking);
    for(const x of [-.76,-.4,-.05])block(arm,[.018,.15,.018],[x,.08,.07],darkSteel);
    const body=createPlumeObstacles(tower,object=>object.parent!==arm);
    return {station,tower,arm,structure:createPlumeObstacles(tower),collision:body.boxes.map(projectStructure),destroyed:false};
  }
  const stations=STATION_POSITIONS.map(buildStation);
  const backdrop=parked?null:createMenuBackdrop(scene);
  // Keep the garage's existing parked backdrop; the menu gets stronger movement references.
  if(parked){
  for(let i=0;i<20;i++){
    const hill=new THREE.Mesh(new THREE.ConeGeometry(1.3+(i%3)*.6,1+(i%4)*.38,4),new THREE.MeshStandardMaterial({color:'#182a32',roughness:1,flatShading:true}));hill.position.set(-14+i*2.6,-.15,-9-(i%3));hill.rotation.y=i*.7;scene.add(hill);
  }
  const stars=[];for(let i=0;i<650;i++)stars.push(Math.sin(i*17.3)*55,2+(i%139)*1.3,-15-(i%7));
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:'#8da8b9',size:.012,transparent:true,opacity:.45,fog:false})));
  }
  const plume=createPlumeEffect(scene,{capacity:600,reducedMotion,random});
  const destruction=createDestructionEffect(scene,{capacity:reducedMotion?72:144,reducedMotion,random,horizontalLimit:Infinity});
  const plumeLevel={theme:'sandstone',gravity:4,objective:'land',roof:[],floor:[[-LAUNCH_RANGE,0],[LAUNCH_RANGE,0]],pads:STATION_POSITIONS.map(x=>({x,y:.16,width:2.1,radius:1.05})),obstacles:stations.flatMap(item=>item.structure.boxes)};
  const actors=new Map();let actor=null,flight=createLaunchSequence(DEFAULT_HULL),viewWidth=1,viewHeight=1,paused=reducedMotion,verticalZoom=0,visualTime=0,previousPose=null;
  const anchor=new THREE.Vector3();
  function restoreScene(){
    previousPose=null;
    plume.reset();destruction.reset();
    for(const item of stations){item.destroyed=false;item.tower.visible=true;item.arm.rotation.y=0;item.structure.update();}
    plumeLevel.obstacles=stations.flatMap(item=>item.structure.boxes);
    if(actor){actor.root.visible=true;actor.appearance.damage.reset();actor.system.reset();actor.engine=false;actor.destroyed=false;actor.resets=flight.sample().resets;actor.system.setPaused(paused);}
  }
  function collideStructures(state){
    if(!actor||state.status==='crashed')return;
    for(const item of stations){
      if(item.destroyed||Math.abs(state.x-item.tower.getWorldPosition(anchor).x)>2.2||state.y>4.5)continue;
      for(const polygon of item.collision){
        const hit=collideMenuTower(state,actor.hull,polygon);if(!hit)continue;
        if(hit.speed>1.2){
          const parts=[];item.tower.traverse(object=>{if(object.isMesh)parts.push(object);});
          destruction.shed(parts,state);item.destroyed=true;item.tower.visible=false;
          plumeLevel.obstacles=stations.filter(station=>!station.destroyed).flatMap(station=>station.structure.boxes);
        }
        break;
      }
    }
  }
  function follow(sample,dt=0){
    const targetZoom=Math.min(18,Math.abs(sample.verticalSpeed)*1.1);
    verticalZoom+=(targetZoom-verticalZoom)*(1-Math.exp(-dt/.6));
    const portrait=viewWidth<680,span=(portrait?8.4+sample.flightBlend*.8:5.4+sample.flightBlend*1.2)+verticalZoom,wide=span*viewWidth/viewHeight;
    const ahead=portrait?0:THREE.MathUtils.clamp(sample.horizontalSpeed*.4,-.45,.45);
    const x=sample.x-wide*(portrait?.12+.08*sample.flightBlend:.22)+ahead,y=parked&&portrait?sample.y+.5-span*.24:1.8+sample.altitude;
    camera.left=-wide/2;camera.right=wide/2;camera.top=span/2;camera.bottom=-span/2;
    camera.position.set(x,y+1.3,12);camera.lookAt(x,y,0);camera.updateProjectionMatrix();
    backdrop?.update(camera);
    // At altitude the pad is outside the shadow volume; skip an invisible shadow pass.
    key.shadow.autoUpdate=sample.altitude<6;key.shadow.intensity=sample.altitude<6?1:0;
    key.position.set(sample.x-3,sample.y+6,6);key.target.position.set(sample.x,sample.y,0);
    rim.position.set(sample.x+3,sample.y+2,-3);rim.target.position.set(sample.x,sample.y,0);
  }
  return {
    scene,camera,
    setPaused(value){paused=value;actor?.system.setPaused(paused);},
    attach(id,source,color,tuning={}){
      if(!actors.has(id)){
        const root=source.template.clone(true),appearance=decorateCraft(root);
        root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
        root.rotation.order='ZYX';root.rotation.y=-.22;root.name=`showcase_${id}`;scene.add(root);
        actors.set(id,{root,appearance,hull:source.hull,anchor:source.anchor,system:createFlightSystems(root,source.animations),engine:false,destroyed:false,resets:0});
      }
      for(const item of actors.values())item.root.visible=false;
      actor=actors.get(id);actor.root.visible=true;actor.appearance.paint(color);actor.appearance.update(tuning.rcs??0,0);
      actor.appearance.configure(tuning);
      actor.rcs=tuning.rcs??0;flight=createLaunchSequence(source.hull,tuning);verticalZoom=0;visualTime=0;
      restoreScene();
      actor.system.setPaused(paused);
      const sample=flight.sample();actor.root.position.set(sample.x,sample.y,0);actor.root.rotation.z=sample.angle;actor.root.updateMatrixWorld(true);follow(sample);
    },
    resize(width,height){
      viewWidth=width;viewHeight=height;
      follow(flight.sample());
    },
    update(seconds,renderer,input={}){
      // Fixed visual steps keep emission and obstacle collisions identical at slow frame rates.
      visualTime+=paused?0:Math.min(seconds,1);
      const ticks=Math.floor((visualTime+1e-10)*60),steps=Math.max(1,ticks),dt=ticks?1/60:0;
      visualTime=Math.max(0,visualTime-ticks/60);
      let sample=flight.sample();
      for(let step=0;step<steps;step++){
        const command=typeof input==='function'?input(dt):input;
        if(dt>0)previousPose=sample;
        sample=actor&&!parked?flight.update(dt,command,collideStructures):flight.sample();
        if(actor&&sample.resets!==actor.resets)restoreScene();
        stations.forEach((item,index)=>{
          const angle=-sample.arms[index]*Math.PI/2;
          if(item.arm.rotation.y!==angle){item.arm.rotation.y=angle;item.structure.update();}
        });
        follow(sample,dt);
        if(!actor)continue;
        actor.root.position.set(sample.x,sample.y,0);actor.root.rotation.z=sample.angle;actor.root.updateMatrixWorld(true);
        actor.appearance.update(actor.rcs,flight.state.rcsTurn,flight.state.damage);
        const detached=actor.appearance.damage.update(flight.state.damage);
        if(detached.length)destruction.shed(detached,flight.state);
        if(sample.status==='crashed'&&!actor.destroyed){destruction.destroy(actor.root,flight.state);actor.root.visible=false;actor.destroyed=true;}
        if(sample.engineArmed!==actor.engine){actor.system.playTrigger(sample.engineArmed?'Engine_start':'Engine_stop');actor.engine=sample.engineArmed;}
        actor.system.update(dt);
        actor.root.localToWorld(anchor.copy(actor.anchor));exhaustLight.position.copy(anchor);exhaustLight.intensity=sample.firing?sample.throttle*12:sample.heat*.65;
        // A rotating nozzle inherits its tangential motion as well as the hull's translation.
        const emitter={x:anchor.x,y:anchor.y,z:anchor.z,angle:sample.angle,
          vy:sample.verticalSpeed+sample.angularSpeed*(anchor.x-actor.root.position.x),vx:sample.horizontalSpeed-sample.angularSpeed*(anchor.y-actor.root.position.y),firing:sample.firing,throttle:sample.throttle,density:1};
        if(sample.firing)plume.emit('showcase',emitter,dt,plumeLevel);
        plume.update(dt,plumeLevel,camera,renderer,[emitter]);
        destruction.update(dt,plumeLevel);
      }
      // Render between the fixed simulation ticks rather than repeating a 60 Hz pose.
      // Never blend across a crash reset or the change to a new flight leg.
      if(actor&&!paused&&previousPose&&previousPose.resets===sample.resets&&previousPose.legs===sample.legs&&previousPose.status===sample.status){
        const alpha=visualTime*60,pose={...sample};
        for(const key of ['x','y','altitude','horizontalSpeed','verticalSpeed','flightBlend'])pose[key]=THREE.MathUtils.lerp(previousPose[key],sample[key],alpha);
        pose.angle=previousPose.angle+Math.atan2(Math.sin(sample.angle-previousPose.angle),Math.cos(sample.angle-previousPose.angle))*alpha;
        actor.root.position.set(pose.x,pose.y,0);actor.root.rotation.z=pose.angle;follow(pose);
      }
      // Expose only presentation telemetry to the DOM; it never touches a campaign race.
      return {...sample,paused,loaded:Boolean(actor),width:viewWidth,height:viewHeight,plume:plume.statistics,debris:destruction.count,towersDestroyed:stations.filter(item=>item.destroyed).length};
    },
  };
}
