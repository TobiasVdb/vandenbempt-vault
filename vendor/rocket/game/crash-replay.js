/** Count visible crash playback once; navigation and manual restarts cancel it. */
export function createCrashReplay(duration=2){
  let remaining=null;
  return {
    start(){remaining=duration;},
    cancel(){remaining=null;},
    update(seconds){if(remaining!==null)remaining=Math.max(0,remaining-Math.max(0,seconds));return remaining;},
    consume(){if(remaining!==0)return false;remaining=null;return true;},
    get active(){return remaining!==null;},
  };
}
