import * as THREE from 'three';
import {plumeJetReach} from './plume.js';

/** A continuous hot core avoids the repeated bright parcels of a sideways jet. */
export function createPlumeCore(scene,{capacity=8}={}){
  const base=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
  geometry.index=base.index;geometry.attributes.position=base.attributes.position;geometry.attributes.uv=base.attributes.uv;
  const origins=new Float32Array(capacity*3),flows=new Float32Array(capacity*4),planes=new Float32Array(capacity*3),walls=new Float32Array(capacity*4),powers=new Float32Array(capacity);
  for(const [name,data,size]of [['origin',origins,3],['flow',flows,4],['floorClip',planes,3],['wallClip',walls,4],['strength',powers,1]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(data,size).setUsage(THREE.DynamicDrawUsage));
  const uniforms={time:{value:0},facing:{value:new THREE.Vector3(0,0,1)}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 origin,floorClip;attribute vec4 flow,wallClip;attribute float strength;uniform vec3 facing;varying vec2 vUv;varying vec3 vWorld,vFloor;varying vec4 vWall;varying float vStrength;
      void main(){vUv=uv;vFloor=floorClip;vWall=wallClip;vStrength=strength;vec3 direction=vec3(flow.xy,0.);vec3 across=normalize(cross(facing,direction));
        vWorld=origin+direction*uv.y*flow.z+across*position.x*2.*flow.w*(.25+.75*uv.y);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`uniform float time;varying vec2 vUv;varying vec3 vWorld,vFloor;varying vec4 vWall;varying float vStrength;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){if(dot(vFloor.xy,vWorld.xy)+vFloor.z<.002||dot(vWall.xyz,vWorld)+vWall.w<0.)discard;
        float x=vUv.x*2.-1.,t=vUv.y,n=noise(vec2(x*4.+time*.3,t*7.-time*6.));
        float edge=exp(-x*x*(5.+n*3.)),tail=1.-smoothstep(.45,1.,t),core=exp(-x*x*22.)*(1.-t);
        float alpha=edge*tail*(.65+.35*n)*vStrength*smoothstep(0.,.025,t);vec3 color=mix(vec3(1.,.26,.045),vec3(.8,.92,1.),core);
        gl_FragColor=vec4(color*(1.2+core*1.8),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>}`});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='rocket_jet_core';mesh.frustumCulled=false;geometry.instanceCount=0;scene.add(mesh);
  return {
    update(seconds,level,camera,emitters){
      uniforms.time.value+=Math.max(0,seconds);uniforms.facing.value.setFromMatrixColumn(camera.matrixWorld,2);let count=0;
      for(const source of emitters){
        if(!source.firing||level.theme==='water'||count>=capacity)continue;
        const throttle=Math.max(0,Math.min(1,source.throttle??1));if(throttle<.005)continue;
        const upgrade=Math.sqrt((source.power??16.67*throttle)/(16.67*throttle));
        const length=(.35+.95*Math.sqrt(throttle))*upgrade*(1+(1-(source.density??1))*.5),reach=plumeJetReach(source,level,length);
        if(reach.length<.02)continue;const i=count++;
        origins.set([source.x,source.y,source.z??.4],i*3);flows.set([Math.sin(source.angle),-Math.cos(source.angle),reach.length,.045+.1*Math.sqrt(throttle)],i*4);
        planes.set(reach.plane,i*3);walls.set(reach.wall,i*4);powers[i]=Math.sqrt(throttle);
      }
      geometry.instanceCount=count;for(const name of ['origin','flow','floorClip','wallClip','strength'])geometry.attributes[name].needsUpdate=true;
    },
    reset(){geometry.instanceCount=0;uniforms.time.value=0;},
  };
}
