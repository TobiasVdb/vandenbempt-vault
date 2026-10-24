import { LANDING_LIMITS } from './flight-balance.js';
import { breakLandingLeg, destroyShip } from './damage.js';

const rotate=([x,y],angle)=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)];
const world=(state,point)=>{const [x,y]=rotate(point,state.angle);return {x:state.x+x,y:state.y+y};};
const intact=(state,side)=>(state.damage[side===0?'legLeft':'legRight']??100)>0;
const geometryCache=new WeakMap();

/** Derive the two flight-plane feet from each exported hull, without changing its asset contract. */
export function landingGeometry(hull){
  if(geometryCache.has(hull))return geometryCache.get(hull);
  const bottom=Math.min(...hull.map(p=>p[1])),top=Math.max(...hull.map(p=>p[1]));
  const low=hull.filter(p=>p[1]<=bottom+(top-bottom)*.04);
  const left=Math.min(...low.map(p=>p[0])),right=Math.max(...low.map(p=>p[0]));
  const feet=[[left,bottom],[right,bottom]],cut=bottom+(top-bottom)*.12,body=[];
  // The lower supports can detach; the pressure hull above them remains solid.
  for(let i=0;i<hull.length;i++){
    const a=hull[i],b=hull[(i+1)%hull.length];
    if(a[1]>=cut)body.push(a);
    if((a[1]<cut)!==(b[1]<cut))body.push([a[0]+(b[0]-a[0])*(cut-a[1])/(b[1]-a[1]),cut]);
  }
  const inertia=Math.max(.05,(top-bottom)**2/12+(right-left)**2/12);
  const geometry={feet,body,inertia};geometryCache.set(hull,geometry);return geometry;
}

/** Highest supporting surface at a point; pad sides remain ordinary solid obstacles. */
export function landingSurface(level,x){
  let surface=null;
  for(let i=1;i<level.floor.length;i++){
    const a=level.floor[i-1],b=level.floor[i];if(x<a[0]||x>b[0])continue;
    const slope=(b[1]-a[1])/(b[0]-a[0]);
    surface={y:a[1]+slope*(x-a[0]),slope,pad:-1};break;
  }
  for(const [index,pad]of level.pads.entries())if(Math.abs(x-pad.x)<=pad.width/2&&(!surface||pad.y>=surface.y))surface={y:pad.y,slope:0,pad:index};
  return surface;
}

function supported(state,level,geometry){
  const points=geometry.feet.map(point=>world(state,point));
  const surfaces=points.map(point=>landingSurface(level,point.x));
  const touching=points.map((point,index)=>intact(state,index)&&surfaces[index]&&point.y-surfaces[index].y<.025);
  return {points,surfaces,touching};
}

function finishRest(state,level,geometry,points,surfaces){
  state.angle=Math.atan2(surfaces[1].y-surfaces[0].y,points[1].x-points[0].x);
  const local=geometry.feet[state.ground.side],offset=rotate(local,state.angle);
  state.x=state.ground.x-offset[0];state.y=state.ground.y-offset[1];
  state.vx=state.vy=state.omega=0;state.ground.resting=true;state.thrust=0;
  state.notice='Settled on terrain. Thrust to lift off.';
  const pad=surfaces[0].pad;
  if(pad<0||pad!==surfaces[1].pad)return;
  const landingPad=level.pads[pad];
  if(!points.every(point=>Math.abs(point.x-landingPad.x)<=landingPad.width/2))return;
  state.pad=pad;state.status=landingPad.type==='goal'?'landed':'ready';
  state.notice='';
}

/** A single foot is a real pivot: gravity rotates the centre of mass about it. */
export function stepGroundContact(state,level,hull,gravity,dt){
  if(!state.ground)return false;
  const geometry=landingGeometry(hull),contact=state.ground;
  if(!intact(state,contact.side)){state.ground=null;return false;}
  let {points,surfaces,touching}=supported(state,level,geometry);
  if(touching.every(Boolean)&&intact(state,0)&&intact(state,1)){
    const low=Math.min(points[0].x,points[1].x),high=Math.max(points[0].x,points[1].x);
    if(state.x>low+.005&&state.x<high-.005){finishRest(state,level,geometry,points,surfaces);return true;}
    contact.side=state.x<=low?0:1;contact.x=points[contact.side].x;contact.y=surfaces[contact.side].y;
  }
  contact.resting=false;
  const local=geometry.feet[contact.side],offset=rotate(local,state.angle);
  const pivotInertia=geometry.inertia+local[0]**2+local[1]**2;
  state.omega+=gravity*offset[0]/pivotInertia*dt;
  state.omega*=Math.exp(-.18*dt);
  state.angle+=state.omega*dt;
  const next=rotate(local,state.angle);
  state.x=contact.x-next[0];state.y=contact.y-next[1];
  state.vx=state.omega*next[1];state.vy=-state.omega*next[0];
  const other=1-contact.side,foot=world(state,geometry.feet[other]),surface=landingSurface(level,foot.x);
  if(intact(state,other)&&surface&&foot.y<=surface.y){
    const arm=rotate(geometry.feet[other],state.angle),nx=-surface.slope/Math.hypot(1,surface.slope),ny=1/Math.hypot(1,surface.slope);
    const vx=state.vx-state.omega*arm[1],vy=state.vy+state.omega*arm[0];
    if(-(vx*nx+vy*ny)>LANDING_LIMITS.vertical||Math.abs(vx*ny-vy*nx)>LANDING_LIMITS.horizontal){
      breakLandingLeg(state,other,geometry.feet[other]);return true;
    }
    const angle=Math.atan2(surface.y-contact.y,foot.x-contact.x)+(other===0?Math.PI:0);
    const target=Math.atan2(Math.sin(angle),Math.cos(angle));
    // The second foot absorbs the remaining rotation instead of bouncing forever.
    if(Math.abs(target-state.angle)<.15){
      state.angle=target;const fixed=rotate(local,state.angle);state.x=contact.x-fixed[0];state.y=contact.y-fixed[1];
      state.omega=0;
      ({points,surfaces,touching}=supported(state,level,geometry));
      if(touching.every(Boolean)&&state.x>points[0].x+.005&&state.x<points[1].x-.005){finishRest(state,level,geometry,points,surfaces);return true;}
    }
  }
  state.notice='Balancing on one landing leg.';
  return true;
}

/** Resolve first foot contact; excessive normal or sideways speed breaks the supports. */
export function resolveLandingContact(state,level,hull,previousPose){
  const geometry=landingGeometry(hull),contacts=[];
  for(const [side,local]of geometry.feet.entries()){
    if(!intact(state,side))continue;
    const point=world(state,local),surface=landingSurface(level,point.x);
    if(surface&&point.y<=surface.y+.001)contacts.push({side,local,point,surface,depth:surface.y-point.y});
  }
  if(!contacts.length)return false;
  contacts.sort((a,b)=>b.depth-a.depth);const hit=contacts[0];
  if(hit.surface.pad>=0&&previousPose){
    const previous=world(previousPose,hit.local),pad=level.pads[hit.surface.pad];
    if(previous.y<pad.y-.025&&Math.abs(previous.x-pad.x)>pad.width/2-.025){
      breakLandingLeg(state,hit.side,hit.local);state.ground=null;return true;
    }
  }
  const nx=-hit.surface.slope/Math.hypot(1,hit.surface.slope),ny=1/Math.hypot(1,hit.surface.slope);
  const offset=rotate(hit.local,state.angle),vx=state.vx-state.omega*offset[1],vy=state.vy+state.omega*offset[0];
  const closing=Math.max(0,-vx*nx-vy*ny),sideways=Math.abs(vx*ny-vy*nx);
  if(vx*nx+vy*ny>.001&&hit.depth<.02)return false;
  if(closing>LANDING_LIMITS.vertical||sideways>LANDING_LIMITS.horizontal){
    for(const contact of contacts)breakLandingLeg(state,contact.side,contact.local);
    state.ground=null;state.notice='Landing leg broken. Landing support lost.';return true;
  }
  state.y+=Math.max(0,hit.depth);
  const rx=state.x-hit.point.x,ry=state.y-hit.surface.y;
  state.omega=(geometry.inertia*state.omega+rx*state.vy-ry*state.vx)/(geometry.inertia+rx*rx+ry*ry);
  state.ground={side:hit.side,x:hit.point.x,y:hit.surface.y,resting:false};
  return true;
}

export function bodyTouchesGround(state,level,hull){
  for(const local of landingGeometry(hull).body){
    const point=world(state,local),surface=landingSurface(level,point.x);
    if(surface&&point.y<surface.y-.005){destroyShip(state,'The pressure hull struck the ground.');return true;}
  }
  return false;
}

export function landingFeet(state,hull){return landingGeometry(hull).feet.map(point=>world(state,point));}
