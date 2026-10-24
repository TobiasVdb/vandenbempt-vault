import * as THREE from 'three';

/** Oriented particle-collision proxies follow the actual structure, including moving service arms. */
export function createPlumeObstacles(root,accept=()=>true){
  const boxes=[],objects=[],centers=[];
  root.traverse(object=>{
    if(!object.isMesh||!accept(object))return;
    object.geometry.computeBoundingBox();
    const bounds=object.geometry.boundingBox,half=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
    if(Math.min(half.x,half.y,half.z)<=0)return;
    objects.push(object);centers.push(bounds.getCenter(new THREE.Vector3()));
    boxes.push({x:0,y:0,z:0,axes:new Float64Array(9),half:new Float64Array(3),radius:0,localHalf:half});
  });
  const worldCenter=new THREE.Vector3();
  function update(){
    root.updateWorldMatrix(true,true);
    for(let index=0;index<objects.length;index++){
      const object=objects[index],box=boxes[index],matrix=object.matrixWorld,e=matrix.elements;
      worldCenter.copy(centers[index]).applyMatrix4(matrix);box.x=worldCenter.x;box.y=worldCenter.y;box.z=worldCenter.z;
      for(let axis=0;axis<3;axis++){
        const column=axis*4,scale=Math.hypot(e[column],e[column+1],e[column+2]);
        for(let j=0;j<3;j++)box.axes[axis*3+j]=e[column+j]/scale;
        box.half[axis]=box.localHalf.getComponent(axis)*scale;
      }
      box.radius=Math.hypot(...box.half);
    }
  }
  update();return {boxes,update};
}
