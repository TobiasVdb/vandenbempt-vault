import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch static trim only. Keep damage parts, glass, lamps and animated nodes addressable. */
export function batchCraftDetails(root,animations=[]){
  const animated=new Set(animations.flatMap(clip=>clip.tracks.map(track=>track.name.split('.')[0]))),groups=new Map();
  root.updateMatrixWorld(true);
  root.traverse(object=>{
    if(!object.isMesh||!object.visible||object.children.length||Array.isArray(object.material)||object.material.transparent)return;
    const name=object.name.replaceAll('_',' ');
    if(!/fastener|seam|stripe|insignia|stencil|manifold|brace|structural rail|conformal titanium rail|cooling slot|heat shield|power module|coupling|recess|throat|rotor blade|louver/i.test(name))return;
    if(/nav|window|visor|glaz|fin|wing|cheek|fairing|bell|collar|cooling ring|reinforced lip/i.test(name))return;
    // Siblings retain their shared parent's animation when merged in that parent's space.
    if(animated.has(object.name))return;
    const key=object.parent.uuid+object.material.uuid+Object.keys(object.geometry.attributes).sort().join(',');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(object);
  });
  let savedCalls=0;
  for(const objects of groups.values()){
    if(objects.length<2)continue;
    const parent=objects[0].parent,inverse=parent.matrixWorld.clone().invert();
    const geometries=objects.map(object=>object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld)));
    const merged=mergeGeometries(geometries);for(const geometry of geometries)geometry.dispose();
    if(!merged)throw new Error('Static craft trim has incompatible geometry.');
    const batch=new THREE.Mesh(merged,objects[0].material);batch.name='batched_static_trim';parent.add(batch);
    for(const object of objects)object.visible=false;
    savedCalls+=objects.length-1;
  }
  root.traverse(object=>{
    if(object===root||animated.has(object.name))return;
    object.updateMatrix();object.matrixAutoUpdate=false;
  });
  return savedCalls;
}
