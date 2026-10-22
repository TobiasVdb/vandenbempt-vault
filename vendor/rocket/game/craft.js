import * as THREE from 'three';
import { convexHull } from './physics.js';
import { createCraftDamage } from './damage-effect.js';

const paintNames=new Set(['Ceramic ivory','Vermilion enamel','Sage green alloy','Oxblood fins','Pearl titanium armor','Aster porcelain alloy']);
export function decorateCraft(root){
  const materials=new Map(),jets=[];
  const jetHeight=.57,attachments=[];
  const collision=root.getObjectByName('collision');
  if(collision?.geometry){
    root.updateWorldMatrix(true,true);
    const transform=root.matrixWorld.clone().invert().multiply(collision.matrixWorld),points=[];
    const position=collision.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const point=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(transform);points.push([point.x,point.y]);
    }
    const hull=convexHull(points);
    for(let i=0;i<hull.length;i++){
      const a=hull[i],b=hull[(i+1)%hull.length];
      if(a[1]===b[1]||jetHeight<Math.min(a[1],b[1])||jetHeight>Math.max(a[1],b[1]))continue;
      attachments.push(a[0]+(b[0]-a[0])*(jetHeight-a[1])/(b[1]-a[1]));
    }
  }
  root.traverse(object=>{
    if(!object.isMesh)return;
    const clone=material=>{
      if(!materials.has(material)){const copy=material.clone();materials.set(material,{copy,color:material.color.clone()});}
      return materials.get(material).copy;
    };
    object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
  });
  for(const side of [-1,1]){
    const edge=attachments.length?(side>0?Math.max(...attachments):Math.min(...attachments)):side*.12;
    const group=new THREE.Group();group.name=`upper_rotation_${side>0?'right':'left'}`;
    group.position.set(edge-side*.008,jetHeight,0);group.scale.setScalar(.35);root.add(group);
    const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,.14,10),new THREE.MeshStandardMaterial({color:'#76848b',metalness:.8,roughness:.35}));
    nozzle.name=`upper_rotation_nozzle_${side>0?'right':'left'}`;
    nozzle.rotation.z=-side*Math.PI/2;nozzle.position.x=side*.06;group.add(nozzle);
    const flare=new THREE.Mesh(new THREE.ConeGeometry(.04,.27,10),new THREE.MeshBasicMaterial({color:'#b4e6ff',transparent:true,opacity:.9,toneMapped:false,blending:THREE.AdditiveBlending,depthWrite:false}));
    flare.rotation.z=-side*Math.PI/2;flare.position.x=side*.21;group.add(flare);jets.push({group,flare,side});
    flare.name=`upper_rotation_flame_${side>0?'right':'left'}`;
  }
  for(const [name,color] of [['nav_port_lens','#ed4848'],['nav_starboard_lens','#63ee92']]){
    const lens=root.getObjectByName(name);if(!lens)continue;
    root.updateMatrixWorld(true);const position=root.worldToLocal(lens.getWorldPosition(new THREE.Vector3()));
    const lamp=new THREE.PointLight(color,.7,4,2);lamp.position.copy(position);root.add(lamp);
  }
  return {
    damage:createCraftDamage(root),
    paint(color){
      for(const {copy,color:original} of materials.values())if(paintNames.has(copy.name)){
        if(color){copy.color.set(color);if(['Ceramic ivory','Aster porcelain alloy'].includes(copy.name))copy.color.lerp(new THREE.Color('#e5e4dc'),.25);}
        else copy.color.copy(original);
      }
    },
    update(tier,turn,damage){for(const jet of jets){jet.group.visible=tier>0&&(damage?.[jet.side>0?'right':'left']??100)>0;jet.flare.visible=turn*jet.side>.05;}},
  };
}
