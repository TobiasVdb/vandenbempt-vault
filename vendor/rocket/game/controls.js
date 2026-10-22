/** Retain a short tap until physics has consumed it, even between rendered frames. */
export function createControls(){
  const held=new Map(),pulses={thrust:0,left:0,right:0,up:0,down:0,strafeLeft:0,strafeRight:0};
  function active(control){return pulses[control]>0||[...held.values()].includes(control);}
  return {
    press(source,control){if(!(control in pulses))return;held.set(source,control);pulses[control]=.09;},
    release(source){held.delete(source);},
    read(translation=false){return {thrust:active('thrust'),turn:Number(active('left'))-Number(active('right')),...(translation?{translateX:Number(active('strafeRight'))-Number(active('strafeLeft')),translateY:Number(active('up')||active('thrust'))-Number(active('down'))}:{})};},
    advance(dt){for(const name of Object.keys(pulses))pulses[name]=Math.max(0,pulses[name]-dt);},
    clear(){held.clear();for(const name of Object.keys(pulses))pulses[name]=0;},
  };
}

export const translationKeys={KeyW:'up',ArrowUp:'up',Space:'up',KeyS:'down',ArrowDown:'down',KeyA:'strafeLeft',ArrowLeft:'strafeLeft',KeyD:'strafeRight',ArrowRight:'strafeRight',KeyQ:'left',KeyE:'right'};
export const hasFlightInput=input=>Boolean(input.thrust||input.translateX||input.translateY||input.turn);
