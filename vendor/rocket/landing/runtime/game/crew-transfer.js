const clamp=value=>value>=1-1e-9?1:Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
export const CREW_COUNT=3;
export const BOARDING_DURATION=8.4;
export const DISEMBARK_DURATION=9.2;
export const ARRIVAL_DURATION=DISEMBARK_DURATION+1.3;

/** One shared, deterministic timetable for crew boarding and disembarking. */
export function crewTransfer(time,{boarding=false,rising=false}={}){
  const rise=rising?1.3:0,t=Math.max(0,time-rise),stagger=.25,walk=2,lift=1.1,exit=4;
  const riseAmount=rising?smooth(time/rise):1;
  let elevator=0,bridge=1,door=0,phase,people=[];
  if(boarding){
    const liftAt=exit+stagger*(CREW_COUNT-1),crossAt=liftAt+lift;
    elevator=smooth((t-liftAt)/lift);door=smooth((t-crossAt+.25)/.25)*(1-smooth((t-(crossAt+walk+stagger*(CREW_COUNT-1)))/.3));
    phase=t<liftAt?'Crew walking to lift':t<crossAt?'Crew taking lift':t<BOARDING_DURATION?'Crew boarding':'Crew aboard';
    people=Array.from({length:CREW_COUNT},(_,index)=>{
      const walkIn=clamp((t-index*stagger)/exit),cross=clamp((t-crossAt-index*stagger)/walk);
      return {visible:cross<1,path:cross>0?'bridge':'ground',progress:cross>0?cross:1-walkIn,elevator,walking:cross>0?cross<1:walkIn<1,index};
    });
  }else{
    const crossAt=.8+.3,liftAt=crossAt+walk+stagger*(CREW_COUNT-1),exitAt=liftAt+lift;
    bridge=smooth(t/.8);door=smooth((t-.8)/.3);
    elevator=1-smooth((t-liftAt)/lift);
    phase=time<rise?'Tower rising':t<.8?'Walkway connecting':t<liftAt?'Crew disembarking':t<exitAt?'Crew descending':'Crew leaving pad';
    people=Array.from({length:CREW_COUNT},(_,index)=>{
      const cross=clamp((t-crossAt-index*stagger)/walk),out=clamp((t-exitAt-index*stagger)/exit);
      return {visible:t>=crossAt+index*stagger&&out<1,path:cross<1?'bridge':'ground',progress:cross<1?1-cross:out,elevator,walking:cross<1||out>0,index};
    });
  }
  const duration=boarding?BOARDING_DURATION:DISEMBARK_DURATION+rise;
  return {phase,people,elevator,bridge,door,rise:riseAmount,complete:time+1e-9>=duration,duration};
}
