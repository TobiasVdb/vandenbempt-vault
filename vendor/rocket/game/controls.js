/** Retain a short tap until physics has consumed it, even between rendered frames. */
export function createControls(){
  const held=new Map(),pulses={thrust:0,left:0,right:0};
  function active(control){return pulses[control]>0||[...held.values()].includes(control);}
  return {
    press(source,control){if(!(control in pulses))return;held.set(source,control);pulses[control]=.09;},
    release(source){held.delete(source);},
    read(){return {thrust:active('thrust'),turn:Number(active('left'))-Number(active('right'))};},
    advance(dt){for(const name of Object.keys(pulses))pulses[name]=Math.max(0,pulses[name]-dt);},
    clear(){held.clear();for(const name of Object.keys(pulses))pulses[name]=0;},
  };
}
