import {createFlight,stepFlight,FIXED_STEP,flightDamping,environmentAt} from '../runtime/game/physics.js';

export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
export const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};

/** Cache a feedback-controlled landing, so scrolling can faithfully rewind every burn. */
export function createDescent(hull){
  const level={id:'introduction',theme:'moon',objective:'land',gravity:9.8,floor:[[-1000,0],[1000,0]],roof:[],pads:[{x:-9,y:.16,width:2.1,type:'launch'},{x:0,y:.16,width:2.1,type:'goal'}],spawn:{x:0,y:180}};
  const state=createFlight(level,hull,{rcs:1});state.status='flying';state.vy=-3;
  const rest=.16-Math.min(...hull.map(point=>point[1]))+.015,samples=[structuredClone(state)];let throttle=0;
  for(let i=0;i<6240;i++){
    const time=i*FIXED_STEP,env=environmentAt(state,level),damping=flightDamping(level,state.tuning);
    let x=2.8*smooth((time-1.2)/6);
    x+=-5.6*smooth((time-19)/6);x+=5.6*smooth((time-31)/6);x+=-2.8*smooth((time-39)/5);
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
export function storyFraming(progress,aspect){
  const p=clamp(progress),phone=aspect<1;
  let side=.72;
  side+=(.27-side)*smooth((p-.43)/.12);
  side+=(.73-side)*smooth((p-.68)/.12);
  side+=((phone?.4:.72)-side)*smooth((p-.82)/.12);
  return {screenX:side,screenY:phone?.2:.48,span:phone?7.2:5.8+smooth((p-.05)/.2)*.7,entry:1-smooth(p/.022),yaw:-.32+Math.sin(p*Math.PI*2)*.28};
}
