import * as THREE from './vendor/three/three.module.js';

const cellSize = 384;
const originalCellSize = 256;
const attacks = [
  [17, 18, 19, 20],
  [33, 65, 34, 34],
  [35, 66, 36, 36],
  [37, 67, 38, 38],
  [39, 68, 40, 40],
];

function slashPose(progress) {
  if (progress < 0.28) return 0;
  if (progress < 0.43) return 1;
  if (progress < 0.62) return 2;
  return 3;
}

function makeTrailPath(start, firstControl, mid, secondControl, end) {
  const point = ([x, y]) => new THREE.Vector2(x, y);
  const path = new THREE.CurvePath();
  path.add(new THREE.QuadraticBezierCurve(point(start), point(firstControl), point(mid)));
  path.add(new THREE.QuadraticBezierCurve(point(mid), point(secondControl), point(end)));
  return { path, midpoint: path.curves[0].getLength() / path.getLength() };
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

  // Each arc follows the blade tip through the corresponding atlas cells.
  const arcs = [
    makeTrailPath([169, 39], [322, 20], [358, 149], [371, 228], [352, 286]),
    makeTrailPath([113, 268], [153, 314], [219, 302], [301, 323], [349, 294]),
    makeTrailPath([73, 270], [291, 323], [358, 195], [389, 102], [332, 37]),
    makeTrailPath([256, 193], [303, 185], [351, 181], [363, 182], [369, 188]),
    makeTrailPath([112, 111], [203, 22], [321, 84], [373, 147], [316, 263]),
  ];
  const points = Array.from({ length: 25 }, () => new THREE.Vector2());

  return {
    trail,
    update(action, progress, attack = 0) {
      const overhead = attack === 0;
      trail.visible = action === 'slash' && progress >= (overhead ? 0.43 : 0.28) && progress < 0.91;
      if (!trail.visible) return;

      const { path, midpoint } = arcs[attack];
      const midSwing = slashPose(progress) === (overhead ? 2 : 1);
      const end = midSwing ? midpoint : 1;
      const fade = THREE.MathUtils.smoothstep(progress, 0.62, 0.91);
      const start = midSwing ? 0.03 : 0.22 + fade * 0.48;
      points.forEach((point, i) => path.getPoint(THREE.MathUtils.lerp(start, end, i / 24), point));

      brush.clearRect(0, 0, cellSize, cellSize);
      brush.beginPath();
      brush.moveTo(points[0].x, points[0].y);
      for (const point of points) brush.lineTo(point.x, point.y);
      for (let i = 24; i >= 0; i--) {
        const { x, y } = points[i];
        const inset = Math.sin(Math.PI * i / 24) * (attack === 3 ? 0.04 : 0.064);
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
  atlas.magFilter = THREE.LinearFilter;
  atlas.minFilter = THREE.LinearFilter;
  atlas.generateMipmaps = false;
  const size = cellSize;
  const columns = 8;
  const rows = 10;
  const frames = Array.from({ length: 73 }, (_, i) => {
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
    attackCount: attacks.length,
    frame(action, moving, phase, progress, attack = 0) {
      switch (action) {
        case 'run': return frameAt([0, 41, 1, 42, 2, 43, 3, 44], phase);
        case 'jump': return frameAt([21, 22, 23, 23, 22, 24], progress);
        case 'run-jump': return frameAt([25, 26, 27, 27, 26, 28], progress);
        case 'armed-jump': return frameAt([49, 50, 51, 51, 50, 52], progress);
        case 'armed-run-jump': return frameAt([53, 54, 55, 55, 54, 56], progress);
        case 'turn': return frameAt([8, 29, 30, 31, 32, 9], progress);
        case 'armed-turn': return frameAt([10, 69, 70, 71, 72, 10], progress);
        case 'draw': return frameAt([4, 57, 58, 5, 59, 60], progress);
        case 'ready': return moving ? frameAt([45, 6, 46, 47, 7, 48], phase) : frames[10];
        case 'slash': return frames[attacks[attack][slashPose(progress)]];
        case 'recover': return frameAt([attacks[attack][3], 13, 10], progress);
        case 'sheathe': return frameAt([60, 59, 5, 58, 57, 4], progress);
        case 'punch': return frameAt([61, 62, 63, 15, 64, 14], progress);
        default: return frames[16];
      }
    },
  };
}

