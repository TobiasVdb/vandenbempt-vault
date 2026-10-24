/** Retain a short tap until physics has consumed it, even between rendered frames. */
export function createControls(){
  const held=new Map(),pulses={thrust:0,left:0,right:0,up:0,down:0,strafeLeft:0,strafeRight:0};
  function active(control,heldOnly){return (!heldOnly&&pulses[control]>0)||[...held.values()].includes(control);}
  function read(translation,heldOnly){const on=control=>active(control,heldOnly);return {thrust:on('thrust'),turn:Number(on('left'))-Number(on('right')),...(translation?{translateX:Number(on('strafeRight'))-Number(on('strafeLeft')),translateY:Number(on('up')||on('thrust'))-Number(on('down'))}:{})};}
  return {
    press(source,control){if(!(control in pulses))return;held.set(source,control);pulses[control]=.09;},
    release(source){held.delete(source);},
    read(translation=false){return read(translation,false);},
    readHeld(translation=false){return read(translation,true);},
    advance(dt){for(const name of Object.keys(pulses))pulses[name]=Math.max(0,pulses[name]-dt);},
    clear(){held.clear();for(const name of Object.keys(pulses))pulses[name]=0;},
  };
}

export const translationKeys={KeyW:'up',ArrowUp:'up',Space:'up',KeyS:'down',ArrowDown:'down',KeyA:'strafeLeft',ArrowLeft:'strafeLeft',KeyD:'strafeRight',ArrowRight:'strafeRight',KeyQ:'left',KeyE:'right'};
export const hasFlightInput=input=>Boolean(input.thrust||input.translateX||input.translateY||input.turn);

/** A repeated heartbeat keeps its identity; a changed control gets a newer command. */
export function createInputCommands(){
  let sequence=0,last=null,sent=null;const pending=[];
  return {
    acknowledge(value){if(Number.isSafeInteger(value)&&value>sequence){sequence=value;last=null;pending.length=0;}},
    next(input){
      const command={thrust:input.thrust,turn:input.turn,translateX:input.translateX||0,translateY:input.translateY||0};
      const changed=!last||Object.keys(command).some(key=>command[key]!==last[key]);
      if(changed){sequence++;last=command;if(pending[0]?.inputSequence===sent)pending.shift();}
      const value={...command,inputSequence:sequence};
      if(changed||!pending.length)pending.push(value);
      // Preserve the latest press/release pair without replaying a stale input backlog.
      if(pending.length>2)pending.splice(0,pending.length-2);
      return value;
    },
    take(){const value=pending.shift();if(value)sent=value.inputSequence;return value;},
    clear(){pending.length=0;last=null;},
    get pending(){return pending.length;},
  };
}
