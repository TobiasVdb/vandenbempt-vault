import * as THREE from 'three';
import { environmentAt } from './physics.js';
import { surfaceAt } from './levels.js';

const wrap=(value,span)=>((value%span)+span)%span;
const noise=index=>{const value=Math.sin(index*127.1+311.7)*43758.5453;return value-Math.floor(value);};

/** Passing concentrations of dust reveal gust fronts; they do not add a second wind force. */
export function windGustAt(x,y,seconds,wind){
  if(!wind)return 0;
  const direction=Math.sign(wind),front=-direction*32+direction*wrap(seconds,10)*Math.abs(wind);
  const shear=Math.sin(y*.35)*1.6;
  return Math.exp(-(((x-front+shear)/6.5)**2));
}

/** Soft world-space ribbons use one mesh and reuse their buffers for the whole mission. */
export function createWindEffect(group,level,{reducedMotion=false}={}){
  const count=reducedMotion?28:72,segments=8,verticesPerRibbon=(segments+1)*2;
  const positions=new Float32Array(count*verticesPerRibbon*3),uv=new Float32Array(count*verticesPerRibbon*2),opacity=new Float32Array(count*verticesPerRibbon);
  const indices=[];
  for(let i=0;i<count;i++)for(let j=0;j<=segments;j++)for(let edge=0;edge<2;edge++){
    const vertex=i*verticesPerRibbon+j*2+edge;uv[vertex*2]=j/segments;uv[vertex*2+1]=edge;
    if(j<segments&&edge===0)indices.push(vertex,vertex+1,vertex+2,vertex+1,vertex+3,vertex+2);
  }
  const geometry=new THREE.BufferGeometry();geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geometry.setAttribute('ribbonOpacity',new THREE.BufferAttribute(opacity,1).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    uniforms:{color:{value:new THREE.Color('#cbd3c8')}},
    vertexShader:`
      attribute float ribbonOpacity;
      varying vec2 vUv;
      varying float vOpacity;
      void main(){
        vUv=uv;vOpacity=ribbonOpacity;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform vec3 color;
      varying vec2 vUv;
      varying float vOpacity;
      void main(){
        float across=1.0-smoothstep(.0,1.0,abs(vUv.y*2.0-1.0));
        float ends=pow(max(0.0,sin(vUv.x*3.14159265)),.7);
        float alpha=vOpacity*across*ends*(.45+.55*vUv.x);
        if(alpha<.001)discard;
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='wind_streaks_and_gusts';mesh.frustumCulled=false;group.add(mesh);
  let clock=0;
  const ribbons=Array.from({length:count},(_,index)=>{
    const y=-7.2+noise(index+31)*19.5,gust=!reducedMotion&&index>=54;
    return {y,gust,x:noise(index+1)*54,z:-.6-noise(index+51)*3,
      speed:environmentAt({x:0,y},level).wind*(.7+noise(index+12)*.3),
      length:gust?2.5+noise(index+21)*3:.65+noise(index+21)*1.4,
      width:gust?.14+noise(index+28)*.12:.03+noise(index+28)*.03,
      opacity:gust?.12:.07+noise(index+45)*.065,phase:noise(index+37)*Math.PI*2};
  });
  function update(seconds){
    if(!reducedMotion)clock+=seconds;
    for(const [index,ribbon] of ribbons.entries()){
      const x=wrap(ribbon.x+clock*ribbon.speed,54)-27;
      const gust=windGustAt(x,ribbon.y,clock,level.wind),direction=Math.sign(ribbon.speed)||1;
      const strength=Math.min(1,Math.abs(ribbon.speed)/9);
      const length=ribbon.length*(.65+strength*.35)*(1+gust*.7);
      const alpha=ribbon.opacity*(.35+strength*.65)*(ribbon.gust?gust:1+gust*.65)*(reducedMotion?.6:1);
      for(let j=0;j<=segments;j++){
        const along=j/segments,px=x+(along-.5)*length*direction;
        const wave=Math.sin(along*Math.PI+clock*.7+ribbon.phase)*(ribbon.gust?.16:.035);
        const y=ribbon.y+wave,floor=surfaceAt(level.floor,px);
        const roof=level.roof.length?surfaceAt(level.roof,px):Infinity;
        const clearance=Math.min(1,Math.max(0,(y-floor-.15)*2),Math.max(0,(roof-y-.15)*2));
        for(let edge=0;edge<2;edge++){
          const vertex=index*verticesPerRibbon+j*2+edge;
          positions[vertex*3]=px;positions[vertex*3+1]=y+(edge-.5)*ribbon.width;positions[vertex*3+2]=ribbon.z;
          opacity[vertex]=alpha*clearance;
        }
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.ribbonOpacity.needsUpdate=true;
  }
  update(0);
  return {update};
}
