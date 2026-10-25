import {createFlight,stepFlight,FIXED_STEP,flightDamping,environmentAt} from '../runtime/game/physics.js';

export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
export const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};

/** Scroll response uses wall time, independently of capped particle/animation steps. */
export const advanceStory=(current,target,seconds)=>current+(target-current)*(1-Math.exp(-Math.max(0,seconds)*6));

/** Scroll wakes the scene gently; idle keeps vapor moving in very slow motion. */
export function createScrollPlayback(){
  let progress=0,rate=.015,lastTarget=0,quiet=Infinity;
  return {update(target,seconds,{paused=false}={}){
    const dt=Math.max(0,seconds);target=clamp(target);
    quiet=Math.abs(target-lastTarget)>1e-6?0:quiet+dt;lastTarget=target;
    if(paused){progress=target;return {progress,rate,seconds:0};}
    const active=quiet<.14,desired=active?1:.015,tau=active?.32:.24,blend=Math.exp(-dt/tau);
    const elapsed=desired*dt+(rate-desired)*tau*(1-blend);
    rate=desired+(rate-desired)*blend;progress=advanceStory(progress,target,elapsed);
    if(Math.abs(target-progress)<1e-7)progress=target;
    return {progress,rate,seconds:elapsed};
  }};
}

/** A passage opens a widening gap, then the displaced mist gradually recovers. */
export function cloudWake(time,crossing){
  const age=time-crossing;
  return {age:Math.max(0,age),strength:smooth((age+.6)/.6)*(1-smooth(age/9)),radius:.6+Math.max(0,Math.min(age,9))*.18};
}

/** Cache a feedback-controlled landing, so scrolling can faithfully rewind every burn. */
export function createDescent(hull){
  const level={id:'introduction',theme:'moon',objective:'land',gravity:9.8,floor:[[-1000,0],[1000,0]],roof:[],pads:[{x:-9,y:.16,width:2.1,type:'launch'},{x:0,y:.16,width:2.1,type:'goal'}],spawn:{x:0,y:180}};
  const state=createFlight(level,hull,{rcs:1});state.status='flying';state.vy=-3;state.x=2.8;
  const rest=.16-Math.min(...hull.map(point=>point[1]))+.015,samples=[structuredClone(state)];let throttle=0;
  for(let i=0;i<6240;i++){
    const time=i*FIXED_STEP,env=environmentAt(state,level),damping=flightDamping(level,state.tuning);
    let x=2.8;
    x+=-5.6*smooth((time-12)/5.5);x+=5.6*smooth((time-24)/5.5);x+=-2.8*smooth((time-39)/5);
    const y=Math.max(rest-.04,154-Math.max(0,time-3)*3.6),vx=clamp((x-state.x)*.6,-1.3,1.3);
    const ax=clamp((vx-state.vx)*1.2,-1.5,1.5)+state.vx*(damping.horizontal+env.drag);
    const ay=clamp((y-state.y)*1.2-state.vy*1.8,-7,7)+env.downward+state.vy*env.verticalDrag;
    const angle=Math.atan2(-ax,Math.max(.1,ay)),error=Math.atan2(Math.sin(angle-state.angle),Math.cos(angle-state.angle));
    const duty=time<1.2||state.status==='landed'?0:clamp(Math.hypot(ax,ay)/state.tuning.thrust);
    throttle+=clamp(duty-throttle,-3*FIXED_STEP,2.2*FIXED_STEP);
    stepFlight(state,{thrust:throttle>0,throttle,turn:time<1.2?0:clamp(error*5-state.omega*2.5,-1,1)},level,hull,FIXED_STEP,[]);
    samples.push(structuredClone(state));
  }
  return {level,duration:52,sample(progress){
    const frame=clamp(progress)*(samples.length-1),index=Math.min(samples.length-2,Math.floor(frame)),t=frame-index,a=samples[index],b=samples[index+1];
    return {...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,vx:a.vx+(b.vx-a.vx)*t,vy:a.vy+(b.vy-a.vy)*t,angle:a.angle+(b.angle-a.angle)*t,thrust:a.thrust+(b.thrust-a.thrust)*t};
  }};
}

/** Content alternates around the ship; the model's flight remains untouched. */
export function storyFraming(progress,aspect,lateralX=2.8){
  const p=clamp(progress),phone=aspect<1;
  // Composition follows the actual inertial traverse, including its bank and braking.
  const side=.5+clamp(lateralX/2.8,-1.15,1.15)*.24;
  return {screenX:side,screenY:phone?.18:.42+smooth(p/.15)*.1,span:phone?8.2:6.5+smooth((p-.05)/.2)*.35,entry:1-smooth(p/.022),yaw:-.16+Math.sin(p*Math.PI*2)*.1};
}

/** The scene leaves its fixed viewport at the same document edge as the signup section. */
export function landingDock(scroll,landingStart,landingLength){
  return Math.min(0,landingStart+landingLength-scroll);
}

/** Cover crop stays inside the artwork; the ridges rise gently as altitude falls. */
export function landscapeFraming(progress,aspect,imageAspect){
  const x=Math.min(1,aspect/imageAspect)*.91,y=Math.min(1,imageAspect/aspect)*.91;
  return {x,y,offsetX:(1-x)*.58,offsetY:(1-y)*.33*(1-smooth(progress))};
}
