export const createRideState=()=>({peakG:0,roughSeconds:0,impacts:0});

export function recordRide(state,ax,ay,dt){
  const ride=state.ride??(state.ride=createRideState()),g=Math.hypot(ax,ay)/9.8;
  ride.peakG=Math.max(ride.peakG,g);if(g>2)ride.roughSeconds+=dt;
}

export function recordLandingShock(state,speed){
  const ride=state.ride??(state.ride=createRideState());
  ride.peakG=Math.max(ride.peakG,speed*speed/(2*.16*9.8));
}

export function crewReactions(ride={}){
  if(ride.peakG>=4)return ['🤢','@#$!','🤮'];
  if(ride.roughSeconds>.4||ride.impacts>0)return ['Damn!','😠','🤢'];
  return ['☺','🙂','☺'];
}
