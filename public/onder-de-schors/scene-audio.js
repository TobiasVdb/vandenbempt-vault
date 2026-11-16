// Overhead chop, low sweep, rising cut, thrust, and cross-body cut.
const swordSounds = [
  { length: 0.16, from: 2400, to: 630, level: 0.21, attack: 0.018 },
  { length: 0.21, from: 1650, to: 880, level: 0.16, attack: 0.032 },
  { length: 0.17, from: 780, to: 2500, level: 0.19, attack: 0.021 },
  { length: 0.065, from: 3700, to: 1530, level: 0.17, attack: 0.005 },
  { length: 0.13, from: 3000, to: 990, level: 0.20, attack: 0.010 },
];

export function makeSceneAudio() {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return { update() {}, swing() {}, swordHit() {}, arcadeHit() {}, scratch() {}, block() {} };

  let context;
  let output;
  let noise;
  let nextCreak = 0;
  const activation = new AbortController();

  async function startAmbience() {
    // Midnight field recording by sengjinn, CC0: https://freesound.org/s/175020/
    const response = await fetch(new URL('./assets/nachtkrekels.mp3', import.meta.url));
    if (!response.ok) return;
    const recording = await context.decodeAudioData(await response.arrayBuffer());
    const fade = Math.min(Math.round(recording.sampleRate * 0.8), Math.floor(recording.length / 4));
    const length = recording.length - fade;
    const loop = context.createBuffer(recording.numberOfChannels, length, recording.sampleRate);
    for (let channel = 0; channel < recording.numberOfChannels; channel++) {
      const original = recording.getChannelData(channel);
      const samples = loop.getChannelData(channel);
      samples.set(original.subarray(0, length));
      // Blend the tail into the start so each repeat reconnects to the same waveform.
      for (let i = 0; i < fade; i++) {
        const blend = i / fade;
        samples[i] = original[length + i] * (1 - blend) + original[i] * blend;
      }
    }
    const source = context.createBufferSource();
    source.buffer = loop;
    source.loop = true;
    const level = context.createGain();
    level.gain.value = 0.60;
    source.connect(level).connect(output);
    source.start();
  }

  async function unlock() {
    try {
      if (!context) {
        context = new Audio();
        output = context.createGain();
        output.gain.value = 0.28;
        output.connect(context.destination);
        noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        document.addEventListener('visibilitychange', () => {
          output.gain.setTargetAtTime(document.hidden ? 0 : 0.28, context.currentTime, 0.06);
        });
        void startAmbience().catch(error => console.warn('Nachtgeluid kon niet laden.', error));
      }
      await context.resume();
      if (context.state === 'running') activation.abort();
    } catch {
      // Audio is optional. The scene stays playable if the browser blocks it.
    }
  }
  window.addEventListener('pointerdown', unlock, { signal: activation.signal });
  window.addEventListener('keydown', unlock, { signal: activation.signal });

  function play(source, tail, when, length, level, attack = 0.012) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(level, when + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
    tail.connect(envelope).connect(output);
    source.stop(when + length);
  }

  function grit(when, length, from, to, level, attack) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.85;
    filter.frequency.setValueAtTime(from, when);
    filter.frequency.exponentialRampToValueAtTime(to, when + length);
    source.connect(filter);
    source.start(when, Math.random() * 0.55);
    play(source, filter, when, length, level, attack);
  }

  return {
    block() {
      if (context?.state !== 'running' || document.hidden) return;
      const now = context.currentTime;
      grit(now, 0.07, 3800, 1200, 0.15, 0.002);
      for (const [frequency, length, volume] of [[790, 0.20, 0.085], [1243, 0.14, 0.055], [2200, 0.09, 0.030]]) {
        const tone = context.createOscillator();
        tone.frequency.value = frequency;
        tone.start(now);
        play(tone, tone, now, length, volume, 0.002);
      }
    },
    scratch() {
      if (context?.state !== 'running' || document.hidden) return;
      grit(context.currentTime, 0.125, 2680, 510, 0.22, 0.005);
    },
    arcadeHit(killed) {
      if (context?.state !== 'running' || document.hidden) return;
      const now = context.currentTime;
      const tone = context.createOscillator();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(killed ? 460 : 655, now);
      tone.frequency.setValueAtTime(killed ? 310 : 440, now + 0.036);
      if (killed) tone.frequency.setValueAtTime(195, now + 0.071);
      tone.start(now);
      play(tone, tone, now, killed ? 0.15 : 0.085, 0.105, 0.004);
    },
    swing(attack) {
      if (context?.state !== 'running' || document.hidden) return;
      const sound = swordSounds[attack];
      grit(context.currentTime, sound.length, sound.from, sound.to, sound.level, sound.attack);
    },
    swordHit(attack) {
      if (context?.state !== 'running' || document.hidden) return;
      const now = context.currentTime;
      const sound = swordSounds[attack];
      grit(now, 0.052, sound.from * 0.59, 420, 0.23, 0.003);
      grit(now + 0.008, 0.078, 640, sound.to * 0.32, 0.12, 0.005);
    },
    update(step, landed) {
      if (context?.state !== 'running' || document.hidden) return;
      const now = context.currentTime + 0.015;
      if (step || landed) {
        const pitch = 0.88 + Math.random() * 0.24;
        grit(now, 0.062, 930 * pitch, 510 * pitch, landed ? 0.079 : 0.042);
        grit(now + 0.009, 0.044, 1800 * pitch, 880 * pitch, landed ? 0.031 : 0.020);
      }
      nextCreak ||= now + 5;
      if (now >= nextCreak) {
        grit(now, 0.31, 470, 205, 0.04);
        grit(now + 0.15, 0.21, 620, 340, 0.022);
        nextCreak = now + 8 + Math.random() * 13;
      }
    },
  };
}
