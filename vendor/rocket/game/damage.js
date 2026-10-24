const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function createDamageState(){return {hull:100,engine:100,left:100,right:100,nose:100,legLeft:100,legRight:100,revision:0,lastHit:null};}

export function breakLandingLeg(state,side,point){
  const zone=side===0?'legLeft':'legRight';if(state.damage[zone]===0)return;
  state.damage[zone]=0;state.damage.revision++;state.damage.lastHit={x:point[0],y:point[1],amount:20,zone};
}

/** Damage belongs to this attempt, never to the saved ship or its upgrades. */
export function applyDamage(state,amount,point={x:0,y:0},reason='Hull integrity depleted.'){
  if(!['ready','flying'].includes(state.status)||amount<=0)return 0;
  const damage=state.damage,loss=Math.min(damage.hull,amount);
  const zone=point.y<-.5?'engine':point.y>.35?'nose':point.x<0?'left':'right';
  damage.hull=clamp(damage.hull-loss,0,100);damage[zone]=clamp(damage[zone]-loss*1.6,0,100);
  damage.revision++;damage.lastHit={x:point.x,y:point.y,amount:loss,zone};
  if(state.ride)state.ride.impacts++;
  if(damage.hull===0){damage.engine=0;state.status='crashed';state.thrust=0;state.rcsTurn=0;state.reason=reason;}
  return loss;
}

export function applyImpact(state,closingSpeed,worldPoint,reason){
  const dx=worldPoint.x-state.x,dy=worldPoint.y-state.y,c=Math.cos(state.angle),s=Math.sin(state.angle);
  return applyDamage(state,Math.max(0,closingSpeed-2.2)**2*3,{x:dx*c+dy*s,y:-dx*s+dy*c},reason);
}

export function destroyShip(state,reason){
  applyDamage(state,100,{x:0,y:-.7},reason);
}

export function damageReadout(damage){
  if(damage.hull===0)return 'Spacecraft destroyed';
  if(damage.legLeft===0||damage.legRight===0)return damage.legLeft===0&&damage.legRight===0?'Both landing legs broken':'Landing leg lost';
  if(damage.engine===0)return 'Engine disabled';
  if(damage.left===0||damage.right===0)return 'Steering thruster disabled';
  if(damage.hull<30)return 'Hull critical';
  if(damage.nose<100&&damage.engine===100&&damage.left===100&&damage.right===100)return `Nose structure ${Math.ceil(damage.nose)}%`;
  if(damage.hull<100)return `Engine ${Math.ceil(damage.engine)}% · Steering ${Math.ceil(Math.min(damage.left,damage.right))}%`;
  return 'Hull intact';
}
