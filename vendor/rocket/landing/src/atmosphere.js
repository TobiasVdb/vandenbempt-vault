import * as THREE from 'three';

const fract=value=>value-Math.floor(value);
const random=seed=>fract(Math.sin(seed*127.1+311.7)*43758.5453);

/** World-anchored banks pass above the camera as the rocket descends through them. */
export function createDescentClouds(scene){
  const banks=[166,140,112,86,58,28],count=banks.length*10,geometry=new THREE.PlaneGeometry(1,1),data=new Float32Array(count*2),wisps=[];
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:`attribute vec2 cloudData;varying vec2 vUv;varying vec2 vCloud;
      void main(){vUv=uv;vCloud=cloudData;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;varying vec2 vCloud;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 p=vUv*vec2(5.,3.)+vCloud.x;
        float billow=noise(p)*.65+noise(p*2.1)*.25+noise(p*4.3)*.1;
        float edge=1.-smoothstep(.2,1.,length((vUv-.5)*2.));
        float density=smoothstep(.18,.75,billow)*edge*edge;
        vec3 color=mix(vec3(.24,.36,.44),vec3(.62,.73,.79),vUv.y*.65+billow*.35);
        gl_FragColor=vec4(color,density*vCloud.y);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const clouds=new THREE.InstancedMesh(geometry,material,count);clouds.name='descent_cloud_banks';clouds.frustumCulled=false;
  clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(clouds);
  for(let i=0;i<count;i++){
    const near=i%3===0;
    wisps.push({x:(i%10-4.5)*2.6+(random(i+3)-.5)*1.5,y:banks[Math.floor(i/10)]+(random(i+41)-.5)*2.2,z:near?2.4:-3.2,width:4+random(i+75)*4,height:1.3+random(i+93)*2,phase:random(i+137)*Math.PI*2});
    data.set([random(i+173)*100,near?.38:.55],i*2);
  }
  geometry.setAttribute('cloudData',new THREE.InstancedBufferAttribute(data,2));
  const transform=new THREE.Object3D();let clock=0;
  return {update(dt,camera,{paused=false,reducedMotion=false}={}){
    if(!paused&&!reducedMotion)clock+=dt;
    for(let i=0;i<count;i++){
      const w=wisps[i];
      transform.position.set(w.x+Math.sin(clock*.035+w.phase)*.35,w.y,w.z);
      transform.quaternion.copy(camera.quaternion);transform.scale.set(w.width,w.height,1);transform.updateMatrix();clouds.setMatrixAt(i,transform.matrix);
    }
    clouds.instanceMatrix.needsUpdate=true;
  }};
}

/** Fine air streaks rise past a descending ship; the actual flight velocity sets their strength. */
export function createFallAir(scene,ship){
  const count=24,positions=new Float32Array(count*6),strength=new Float32Array(count*2),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('strength',new THREE.BufferAttribute(strength,1).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:'attribute float strength;varying float vStrength;void main(){vStrength=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float vStrength;void main(){gl_FragColor=vec4(.68,.82,.9,vStrength*.2);}',
  });
  const lines=new THREE.LineSegments(geometry,material);lines.frustumCulled=false;scene.add(lines);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'#fff');gradient.addColorStop(.12,'#fffe');gradient.addColorStop(.35,'#fff5');gradient.addColorStop(1,'#fff0');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const map=new THREE.CanvasTexture(canvas),lamps=[];ship.updateMatrixWorld(true);
  for(const [name,color,phase]of [['nav_port_lens','#fa6157',0],['nav_starboard_lens','#83f1bf',.65],['nav_beacon_lens','#eef4ff',1.1]]){
    const lens=ship.getObjectByName(name);if(!lens)continue;
    const position=ship.worldToLocal(lens.getWorldPosition(new THREE.Vector3())),glow=new THREE.Sprite(new THREE.SpriteMaterial({map,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    glow.position.copy(position);glow.position.z+=.03;glow.scale.setScalar(.18);ship.add(glow);lamps.push({lens,glow,phase});
  }
  let clock=0;
  return {update(dt,state,camera,{paused=false,reducedMotion=false}={}){
    if(!paused)clock+=dt;
    const speed=Math.min(1,Math.abs(state.vy)/18),span=camera.top-camera.bottom,width=camera.right-camera.left;
    lines.visible=!reducedMotion&&speed>.025;
    for(let i=0;i<count;i++){
      const phase=fract(random(i+80)+clock*(.09+speed*.17)),x=camera.position.x+(random(i+1)-.5)*width,y=camera.position.y+(phase-.5)*span;
      const length=(.06+random(i+21)*.24)*(.3+speed),alpha=Math.sin(phase*Math.PI)*speed;
      positions.set([x,y,2+random(i+40),x-state.vx*.006,y+length,2+random(i+40)],i*6);strength[i*2]=0;strength[i*2+1]=alpha;
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.strength.needsUpdate=true;
    for(const {lens,glow,phase}of lamps){const beat=(clock+phase)%2.2,pulse=reducedMotion?.45:beat<.1||beat>.23&&beat<.33?1:.05;glow.material.opacity=.1+pulse*.85;if(lens.material.emissive)lens.material.emissiveIntensity=.2+pulse*2;}
  }};
}
