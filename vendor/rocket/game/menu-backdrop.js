import * as THREE from 'three';

const fraction=value=>value-Math.floor(value);
const noise=seed=>fraction(Math.sin(seed*127.1+311.7)*43758.5453);

/** Distant visual references only: four draw calls, no lights, shadows or collision. */
export function createMenuBackdrop(scene){
  const root=new THREE.Group();root.name='menu_movement_backdrop';scene.add(root);
  const stars=[];
  for(const [name,count,size,opacity,depth] of [['distant_stars',1700,1.6,.65,48],['near_stars',220,2.3,.75,44]]){
    const positions=[],colors=[];
    for(let i=0;i<count;i++){
      positions.push((noise(i+1)-.5)*64,(noise(i+5001)-.5)*64,0);
      const brightness=.45+noise(i+9001)*.55;colors.push(brightness*.75,brightness*.88,brightness);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    // Orthographic PointsMaterial sizes are pixels; subpixel world-sized stars were invisible.
    const points=new THREE.Points(geometry,new THREE.PointsMaterial({size,sizeAttenuation:false,vertexColors:true,transparent:true,opacity,fog:false,depthWrite:false,toneMapped:false}));
    points.name=name;root.add(points);stars.push({points,depth});
  }
  const ridges=[];
  for(const [name,color,height,parallax,z] of [['far_horizon','#193443',.6,.96,-26],['near_horizon','#25434c',1,.9,-21]]){
    const positions=[],indices=[];
    for(let i=0;i<=256;i++){
      const x=i-128,y=height*(.75+.3*Math.sin(x*.27)+.18*Math.sin(x*.73+2)+.08*Math.sin(x*1.91));
      positions.push(x,y,0,x,-80,0);
      if(i<256){const a=i*2;indices.push(a,a+1,a+2,a+2,a+1,a+3);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
    const ridge=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,fog:false,toneMapped:false}));ridge.name=name;ridge.position.z=z;root.add(ridge);ridges.push({ridge,parallax});
  }
  const direction=new THREE.Vector3();
  return {
    update(camera){
      camera.getWorldDirection(direction);
      const span=camera.top-camera.bottom;
      // Keep a remote horizon in view during high climbs, while local ground stays physical.
      const atHorizon=camera.position.y+(-24-camera.position.z)*direction.y/direction.z;
      const base=Math.max(0,atHorizon-span*.27);
      // Stars are effectively at infinity: translation and follow-camera zoom must not
      // make them slide or expand. Keep their screen positions fixed behind the terrain.
      for(const {points,depth} of stars){
        points.position.copy(camera.position).addScaledVector(direction,depth);
        points.quaternion.copy(camera.quaternion);
        points.scale.set((camera.right-camera.left)/(12*camera.zoom),span/(12*camera.zoom),1);
      }
      for(const {ridge,parallax} of ridges){ridge.position.x=camera.position.x*parallax;ridge.position.y=base;}
    },
  };
}
