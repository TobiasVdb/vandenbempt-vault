import * as THREE from './vendor/three/three.module.js';

const cellSize = 384;
const originalCellSize = 256;

function slashPose(progress) {
  if (progress < 0.28) return 0;
  if (progress < 0.43) return 1;
  if (progress < 0.62) return 2;
  return 3;
}

export function makeSlashTrail() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cellSize;
  const brush = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false,
  }));
  trail.position.z = 0.01;
  trail.visible = false;

  // Points follow the blade tips in atlas frames 18–20, in sprite cell pixels.
  const arc = new THREE.CurvePath();
  const impact = new THREE.Vector2(358, 149);
  arc.add(new THREE.CubicBezierCurve(
    new THREE.Vector2(169, 39), new THREE.Vector2(252, 15), new THREE.Vector2(348, 78), impact,
  ));
  arc.add(new THREE.CubicBezierCurve(
    impact, new THREE.Vector2(364, 188), new THREE.Vector2(366, 246), new THREE.Vector2(352, 286),
  ));
  const reachAtImpact = arc.curves[0].getLength() / arc.getLength();
  const points = Array.from({ length: 25 }, () => new THREE.Vector2());

  return {
    trail,
    update(action, progress) {
      trail.visible = action === 'slash' && progress >= 0.43 && progress < 0.91;
      if (!trail.visible) return;

      const impactPose = slashPose(progress) === 2;
      const end = impactPose ? reachAtImpact : 1;
      const fade = THREE.MathUtils.smoothstep(progress, 0.62, 0.91);
      const start = impactPose ? 0.03 : 0.22 + fade * 0.48;
      points.forEach((point, i) => arc.getPoint(THREE.MathUtils.lerp(start, end, i / 24), point));

      brush.clearRect(0, 0, cellSize, cellSize);
      brush.beginPath();
      brush.moveTo(points[0].x, points[0].y);
      for (const point of points) brush.lineTo(point.x, point.y);
      for (let i = 24; i >= 0; i--) {
        const { x, y } = points[i];
        const inset = Math.sin(Math.PI * i / 24) * 0.064;
        brush.lineTo(THREE.MathUtils.lerp(x, 213, inset), THREE.MathUtils.lerp(y, 165, inset));
      }
      brush.closePath();
      const gradient = brush.createLinearGradient(points[0].x, points[0].y, points[24].x, points[24].y);
      gradient.addColorStop(0, 'rgba(212, 225, 215, 0)');
      gradient.addColorStop(0.64, 'rgba(226, 237, 229, 0.58)');
      gradient.addColorStop(1, '#fff6dc');
      brush.fillStyle = gradient;
      brush.fill();
      trail.material.opacity = 1 - fade;
      texture.needsUpdate = true;
    },
  };
}

export async function loadBellmakerSprites(loader) {
  const atlas = await loader.loadAsync('./assets/klokkenmaker-animaties.webp');
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.magFilter = THREE.NearestFilter;
  atlas.minFilter = THREE.NearestFilter;
  atlas.generateMipmaps = false;
  const size = cellSize;
  const columns = 4;
  const rows = 6;
  const frames = Array.from({ length: 21 }, (_, i) => {
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
    scale: size / originalCellSize,
    baseline: (19 + (size - originalCellSize) / 2) / size,
    cycle: 0.59,
    frame(action, moving, phase, progress) {
      switch (action) {
        case 'run': return frameAt([0, 1, 2, 3], phase);
        case 'jump': return frames[1];
        case 'armed-jump': return frames[7];
        case 'turn': return frameAt([8, 9], progress);
        case 'draw': return frameAt([4, 5, 6], progress);
        case 'ready': return moving ? frameAt([6, 7], phase) : frames[10];
        case 'slash': return frames[17 + slashPose(progress)];
        case 'recover': return frameAt([20, 13, 10], progress);
        case 'sheathe': return frameAt([6, 5, 4], progress);
        case 'punch': return frameAt([14, 15, 14], progress);
        default: return frames[16];
      }
    },
  };
}

