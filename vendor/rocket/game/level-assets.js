import * as THREE from 'three';

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
  return scene;
}

export function resetLevelModel(scene){
  scene.traverse(object=>{if(object.userData.role==='fog')object.position.fromArray(object.userData.restPosition);});
}
