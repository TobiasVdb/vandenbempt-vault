const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** The same planar floor and landing-pad tops used by the flight simulation. */
export function plumeSurface(level,x,z=0,result={}){
  const floor=level.floor;
  if(!floor.length){result.y=-Infinity;result.nx=0;result.ny=1;return result;}
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
  result.y=y;result.nx=nx;result.ny=ny;return result;
}

/** Sweep a parcel through oriented structural boxes, returning the first contacted face. */
function obstacleHit(x,y,z,toX,toY,toZ,obstacles){
  if(!obstacles.length)return null;
  let nearest=null,first=Infinity;
  const dx=toX-x,dy=toY-y,dz=toZ-z,travel=Math.hypot(dx,dy,dz)+.025;
  for(const box of obstacles){
    const sx=x-box.x,sy=y-box.y,sz=z-box.z;
    const reach=box.radius+travel;
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
      if(near>far){const swap=near;near=far;far=swap;}
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

const padBoxes=new WeakMap();
export function plumeJetReach(source,level,length){
  const dx=Math.sin(source.angle),dy=-Math.cos(source.angle),z=source.z??.4;
  if(!padBoxes.has(level))padBoxes.set(level,level.pads.map(pad=>{
    const half=[pad.width/2,.19,(pad.depth??(pad.radius!==undefined?pad.radius*2:2.5))/2];
    return {x:pad.x,y:pad.y-.19,z:pad.z||0,half,axes:[1,0,0,0,1,0,0,0,1],radius:Math.hypot(...half)};
  }));
  const hit=obstacleHit(source.x,source.y,z,source.x+dx*length,source.y+dy*length,z,[...(level.obstacles||[]),...padBoxes.get(level)]);
  let reach=hit?Math.max(0,length*hit.time):length,wall=[0,0,0,1],plane=[0,0,1],previous=Infinity;
  if(hit)wall=[hit.nx,hit.ny,hit.nz,-hit.nx*(source.x+dx*reach)-hit.ny*(source.y+dy*reach)-hit.nz*z];
  const steps=Math.max(1,Math.ceil(reach/.04));
  for(let i=0;i<=steps;i++){
    const distance=reach*i/steps,x=source.x+dx*distance,y=source.y+dy*distance,surface=plumeSurface(level,x,z);
    const clearance=y-surface.y-.01;
    if(clearance<0){
      const before=reach*Math.max(0,i-1)/steps;
      reach=i===0?0:before+(distance-before)*previous/(previous-clearance);
      plane=[surface.nx,surface.ny,-surface.nx*x-surface.ny*surface.y];break;
    }
    previous=clearance;
  }
  return {length:reach,plane,wall};
}

export function plumeOpacity(age,lifetime){
  const t=clamp((age/lifetime-.35)/.65,0,1),fade=1-t*t*(3-2*t);
  return .23*Math.min(1,age/.06)*fade;
}

export function createPlumePool({capacity=1200,random=Math.random}={}){
  const particles=Array.from({length:capacity},()=>({active:false}));
  const clocks=new Map(),fires=new Map(),surfaceScratch={};let cursor=0,obstacleHits=0;

  function spawn(source,level,delay,interval,effectiveRate){
    const p=particles[cursor++%capacity],side=cursor%2?1:-1;
    const water=level.theme==='water',density=source.density??1;
    const throttle=clamp(source.throttle??1,0,1),expansion=1-Math.sqrt(clamp(density,0,1));
    const speed=(water?3:source.fire?1.5+random()*2:11+random()*3)*(.8+.2*Math.sqrt(throttle));
    Object.assign(p,{active:true,x:source.x-(source.vx||0)*(interval-delay),y:source.y-(source.vy||0)*(interval-delay),z:source.z??.5,delay,
      vx:Math.sin(source.angle)*speed+(source.vx||0)+(random()-.5)*.3,
      vy:-Math.cos(source.angle)*speed+(source.vy||0)+(random()-.5)*.3,
      vz:(random()-.5)*(.15+expansion*.6),age:0,
      lifetime:water?4+random()*2:source.fire?4+random()*2:density>.1?6+random()*2:.8+random()*.3,
      size:.12,width:.12,height:.24,hotLength:Math.max(.32,speed/effectiveRate*2.6),rotation:-source.angle,opacity:0,heat:water?0:(source.fireHeat??1),fireHeat:source.fireHeat??1,
      water,fire:Boolean(source.fire),impacted:false,impactAge:0,impactHeat:0,side,radialAngle:cursor*2.39996323+random()*.2,seed:random()*100,
      density,expansion,throttle,wind:level.wind||0,nx:0,ny:1,plane:0,
      jetNx:Math.sin(source.angle),jetNy:-Math.cos(source.angle),jetD:-Math.sin(source.angle)*source.x+Math.cos(source.angle)*source.y,
      wallNx:0,wallNy:0,wallNz:0,wallD:1,wallAge:1,heatRetention:1});
  }

  function emit(id,source,seconds,level,rate=96){
    if(seconds<=0)return;
    const spacing=Math.min(4,Math.max(1,Math.hypot(source.vx||0,source.vy||0)/8));
    const previous=clocks.get(id)||0,effectiveRate=rate*clamp(source.throttle??1,0,1)*spacing;
    if(effectiveRate===0)return;
    let pending=previous+seconds*effectiveRate;
    // A stalled frame cannot generate an unbounded burst.
    const total=Math.floor(pending+1e-9),count=Math.min(capacity,total);pending=Math.max(0,pending-total);
    for(let i=0;i<count;i++)spawn(source,level,clamp((i+1-previous)/effectiveRate,0,seconds),seconds,effectiveRate);
    clocks.set(id,pending);
  }

  function ignite(id,state,level){
    if(level.theme==='water')return;
    const fuel=clamp(state.fuel||0,0,300),radius=.15+Math.sqrt(fuel)*.055;
    const source={x:state.x,y:state.y,z:.4,angle:Math.PI,vx:0,vy:0,density:level.theme==='space'?0:1,throttle:1,fire:true,fireHeat:fuel>0?1:.03};
    if(fuel>0){
      if(fires.size>=8)fires.delete(fires.keys().next().value);
      fires.set(id,{...source,left:Math.min(10,.04*fuel),radius,rate:12+Math.sqrt(fuel)*5});
    }
    const count=Math.min(capacity,Math.floor(4+fuel*.9));
    for(let i=0;i<count;i++){
      const angle=random()*Math.PI*2,spread=random()*radius;
      spawn({...source,x:source.x+Math.cos(angle)*spread,y:source.y+Math.sin(angle)*spread},level,0,0,96);
      const particle=particles[(cursor-1)%capacity];
      particle.vx=Math.cos(angle)*(1+random()*4);particle.vy=Math.sin(angle)*(1+random()*4)+2;
      particle.vz=(random()-.5)*2;particle.heat=fuel>0?1:.15;
      particle.jetNx=particle.jetNy=0;particle.jetD=1;
    }
  }

  function update(seconds,level,emitters=[]){
    if(seconds<=0)return;
    for(const [id,fire]of fires){
      const duration=Math.min(seconds,fire.left);fire.left-=duration;
      emit('fire:'+id,{...fire,x:fire.x+(random()-.5)*fire.radius,y:fire.y+(random()-.5)*fire.radius,fire:true},duration,level,fire.rate);
      if(fire.left<=0){fires.delete(id);clocks.delete('fire:'+id);}
    }
    const steps=Math.ceil(seconds*120),dt=seconds/steps,obstacles=level.obstacles||[];
    for(let step=0;step<steps;step++)for(const p of particles){
      if(!p.active)continue;
      const h=Math.max(0,dt-p.delay);p.delay=Math.max(0,p.delay-dt);if(h===0)continue;
      p.age+=h;
      if(p.age>=p.lifetime){p.active=false;p.opacity=0;continue;}
      const grounded=p.impacted&&!p.water;
      const cooled=!p.water&&!p.fire&&p.age>.25;
      const drag=p.water?.8:grounded?.55:(cooled?2.4:.38)*p.density;
      if(cooled&&!grounded){
        p.vx+=Math.sin(p.y*1.7+p.age*2.1+p.seed)*.35*p.density*h;
        p.vz+=Math.cos(p.x*1.3+p.age*1.7+p.seed)*.2*p.density*h;
      }
      p.vx+=(p.wind*.65-p.vx)*drag*h;
      p.vz*=Math.exp(-drag*h);
      p.vy+=(p.water?2.2:grounded?.08:p.fire?1.8*p.density:.3*p.density)*h;
      p.vy*=Math.exp(-(grounded?3:p.water?.5:(cooled?2.4:.2)*p.density)*h);
      // Every firing engine acts on every parcel, including an opponent's old trail.
      if(p.age>.12)for(const source of emitters){
        if(!source.firing)continue;
        const dx=Math.sin(source.angle),dy=-Math.cos(source.angle),x=p.x-source.x,y=p.y-source.y,z=p.z-(source.z??.4);
        const along=x*dx+y*dy;if(along<0||along>6)continue;
        const across=x*dy-y*dx,radius=.22+along*.24;
        const weight=Math.exp(-(across*across+z*z)/(radius*radius)*2)*(1-along/6);
        const power=clamp((source.power??16.67*(source.throttle??1))/16.67,0,3),force=weight*power*h;
        p.vx+=(dx*22+dy*across*7)*force;p.vy+=(dy*22-dx*across*7)*force;p.vz+=z*7*force;
        if(p.impacted&&p.vy>1)p.impacted=false;
      }
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
      const surface=plumeSurface(level,p.x,p.z,surfaceScratch),margin=.025;
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
      }else if(p.fire){
        p.width=.22+p.age*.5;p.height=.4+p.age*.65;p.rotation=0;
        p.opacity=plumeOpacity(p.age,p.lifetime)*.8;p.heat=p.fireHeat*Math.max(0,1-p.age/.9)**2;p.hotLength=p.height;
        p.jetNx=p.jetNy=0;p.jetD=1;
      }else{
        p.width=.11+p.age*(.36+p.expansion*.85);
        const cooling=clamp((p.age-.2)/.5,0,1),jetHeight=.28+p.age*(.32+p.expansion*.3);
        p.height=jetHeight+(p.width*1.15-jetHeight)*cooling;
        p.rotation=Math.atan2(p.vy,p.vx)-Math.PI/2;
        const dilution=Math.pow(.11*.28/(p.width*p.height),.4);
        p.opacity=plumeOpacity(p.age,p.lifetime)*dilution*(.35+.65*Math.sqrt(clamp(p.density,0,1)));
        p.heat=Math.max(0,1-p.age/.2)*p.heatRetention;
      }
      p.size=Math.max(p.width,p.height);
      p.nx=surface.nx;p.ny=surface.ny;p.plane=-surface.nx*p.x-surface.ny*surface.y;
    }
  }

  return {particles,emit,ignite,update,
    reset(){clocks.clear();fires.clear();cursor=0;obstacleHits=0;for(const p of particles){p.active=false;p.opacity=0;}},
    get fires(){return fires.size;},
    get obstacleHits(){return obstacleHits;},
    get count(){return particles.reduce((count,p)=>count+Number(p.active),0);},
  };
}
