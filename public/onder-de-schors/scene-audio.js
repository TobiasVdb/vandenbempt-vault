export function makeSceneAudio() {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return { update() {} };

  let context;
  let output;
  let noise;
  let nextBird = 0;
  let nextCreak = 0;
  const activation = new AbortController();

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
      }
      await context.resume();
      if (context.state === 'running') activation.abort();
    } catch {
      // Audio is optional. The scene stays playable if the browser blocks it.
    }
  }
  window.addEventListener('pointerup', unlock, { signal: activation.signal });
  window.addEventListener('keydown', unlock, { signal: activation.signal });

  function play(source, tail, when, length, level, attack = 0.012) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(level, when + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
    tail.connect(envelope).connect(output);
    source.stop(when + length);
  }

  function grit(when, length, low, high, level) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.85;
    filter.frequency.setValueAtTime(low, when);
    filter.frequency.exponentialRampToValueAtTime(high, when + length);
    source.connect(filter);
    source.start(when, Math.random() * 0.55);
    play(source, filter, when, length, level);
  }

  function tone(when, length, from, to, level, attack) {
    const source = context.createOscillator();
    source.frequency.setValueAtTime(from, when);
    source.frequency.exponentialRampToValueAtTime(to, when + length);
    source.start(when);
    play(source, source, when, length, level, attack);
  }

  return {
    update(step, landed) {
      if (context?.state !== 'running' || document.hidden) return;
      const now = context.currentTime + 0.015;
      if (step || landed) {
        const pitch = 0.88 + Math.random() * 0.24;
        grit(now, 0.12, 460 * pitch, 190 * pitch, landed ? 0.23 : 0.15);
        grit(now + 0.014, 0.085, 1720 * pitch, 700 * pitch, 0.054);
        tone(now, 0.073, 106 * pitch, 54 * pitch, landed ? 0.16 : 0.10, 0.007);
      }
      nextBird ||= now + 2.5;
      nextCreak ||= now + 5;
      if (now >= nextBird) {
        const pitch = 0.8 + Math.random() * 0.35;
        tone(now, 0.16, 1380 * pitch, 2100 * pitch, 0.022, 0.04);
        tone(now + 0.19, 0.21, 2000 * pitch, 1460 * pitch, 0.017, 0.025);
        nextBird = now + 11 + Math.random() * 16;
      }
      if (now >= nextCreak) {
        grit(now, 0.31, 470, 205, 0.04);
        grit(now + 0.15, 0.21, 620, 340, 0.022);
        tone(now, 0.30, 207, 130, 0.011, 0.08);
        nextCreak = now + 8 + Math.random() * 13;
      }
    },
  };
}
