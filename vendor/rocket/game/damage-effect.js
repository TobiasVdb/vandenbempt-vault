import * as THREE from 'three';
import { plumeSurface } from './plume.js';
import { environmentAt } from './physics.js';
import { surfaceAt } from './levels.js';

const hullNames=new Set(['Checkerboard pressure hull','Planet Express pressure hull','Racing fuselage','Faceted stealth monocoque','Aster blade monocoque','Pod pressure hull']);
const nameOf=object=>(object?.name??'').replaceAll('_',' ');
const isHull=object=>hullNames.has(nameOf(object))||hullNames.has(nameOf(object.parent));
const isPart=object=>/fin|wing|armor cheek|shoe|fairing|bell|collar|cooling ring|reinforced lip|upper rotation nozzle/i.test(nameOf(object));

/** Each actor owns its dents; GLB templates, animation nodes and collision outlines stay intact. */
export function createCraftDamage(root){
  const bodies=[],parts=[],charred=new Map(),broken=new Set();let revision=0;
  root.updateWorldMatrix(true,true);
  const inverseRoot=root.matrixWorld.clone().invert(),point=new THREE.Vector3();
  root.traverse(object=>{
    if(!object.isMesh||object.name==='collision')return;
    if(isHull(object))bodies.push({object,original:object.geometry,dented:null});
    if(isPart(object)){
      object.geometry.computeBoundingBox();
      const center=object.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(object.matrixWorld).applyMatrix4(inverseRoot);
      const engine=/bell|collar|cooling ring|reinforced lip/i.test(nameOf(object));
      parts.push({object,visible:object.visible,zone:engine?'engine':center.x<0?'left':'right'});
    }
  });
  function reset(){
    for(const body of bodies)if(body.dented){body.object.geometry=body.original;body.dented.dispose();body.dented=null;}
    for(const part of parts)part.object.visible=part.visible;
    for(const [material,base] of charred){material.color.copy(base.color);material.roughness=base.roughness;}
    charred.clear();broken.clear();revision=0;
  }
  return {reset,
    update(damage){
      if(damage.revision===revision)return [];
      if(damage.revision===0){reset();return [];}
      root.updateWorldMatrix(true,true);inverseRoot.copy(root.matrixWorld).invert();
      const hit=damage.lastHit;
      if(hit)for(const body of bodies){
        if(!body.dented){body.dented=body.original.clone();body.object.geometry=body.dented;}
        const transform=inverseRoot.clone().multiply(body.object.matrixWorld),inverse=transform.clone().invert();
        const positions=body.dented.attributes.position,direction=new THREE.Vector2(-hit.x,-hit.y).normalize();
        for(let i=0;i<positions.count;i++){
          point.fromBufferAttribute(positions,i).applyMatrix4(transform);
          const weight=Math.exp(-((point.x-hit.x)**2+(point.y-hit.y)**2)/.06),depth=Math.min(.035,hit.amount*.0008)*weight;
          point.x+=direction.x*depth;point.y+=direction.y*depth;point.applyMatrix4(inverse);positions.setXYZ(i,point.x,point.y,point.z);
        }
        positions.needsUpdate=true;body.dented.computeVertexNormals();body.dented.computeBoundingSphere();
      }
      root.traverse(object=>{
        if(!object.isMesh||object.name==='collision')return;
        for(const material of Array.isArray(object.material)?object.material:[object.material]){
          if(!material.isMeshStandardMaterial||material.transparent||!material.color)continue;
          if(!charred.has(material))charred.set(material,{color:material.color.clone(),roughness:material.roughness});
          const base=charred.get(material);material.color.copy(base.color).multiplyScalar(.55+.45*damage.hull/100);material.roughness=Math.min(1,base.roughness+(1-damage.hull/100)*.3);
        }
      });
      const detached=[];
      for(const part of parts)if(damage[part.zone]===0&&!broken.has(part.object)){
        broken.add(part.object);part.object.visible=false;if(part.visible)detached.push(part.object);
      }
      revision=damage.revision;return detached;
    },
  };
}

/** Partition shell triangles into eight real mesh fragments, preserving their material groups. */
function fractureHull(object,root){
  const geometry=object.geometry,position=geometry.attributes.position,index=geometry.index,normal=geometry.attributes.normal;
  geometry.computeBoundingBox();
  const toWorld=object.matrixWorld;
  const vertices=[],point=new THREE.Vector3();
  for(let i=0;i<position.count;i++)vertices.push(point.fromBufferAttribute(position,i).applyMatrix4(toWorld).clone());
  // Bucket in the craft frame so rotation of a falling ship does not change its seams.
  const inverse=root.matrixWorld.clone().invert();for(const p of vertices)p.applyMatrix4(inverse);
  const bounds=new THREE.Box3().setFromPoints(vertices),span=Math.max(.001,bounds.max.y-bounds.min.y),mid=(bounds.min.x+bounds.max.x)/2;
  const buckets=Array.from({length:8},()=>({positions:[],normals:[],groups:[]})),count=index?index.count:position.count;
  for(let i=0;i<count;i+=3){
    const ids=[0,1,2].map(offset=>index?index.getX(i+offset):i+offset);
    const x=ids.reduce((sum,id)=>sum+vertices[id].x,0)/3,y=ids.reduce((sum,id)=>sum+vertices[id].y,0)/3;
    const bucket=buckets[Math.min(3,Math.max(0,Math.floor((y-bounds.min.y)/span*4)))*2+Number(x>mid)];
    const material=geometry.groups.find(group=>i>=group.start&&i<group.start+group.count)?.materialIndex??0;
    const start=bucket.positions.length/3,last=bucket.groups.at(-1);
    if(last?.materialIndex===material)last.count+=3;else bucket.groups.push({start,count:3,materialIndex:material});
    for(const id of ids){bucket.positions.push(position.getX(id),position.getY(id),position.getZ(id));if(normal)bucket.normals.push(normal.getX(id),normal.getY(id),normal.getZ(id));}
  }
  return buckets.filter(bucket=>bucket.positions.length).map(bucket=>{
    const shard=new THREE.BufferGeometry();shard.setAttribute('position',new THREE.Float32BufferAttribute(bucket.positions,3));
    if(normal)shard.setAttribute('normal',new THREE.Float32BufferAttribute(bucket.normals,3));else shard.computeVertexNormals();
    for(const group of bucket.groups)shard.addGroup(group.start,group.count,group.materialIndex);
    return shard;
  });
}

/** Bounded debris, with inherited motion, spin, terrain bounce and a fading engine flash. */
export function createDestructionEffect(scene,{capacity=96,reducedMotion=false,random=Math.random,horizontalLimit=24.965}={}){
  const placeholder=new THREE.BufferGeometry(),material=new THREE.MeshStandardMaterial({color:'#534d45'});
  const pieces=Array.from({length:capacity},()=>{
    const mesh=new THREE.Mesh(placeholder,material);mesh.visible=false;mesh.name='wreck_fragment';scene.add(mesh);
    return {mesh,life:0,owned:false,velocity:new THREE.Vector3(),spin:new THREE.Vector3(),opacity:[]};
  });
  const flash=new THREE.PointLight('#ffab57',0,7,2);scene.add(flash);let cursor=0,flashLife=0;
  const center=new THREE.Vector3(),translation=new THREE.Vector3(),direction=new THREE.Vector3();
  function release(piece){
    if(piece.owned){piece.mesh.geometry.dispose();for(const m of Array.isArray(piece.mesh.material)?piece.mesh.material:[piece.mesh.material])m.dispose();}
    piece.mesh.geometry=placeholder;piece.mesh.material=material;piece.owned=false;piece.life=0;piece.mesh.visible=false;
  }
  function emit(geometry,source,matrix,state,strength){
    const piece=pieces[cursor++%capacity];release(piece);piece.owned=true;
    geometry.computeBoundingBox();geometry.boundingBox.getCenter(center);geometry.translate(-center.x,-center.y,-center.z);
    if(!geometry.groups.length)geometry.addGroup(0,geometry.index?geometry.index.count:geometry.attributes.position.count,0);
    const mesh=piece.mesh;mesh.geometry=geometry;mesh.material=(Array.isArray(source)?source:[source]).map(m=>{const copy=m.clone();copy.transparent=true;return copy;});
    matrix.decompose(translation,mesh.quaternion,mesh.scale);mesh.position.copy(center).applyMatrix4(matrix);
    direction.copy(mesh.position).sub(new THREE.Vector3(state.x,state.y,.4)).normalize();
    const scatter=reducedMotion?.35:1;
    piece.velocity.set(state.vx*.65+(direction.x*strength+(random()-.5)*2)*scatter,state.vy*.65+(1+direction.y*strength+random())*scatter,(direction.z+(random()-.5)*2)*scatter);
    piece.spin.set((random()-.5)*7*scatter,(random()-.5)*7*scatter,(random()-.5)*7*scatter);
    piece.opacity=mesh.material.map(m=>m.opacity);piece.life=6;mesh.visible=true;
  }
  return {
    shed(objects,state){for(const object of objects)emit(object.geometry.clone(),object.material,object.matrixWorld,state,1.5);},
    destroy(root,state){
      root.updateWorldMatrix(true,true);const parts=[];
      root.traverseVisible(object=>{
        if(!object.isMesh||!object.visible||object.name==='collision')return;
        if(isHull(object)){for(const shard of fractureHull(object,root))emit(shard,object.material,object.matrixWorld,state,3.5);}
        else if(isPart(object)&&parts.length<18)parts.push(object);
      });
      for(const object of parts)emit(object.geometry.clone(),object.material,object.matrixWorld,state,3.5);
      flash.position.set(state.x,state.y,.7);flashLife=reducedMotion?0:.5;
    },
    update(seconds,level){
      if(seconds<=0)return;
      const steps=Math.max(1,Math.ceil(seconds*60)),dt=seconds/steps;
      for(let step=0;step<steps;step++)for(const piece of pieces){
        if(piece.life<=0)continue;piece.life-=dt;
        if(piece.life<=0){release(piece);continue;}
        const mesh=piece.mesh,water=level.theme==='water',env=environmentAt({x:mesh.position.x,y:mesh.position.y,vx:piece.velocity.x},level);
        piece.velocity.y-=env.downward*dt;piece.velocity.multiplyScalar(Math.exp(-(water?.9:.12*env.density)*dt));
        mesh.position.addScaledVector(piece.velocity,dt);mesh.rotation.x+=piece.spin.x*dt;mesh.rotation.y+=piece.spin.y*dt;mesh.rotation.z+=piece.spin.z*dt;
        const ground=level.theme==='space'?-Infinity:plumeSurface(level,mesh.position.x,mesh.position.z).y+.035;
        if(mesh.position.y<ground){mesh.position.y=ground;piece.velocity.y=Math.abs(piece.velocity.y)*.2;if(piece.velocity.y<.12)piece.velocity.y=0;piece.velocity.x*=.72;piece.velocity.z*=.72;piece.spin.multiplyScalar(.65);}
        if(level.roof.length){
          const ceiling=surfaceAt(level.roof,mesh.position.x)-.035;
          if(mesh.position.y>ceiling){mesh.position.y=ceiling;piece.velocity.y=-Math.abs(piece.velocity.y)*.3;piece.spin.multiplyScalar(.8);}
        }
        if(level.objective!=='orbit'&&level.theme!=='space'&&Math.abs(mesh.position.x)>horizontalLimit){mesh.position.x=Math.sign(mesh.position.x)*horizontalLimit;piece.velocity.x=-Math.sign(mesh.position.x)*Math.abs(piece.velocity.x)*.3;}
        mesh.material.forEach((m,i)=>{m.opacity=piece.opacity[i]*Math.min(1,piece.life/2);});
      }
      flashLife=Math.max(0,flashLife-seconds);flash.intensity=flashLife*35;
    },
    reset(){for(const piece of pieces)release(piece);cursor=0;flashLife=0;flash.intensity=0;},
    get count(){return pieces.filter(piece=>piece.life>0).length;},
  };
}
