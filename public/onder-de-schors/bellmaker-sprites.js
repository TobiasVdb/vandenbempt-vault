import * as THREE from './vendor/three/three.module.js';

export async function loadBellmakerSprites(loader) {
  const atlas = await loader.loadAsync('./assets/klokkenmaker-animaties.webp');
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.magFilter = THREE.NearestFilter;
  atlas.minFilter = THREE.NearestFilter;
  atlas.generateMipmaps = false;
  const size = 256;
  const columns = 4;
  const rows = 5;
  const frames = Array.from({ length: 17 }, (_, i) => {
    const frame = atlas.clone();
    frame.repeat.set((size - 1) / (columns * size), (size - 1) / (rows * size));
    frame.offset.set(((i % columns) * size + 0.5) / (columns * size),
      1 - ((Math.floor(i / columns) + 1) * size - 0.5) / (rows * size));
    frame.needsUpdate = true;
    return frame;
  });

  const frameAt = (indices, progress) => frames[indices[Math.min(indices.length - 1, Math.floor(progress * indices.length))]];

  return {
    aspect: 1,
    baseline: 19 / size,
    cycle: 0.59,
    frame(action, moving, phase, progress) {
      switch (action) {
        case 'run': return frameAt([0, 1, 2, 3], phase);
        case 'turn': return frameAt([8, 9], progress);
        case 'draw': return frameAt([4, 5, 6], progress);
        case 'ready': return moving ? frameAt([6, 7], phase) : frames[10];
        case 'slash': return frameAt([11, 11, 12, 13], progress);
        case 'recover': return frames[13];
        case 'sheathe': return frameAt([6, 5, 4], progress);
        case 'punch': return frameAt([14, 15, 14], progress);
        default: return frames[16];
      }
    },
  };
}

