const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** The same planar floor and landing-pad tops used by the flight simulation. */
export function plumeSurface(level,x,z=0){
  const floor=level.floor;
  if(!floor.length)return {y:-Infinity,nx:0,ny:1};
  let a=floor[0],b=floor[1];
  for(let i=1;i<floor.length;i++){
    a=floor[i-1];b=floor[i];
    if(x<=b[0])break;
  }
  const slope=(b[1]-a[1])/(b[0]-a[0]),length=Math.hypot(slope,1);
  let y=a[1]+slope*(clamp(x,a[0],b[0])-a[0]),nx=-slope/length,ny=1/length;
  for(const pad of level.pads){
    const inside=pad.radius!==undefined?Math.hypot(x-pad.x,z-(pad.z||0))<=pad.radius:Math.abs(x-pad.x)<=pad.width/2&&Math.abs(z-(pad.z||0))<=(pad.depth??2.5)/2;
    if(inside&&pad.y>=y){y=pad.y;nx=0;ny=1;}
  }
  return {y,nx,ny};
}

/** Sweep a parcel through oriented structural boxes, returning the first contacted face. */
function obstacleHit(x,y,z,toX,toY,toZ,obstacles){
  let nearest=null,first=Infinity;
  for(const box of obstacles){
    const sx=x-box.x,sy=y-box.y,sz=z-box.z,dx=toX-x,dy=toY-y,dz=toZ-z;
    const reach=box.radius+Math.hypot(dx,dy,dz)+.025;
    if(sx*sx+sy*sy+sz*sz>reach*reach)continue;
    let enter=-Infinity,exit=Infinity,axis=-1,sign=1,inside=true,closest=Infinity,insideAxis=0,insideSign=1,rejected=false;
    for(let a=0;a<3;a++){
      const n=a*3,origin=sx*box.axes[n]+sy*box.axes[n+1]+sz*box.axes[n+2];
      const direction=dx*box.axes[n]+dy*box.axes[n+1]+dz*box.axes[n+2],extent=box.half[a]+.025;
      if(Math.abs(origin)>extent)inside=false;
      const distance=extent-Math.abs(origin);
      if(distance<closest){closest=distance;insideAxis=a;insideSign=Math.sign(origin)||1;}
      if(Math.abs(direction)<1e-9){if(Math.abs(origin)>extent){rejected=true;break;}continue;}
      let near=(-extent-origin)/direction,far=(extent-origin)/direction;
      if(near>far)[near,far]=[far,near];
      if(near>enter){enter=near;axis=a;sign=direction>0?-1:1;}
      exit=Math.min(exit,far);
      if(enter>exit){rejected=true;break;}
    }
    if(rejected||exit<0||enter>1)continue;
    const time=inside?0:enter;
    if(time<0||time>=first)continue;
    if(inside){axis=insideAxis;sign=insideSign;}
    if(axis<0)continue;
    const n=axis*3,nx=box.axes[n]*sign,ny=box.axes[n+1]*sign,nz=box.axes[n+2]*sign;
    nearest={time,nx,ny,nz,push:inside?closest:0};first=time;
  }
  return nearest;
}

export function plumeOpacity(age,lifetime){
  const t=clamp((age/lifetime-.35)/.65,0,1),fade=1-t*t*(3-2*t);
  return .23*Math.min(1,age/.06)*fade;
}

export function createPlumePool({capacity=1200,random=Math.random}={}){
  const particles=Array.from({length:capacity},()=>({active:false}));
  const clocks=new Map();let cursor=0,obstacleHits=0;

  function spawn(source,level,delay,interval,effectiveRate){
    const p=particles[cursor++%capacity],side=cursor%2?1:-1;
    const water=level.theme==='water',density=source.density??1;
    const throttle=clamp(source.throttle??1,0,1),expansion=1-Math.sqrt(clamp(density,0,1));
    const speed=(water?3:11+random()*3)*(.8+.2*Math.sqrt(throttle));
    Object.assign(p,{active:true,x:source.x-(source.vx||0)*(interval-delay),y:source.y-(source.vy||0)*(interval-delay),z:source.z??.5,delay,
      vx:Math.sin(source.angle)*speed+(source.vx||0)+(random()-.5)*.3,
      vy:-Math.cos(source.angle)*speed+(source.vy||0)+(random()-.5)*.3,
      vz:(random()-.5)*(.15+expansion*.6),age:0,
      lifetime:water?4+random()*2:(1.6+random()*.5)*(1-expansion*.5),
      size:.12,width:.12,height:.24,hotLength:Math.max(.32,speed/effectiveRate*2.6),rotation:-source.angle,opacity:0,heat:water?0:1,
      water,impacted:false,impactAge:0,impactHeat:0,side,radialAngle:cursor*2.39996323+random()*.2,seed:random()*100,
      density,expansion,throttle,wind:level.wind||0,nx:0,ny:1,plane:0,
      jetNx:Math.sin(source.angle),jetNy:-Math.cos(source.angle),jetD:-Math.sin(source.angle)*source.x+Math.cos(source.angle)*source.y,
      wallNx:0,wallNy:0,wallNz:0,wallD:1,wallAge:1,heatRetention:1});
  }

  function emit(id,source,seconds,level,rate=96){
    if(seconds<=0)return;
    const previous=clocks.get(id)||0,effectiveRate=rate*clamp(source.throttle??1,0,1);
    if(effectiveRate===0)return;
    let pending=previous+seconds*effectiveRate;
    // A stalled frame cannot generate an unbounded burst.
    const total=Math.floor(pending+1e-9),count=Math.min(capacity,total);pending=Math.max(0,pending-total);
    for(let i=0;i<count;i++)spawn(source,level,clamp((i+1-previous)/effectiveRate,0,seconds),seconds,effectiveRate);
    clocks.set(id,pending);
  }

  function update(seconds,level){
    if(seconds<=0)return;
    const steps=Math.ceil(seconds*120),dt=seconds/steps,obstacles=level.obstacles||[];
    for(let step=0;step<steps;step++)for(const p of particles){
      if(!p.active)continue;
      const h=Math.max(0,dt-p.delay);p.delay=Math.max(0,p.delay-dt);if(h===0)continue;
      p.age+=h;
      if(p.age>=p.lifetime){p.active=false;p.opacity=0;continue;}
      const grounded=p.impacted&&!p.water;
      const drag=p.water?.8:grounded?.55:.38*p.density;
      p.vx+=(p.wind*.65-p.vx)*drag*h;
      p.vz*=Math.exp(-drag*h);
      p.vy+=(p.water?2.2:grounded?.08:.12*p.density)*h;
      p.vy*=Math.exp(-(grounded?3:p.water?.5:.2*p.density)*h);
      const beforeX=p.x,beforeY=p.y,beforeZ=p.z;
      p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
      p.wallAge+=h;
      if(p.wallAge>.12){p.wallNx=0;p.wallNy=0;p.wallNz=0;p.wallD=1;}
      const hit=obstacleHit(beforeX,beforeY,beforeZ,p.x,p.y,p.z,obstacles);
      if(hit){
        p.x=beforeX+(p.x-beforeX)*hit.time+hit.nx*(hit.push+.002);
        p.y=beforeY+(p.y-beforeY)*hit.time+hit.ny*(hit.push+.002);
        p.z=beforeZ+(p.z-beforeZ)*hit.time+hit.nz*(hit.push+.002);
        const incoming=p.vx*hit.nx+p.vy*hit.ny+p.vz*hit.nz;
        if(incoming<0){
          p.vx-=incoming*hit.nx*1.08;p.vy-=incoming*hit.ny*1.08;p.vz-=incoming*hit.nz*1.08;
          const wrap=Math.min(1.5,-incoming*.35)*p.side;
          p.vx+=hit.nz*wrap;p.vz-=hit.nx*wrap;
          p.heatRetention*=.85;obstacleHits++;
        }
        p.wallNx=hit.nx;p.wallNy=hit.ny;p.wallNz=hit.nz;p.wallD=-hit.nx*p.x-hit.ny*p.y-hit.nz*p.z;p.wallAge=0;
      }
      const surface=plumeSurface(level,p.x,p.z),margin=.025;
      if(p.y<surface.y+margin){
        p.y=surface.y+margin;
        const incoming=p.vx*surface.nx+p.vy*surface.ny;
        if(incoming<0){
          // Impingement turns the jet into a wall flow, with only a small upward rebound.
          const rebound=Math.min(p.water?.5:.32,-incoming*.035);
          p.vx-=incoming*surface.nx;p.vy-=incoming*surface.ny;
          p.vx+=rebound*surface.nx;p.vy+=rebound*surface.ny;
          if(!p.impacted){
            const spread=Math.min(5.5,Math.abs(incoming)*.42),across=Math.cos(p.radialAngle),depth=Math.sin(p.radialAngle);
            p.vx+=surface.ny*spread*across;p.vy-=surface.nx*spread*across;p.vz+=spread*depth;
          }
        }
        if(!p.impacted){
          p.impactAge=0;
          p.impactHeat=p.heat;
          if(!p.water)p.lifetime=p.age+6+random()*2;
        }
        p.impacted=true;
      }
      if(p.water){
        p.width=p.height=Math.min(.45,.1+p.age*.12);p.rotation=0;
        p.opacity=plumeOpacity(p.age,p.lifetime)*.65;p.heat=0;
      }else if(p.impacted){
        p.impactAge+=h;
        p.width=Math.min(1.7,.2+p.impactAge*.65);
        p.height=Math.min(.62,.13+p.impactAge*.18);
        p.rotation=Math.atan2(-surface.nx,surface.ny);
        const lift=Math.min(.12,p.height*.18),target=surface.y+lift;
        // Once redirected, the smoke rolls along the contour instead of hovering above it.
        p.y+=(target-p.y)*(1-Math.exp(-h*7));
        // Keep the rolling parcel touching the surface when it spills off a raised pad.
        p.y=clamp(p.y,surface.y+margin,surface.y+Math.min(.16,p.height*.4));
        const dilution=Math.sqrt(.2*.13/(p.width*p.height));
        const remaining=p.lifetime-p.age+p.impactAge;
        p.opacity=plumeOpacity(p.impactAge,remaining)*dilution*(.7+.3*p.throttle);
        p.heat=p.impactHeat*Math.exp(-p.impactAge/.13);p.hotLength=p.height;
      }else{
        p.width=.11+p.age*(.24+p.expansion*.85);
        p.height=.28+p.age*(.32+p.expansion*.3);
        p.rotation=Math.atan2(p.vy,p.vx)-Math.PI/2;
        const dilution=Math.pow(.11*.28/(p.width*p.height),.7);
        p.opacity=plumeOpacity(p.age,p.lifetime)*dilution*(.35+.65*Math.sqrt(clamp(p.density,0,1)));
        p.heat=Math.max(0,1-p.age/.2)*p.heatRetention;
      }
      p.size=Math.max(p.width,p.height);
      p.nx=surface.nx;p.ny=surface.ny;p.plane=-surface.nx*p.x-surface.ny*surface.y;
    }
  }

  return {particles,emit,update,
    reset(){clocks.clear();cursor=0;obstacleHits=0;for(const p of particles){p.active=false;p.opacity=0;}},
    get obstacleHits(){return obstacleHits;},
    get count(){return particles.reduce((count,p)=>count+Number(p.active),0);},
  };
}
