import * as THREE from 'three';
import { createPlumePool } from './plume.js';

/** Anisotropic billboards distinguish the airborne jet from its low, rolling ground wake. */
export function createPlumeEffect(scene,{capacity=1200,reducedMotion=false,random=Math.random}={}){
  const pool=createPlumePool({capacity,random});
  const centers=new Float32Array(capacity*3),sizes=new Float32Array(capacity*2),planes=new Float32Array(capacity*3),rotations=new Float32Array(capacity),types=new Float32Array(capacity);
  const geometry=new THREE.InstancedBufferGeometry();geometry.instanceCount=0;
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);
  const parcels=new Float32Array(capacity*4);
  for(const [name,array,itemSize] of [['center',centers,3],['puffSize',sizes,2],['parcel',parcels,4],['surfacePlane',planes,3],['rotation',rotations,1],['kind',types,1]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(array,itemSize).setUsage(THREE.DynamicDrawUsage));
  const walls=new Float32Array(capacity*4),jets=new Float32Array(capacity*3),hotLengths=new Float32Array(capacity),throttles=new Float32Array(capacity),velocities=new Float32Array(capacity*3);
  for(const [name,array,itemSize] of [['wallPlane',walls,4],['jetPlane',jets,3],['hotLength',hotLengths,1],['throttle',throttles,1],['velocity',velocities,3]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(array,itemSize).setUsage(THREE.DynamicDrawUsage));
  const uniforms={firePass:{value:0},cameraRight:{value:new THREE.Vector3(1,0,0)},cameraUp:{value:new THREE.Vector3(0,1,0)},dark:{value:0},water:{value:0},
    lights:{value:Array.from({length:3},()=>new THREE.Vector3())},powers:{value:[0,0,0]}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,forceSinglePass:true,
    vertexShader:`
      attribute vec3 center, surfacePlane, jetPlane, velocity;
      attribute vec4 wallPlane;
      attribute vec2 puffSize;
      attribute vec4 parcel;
      attribute float rotation, kind, hotLength, throttle;
      uniform float firePass;
      uniform vec3 cameraRight, cameraUp;
      varying vec2 vUv;
      varying float vOpacity, vHeat, vSeed, vAge, vKind;
      varying vec3 vWorld, vPlane, vJet;
      varying vec4 vWall;
      varying float vThrottle;
      void main(){
        vUv=uv;vOpacity=parcel.x;vHeat=parcel.y;vSeed=parcel.z;vAge=parcel.w;vKind=kind;vPlane=surfacePlane;
        vWall=wallPlane;vJet=jetPlane;vThrottle=throttle;
        vec2 dimensions=puffSize;
        if(firePass>.5&&kind<.5){dimensions.x=max(.16,dimensions.x*1.3);dimensions.y=max(hotLength,puffSize.y);}
        vec2 offset=position.xy*dimensions;
        vec2 projected=vec2(dot(velocity,cameraRight),dot(velocity,cameraUp));
        float angle=kind<.5&&length(projected)>.01?atan(projected.y,projected.x)-1.5707963:rotation;
        float c=cos(angle),s=sin(angle);
        offset=mat2(c,s,-s,c)*offset;
        vWorld=center+cameraRight*offset.x+cameraUp*offset.y;
        gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);
      }`,
    fragmentShader:`
      uniform float dark, water, firePass;
      uniform vec3 lights[3];
      uniform float powers[3];
      varying vec2 vUv;
      varying float vOpacity, vHeat, vSeed, vAge, vKind;
      varying vec3 vWorld, vPlane, vJet;
      varying vec4 vWall;
      varying float vThrottle;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
      }
      void main(){
        if(dot(vPlane.xy,vWorld.xy)+vPlane.z<.001||dot(vWall.xyz,vWorld)+vWall.w<0.0)discard;
        if(firePass>.5){if(vHeat<.005||dot(vJet.xy,vWorld.xy)+vJet.z<0.0)discard;}
        else if(vOpacity<.001)discard;
        vec2 p=(vUv-.5)*2.0;
        vec2 drift=vec2(vSeed*.19,vSeed*.31+vAge*.3);
        float textureNoise=noise(p*2.4+drift)*.65+noise(p*5.3-drift)*.35;
        float radius=length(p);
        float edge=1.0-smoothstep(.42,1.0,radius+(textureNoise-.5)*.3);
        float body=.55+textureNoise*.45;
        if(firePass>.5){
          float core=exp(-p.x*p.x*15.0)*(1.0-smoothstep(.15,1.0,abs(p.y)));
          float diamonds=.84+.16*cos(p.y*19.0+vAge*9.0);
          float alpha=edge*edge*body*pow(vHeat,.75)*(.45+.55*vThrottle);
          vec3 color=mix(vec3(1.0,.22,.035),vec3(.65,.84,1.0),core*vHeat);
          gl_FragColor=vec4(color*(1.25+core*1.8)*diamonds,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          return;
        }
        float alpha=edge*edge*body*vOpacity;
        if(alpha<.001)discard;
        float ground=step(.5,vKind)*(1.0-water);
        vec3 smoke=mix(vec3(.44,.47,.48),vec3(.48,.45,.40),ground);
        smoke=mix(smoke,vec3(.43,.71,.78),water);
        vec3 color=mix(smoke,vec3(1.0,.62,.27),vHeat);
        float illumination=1.0;
        if(dark>.5){
          illumination=.008+vHeat*.85;
          for(int i=0;i<3;i++)illumination+=powers[i]*exp(-distance(vWorld,lights[i])*.65);
          illumination=min(1.0,illumination);
        }
        gl_FragColor=vec4(color*illumination,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='rocket_plume';mesh.frustumCulled=false;scene.add(mesh);
  // The hot pass shares every parcel and collision plane with the cooling smoke.
  const fireMaterial=new THREE.ShaderMaterial({uniforms:{...uniforms,firePass:{value:1}},vertexShader:material.vertexShader,fragmentShader:material.fragmentShader,transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending});
  const fire=new THREE.Mesh(geometry,fireMaterial);fire.name='rocket_fire';fire.frustumCulled=false;scene.add(fire);
  return {
    emit(id,source,seconds,level){pool.emit(id,source,seconds,level,reducedMotion?40:96);},
    update(seconds,level,camera,renderer,emitters){
      pool.update(seconds,level);camera.updateMatrixWorld();
      uniforms.cameraRight.value.setFromMatrixColumn(camera.matrixWorld,0);uniforms.cameraUp.value.setFromMatrixColumn(camera.matrixWorld,1);
      uniforms.dark.value=Number(level.theme==='dark');uniforms.water.value=Number(level.theme==='water');
      for(let i=0;i<3;i++){
        const emitter=emitters[i];uniforms.powers.value[i]=emitter?.firing?(emitter.throttle??1):0;
        if(emitter)uniforms.lights.value[i].set(emitter.x,emitter.y,emitter.z);
      }
      let renderCount=0;
      for(const p of pool.particles){
        if(!p.active)continue;
        const i=renderCount++;
        centers[i*3]=p.x;centers[i*3+1]=p.y;centers[i*3+2]=p.z;
        sizes[i*2]=p.width;sizes[i*2+1]=p.height;
        rotations[i]=p.rotation;types[i]=p.water?2:Number(p.impacted);
        parcels.set([p.opacity,p.heat,p.seed,p.age],i*4);
        planes[i*3]=p.nx;planes[i*3+1]=p.ny;planes[i*3+2]=p.plane;
        walls.set([p.wallNx,p.wallNy,p.wallNz,p.wallD],i*4);jets.set([p.jetNx,p.jetNy,p.jetD],i*3);
        velocities.set([p.vx,p.vy,p.vz],i*3);hotLengths[i]=p.hotLength;throttles[i]=p.throttle;
      }
      geometry.instanceCount=renderCount;
      for(const attribute of Object.values(geometry.attributes))if(attribute.isInstancedBufferAttribute)attribute.needsUpdate=true;
    },
    reset(){pool.reset();geometry.instanceCount=0;},
    get count(){return pool.count;},
    get statistics(){
      let air=0,ground=0,water=0,maxGroundHeight=0;
      for(const p of pool.particles){
        if(!p.active)continue;
        if(p.water)water++;else if(p.impacted){ground++;maxGroundHeight=Math.max(maxGroundHeight,p.nx*p.x+p.ny*p.y+p.plane);}else air++;
      }
      return {air,ground,water,maxGroundHeight,obstacleHits:pool.obstacleHits};
    },
  };
}
