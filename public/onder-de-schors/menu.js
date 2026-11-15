import * as THREE from './vendor/three/three.module.js';
import { loadBellmakerSprites, makeSlashTrail } from './bellmaker-sprites.js';
import { makeSceneAudio } from './scene-audio.js';

const host = document.querySelector('#scene');
const status = document.querySelector('#status');
const loadingScreen = document.querySelector('#loading-screen');
const controls = document.querySelector('#controls');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileLandscape = matchMedia('(orientation: landscape) and (any-pointer: coarse), (orientation: landscape) and (max-width: 1000px) and (max-height: 500px)');

const directions = new Map([
  ['z', [0, -1]], ['arrowup', [0, -1]],
  ['q', [-1, 0]], ['arrowleft', [-1, 0]],
  ['s', [0, 1]], ['arrowdown', [0, 1]],
  ['d', [1, 0]], ['arrowright', [1, 0]],
]);
const keys = new Set();
const touchDirections = new Map();
const activeDirections = new Set();
const heroPosition = new THREE.Vector2(0.68, 0.91);
const stepDirection = new THREE.Vector2();
const motion = new THREE.Vector2();
const plane = new THREE.PlaneGeometry(1, 1);
const routeSpacing = 0.78;
const routeScenes = ['bos', 'grasland-open', 'dorpsrand'];
const routeEnd = 1 + routeSpacing * routeScenes.length;
const sceneryParallax = 0.74;
const skyParallax = 0.48;
const closeForegroundParallax = 0.24;
let width, height, backgroundWidth, backgroundHeight, backgroundCenter;
let elapsed = 0;

function bindControls(weaponInput, jump) {
  let hitPress = null;
  const clearHitPress = () => {
    if (hitPress) clearTimeout(hitPress.timer);
    hitPress = null;
  };
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (key === 'j' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (!event.repeat) jump();
      return;
    }
    if ((key === 'f' || key === ' ') && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (key === ' ' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (!event.repeat) weaponInput(key);
      return;
    }
    if (!directions.has(key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    keys.add(key);
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  const clearInput = () => {
    keys.clear();
    touchDirections.clear();
    clearHitPress();
  };
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', clearInput);
  for (const button of controls.querySelectorAll('[data-direction]')) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      button.setPointerCapture(event.pointerId);
      touchDirections.set(event.pointerId, button.dataset.direction === 'left' ? '-1,0' : '1,0');
    });
    const release = event => touchDirections.delete(event.pointerId);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(event, release);
    }
  }
  const jumpButton = controls.querySelector('[data-action="jump"]');
  jumpButton.addEventListener('pointerdown', event => {
    if (event.button === 0) jump();
  });
  jumpButton.addEventListener('click', event => {
    if (event.detail === 0) jump();
  });

  const hitButton = controls.querySelector('[data-action="hit"]');
  hitButton.addEventListener('pointerdown', event => {
    if (event.button !== 0 || hitPress) return;
    hitButton.setPointerCapture(event.pointerId);
    hitPress = { pointerId: event.pointerId, held: false, timer: setTimeout(() => {
      hitPress.held = true;
      weaponInput('draw');
    }, 350) };
  });
  hitButton.addEventListener('pointerup', event => {
    if (hitPress?.pointerId !== event.pointerId) return;
    const tapped = !hitPress.held;
    clearHitPress();
    if (tapped) weaponInput(' ');
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    hitButton.addEventListener(type, event => {
      if (hitPress?.pointerId === event.pointerId) clearHitPress();
    });
  }
  hitButton.addEventListener('contextmenu', event => event.preventDefault());
  hitButton.addEventListener('click', event => {
    if (event.detail === 0) weaponInput(' ');
  });
}

function makeTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function sprite(texture, z) {
  const mesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false,
  }));
  mesh.position.z = z;
  return mesh;
}

function makeRoute(scene, world, scenery, foliage, entranceTree, closeFoliage) {
  const townTime = { value: 0 };
  const skyOffset = { value: 0 };
  const forestSeam = `
    float seam = 0.202 + sin(vMapUv.y * 14.0) * 0.004;
    diffuseColor.a *= smoothstep(seam - 0.009, seam + 0.009, vMapUv.x);
  `;
  const routeSeam = `
    float seam = 0.12 + sin(vMapUv.y * 14.0) * 0.017;
    diffuseColor.a *= smoothstep(seam - 0.038, seam + 0.038, vMapUv.x);
  `;
  const panels = scenery.map((texture, index) => {
    const panel = sprite(makeTexture(texture), 0.1 * (index + 1));
    const isForest = index === 0;
    const isTown = index === scenery.length - 1;
    panel.material.customProgramCacheKey = () => routeScenes[index];
    panel.material.onBeforeCompile = shader => {
      if (isTown) {
        shader.uniforms.townTime = townTime;
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
          #include <common>
          uniform float townTime;
        `);
      }
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        ${isForest ? forestSeam : routeSeam}
        ${isTown ? `
          vec2 uv = vMapUv;
          float fountain = (1.0 - smoothstep(0.8, 1.0,
            length((uv - vec2(0.509, 0.392)) / vec2(0.057, 0.045))))
            * smoothstep(0.015, 0.14, diffuseColor.g - diffuseColor.r);
          float shimmer = sin(uv.y * 680.0 + uv.x * 420.0 + townTime * 13.0);
          diffuseColor.rgb += vec3(0.075, 0.13, 0.14) * fountain * shimmer;
        ` : ''}
      `);
    };
    scene.add(panel);
    return panel;
  });

  const road = [world, ...scenery].map((texture, index) => {
    const tile = sprite(texture, 0.55 + index * 0.1);
    tile.material.customProgramCacheKey = () => `road-${index}`;
    tile.material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        ${index === 0 ? '' : index === 1 ? forestSeam : routeSeam}
        diffuseColor.a *= 1.0 - smoothstep(0.12, 0.175, vMapUv.y);
      `);
    };
    scene.add(tile);
    return tile;
  });

  const sky = [world, ...scenery].map((texture, index, tiles) => {
    const clouds = sprite(texture, 0.36 + index * 0.02);
    clouds.material.customProgramCacheKey = () => `sky-${index}`;
    clouds.material.onBeforeCompile = shader => {
      shader.uniforms.skyOffset = skyOffset;
      shader.uniforms.weatherTime = townTime;
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform float skyOffset;
        uniform float weatherTime;
        float skyHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float skyNoise(vec2 p) {
          vec2 cell = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(skyHash(cell), skyHash(cell + vec2(1, 0)), f.x),
            mix(skyHash(cell + vec2(0, 1)), skyHash(cell + vec2(1, 1)), f.x), f.y);
        }
      `).replace('#include <map_fragment>', `
        #include <map_fragment>
        vec2 uv = vMapUv;
        // Use the painted sky as a mask so clouds stay behind roofs and leaves.
        float blue = smoothstep(0.005, 0.08, diffuseColor.b - diffuseColor.r);
        float silhouettes = 1.0 - smoothstep(0.13, 0.28, diffuseColor.r);
        float heightMask = smoothstep(0.65, 0.78, uv.y) * (1.0 - smoothstep(0.94, 1.0, uv.y));
        vec2 cloud = vec2((uv.x + ${(index * routeSpacing).toFixed(2)} - skyOffset) * 8.5 - weatherTime * 0.11, uv.y * 17.0);
        float banks = skyNoise(cloud) * 0.72 + skyNoise(cloud * 2.25) * 0.28;
        diffuseColor.rgb = vec3(0.18, 0.37, 0.42);
        diffuseColor.a *= blue * silhouettes * heightMask * smoothstep(0.47, 0.82, banks) * 0.32;
        ${index === 0 ? '' : index === 1 ? forestSeam : routeSeam}
        ${index < tiles.length - 1 ? 'diffuseColor.a *= 1.0 - smoothstep(0.86, 0.95, uv.x);' : ''}
      `);
    };
    scene.add(clouds);
    return clouds;
  });

  const forestEntrance = sprite(makeTexture(entranceTree), 0.45);
  scene.add(forestEntrance);

  makeTexture(foliage);
  const plants = [
    [0.97, 0, 0.17], [1.26, 1, 0.19], [1.52, 0, 0.14],
    [1.77, 2, 0.16], [2.03, 1, 0.16], [2.22, 2, 0.15],
    [2.50, 3, 0.14], [2.86, 3, 0.15], [3.22, 3, 0.13],
  ].map(([x, tile, size]) => {
    const texture = foliage.clone();
    const cell = foliage.image.width / 2;
    texture.repeat.set(0.5 - 1 / (cell * 2), 0.5 - 1 / (cell * 2));
    texture.offset.set((tile % 2) / 2 + 0.5 / (cell * 2), (1 - Math.floor(tile / 2)) / 2 + 0.5 / (cell * 2));
    texture.needsUpdate = true;
    const plant = sprite(texture, 4.5);
    scene.add(plant);
    return { x, size, plant };
  });

  makeTexture(closeFoliage);
  const closePlants = [0.38, 0.88, 1.15, 1.48].map((x, index) => {
    const texture = closeFoliage.clone();
    texture.repeat.x = 0.5;
    texture.offset.x = index % 2 * 0.5;
    texture.needsUpdate = true;
    const plant = sprite(texture, 5);
    scene.add(plant);
    return { x, plant };
  });

  function positionPanel(panel, x) {
    panel.scale.set(backgroundWidth, backgroundHeight, 1);
    panel.position.x = x;
    panel.position.y = backgroundHeight / 2;
    panel.visible = x + backgroundWidth / 2 > 0 && x - backgroundWidth / 2 < width;
  }

  return (origin, scroll, sceneryCenter) => {
    townTime.value = reducedMotion.matches ? 0 : elapsed;
    const sceneryShift = (origin - sceneryCenter) / backgroundWidth;
    skyOffset.value = sceneryShift - scroll * skyParallax;
    sky.forEach((tile, index) => positionPanel(tile, sceneryCenter + index * routeSpacing * backgroundWidth));
    panels.forEach((panel, index) => positionPanel(panel, sceneryCenter + (index + 1) * routeSpacing * backgroundWidth));
    road.forEach((tile, index) => positionPanel(tile, backgroundCenter + index * routeSpacing * backgroundWidth));
    const entranceX = sceneryCenter + (routeSpacing + 0.202 - 0.5) * backgroundWidth;
    const trunkWidth = backgroundWidth * 0.19;
    forestEntrance.position.set(entranceX, backgroundHeight * 0.63, 0.45);
    forestEntrance.scale.set(trunkWidth, backgroundHeight * 0.89, 1);
    forestEntrance.visible = entranceX + trunkWidth / 2 > 0 && entranceX - trunkWidth / 2 < width;
    for (const { x, size, plant } of plants) {
      const side = size * backgroundHeight;
      const screenX = origin + (x - 0.5 - scroll + (x - 0.67 - scroll) * 0.24) * backgroundWidth;
      plant.position.set(screenX, side * 0.30, 4.5);
      plant.scale.set(side, side, 1);
      plant.visible = screenX + side / 2 > 0 && screenX - side / 2 < width;
    }
    for (const { x, plant } of closePlants) {
      const size = backgroundHeight * 0.39;
      const screenX = origin + (x - 0.5 - scroll * closeForegroundParallax) * backgroundWidth;
      plant.position.set(screenX, size * 0.09, 5);
      plant.scale.set(size, size * 0.44, 1);
      plant.visible = screenX + size / 2 > 0 && screenX - size / 2 < width;
    }
  };
}

function makeLandscape(texture) {
  const time = { value: 0 };
  const material = new THREE.MeshBasicMaterial({ map: texture });
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = time;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform float uTime;
      float mistHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float mistNoise(vec2 p) {
        vec2 cell = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mistHash(cell), mistHash(cell + vec2(1.0, 0.0)), f.x),
          mix(mistHash(cell + vec2(0.0, 1.0)), mistHash(cell + vec2(1.0)), f.x), f.y);
      }
      float windBand(vec2 uv, float level, float breadth, float drift) {
        float height = (uv.y - level) / breadth;
        vec2 p = vec2(uv.x * 5.0 - uTime * drift, height * 1.25);
        float shape = mistNoise(p) * 0.75 + mistNoise(p * 2.3 + 4.0) * 0.25;
        return smoothstep(0.30, 0.82, shape) * exp(-height * height);
      }
      vec2 leafSway(vec2 uv, vec2 center, vec2 span, float phase) {
        vec2 p = (uv - center) / span;
        float tips = smoothstep(-0.70, 0.60, p.y);
        float cluster = 1.0 - smoothstep(0.42, 1.0, length(p));
        float gust = sin(uTime * 1.9 + phase) * 0.72 + sin(uTime * 3.2 + phase) * 0.28;
        return vec2(0.0030, -p.x * 0.0008) * cluster * tips * gust;
      }
      float softArea(vec2 uv, vec2 center, vec2 span) {
        return 1.0 - smoothstep(0.50, 1.0, length((uv - center) / span));
      }
      float cascade(vec2 uv, vec2 center, vec2 span) {
        vec2 p = abs((uv - center) / span);
        return (1.0 - smoothstep(0.65, 1.0, p.x)) * (1.0 - smoothstep(0.67, 1.0, p.y));
      }
    `).replace('#include <map_fragment>', `
      vec2 uv = vMapUv;
      // De hangende bladeren en de kruin bewegen. De stam en gebouwen staan vast.
      vec2 sway = leafSway(uv, vec2(0.16, 0.95), vec2(0.17, -0.07), 0.0)
        + leafSway(uv, vec2(0.46, 0.94), vec2(0.15, -0.07), 1.8)
        + leafSway(uv, vec2(0.69, 0.89), vec2(0.16, 0.09), 3.2)
        + leafSway(uv, vec2(0.82, 0.77), vec2(0.15, 0.065), 4.7);
      float falls = max(cascade(uv, vec2(0.842, 0.384), vec2(0.027, 0.019)),
        cascade(uv, vec2(0.735, 0.380), vec2(0.014, 0.017)));
      falls = max(falls, cascade(uv, vec2(0.741, 0.454), vec2(0.012, 0.013)));
      falls = max(falls, cascade(uv, vec2(0.776, 0.483), vec2(0.009, 0.016)));
      falls = max(falls, cascade(uv, vec2(0.628, 0.260), vec2(0.018, 0.028)));
      float lake = max(softArea(uv, vec2(0.528, 0.295), vec2(0.104, 0.023)),
        softArea(uv, vec2(0.669, 0.318), vec2(0.048, 0.024)));
      vec3 painted = texture2D(map, uv).rgb;
      float cyanWater = smoothstep(0.015, 0.11, painted.g - painted.r)
        * smoothstep(0.15, 0.40, painted.g);
      falls *= mix(0.18, 1.0, cyanWater);
      sway.y += falls * sin(uv.y * 270.0 + uv.x * 193.0 + uTime * 8.0) * 0.0020;
      float ripple = sin(uv.y * 530.0 + uv.x * 26.0 + uTime * 2.5)
        * sin(uv.x * 56.0 - uTime * 0.8);
      sway.x += lake * ripple * 0.0018;
      diffuseColor *= texture2D(map, clamp(uv + sway, 0.0, 1.0));
      diffuseColor.rgb += vec3(0.09, 0.15, 0.16) * falls
        * pow(0.5 + 0.5 * sin(uv.y * 420.0 + uv.x * 310.0 + uTime * 10.0), 3.0);
      diffuseColor.rgb += vec3(0.035, 0.065, 0.067) * lake * ripple;
      float valleyMist = windBand(uv, 0.30 + sin(uv.x * 5.0) * 0.027, 0.087, 0.085);
      float highClouds = windBand(uv, 0.59 - uv.x * 0.13, 0.095, 0.055);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.44, 0.43),
        valleyMist * 0.22 + highClouds * 0.13);
      vec2 lamp = (uv - vec2(0.907, 0.285)) * vec2(1.77, 1.0);
      float lantern = exp(-dot(lamp, lamp) * 550.0);
      float flame = 0.65 + sin(uTime * 5.7) * 0.19 + sin(uTime * 9.3) * 0.16;
      diffuseColor.rgb += vec3(0.37, 0.17, 0.028) * lantern * flame * 0.27;
    `);
  };
  return { mesh: new THREE.Mesh(plane, material), time };
}

function makeFireflies(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const brush = canvas.getContext('2d');
  const light = brush.createRadialGradient(32, 32, 0, 32, 32, 30);
  light.addColorStop(0, '#fffad6');
  light.addColorStop(0.10, '#ffe4a0');
  light.addColorStop(0.26, '#edb64380');
  light.addColorStop(0.58, '#c9942e28');
  light.addColorStop(1, '#c9942e00');
  brush.fillStyle = light;
  brush.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  scene.add(group);
  const flies = Array.from({ length: Math.ceil(routeEnd * 22) }, (_, index) => {
    const foreground = index % 4 === 0;
    const mesh = sprite(texture, foreground ? 4 : 1);
    mesh.material.blending = THREE.AdditiveBlending;
    group.add(mesh);
    return {
      mesh, foreground,
      x: (index * 0.618 + 0.16) % routeEnd,
      y: 0.18 + (index * 0.341 % 1) * 0.49,
      pace: 0.38 + index % 6 * 0.067,
      phase: index * 2.399,
    };
  });
  return (time, visible, sceneryCenter) => {
    group.visible = visible;
    if (!visible) return;
    for (const { mesh, x, y, foreground, pace, phase } of flies) {
      const flight = time * pace + phase;
      const pulse = Math.pow(0.5 + 0.5 * Math.sin(flight * 2.4), 3);
      const size = (foreground ? 38 : 25) * (0.8 + pulse * 0.2);
      mesh.position.x = sceneryCenter + (x - 0.5 + Math.sin(flight) * 0.019) * backgroundWidth;
      mesh.position.y = (y + Math.cos(flight * 0.77 + phase) * 0.032) * backgroundHeight;
      mesh.visible = mesh.position.x + size > 0 && mesh.position.x - size < width;
      mesh.scale.set(size, size, 1);
      mesh.material.opacity = 0.055 + pulse * (foreground ? 0.82 : 0.62);
    }
  };
}


function makeCritters(scene) {
  const species = [
    {
      frames: [
        ['..........t...', '.........tft..', '.tt...bbbbff..', 't..ttbbbbbbb..', '....bbbbbbbbh.', '.....llll.l..'],
        ['..........t...', '.........tft..', '..t...bbbbff..', 'tt.ttbbbbbbb..', '....bbbbbbbbh.', '....l...ll...'],
      ],
      palette: { t: '#bf8c71', f: '#baa48e', b: '#8d7562', h: '#ead0b0', l: '#514139' },
      size: 39,
      pace: 98,
    },
    {
      frames: [
        ['........t.t.', '...gggg..t..', '..gbbbbgbb..', '..gbbbbg.bb.', '...l.l..l...'],
        ['.........tt.', '...gggg.t...', '..gbbbbgbb..', '..gbbbbg.bb.', '..l..l.l....'],
      ],
      palette: { t: '#c7a777', g: '#b99257', b: '#635031', l: '#493d2b' },
      size: 26,
      pace: 76,
    },
  ].map(animal => ({
    ...animal,
    textures: animal.frames.map(rows => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(...rows.map(row => row.length));
      canvas.height = rows.length;
      const brush = canvas.getContext('2d');
      rows.forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel === '.') return;
        brush.fillStyle = animal.palette[pixel];
        brush.fillRect(x, y, 1, 1);
      }));
      const texture = makeTexture(new THREE.CanvasTexture(canvas));
      texture.minFilter = THREE.NearestFilter;
      return texture;
    }),
  }));
  const mesh = sprite(species[0].textures[0], 2);
  mesh.visible = false;
  scene.add(mesh);

  const stainCanvas = document.createElement('canvas');
  stainCanvas.width = 16;
  stainCanvas.height = 6;
  const ink = stainCanvas.getContext('2d');
  ink.fillStyle = '#631022';
  ink.fillRect(2, 2, 12, 3);
  ink.fillRect(4, 1, 8, 5);
  ink.fillRect(0, 3, 3, 1);
  ink.fillRect(14, 1, 2, 1);
  ink.fillStyle = '#a32036';
  ink.fillRect(4, 2, 7, 2);
  ink.fillRect(7, 1, 3, 1);
  const puddle = sprite(makeTexture(new THREE.CanvasTexture(stainCanvas)), 1.65);
  puddle.visible = false;
  scene.add(puddle);

  let nextVisit = 2.5;
  let visit;
  let spill;

  return (time, dt, visible, footX, footY, running) => {
    puddle.visible = Boolean(spill && visible && time < spill.time + 4);
    if (puddle.visible) {
      puddle.position.x = backgroundCenter + spill.x * backgroundWidth;
      puddle.position.y = spill.y * backgroundHeight + puddle.scale.y / 2;
      puddle.material.opacity = 1 - THREE.MathUtils.smoothstep(time - spill.time, 2.3, 4);
    } else {
      spill = undefined;
    }
    if (!visible) {
      mesh.visible = false;
      visit = undefined;
      nextVisit = time + 2.5;
      return;
    }
    if (!visit && time >= nextVisit) {
      const animal = species[Math.floor(Math.random() * species.length)];
      const direction = Math.random() < 0.5 ? 1 : -1;
      const lane = THREE.MathUtils.clamp(heroPosition.y + (Math.random() - 0.5) * 0.017, 0.84, 0.94);
      visit = { animal, direction, started: time, distance: 0, lane };
      mesh.visible = true;
    }
    if (!visit) return;
    const { animal, direction, started, lane } = visit;
    const age = time - started;
    const moving = age % 2.1 < 1.68;
    if (moving) visit.distance += animal.pace * dt;
    const size = THREE.MathUtils.clamp(height / 850, 0.78, 1.25) * animal.size;
    const texture = animal.textures[moving ? Math.floor(age * 12) % 2 : 0];
    const spriteHeight = size * texture.image.height / texture.image.width;
    mesh.material.map = texture;
    mesh.scale.set(direction * size, spriteHeight, 1);
    const fraction = visit.distance / Math.min(width, 1050);
    const progress = direction > 0 ? fraction : 1 - fraction;
    const groundY = (1 - lane) * backgroundHeight;
    mesh.position.set(
      -size + progress * (width + 2 * size),
      groundY + spriteHeight / 2,
      lane > heroPosition.y ? 4 : 1.8,
    );
    const trampled = running && Math.abs(mesh.position.x - footX) < size * 0.40
      && Math.abs(groundY - footY) < Math.max(9, backgroundHeight * 0.009);
    if (trampled) {
      spill = { time, x: (mesh.position.x - backgroundCenter) / backgroundWidth, y: 1 - lane };
      puddle.scale.set(size * 0.76, size * 0.23, 1);
    }
    if (trampled || fraction > 1) {
      mesh.visible = false;
      visit = undefined;
      nextVisit = time + 8 + Math.random() * 9;
    }
  };
}

function makeTrainingDummies(scene, atlas) {
  makeTexture(atlas);
  atlas.minFilter = THREE.LinearFilter;
  atlas.generateMipmaps = false;
  const frames = Array.from({ length: 4 }, (_, index) => {
    const frame = atlas.clone();
    frame.repeat.x = (atlas.image.width / 4 - 1) / atlas.image.width;
    frame.offset.x = (atlas.image.width / 4 * index + 0.5) / atlas.image.width;
    frame.needsUpdate = true;
    return frame;
  });
  const dummies = [1.19, 1.43, 1.66].map((home, index) => {
    const mesh = sprite(frames[1], 2.8);
    scene.add(mesh);
    return { mesh, home, x: home, facing: -1, phase: index * 0.29, stagger: 0, struck: false };
  });

  return (dt, player, reach, facing, baseHeight) => {
    const lane = 0.91;
    const footY = (1 - lane) * backgroundHeight;
    const size = baseHeight * 1.11;
    const stopDistance = size * 0.32 / backgroundWidth;
    let hit = false;
    for (const dummy of dummies) {
      if (!reach) dummy.struck = false;
      const distance = player.x - dummy.x;
      const gap = Math.abs(distance);
      if (gap > 0.004) dummy.facing = Math.sign(distance);
      if (reach && !dummy.struck && gap * backgroundWidth <= reach
        && distance * facing <= 0.015 && Math.abs(player.y - lane) < 0.026) {
        dummy.struck = true;
        dummy.stagger = 0.34;
        dummy.recoil = facing;
        hit = true;
      }

      const stunned = dummy.stagger > 0;
      const following = !stunned && gap > stopDistance && gap < 0.27;
      const movement = stunned ? dummy.recoil * 0.075 : following ? dummy.facing * 0.032 : 0;
      const nextX = THREE.MathUtils.clamp(dummy.x + movement * dt, dummy.home - 0.11, dummy.home + 0.11);
      const walking = following && nextX !== dummy.x;
      dummy.x = nextX;
      dummy.stagger = Math.max(0, dummy.stagger - dt);
      if (walking) dummy.phase = (dummy.phase + dt / 1.08) % 1;

      const screenX = backgroundCenter + (dummy.x - 0.5) * backgroundWidth;
      dummy.mesh.visible = screenX + size > 0 && screenX - size < width;
      dummy.mesh.material.map = frames[stunned ? 3 : walking ? Math.floor(dummy.phase * 3) : 1];
      dummy.mesh.position.set(screenX, footY + size * 0.46, player.y < lane ? 3.15 : 2.8);
      dummy.mesh.scale.set(size * dummy.facing, size, 1);
    }
    return hit;
  };
}

async function showMenu() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 30);
  camera.position.z = 10;
  const loader = new THREE.TextureLoader();
  const [worldTexture, bellmaker, scenery, foliage, entranceTree, closeFoliage, dummyAtlas] = await Promise.all([
    loader.loadAsync('./assets/wereldboom.webp'),
    loadBellmakerSprites(loader),
    Promise.all(routeScenes.map(name => loader.loadAsync(`./assets/route-${name}.webp`))),
    loader.loadAsync('./assets/route-voorgrond.webp'),
    loader.loadAsync('./assets/route-bosstam.webp'),
    loader.loadAsync('./assets/route-dichte-voorgrond.webp'),
    loader.loadAsync('./assets/oefenpoppen.webp'),
  ]);
  const world = makeTexture(worldTexture);
  const { mesh: background, time: landscapeTime } = makeLandscape(world);
  scene.add(background);
  const updateRoute = makeRoute(scene, world, scenery, foliage, entranceTree, closeFoliage);
  let routeOrigin;
  const hero = sprite(bellmaker.frame('idle', false, 0, 0), 3);
  hero.geometry = new THREE.PlaneGeometry(1, 1, 24, 32);
  const idleBreath = { value: 0 };
  let idleTime = 0;
  hero.material.onBeforeCompile = shader => {
    shader.uniforms.idleBreath = idleBreath;
    shader.vertexShader = 'uniform float idleBreath;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n'
        + `float heightFromChest = (position.y * ${bellmaker.scale.toFixed(6)} - 0.15) / 0.095;\n`
        + 'float chest = exp(-heightFromChest * heightFromChest);\n'
        + 'float upperBody = smoothstep(-0.16, 0.045, position.y);\n'
        + 'transformed.x += position.x * chest * idleBreath * 0.018;\n'
        + `transformed.y += upperBody * idleBreath * ${(0.004 / bellmaker.scale).toFixed(6)};`
    );
  };
  scene.add(hero);
  const { trail: slashTrail, update: updateSlashTrail } = makeSlashTrail();
  hero.add(slashTrail);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 32;
  const brush = shadowCanvas.getContext('2d');
  brush.translate(32, 16);
  brush.scale(1, 0.48);
  const gradient = brush.createRadialGradient(0, 0, 3, 0, 0, 32);
  gradient.addColorStop(0, '#0b100ad9');
  gradient.addColorStop(1, '#0b100a00');
  brush.fillStyle = gradient;
  brush.fillRect(-32, -34, 64, 68);
  const shadow = sprite(new THREE.CanvasTexture(shadowCanvas), 2);
  scene.add(shadow);

  const animateFireflies = makeFireflies(scene);
  const animateCritters = makeCritters(scene);
  const animateDummies = makeTrainingDummies(scene, dummyAtlas);
  const audio = makeSceneAudio();

  const playSequence = document.querySelector('#play-sequence');
  let demoTime = -1;
  let facing = 1;
  let action = 'idle';
  let actionTime = 0;
  let phase = 0;
  let attack = 0;
  let nextAttack = 0;
  let swingPlayed = false;
  const jumpDrift = new THREE.Vector2();
  let jumpDuration = 0.54;
  let jumpTime = jumpDuration;
  function jump() {
    if (demoTime >= 0 || jumpTime < jumpDuration) return;
    jumpDrift.set(0, 0);
    if (motion.lengthSq() > 0.05) jumpDrift.copy(motion).normalize();
    jumpDuration = jumpDrift.lengthSq() > 0 ? 0.59 : 0.50;
    jumpTime = 0;
  }

  const duration = { turn: 0.34, 'armed-turn': 0.34, draw: 0.48, slash: 0.42, recover: 0.20, sheathe: 0.48, punch: 0.31 };
  const demo = [
    { action: 'run', duration: 1.10, facing: 1 },
    { action: 'turn', duration: duration.turn, facing: -1 },
    { action: 'run', duration: 0.86, facing: -1 },
    { action: 'draw', duration: duration.draw, facing: -1, moving: true },
    { action: 'ready', duration: 0.24, facing: -1 },
    { action: 'slash', duration: duration.slash, facing: -1 },
    { action: 'recover', duration: duration.recover, facing: -1 },
    { action: 'sheathe', duration: duration.sheathe, facing: -1 },
  ];
  function startAction(next) {
    action = next;
    actionTime = 0;
    if (next === 'slash') {
      attack = nextAttack;
      nextAttack = (nextAttack + 1) % bellmaker.attackCount;
    }
  }
  function startDemo() {
    if (demoTime >= 0) return;
    heroPosition.x = (width * 0.40 - routeOrigin) / backgroundWidth + 0.5;
    heroPosition.y = 0.90;

    phase = 0;
    attack = 0;
    jumpTime = jumpDuration;
    facing = 1;
    motion.set(0, 0);
    demoTime = 0;
    playSequence.disabled = true;
    playSequence.blur();
  }
  playSequence.addEventListener('click', startDemo);

  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setSize(width, height, false);
    camera.right = width;
    camera.top = height;
    camera.updateProjectionMatrix();

    const scale = Math.max(width / world.image.width, height / world.image.height);
    backgroundWidth = world.image.width * scale;
    backgroundHeight = world.image.height * scale;
    routeOrigin = THREE.MathUtils.lerp(width / 2, width / 2 - backgroundWidth * 0.16,
      THREE.MathUtils.clamp(1 - width / backgroundWidth, 0, 0.7));
    background.scale.set(backgroundWidth, backgroundHeight, 1);
    background.position.y = backgroundHeight / 2;
  }

  function draw(dt) {
    elapsed += dt;
    const previousJumpProgress = jumpTime / jumpDuration;
    const wasInAir = previousJumpProgress < 1;
    jumpTime = Math.min(jumpTime + dt, jumpDuration);
    stepDirection.set(0, 0);
    activeDirections.clear();
    for (const key of keys) {
      const direction = directions.get(key);
      activeDirections.add(direction[0] + ',' + direction[1]);
    }
    for (const direction of touchDirections.values()) activeDirections.add(direction);
    stepDirection.set(
      Number(activeDirections.has('1,0')) - Number(activeDirections.has('-1,0')),
      Number(activeDirections.has('0,1')) - Number(activeDirections.has('0,-1')),
    );
    stepDirection.normalize();
    actionTime += dt;
    let demoStage;
    if (demoTime >= 0) {
      let t = demoTime;
      demoStage = demo.find(stage => {
        if (t < stage.duration) return true;
        t -= stage.duration;
        return false;
      });
      if (demoStage) {
        demoTime += dt;
        action = demoStage.action;
        facing = demoStage.facing;
        actionTime = t;
        stepDirection.set(action === 'run' || demoStage.moving ? facing : 0, 0);
      } else {
        demoTime = -1;
        playSequence.disabled = false;
        startAction('idle');
      }
    }
    if (!demoStage) {
      if (duration[action] && actionTime >= duration[action]) {
        startAction(['draw', 'recover', 'armed-turn'].includes(action) ? 'ready' : action === 'slash' ? 'recover' : 'idle');
      }
      const canTurn = ['idle', 'run', 'ready'].includes(action);
      if (!wasInAir && canTurn && stepDirection.x && Math.sign(stepDirection.x) !== facing) {
        facing = Math.sign(stepDirection.x);
        startAction(action === 'ready' ? 'armed-turn' : 'turn');
      }
      if (action === 'idle' || action === 'run') action = stepDirection.lengthSq() ? 'run' : 'idle';
      if (['turn', 'armed-turn', 'slash', 'recover', 'punch'].includes(action)) stepDirection.set(0, 0);
      // Keep moving during weapon transitions. Defer reversing until the animation ends.
      if (stepDirection.x && Math.sign(stepDirection.x) !== facing) stepDirection.x = 0;
      if (wasInAir) stepDirection.copy(jumpDrift);
    }
    motion.lerp(stepDirection, 1 - Math.exp(-dt * 18));
    if (!wasInAir && (action === 'turn' || action === 'armed-turn')) motion.set(0, 0);
    const speed = motion.length();
    const targetHeight = THREE.MathUtils.clamp(height * 0.31, 100, 285)
      * THREE.MathUtils.lerp(0.78, 1.09, (heroPosition.y - 0.835) / 0.11);
    const characterHeight = targetHeight * (mobileLandscape.matches ? 0.65 : 0.5);
    const renderHeight = characterHeight * 1.34;
    const heroWidth = renderHeight * bellmaker.aspect;
    const margin = Math.min(width * 0.27, renderHeight * 0.35);
    const viewLeft = Math.max(0.07, (margin - routeOrigin) / backgroundWidth + 0.5);
    const viewRight = routeEnd - margin / backgroundWidth;
    const travel = targetHeight * 0.72;
    const oldX = heroPosition.x;
    const oldY = heroPosition.y;
    heroPosition.x = THREE.MathUtils.clamp(heroPosition.x + motion.x * dt * travel / backgroundWidth, viewLeft, viewRight);
    heroPosition.y = THREE.MathUtils.clamp(heroPosition.y + motion.y * dt * 0.13, 0.835, 0.945);
    const follow = heroPosition.x - 0.5 + (routeOrigin - width * 0.67) / backgroundWidth;
    const maxScroll = routeEnd - 0.5 + (routeOrigin - width) / backgroundWidth;
    const scroll = THREE.MathUtils.clamp(follow, 0, maxScroll);
    backgroundCenter = routeOrigin - scroll * backgroundWidth;
    // Limit the offset over long walks so the far end of the town stays in view.
    const sceneryLag = scroll * (1 - sceneryParallax) / Math.hypot(1, scroll / 0.48);
    const sceneryCenter = backgroundCenter + sceneryLag * backgroundWidth;
    background.position.x = sceneryCenter;
    background.visible = sceneryCenter + backgroundWidth / 2 > 0;
    updateRoute(routeOrigin, scroll, sceneryCenter);
    const nextPhase = phase + dt * speed * 1.22 / bellmaker.cycle;
    const stepped = !wasInAir && speed > 0.12
      && (heroPosition.x !== oldX || heroPosition.y !== oldY)
      && Math.floor(nextPhase * 2) !== Math.floor(phase * 2);
    const airProgress = jumpTime / jumpDuration;
    audio.update(stepped, previousJumpProgress < 0.88 && airProgress >= 0.88);
    phase = nextPhase % 1;
    const progress = THREE.MathUtils.clamp(actionTime / (duration[action] ?? 1), 0, 1);
    const footX = backgroundCenter + (heroPosition.x - 0.5) * backgroundWidth;
    const footY = (1 - heroPosition.y) * backgroundHeight;
    const flight = THREE.MathUtils.clamp((airProgress - 0.12) / 0.76, 0, 1);
    const lift = 4 * flight * (1 - flight);
    const airborne = jumpTime < jumpDuration && ['idle', 'run', 'ready', 'turn', 'armed-turn'].includes(action);
    const runningJump = jumpDrift.lengthSq() > 0;
    const armed = action === 'ready' || action === 'armed-turn';
    const jumpAction = `${armed ? 'armed-' : ''}${runningJump ? 'run-jump' : 'jump'}`;
    const frame = bellmaker.frame(airborne ? jumpAction : action, speed > 0.12, phase,
      airborne ? airProgress : progress, attack);
    hero.material.map = frame;
    idleTime = action === 'idle' && !airborne && !reducedMotion.matches ? idleTime + dt : 0;
    idleBreath.value = 0.5 - Math.cos(idleTime * 1.62) * 0.5;
    const turning = action === 'turn' || action === 'armed-turn';
    const facingSprite = turning && progress < 0.5 ? -facing : facing;
    const spriteHeight = renderHeight * bellmaker.scale;
    hero.scale.set(heroWidth * bellmaker.scale * facingSprite, spriteHeight, 1);
    hero.position.set(footX, footY + spriteHeight * (0.5 - bellmaker.baseline)
      + lift * characterHeight * (runningJump ? 0.52 : 0.73), 3);
    updateSlashTrail(action, progress, attack);
    shadow.scale.set(characterHeight * 0.54, characterHeight * 0.125, 1);
    shadow.material.opacity = 1 - lift * 0.55;
    shadow.position.set(footX, footY + 1, 2);

    landscapeTime.value = reducedMotion.matches ? 0 : elapsed;
    animateFireflies(elapsed, !reducedMotion.matches, sceneryCenter);
    const runningOnGround = lift === 0 && speed > 0.12 && stepDirection.lengthSq() > 0
      && (heroPosition.x !== oldX || heroPosition.y !== oldY);
    animateCritters(elapsed, dt, !reducedMotion.matches, footX, footY, runningOnGround);
    const swinging = action === 'slash';
    const swingMoment = attack === 0 ? 0.43 : 0.28;
    if (!swinging) swingPlayed = false;
    if (swinging && progress >= swingMoment && !swingPlayed) {
      audio.swing(attack);
      swingPlayed = true;
    }
    const attacking = lift < 0.2 && progress >= (swinging ? swingMoment : 0.32) && progress < 0.69;
    const reach = attacking ? characterHeight * (action === 'slash' ? 0.97 : action === 'punch' ? 0.49 : 0) : 0;
    const hit = animateDummies(dt, heroPosition, reach, facing,
      THREE.MathUtils.clamp(height * 0.31, 100, 285) * (mobileLandscape.matches ? 0.65 : 0.5));
    if (swinging && hit) audio.swordHit(attack);
    renderer.render(scene, camera);
  }

  host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', () => {
    status.textContent = 'De 3D-weergave is onderbroken. Vernieuw de pagina om verder te gaan.';
    status.hidden = false;
    controls.hidden = true;
    renderer.setAnimationLoop(null);
  });
  bindControls(key => {
    if (demoTime >= 0) return;
    if ((key === 'f' || key === 'draw') && (action === 'idle' || action === 'run')) startAction('draw');
    else if (key === 'f' && action === 'ready') startAction('sheathe');
    else if (key === ' ' && action === 'ready') startAction('slash');
    else if (key === ' ' && (action === 'idle' || action === 'run' || action === 'turn')) startAction('punch');
  }, jump);
  new ResizeObserver(resize).observe(host);
  resize();
  draw(0);
  loadingScreen.hidden = true;
  controls.hidden = false;
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    draw(THREE.MathUtils.clamp((now - last) / 1000, 0, 0.04));
    last = now;
  });
}

showMenu().catch(error => {
  console.error(error);
  loadingScreen.hidden = true;
  status.textContent = 'De interactieve scène kon niet laden. Vernieuw de pagina om het opnieuw te proberen.';
  status.hidden = false;
});





