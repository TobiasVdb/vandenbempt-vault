import * as THREE from 'three';

const fraction=value=>value-Math.floor(value);
const noise=seed=>fraction(Math.sin(seed*127.1+311.7)*43758.5453);

/** Distant visual references only: four draw calls, no lights, shadows or collision. */
export function createMenuBackdrop(scene,{texture=null}={}){
  const root=new THREE.Group();root.name='menu_movement_backdrop';scene.add(root);
  const stars=[];
  for(const [name,count,size,opacity,depth] of [['distant_stars',240,1.2,.25,48],['near_stars',48,1.7,.3,44]]){
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
  // Camera-facing artwork supplies real faceted detail without adding scene lights.
  const horizon=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:texture,color:texture?'#ffffff':'#0b1823',fog:false,depthTest:false,depthWrite:false,toneMapped:false}));
  horizon.name='far_horizon';horizon.renderOrder=-100;root.add(horizon);
  const shade=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
    transparent:true,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 screenUv; void main(){screenUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 screenUv; void main(){float edge=pow(abs(screenUv.x-.5)*2.0,3.0);float top=smoothstep(.45,1.0,screenUv.y);gl_FragColor=vec4(.018,.035,.05,edge*.15+top*.08);}',
  }));shade.name='near_horizon';shade.renderOrder=-99;root.add(shade);
  const direction=new THREE.Vector3();
  return {
    update(camera){
      camera.getWorldDirection(direction);
      const span=camera.top-camera.bottom;
      // Stars are effectively at infinity: translation and follow-camera zoom must not
      // make them slide or expand. Keep their screen positions fixed behind the terrain.
      for(const {points,depth} of stars){
        points.position.copy(camera.position).addScaledVector(direction,depth);
        points.quaternion.copy(camera.quaternion);
        points.scale.set((camera.right-camera.left)/(12*camera.zoom),span/(12*camera.zoom),1);
      }
      for(const [plane,depth] of [[horizon,60],[shade,59]]){
        plane.position.copy(camera.position).addScaledVector(direction,depth);plane.quaternion.copy(camera.quaternion);
        plane.scale.set((camera.right-camera.left)/(2*camera.zoom),span/(2*camera.zoom),1);
      }
      if(texture){
        const aspect=(camera.right-camera.left)/span,imageAspect=texture.image?texture.image.width/texture.image.height:1672/941;
        const x=Math.min(1,aspect/imageAspect),y=Math.min(1,imageAspect/aspect);
        texture.repeat.set(x,y);texture.offset.set((1-x)*.64,(1-y)*.5);
      }
    },
  };
}
