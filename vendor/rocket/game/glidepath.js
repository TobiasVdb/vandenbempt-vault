import * as THREE from 'three';
import { stepFlight, FIXED_STEP, worldHull, polygonsOverlap } from './physics.js';
import { terrainSolids } from './levels.js';

/** Predict a short, constant-input flight using the actual integrator. Never changes the live state. */
export function predictGlidepath(state,input,level,hull,{seconds=3.2,solids=terrainSolids(level)}={}){
  const ghost={...state,damage:{...state.damage},translation:state.translation?{...state.translation}:undefined},points=[[state.x,state.y]];
  if(state.status!=='flying')return {points,impact:null,landing:null};
  for(let frame=1;frame<=Math.ceil(seconds/FIXED_STEP);frame++){
    if(ghost.worldTime!==undefined)ghost.worldTime+=FIXED_STEP;
    stepFlight(ghost,input,level,hull,FIXED_STEP,solids);
    if(frame%6===0)points.push([ghost.x,ghost.y]);
    if(!['ready','landed','finished','orbiting','crashed'].includes(ghost.status))continue;
    points.push([ghost.x,ghost.y]);
    if(ghost.status==='crashed'){
      const body=worldHull(ghost,hull),obstacles=[...solids,...level.pads.map(p=>[[p.x-p.width/2,p.y-.38],[p.x+p.width/2,p.y-.38],[p.x+p.width/2,p.y],[p.x-p.width/2,p.y]])];
      let distance=Infinity,contact=[ghost.x,ghost.y];
      for(const polygon of obstacles.filter(p=>polygonsOverlap(body,p)))for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1];
        for(const point of body){const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1))),x=a[0]+dx*t,y=a[1]+dy*t,d=Math.hypot(x-point[0],y-point[1]);if(d<distance){distance=d;contact=[x,y];}}
      }
      return {points,impact:{x:contact[0],y:contact[1],time:frame*FIXED_STEP,kind:level.theme==='space'?'METEOR':'TERRAIN'},landing:null};
    }
    return {points,impact:null,landing:ghost.status==='ready'||ghost.status==='landed'?{time:frame*FIXED_STEP}:null};
  }
  return {points,impact:null,landing:null};
}

export function createGlidepath(scene){
  const positions=new Float32Array(70*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.LineBasicMaterial({color:'#e5b75a',transparent:true,opacity:.55,depthTest:false,toneMapped:false});
  const line=new THREE.Line(geometry,material);line.name='predicted_glidepath';line.frustumCulled=false;line.renderOrder=5;scene.add(line);
  const markerGeometry=new THREE.BufferGeometry();markerGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.22,0,0,.22,0,0,0,-.22,0,0,.22,0],3));
  const marker=new THREE.LineSegments(markerGeometry,material);marker.name='predicted_contact';marker.renderOrder=6;scene.add(marker);
  let cachedLevel=null,solids=[];
  return {
    hide(){line.visible=false;marker.visible=false;},
    update(state,input,level,hull){
      if(level!==cachedLevel){cachedLevel=level;solids=terrainSolids(level);}
      const result=predictGlidepath(state,input,level,hull,{solids}),count=Math.min(result.points.length,70);
      for(let i=0;i<count;i++){positions[i*3]=result.points[i][0];positions[i*3+1]=result.points[i][1];positions[i*3+2]=1.2;}
      geometry.setDrawRange(0,count);geometry.attributes.position.needsUpdate=true;line.visible=state.status==='flying';
      marker.visible=Boolean(result.impact);if(result.impact)marker.position.set(result.impact.x,result.impact.y,1.2);
      material.color.set(result.impact?(result.impact.time<.8?'#ef8c53':'#e5b75a'):result.landing?'#91ceac':'#a3bcc8');
      return result;
    },
  };
}
