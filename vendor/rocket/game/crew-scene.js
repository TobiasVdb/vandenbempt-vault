import * as THREE from 'three';
import { crewTransfer, CREW_COUNT } from './crew-transfer.js';
import { crewReactions } from './ride.js';
import { plumeSurface } from './plume.js';

const mix=(a,b,t)=>a+(b-a)*t;
const doors=new WeakMap();
export function createCrewHatch(ship,{pod=false,hull=[]}={}){
  if(doors.has(ship))return doors.get(ship);
  const height=pod?.05:.45,edges=[];
  for(let i=0;i<hull.length;i++){
    const a=hull[i],b=hull[(i+1)%hull.length];
    if(a[1]!==b[1]&&height>=Math.min(a[1],b[1])&&height<=Math.max(a[1],b[1]))edges.push(a[0]+(b[0]-a[0])*(height-a[1])/(b[1]-a[1]));
  }
  const edge=edges.length?Math.max(...edges):pod?.32:.14;
  const root=new THREE.Group();root.name='crew_airlock';root.visible=false;root.position.set(edge+.018,height,0);root.rotation.y=Math.PI/2;ship.add(root);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(.075,.11,.008),new THREE.MeshStandardMaterial({color:'#b39b6e',metalness:.65,roughness:.4}));root.add(frame);
  const opening=new THREE.Mesh(new THREE.PlaneGeometry(.056,.085),new THREE.MeshBasicMaterial({color:'#10181c'}));opening.position.z=.006;root.add(opening);
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.058,.087,.008),new THREE.MeshStandardMaterial({color:'#ddd8c9',metalness:.3,roughness:.5}));panel.position.z=.012;root.add(panel);
  const collar=new THREE.Mesh(new THREE.BoxGeometry(.09,.012,.12),frame.material);collar.position.set(0,-.045,.06);root.add(collar);
  const anchor=new THREE.Vector3(0,-.05,.025),dock=new THREE.Vector3(0,-.05,.13);
  const hatch={root,world(){ship.updateWorldMatrix(true,true);return root.localToWorld(anchor.clone());},dock(){ship.updateWorldMatrix(true,true);return root.localToWorld(dock.clone());},open(amount){panel.position.x=amount*.06;}};
  doors.set(ship,hatch);return hatch;
}

/** Small crew, a working lift and the launch display's steel gantry language. */
export function createCrewScene(scene,{reducedMotion=false}={}){
  const root=new THREE.Group();root.name='crew_transfer';root.visible=false;scene.add(root);
  const tower=new THREE.Group();tower.name='arrival_tower';root.add(tower);
  const steel=new THREE.MeshStandardMaterial({color:'#53636b',metalness:.75,roughness:.44});
  const dark=new THREE.MeshStandardMaterial({color:'#273943',metalness:.7,roughness:.5});
  const gold=new THREE.MeshStandardMaterial({color:'#d9b476',metalness:.3,roughness:.65});
  function block(parent,size,position,material=steel){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  block(tower,[.65,.1,.65],[0,.05,0],dark);
  for(const x of [-.19,.19])for(const z of [-.19,.19])block(tower,[.035,2.6,.035],[x,1.35,z]);
  for(let i=0;i<5;i++){
    const y=.16+i*.5;block(tower,[.43,.02,.43],[0,y,0],dark);
    for(const side of [-1,1]){const beam=block(tower,[.025,.62,.025],[0,y+.25,side*.19]);beam.rotation.z=side*.66;}
  }
  block(tower,[.48,.23,.45],[0,2.62,0],dark);
  const beacon=block(tower,[.06,.04,.06],[0,2.77,0],new THREE.MeshBasicMaterial({color:'#edbb77',toneMapped:false}));
  const arm=new THREE.Group();arm.name='crew_walkway';arm.position.x=-.19;tower.add(arm);
  block(arm,[.8,.028,.17],[-.4,0,0]);block(arm,[.8,.012,.012],[-.4,.1,.075],gold);
  for(const x of [-.76,-.4,-.04])block(arm,[.012,.1,.012],[x,.05,.075],dark);
  const elevator=new THREE.Group();elevator.name='crew_elevator';root.add(elevator);
  const exitDeck=block(root,[6,.025,.28],[3,.02,0],dark);exitDeck.visible=false;
  block(elevator,[.3,.025,.3],[0,.01,0]);
  for(const x of [-.13,.13])block(elevator,[.012,.13,.012],[x,.075,-.13],gold);
  block(elevator,[.28,.012,.012],[0,.14,-.13],gold);
  const helmet=new THREE.InstancedMesh(new THREE.SphereGeometry(.01,8,6),new THREE.MeshStandardMaterial({color:'#e7e3d7',roughness:.6,emissive:'#9c9989',emissiveIntensity:.25}),CREW_COUNT);
  const suits=new THREE.InstancedMesh(new THREE.BoxGeometry(.018,.026,.012),gold,CREW_COUNT);
  const limbs=new THREE.InstancedMesh(new THREE.BoxGeometry(.004,.019,.005),dark,CREW_COUNT*4);
  for(const mesh of [helmet,suits,limbs]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);}
  const dummy=new THREE.Object3D(),materials=new Map();
  function speech(text){
    if(materials.has(text))return materials.get(text);
    let map=null;
    if(typeof document!=='undefined'){
      const canvas=document.createElement('canvas');canvas.width=192;canvas.height=96;const context=canvas.getContext('2d');
      context.fillStyle='#fff9ee';context.strokeStyle='#5a554b';context.lineWidth=3;context.beginPath();context.roundRect(4,4,184,76,22);context.fill();context.stroke();
      context.beginPath();context.moveTo(70,78);context.lineTo(77,92);context.lineTo(95,78);context.fill();
      context.fillStyle='#24272a';context.font='600 45px "Segoe UI Emoji", Arial';context.textAlign='center';context.textBaseline='middle';context.fillText(text,96,43);
      map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    }
    const material=new THREE.SpriteMaterial({map,color:'#ffffff',depthWrite:false,toneMapped:false});materials.set(text,material);return material;
  }
  const bubbles=Array.from({length:CREW_COUNT},()=>{const sprite=new THREE.Sprite(speech('☺'));sprite.scale.set(.22,.11,1);root.add(sprite);return sprite;});
  let context=null,time=0,sample=null;
  function matrix(mesh,index,x,y,z,angle=0,visible=true){dummy.position.set(x,y,z);dummy.rotation.set(0,0,angle);dummy.scale.setScalar(visible?1:0);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
  return {
    root,tower,elevator,
    start(options){
      context=options;time=0;root.visible=true;tower.visible=!options.externalArm;context.hatch.root.visible=true;
      const reactions=crewReactions(options.boarding?{}:options.ride);
      bubbles.forEach((bubble,index)=>{bubble.material=speech(reactions[index]);bubble.userData.text=reactions[index];});
      sample=crewTransfer(0,options);
    },
    update(seconds,camera,level){
      if(!context)return null;
      time+=Math.max(0,seconds);sample=crewTransfer(time,context);
      const origin=context.tower,door=context.hatch.world(),dock=context.hatch.dock(),deck=door.y-origin.y;
      root.position.set(origin.x,origin.y-(1-sample.rise)*3,origin.z);
      elevator.position.y=sample.elevator*deck;
      const target=context.externalArm||arm,length=Math.hypot(dock.x-(origin.x-.19),dock.z-origin.z);
      target.position.y=deck;target.scale.x=length/.8;
      target.rotation.y=Math.atan2(dock.z-origin.z,origin.x-.19-dock.x)-(1-sample.bridge)*Math.PI/2;
      context.hatch.open(sample.door);
      const right=camera.position.x+camera.right/camera.zoom+.6;
      const exitDistance=Math.max(1,right-origin.x);
      exitDeck.visible=!level.floor.length;exitDeck.scale.x=(exitDistance+.4)/6;exitDeck.position.x=(exitDistance+.4)/2;
      sample.people.forEach((person,index)=>{
        let x,y,z;
        if(person.path==='bridge'){
          const crossing=Math.min(1,person.progress/.88),entering=Math.max(0,(person.progress-.88)/.12);
          x=mix(mix(0,dock.x-origin.x,crossing),door.x-origin.x,entering);y=deck+.025;
          z=mix(mix(0,dock.z-origin.z,crossing),door.z-origin.z,entering);
        }else if(person.progress===0){x=(index-1)*.025;y=elevator.position.y+.025;z=0;}
        else{
          x=exitDistance*person.progress;z=.12*Math.sin(person.progress*Math.PI);
          const surface=plumeSurface(level,origin.x+x,origin.z+z);y=Number.isFinite(surface.y)?surface.y-origin.y+.015:.015;
        }
        const gait=person.walking?Math.sin(time*18+index)*.65:0,bob=reducedMotion?0:Math.abs(gait)*.003;
        matrix(helmet,index,x,y+.065+bob,z,0,person.visible);matrix(suits,index,x,y+.043+bob,z,0,person.visible);
        for(let limb=0;limb<4;limb++){
          const side=limb%2?1:-1,arms=limb>=2;
          matrix(limbs,index*4+limb,x+side*(arms?.013:.006),y+(arms?.035:.012)+bob,z,side*gait*(arms?-.7:1),person.visible);
        }
        const bubble=bubbles[index];bubble.position.set(x,y+.15,z+.03);bubble.visible=context.bubbles!==false&&!context.boarding&&person.visible&&person.walking&&(time+index*.4)%2.2<1.4;
      });
      for(const mesh of [helmet,suits,limbs])mesh.instanceMatrix.needsUpdate=true;
      beacon.material.color.set(sample.complete?'#9ce3bb':'#edbb77');
      return {...sample,time};
    },
    reset(){if(context){context.hatch.open(0);context.hatch.root.visible=false;}context=null;sample=null;root.visible=false;},
    get active(){return context!==null;},
    get sample(){return sample;},
  };
}
