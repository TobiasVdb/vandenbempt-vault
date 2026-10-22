import * as THREE from 'three';

export const TRIGGER_GROUPS = Object.freeze({
  Engine_start: 'engine',
  Engine_stop: 'engine',
  Service_open: 'service',
  Service_close: 'service',
});

export const CLIP_LABELS = Object.freeze({
  Idle_loop: 'Idle loop',
  Engine_start: 'Engine start',
  Engine_stop: 'Engine stop',
  Service_open: 'Service open',
  Service_close: 'Service close',
});

/** Plays the embedded clips; the host explicitly owns autoplay and trigger policy. */
export function createFlightSystems(root, clips, { idleEnabled = true } = {}) {
  const mixer = new THREE.AnimationMixer(root);
  const byName = new Map(clips.map(clip => [clip.name, clip]));
  const held = new Map();
  let paused = false;
  const idle = byName.has('Idle_loop') ? mixer.clipAction(byName.get('Idle_loop')) : null;

  function setIdleEnabled(enabled) {
    idleEnabled = enabled;
    if (!idle) return;
    if (enabled) idle.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    else idle.stop();
    mixer.update(0);
  }

  function playTrigger(name) {
    const clip = byName.get(name);
    const group = TRIGGER_GROUPS[name];
    if (!clip || !group) throw new Error(`Unknown trigger clip: ${name}`);
    held.get(group)?.action.stop();
    const action = mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    held.set(group, { name, action });
    mixer.update(0);
  }

  function reset() {
    mixer.stopAllAction();
    held.clear();
    setIdleEnabled(idleEnabled);
  }

  setIdleEnabled(idleEnabled);
  return {
    names: [...byName.keys()],
    setIdleEnabled,
    setPaused(value) { paused = value; },
    playTrigger,
    reset,
    update(seconds) { if (!paused) mixer.update(seconds); },
    getStatus() {
      return {
        paused,
        idle: idleEnabled && Boolean(idle),
        triggers: [...held.values()].map(({ name, action }) => ({ name, complete: action.paused })),
      };
    },
  };
}
