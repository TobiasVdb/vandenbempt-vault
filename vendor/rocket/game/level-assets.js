import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function levelAssetFile(level,index){return `${String(index+1).padStart(2,'0')}-${level.id}.glb`;}

/** Visuals carry an exact copy of their source data, never an independent physics world. */
export function prepareLevelModel(scene,level){
  const root=scene.getObjectByName('level_root');
  if(!root||root.userData.mission_id!==level.id)throw new Error(`${level.id}: level model identity is missing or incorrect.`);
  let embedded;
  try{embedded=JSON.parse(root.userData.level_data);}catch{throw new Error(`${level.id}: level model has no readable mission data.`);}
  if(JSON.stringify(embedded)!==JSON.stringify(level))throw new Error(`${level.id}: level model is out of date. Rebuild the level assets.`);
  scene.traverse(object=>{
    if(object.userData.role==='collision')object.visible=false;
    if(object.userData.role==='fog')object.userData.restPosition=object.position.toArray();
    if(object.userData.role==='pad_light')object.add(new THREE.PointLight(object.userData.color,3,7,2));
  });
  // Static opaque decorations can share a draw. Keep gates, fog, lights and collision
  // references individually addressable for mission behaviour and inspection.
  const groups=new Map();scene.updateMatrixWorld(true);
  scene.traverse(object=>{
    if(!object.isMesh||!object.visible||object.children.length||object.name.startsWith('wind_vane_')||object.userData.role!=='decoration'||Array.isArray(object.material)||object.material.transparent)return;
    const key=object.parent.uuid+object.material.uuid+Object.keys(object.geometry.attributes).sort().join(',');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(object);
  });
  for(const objects of groups.values()){
    if(objects.length<2)continue;
    const parent=objects[0].parent,inverse=parent.matrixWorld.clone().invert();
    const geometries=objects.map(object=>object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld)));
    const merged=mergeGeometries(geometries);for(const geometry of geometries)geometry.dispose();
    if(!merged)throw new Error(`${level.id}: incompatible static scenery geometry.`);
    const batch=new THREE.Mesh(merged,objects[0].material);batch.name='batched_level_decoration';parent.add(batch);
    for(const object of objects)object.visible=false;
  }
  return scene;
}

export function resetLevelModel(scene){
  scene.traverse(object=>{if(object.userData.role==='fog')object.position.fromArray(object.userData.restPosition);});
}
