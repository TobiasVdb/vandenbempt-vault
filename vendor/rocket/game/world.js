import * as THREE from 'three';
import { createWindEffect, createWindFlags } from './wind-effect.js';

export const THEMES={
  sandstone:{sky:'#211d19',rocks:['#6e4b32','#7e583b','#896244','#60452f','#966b49','#755139'],back:'#302820'},
  ice:{sky:'#102a3b',rocks:['#39667d','#567b8b','#598999','#304958'],back:'#1d3a4b'},
  moon:{sky:'#080f20',rocks:['#5b6573','#777979','#535a68','#8a8c8c'],back:'#242a3b'},
  volcanic:{sky:'#2e1115',rocks:['#563c3c','#753b32','#9a4b36','#433137'],back:'#321c23'},
  water:{sky:'#063443',rocks:['#215b62','#386468','#234b58','#42787b'],back:'#123943'},
  clouds:{sky:'#607d8b',rocks:['#526d6d','#698484','#637c71','#3b555c'],back:'#45616c'},
  storm:{sky:'#252a32',rocks:['#57574c','#6b6555','#424d52','#7c7058'],back:'#303941'},
  dark:{sky:'#02060b',rocks:['#252e38','#30313b','#1f3038','#332c37'],back:'#03070d'},
  orbit:{sky:'#142b48',rocks:['#4b5966','#6a736a','#505660'],back:'#111b2e'},
  space:{sky:'#02050e',rocks:['#666c76','#5c626c','#717783','#626872'],back:'#101929'},
};

export function createWorldEffects(scene,group,level,{reducedMotion=false,levelModel=null}={}){
  const theme=THEMES[level.theme],rings=[],wisps=[];
  scene.background=new THREE.Color(theme.sky);
  scene.fog=new THREE.Fog(theme.sky,level.theme==='dark'?43:level.theme==='water'?35:58,level.theme==='dark'?74:level.theme==='water'?83:115);
  if(levelModel){
    for(const [index] of (level.rings||[]).entries()){
      const rim=levelModel.getObjectByName(`gate_${String(index+1).padStart(2,'0')}_rim`);
      rim.material.transparent=true;rim.material.depthWrite=false;rings.push(rim);
    }
    levelModel.traverse(object=>{if(object.userData.role==='fog')wisps.push(object);});
  }
  if(!levelModel&&['moon','ice','orbit'].includes(level.theme)){
    const positions=[];
    for(let i=0;i<650;i++)positions.push((Math.random()-.5)*(level.objective==='orbit'?1200:100),-5+Math.random()*(level.objective==='orbit'?190:35),-30-Math.random()*20);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    group.add(new THREE.Points(geo,new THREE.PointsMaterial({color:'#c7daec',size:.055,sizeAttenuation:true,fog:false})));
    const planet=new THREE.Mesh(new THREE.SphereGeometry(level.objective==='orbit'?145:4,40,24),new THREE.MeshStandardMaterial({color:level.theme==='moon'?'#485b7c':'#365776',roughness:1}));
    planet.position.set(level.objective==='orbit'?0:12,level.objective==='orbit'?-155:10,-45);group.add(planet);
  }
  for(const ring of levelModel?[]:level.rings||[]){
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(ring.radius,.075,8,56),new THREE.MeshBasicMaterial({color:'#f4ca81',toneMapped:false,transparent:true,opacity:.9}));
    mesh.rotation.y=1.05;mesh.position.set(ring.x,ring.y,0);group.add(mesh);rings.push(mesh);
    for(const side of [-1,1]){
      const beacon=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:'#f8e3a7',toneMapped:false}));
      beacon.position.set(ring.x,ring.y+side*ring.radius,.12);group.add(beacon);
    }
  }
  for(const volume of levelModel?[]:level.clouds||[]){
    const cloud=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:'#ecf0e9',transparent:true,opacity:.24,depthWrite:false,roughness:1}),22);
    const transform=new THREE.Object3D();
    for(let i=0;i<22;i++){
      const angle=i*2.39996,r=Math.sqrt((i+.5)/22);
      transform.position.set(volume.x+Math.cos(angle)*r*volume.rx*.8,volume.y+Math.sin(angle)*r*volume.ry*.75,-.7-Math.random()*2);
      transform.scale.set(volume.rx*.45,volume.ry*.4,1.5);transform.updateMatrix();cloud.setMatrixAt(i,transform.matrix);
    }
    group.add(cloud);
  }
  if(!levelModel&&level.theme==='dark'){
    // These surfaces have no emissive component: only ship lamps and exhaust reveal them.
    const fogMaterial=new THREE.MeshStandardMaterial({color:'#7193a1',transparent:true,opacity:.12,depthWrite:false,roughness:1});
    const fogGeometry=new THREE.IcosahedronGeometry(1,1);
    for(let i=0;i<20;i++){
      const fog=new THREE.Mesh(fogGeometry,fogMaterial);fog.position.set(-24+i*2.5,-5+(i%5)*2.3,-1-(i%3)*.3);fog.scale.set(3.5,.45,.6);group.add(fog);wisps.push(fog);
    }
  }
  let weather=null,points=null;
  const water=level.theme==='water';
  const wind=level.wind?createWindEffect(group,level,{reducedMotion}):null;
  const flags=level.wind?createWindFlags(levelModel,level,{reducedMotion}):null;
  if(water){
    points=new Float32Array(200*3);
    for(let i=0;i<points.length;i+=3){points[i]=(Math.random()-.5)*52;points[i+1]=-7+Math.random()*20;points[i+2]=-1-Math.random()*7;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(points,3));
    weather=new THREE.Points(geo,new THREE.PointsMaterial({color:'#a1d9e4',size:.065,transparent:true,opacity:.35,depthWrite:false}));group.add(weather);
  }
  const thinAir=new THREE.Color('#030715'),atmosphere=new THREE.Color(theme.sky);
  return {
    update(state,dt){
      for(const [i,ring] of rings.entries()){
        const passed=i<(state.gate||0),color=passed?'#73c68a':'#f4ca81';
        ring.material.color.set(color);ring.material.emissive?.set(color);ring.material.opacity=passed?.25:.9;
      }
      if(!reducedMotion)for(const [i,fog] of wisps.entries())fog.position.x+=Math.sin(state.time*.3+i)*dt*.14;
      wind?.update(dt);
      flags?.update(dt);
      if(weather&&!reducedMotion){
        for(let i=0;i<points.length;i+=3){points[i+1]+=dt*.7;if(points[i+1]>13)points[i+1]=-7;}
        weather.geometry.attributes.position.needsUpdate=true;
      }
      if(level.objective==='orbit'){
        scene.background.copy(atmosphere).lerp(thinAir,THREE.MathUtils.clamp((state.y+8)/65,0,1));scene.fog.color.copy(scene.background);
      }
    },
  };
}
