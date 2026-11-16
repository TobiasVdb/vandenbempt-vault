import * as THREE from './vendor/three/three.module.js';
import { loadBellmakerSprites, makeSlashTrail } from './bellmaker-sprites.js?v=shield';
import { makeSceneAudio } from './scene-audio.js?v=shield';

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
const shieldPointers = new Set();
let shieldKey = false;
const activeDirections = new Set();
const heroPosition = new THREE.Vector2(0.68, 0.91);
const stepDirection = new THREE.Vector2();
const motion = new THREE.Vector2();
const plane = new THREE.PlaneGeometry(1, 1);
const routeSpacing = 0.78;
const routeScenes = ['bos-uitloop', 'grasland-open', 'dorpsplein'];
const routeEnd = 1 + routeSpacing * routeScenes.length;
const sceneryParallax = 0.74;
const skyParallax = 0.48;
const closeForegroundParallax = 0.24;
const lightAnchors = [[0.907, 0.285], [1.95, 0.36], [2.62, 0.33], [3.14, 0.33]];
// Corner positions on the original town painting, measured on a 1300 × 732 reference.
const pennants = [
  [[390,234], [416,246], [383,276], [407,280]],
  [[420,249], [435,255], [420,284], [420,284]],
  [[435,256], [451,264], [441,284], [441,284]],
  [[461,269], [474,274], [467,297], [467,297]],
  [[480,276], [496,282], [491,304], [491,304]],
  [[504,284], [520,288], [508,311], [508,311]],
  [[530,290], [556,296], [526,329], [550,333]],
  [[728,308], [754,305], [729,352], [757,350]],
  [[765,304], [782,301], [775,331], [775,331]],
  [[791,299], [808,294], [799,326], [799,326]],
  [[814,291], [840,283], [818,334], [844,329]],
  [[934,241], [945,235], [941,283], [941,283]],
  [[945,235], [966,220], [953,286], [977,278]],
].map(points => points.map(([x, y]) => [x / 1300, 1 - y / 732]));
const puddleGLSL = `
  float pavingX(float x) {
    return 1.0 - abs(fract(x / 1.24) * 2.0 - 1.0);
  }
  float pool(vec2 uv, vec2 center, vec2 span) {
    return 1.0 - smoothstep(0.72, 1.0, length((uv - center) / span));
  }
  float puddleAt(vec2 ground) {
    vec2 uv = vec2(pavingX(ground.x), ground.y / 0.22);
    float smallPools = max(pool(uv, vec2(0.13, 0.27), vec2(0.066, 0.036)),
      pool(uv, vec2(0.45, 0.145), vec2(0.052, 0.025)));
    float largePools = max(pool(uv, vec2(0.17, 0.565), vec2(0.091, 0.047)),
      pool(uv, vec2(0.775, 0.415), vec2(0.086, 0.046)));
    return max(smallPools, largePools);
  }
`;
let width, height, backgroundWidth, backgroundHeight, backgroundCenter;
let elapsed = 0;
let sprintDirection = 0;

function bindControls(weaponInput, jump) {
  let hitPress = null;
  let lastTapDirection = 0;
  let lastTapTime = -Infinity;
  const tapDirection = direction => {
    if (!direction) return;
    const now = performance.now();
    sprintDirection = direction === lastTapDirection && now - lastTapTime < 300 ? direction : 0;
    lastTapDirection = direction;
    lastTapTime = now;
  };
  const clearHitPress = () => {
    if (hitPress) clearTimeout(hitPress.timer);
    hitPress = null;
  };
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (key === 'b' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      shieldKey = true;
      return;
    }
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
    if (!event.repeat && !keys.has(key)) tapDirection(directions.get(key)[0]);
    keys.add(key);
  });
  const shieldButton = controls.querySelector('[data-action="shield"]');
  window.addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    keys.delete(key);
    if (key === 'b') shieldKey = false;
  });
  const clearInput = () => {
    keys.clear();
    touchDirections.clear();
    shieldPointers.clear();
    shieldKey = false;
    sprintDirection = 0;
    lastTapTime = -Infinity;
    clearHitPress();
  };
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', clearInput);
  for (const button of controls.querySelectorAll('[data-direction]')) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      button.setPointerCapture(event.pointerId);
      const direction = button.dataset.direction === 'left' ? -1 : 1;
      tapDirection(direction);
      touchDirections.set(event.pointerId, `${direction},0`);
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
  shieldButton?.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    shieldButton.setPointerCapture(event.pointerId);
    shieldPointers.add(event.pointerId);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    shieldButton?.addEventListener(event, pointer => shieldPointers.delete(pointer.pointerId));
  }
  shieldButton?.addEventListener('contextmenu', event => event.preventDefault());
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

function makePennants(scene, texture) {
  const cloth = pennants.map(([topL, topR, bottomL, bottomR], index) => {
    const geometry = new THREE.PlaneGeometry(1, 1, 6, 8);
    const uv = geometry.attributes.uv;
    const tint = new THREE.BufferAttribute(new Float32Array(uv.count * 3).fill(1), 3);
    const rest = [];
    for (let i = 0; i < uv.count; i++) {
      const s = uv.getX(i), t = 1 - uv.getY(i);
      const x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(topL[0], topR[0], s),
        THREE.MathUtils.lerp(bottomL[0], bottomR[0], s), t);
      const y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(topL[1], topR[1], s),
        THREE.MathUtils.lerp(bottomL[1], bottomR[1], s), t);
      rest.push({ s, t, x, y });
      uv.setXY(i, x, y);
    }
    geometry.setAttribute('color', tint);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      map: texture, vertexColors: true, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    }));
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { index, mesh, rest, tint };
  });
  return (center, time, storm) => {
    for (const { index, mesh, rest, tint } of cloth) {
      const anchor = center + (pennants[index][0][0] - 0.5) * backgroundWidth;
      mesh.visible = anchor > -100 && anchor < width + 100;
      if (!mesh.visible) continue;
      const position = mesh.geometry.attributes.position;
      const gust = (1 + storm * 0.51) * (0.58 + Math.sin(time * 1.7 - index * 0.24) * 0.27 + Math.sin(time * 3.1) * 0.15);
      for (let i = 0; i < rest.length; i++) {
        const { s, t, x, y } = rest[i];
        const wave = time * 5.3 - t * 5.6 - s * 1.5 - index * 0.43;
        const billow = t * t * (0.64 + Math.sin(wave) * 0.36) * gust;
        position.setXYZ(i, (x - 0.5 + billow * 0.015) * backgroundWidth,
          (y + billow * 0.010 + Math.sin(wave + 1.1) * t * 0.0025) * backgroundHeight, 0);
        const shade = 1 + Math.cos(wave) * t * gust * 0.27;
        tint.setXYZ(i, shade, shade, shade);
      }
      position.needsUpdate = tint.needsUpdate = true;
      mesh.position.set(center, 0, 0.46);
    }
  };
}

function makeRoute(scene, world, scenery, foliage, entranceTree, closeFoliage, street, storefronts, effects, weather) {
  const { lights, splash } = effects;
  const townTime = { value: 0 };
  const skyOffset = { value: 0 };
  const forestSeam = `
    float seam = 0.202 + sin(vMapUv.y * 14.0) * 0.004;
    diffuseColor.a *= smoothstep(seam - 0.009, seam + 0.009, vMapUv.x);
  `;
  const routeSeam = `
    float seam = 0.12 + sin(vMapUv.y * 14.0) * 0.017;
    diffuseColor.a *= smoothstep(seam - 0.027, seam + 0.027, vMapUv.x);
  `;
  const meadowSeam = 'diffuseColor.a *= smoothstep(0.05, 0.091, vMapUv.x);';
  const drawPennants = makePennants(scene, scenery.at(-1));
  const clothCutouts = pennants.map(corners => {
    const points = corners.map(([x, y]) => `vec2(${x.toFixed(6)}, ${y.toFixed(6)})`).join(', ');
    return `paint = clearCloth(map, paint, vMapUv, ${points});`;
  }).join(' ');
  const panels = scenery.map((texture, index) => {
    const panel = sprite(makeTexture(texture), 0.1 * (index + 1));
    const isForest = index === 0;
    const isTown = index === scenery.length - 1;
    panel.material.customProgramCacheKey = () => routeScenes[index];
    panel.material.onBeforeCompile = shader => {
      if (isTown) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
          #include <common>
          #ifdef USE_MAP
          vec4 clearCloth(sampler2D art, vec4 painted, vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
            float low = min(c.y, d.y);
            float high = mix(a.y, b.y, clamp((p.x - a.x) / (b.x - a.x), 0.0, 1.0)) - 0.0035;
            if (p.y > high || p.y < low - 0.003) return painted;
            float t = 1.0 - clamp((p.y - low) / (high - low), 0.0, 1.0);
            float left = mix(a.x, c.x, t), right = mix(b.x, d.x, t);
            float mask = smoothstep(left - 0.003, left, p.x) * (1.0 - smoothstep(right, right + 0.003, p.x));
            // Warm fringes can extend past the measured edges of the triangular flags.
            if (distance(c, d) < 0.00001 && a.x > 0.35) {
              float edge = smoothstep(left - 0.006, left, p.x) * (1.0 - smoothstep(right, right + 0.006, p.x));
              mask = max(mask, edge * smoothstep(0.04, 0.15, painted.r - painted.g));
            }
            if (mask < 0.001) return painted;
            vec4 fill = mix(texture2D(art, vec2(left - 0.004, p.y)), texture2D(art, vec2(right + 0.004, p.y)),
              smoothstep(left - 0.003, right + 0.003, p.x));
            return mix(painted, fill, mask);
          }
          #endif
        `);
      }
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        ${isForest ? `
          vec2 forestUV = vMapUv;
          float curb = smoothstep(0.13, 0.19, forestUV.y) * (1.0 - smoothstep(0.26, 0.41, forestUV.y));
          forestUV.y -= 0.04 * curb * smoothstep(0.58, 0.82, forestUV.x);
          diffuseColor *= texture2D(map, forestUV);
        ` : isTown ? `
          vec4 paint = texture2D(map, vMapUv);
          ${clothCutouts}
          diffuseColor *= paint;
        ` : '#include <map_fragment>'}
        ${isForest ? forestSeam : isTown ? routeSeam : meadowSeam}
      `);
    };
    scene.add(panel);
    return panel;
  });

  const road = sprite(makeTexture(street), 0.55);
  const roadView = { value: new THREE.Vector2() };
  road.material.onBeforeCompile = shader => {
    shader.uniforms.roadView = roadView;
    shader.uniforms.roadLights = lights;
    shader.uniforms.roadSplash = splash;
    shader.uniforms.roadTime = townTime;
    shader.uniforms.weather = weather;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform vec2 roadView;
      uniform vec3 roadLights[4];
      uniform vec3 roadSplash;
      uniform float roadTime;
      uniform vec4 weather;
      ${puddleGLSL}
    `).replace('#include <map_fragment>', `
      // Mirror a clean section of paving at the joins. World coordinates keep
      // the same stones under the player's feet across every landscape.
      float worldX = roadView.x + vMapUv.x * roadView.y;
      float paving = pavingX(worldX);
      diffuseColor *= texture2D(map, vec2(paving, vMapUv.y / 0.22));
      float wet = puddleAt(vec2(worldX, vMapUv.y));
      wet = mix(wet, max(wet, 0.33), weather.z);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.60 + vec3(0.015, 0.037, 0.047), wet * 0.72);
      vec3 illumination = vec3(0.89, 0.95, 1.01);
      vec3 reflections = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        float spread = (worldX - roadLights[i].x);
        float distance = length(vec2(spread * 1.78, (vMapUv.y - roadLights[i].y) * 0.82));
        float glow = exp(-distance * distance * 25.0) * roadLights[i].z;
        illumination += vec3(0.63, 0.28, 0.065) * glow;
        float ripple = 0.65 + 0.35 * sin(vMapUv.y * 690.0 + roadTime * 7.0 + worldX * 90.0);
        float reflection = exp(-abs(spread + sin(vMapUv.y * 380.0 + roadTime * 3.0) * 0.003) * 47.0);
        reflections += vec3(0.81, 0.34, 0.061) * glow * reflection * ripple * wet * 0.75;
      }
      diffuseColor.rgb = diffuseColor.rgb * illumination + reflections;
      float wake = length((vec2(worldX, vMapUv.y) - roadSplash.xy) * vec2(2.1, 5.2));
      float ring = 1.0 - smoothstep(0.002, 0.014, abs(wake - roadSplash.z * 0.23));
      diffuseColor.rgb += vec3(0.11, 0.19, 0.20) * wet * ring *
        (1.0 - smoothstep(0.06, 0.42, roadSplash.z));
      vec2 rainGrid = vec2(worldX * 93.0, vMapUv.y * 92.0);
      vec2 rainCell = floor(rainGrid);
      float rainSeed = fract(sin(dot(rainCell, vec2(127.1, 311.7))) * 43758.54);
      float rainAge = fract(roadTime * (1.4 + rainSeed) + rainSeed * 13.0);
      float radius = length((fract(rainGrid) - vec2(0.5)) * vec2(1.0, 1.8));
      float rainRing = (1.0 - smoothstep(0.013, 0.049, abs(radius - rainAge * 0.42))) * (1.0 - rainAge);
      diffuseColor.rgb += vec3(0.12, 0.19, 0.24) * rainRing * weather.z * (0.35 + 0.65 * wet);
      diffuseColor.a *= 1.0 - smoothstep(0.154, 0.213, vMapUv.y);
    `);
  };
  scene.add(road);

  makeTexture(storefronts);
  storefronts.minFilter = THREE.LinearFilter;
  storefronts.generateMipmaps = false;
  const shops = [0.27, 0.80].map((x, index) => {
    const texture = storefronts.clone();
    texture.repeat.x = 0.5;
    texture.offset.x = index * 0.5;
    texture.needsUpdate = true;
    const facade = sprite(texture, 0.48);
    facade.material.customProgramCacheKey = () => `open-shop-${index}`;
    facade.material.onBeforeCompile = shader => {
      shader.uniforms.shopGlow = lights;
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform vec3 shopGlow[4];
      `).replace('#include <map_fragment>', `
        #include <map_fragment>
        vec2 doorway = vec2(vMapUv.x * 2.0 - ${index}.0, vMapUv.y) - vec2(0.53, 0.19);
        float hearth = exp(-dot(doorway * vec2(3.6, 3.2), doorway * vec2(3.6, 3.2)));
        diffuseColor.rgb *= vec3(1.0) + hearth * shopGlow[${index + 2}].z * vec3(0.17, 0.082, 0.015);
      `);
    };
    scene.add(facade);
    return { facade, x: routeSpacing * 3 + x };
  });

  const sky = [world, ...scenery].map((texture, index, tiles) => {
    const clouds = sprite(texture, 0.36 + index * 0.02);
    clouds.material.customProgramCacheKey = () => `sky-${index}`;
    clouds.material.onBeforeCompile = shader => {
      shader.uniforms.skyOffset = skyOffset;
      shader.uniforms.weatherTime = townTime;
      shader.uniforms.weather = weather;
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform float skyOffset;
        uniform float weatherTime;
        uniform vec4 weather;
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
        float cloudShape(vec2 p) {
          return skyNoise(p) * 0.55 + skyNoise(p * 2.03 + 14.2) * 0.27
            + skyNoise(p * 4.11 - 9.6) * 0.13 + skyNoise(p * 8.17) * 0.05;
        }
      `).replace('#include <map_fragment>', `
        #include <map_fragment>
        vec2 uv = vMapUv;
        // Use the painted sky as a mask so clouds stay behind roofs and leaves.
        float blue = smoothstep(0.005, 0.08, diffuseColor.b - diffuseColor.r);
        float silhouettes = 1.0 - smoothstep(0.13, 0.28, diffuseColor.r);
        float heightMask = smoothstep(0.61, 0.74, uv.y) * (1.0 - smoothstep(0.95, 1.0, uv.y));
        float skyX = uv.x + ${(index * routeSpacing).toFixed(2)} - skyOffset;
        vec2 wisp = vec2(skyX * 6.4 - weatherTime * 0.035, uv.y * 33.0);
        float highCloud = smoothstep(0.46, 0.72, cloudShape(wisp + 19.0));
        vec2 bank = vec2(skyX * 9.1 - weatherTime * 0.105 - weather.z * 0.55, uv.y * 24.0);
        bank.y += skyNoise(bank * 0.36 + vec2(0.0, weatherTime * 0.014)) * 0.96;
        float density = cloudShape(bank);
        float lowCloud = smoothstep(0.44, 0.74, density);
        float rim = clamp((density - cloudShape(bank + vec2(-0.16, 0.28))) * 3.7 + 0.28, 0.0, 1.0);
        vec3 cloudColor = mix(vec3(0.026, 0.084, 0.103), vec3(0.19, 0.29, 0.30), rim);
        vec3 clearSky = mix(vec3(0.082, 0.142, 0.17), vec3(0.092, 0.31, 0.57), weather.x);
        cloudColor = mix(cloudColor, vec3(0.46, 0.55, 0.60) + rim * 0.19, weather.x);
        cloudColor = mix(cloudColor, vec3(0.045, 0.063, 0.088) + rim * 0.095, weather.z);
        diffuseColor.rgb = mix(clearSky, cloudColor, lowCloud * (1.0 - weather.y * 0.48));
        diffuseColor.a *= blue * silhouettes * heightMask * clamp(highCloud * 0.17 + lowCloud * 0.56
          + weather.x * 0.59 + weather.z * 0.24, 0.0, 1.0);
        ${['', forestSeam, meadowSeam, routeSeam][index]}
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
    const playerX = backgroundCenter + (heroPosition.x - 0.5) * backgroundWidth;
    townTime.value = reducedMotion.matches ? 0 : elapsed;
    const sceneryShift = (origin - sceneryCenter) / backgroundWidth;
    skyOffset.value = sceneryShift - scroll * skyParallax;
    sky.forEach((tile, index) => positionPanel(tile, sceneryCenter + index * routeSpacing * backgroundWidth));
    panels.forEach((panel, index) => positionPanel(panel, sceneryCenter + (index + 1) * routeSpacing * backgroundWidth));
    drawPennants(sceneryCenter + routeSpacing * routeScenes.length * backgroundWidth, townTime.value, weather.value.w);
    roadView.value.set(0.5 - backgroundCenter / backgroundWidth, width / backgroundWidth);
    road.scale.set(width, backgroundHeight, 1);
    road.position.set(width / 2, backgroundHeight / 2, 0.55);
    for (const { facade, x } of shops) {
      const center = sceneryCenter + (x - 0.5) * backgroundWidth;
      const size = backgroundHeight * 0.56;
      facade.position.set(center, backgroundHeight * 0.238 + size / 2, 0.48);
      facade.scale.set(size, size, 1);
      facade.visible = center + size / 2 > 0 && center - size / 2 < width;
    }
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
      plant.material.opacity = THREE.MathUtils.lerp(0.35, 1, THREE.MathUtils.smoothstep(Math.abs(playerX - screenX), side * 0.22, side * 0.54));
      const brush = THREE.MathUtils.clamp((playerX - screenX) / side, -1, 1);
      plant.rotation.z = reducedMotion.matches ? 0
        : Math.sin(elapsed * 2 + x * 5) * 0.022 + brush * (1 - Math.abs(brush)) * 0.29;
    }
    for (const { x, plant } of closePlants) {
      const size = backgroundHeight * 0.39;
      const screenX = origin + (x - 0.5 - scroll * closeForegroundParallax) * backgroundWidth;
      plant.position.set(screenX, size * 0.09, 5);
      plant.scale.set(size, size * 0.44, 1);
      plant.visible = screenX + size / 2 > 0 && screenX - size / 2 < width;
      plant.material.opacity = THREE.MathUtils.lerp(0.35, 1, THREE.MathUtils.smoothstep(Math.abs(playerX - screenX), size * 0.22, size * 0.54));
    }
  };
}

function makeRouteEffects(scene) {
  const lights = { value: lightAnchors.map(() => new THREE.Vector3()) };
  const splash = { value: new THREE.Vector3(0, 0, 1) };
  const emberCount = 15;
  const tracks = Array.from({ length: 18 }, () => ({ life: 0, x: 0, y: 0, drift: 0 }));
  const positions = new THREE.BufferAttribute(new Float32Array((emberCount + tracks.length) * 3), 3);
  const colors = new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colors);
  const material = new THREE.PointsMaterial({
    size: 3.2, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  scene.add(particles);
  let nextTrack = 0;
  let kickTime = 0;
  return {
    lights,
    splash,
    footstep(worldX, gridY) {
      if (!reducedMotion.matches) splash.value.set(worldX, gridY, 0);
    },
    update(dt, sceneryCenter, footX, footY, sliding, drift) {
      splash.value.z = Math.min(1, splash.value.z + dt);
      const animated = !reducedMotion.matches;
      particles.visible = animated;
      let nearestLight;
      let strength = 0;
      for (const [index, [x, y]] of lightAnchors.entries()) {
        const lightX = sceneryCenter + (x - 0.5) * backgroundWidth;
        const fire = animated ? 0.79 + Math.sin(elapsed * 7.9 + x * 7) * 0.13 + Math.sin(elapsed * 17) * 0.08 : 0.8;
        lights.value[index].set(0.5 + (lightX - backgroundCenter) / backgroundWidth, y, fire);
        const distance = Math.hypot((footX - lightX) / backgroundWidth * 2.2, footY / backgroundHeight - y);
        const incident = Math.exp(-distance * distance * 29) * fire;
        if (incident > strength) {
          strength = incident;
          nearestLight = lightX;
        }
      }
      // The forge is open; the glass lanterns keep their embers inside.
      const forgeX = sceneryCenter + (lightAnchors[3][0] - 0.5) * backgroundWidth - backgroundHeight * 0.019;
      for (let i = 0; i < emberCount; i++) {
        const t = (elapsed * (0.61 + (i % 5) * 0.11) + i * 0.618) % 1;
        const px = forgeX + (Math.sin(i * 2.17) * 0.012 + Math.sin(i * 4.1 + t * 4) * t * 0.036) * backgroundHeight;
        const py = backgroundHeight * (0.337 + t * (0.032 + i % 4 * 0.009) - t * t * 0.01);
        const alpha = Math.sin(Math.PI * t) * (1 - t) * (0.16 + i % 4 * 0.11);
        positions.setXYZ(i, px, py, 0.51);
        colors.setXYZ(i, alpha, alpha * 0.42, alpha * 0.075);
      }
      kickTime -= dt;
      if (animated && sliding && kickTime <= 0) {
        const track = tracks[nextTrack];
        track.x = (footX - backgroundCenter) / backgroundWidth;
        track.y = footY / backgroundHeight;
        track.life = 0.31;
        track.drift = drift * 0.045;
        kickTime = 0.024;
        nextTrack = (nextTrack + 1) % tracks.length;
      }
      tracks.forEach((track, index) => {
        track.life = Math.max(0, track.life - dt);
        track.x -= track.drift * dt;
        const p = emberCount + index;
        const shine = track.life * 1.48;
        positions.setXYZ(p, backgroundCenter + track.x * backgroundWidth,
          backgroundHeight * (track.y + (0.31 - track.life) * 0.055), 2.2);
        colors.setXYZ(p, shine * 0.53, shine * 0.45, shine * 0.34);
      });
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      return { strength, direction: nearestLight === undefined ? 0 : Math.sign(footX - nearestLight) };
    },
  };
}

function makeLivingScenery(scene) {
  const time = { value: 0 };
  const makeMaterial = (fragment, seed) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time, seed: { value: seed } },
    vertexShader: `
      varying vec2 uvLocal;
      void main() {
        uvLocal = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 uvLocal;
      uniform float time, seed;
      float roll(float n) { return fract(sin(n * 127.1 + seed * 83.71) * 43758.54); }
      float noise1(float n) {
        float i = floor(n), f = fract(n);
        return mix(roll(i), roll(i + 1.0), f * f * (3.0 - 2.0 * f));
      }
      void main() {
        ${fragment}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const stream = `
    vec2 p = vec2(uvLocal.x * 2.0 - 1.0, uvLocal.y);
    float fall = clamp((0.99 - p.y) / 0.79, 0.0, 1.0);
    float path = (noise1(fall * 4.0 + time * 0.7) - 0.5) * fall * 0.20;
    float threads = 0.67 + 0.33 * noise1(7.0 * p.x + floor(seed * 5.0));
    float flow = noise1(sqrt(fall + 0.07) * 13.0 - time * 16.0 + p.x * 2.1);
    float streamWidth = (0.23 + fall * 0.26) * threads;
    float body = (1.0 - smoothstep(streamWidth * 0.30, streamWidth, abs(p.x - path)))
      * smoothstep(0.18, 0.29, p.y) * (1.0 - smoothstep(0.967, 1.0, p.y));
    float splash = 0.0;
    for (int i = 0; i < 7; i++) {
      float key = float(i) + 3.0;
      float age = fract(time * (1.4 + roll(key) * 1.1) + roll(key + 19.0));
      vec2 drop = vec2((roll(key + 7.0) - 0.5) * age * 2.7,
        0.22 + (0.29 + roll(key + 11.0) * 0.28) * age - age * age * 0.46);
      splash += (1.0 - smoothstep(0.025, 0.12, length((p - drop) * vec2(1.0, 2.9)))) * (1.0 - age);
    }
    float foam = exp(-abs(p.x) * 3.2 - abs(p.y - 0.22) * 35.0) * (0.23 + 0.42 * noise1(time * 7.0));
    float ringAge = fract(time * 1.45 + roll(27.0));
    float ringRadius = length(vec2(p.x, (p.y - 0.20) * 9.0));
    float ripple = exp(-abs(ringRadius - (0.17 + ringAge * 0.63)) * 37.0) * sin(ringAge * 3.14159) * 0.17;
    float lip = flow * flow * (0.22 + fall * 0.34);
    gl_FragColor = vec4(mix(vec3(0.18, 0.47, 0.49), vec3(0.70, 0.88, 0.80), clamp(lip + splash + foam, 0.0, 1.0)),
      clamp(body * (0.16 + flow * 0.46) + splash * 0.31 + foam * 0.52 + ripple, 0.0, 0.88));
  `;
  const pool = `
    vec2 p = uvLocal * 2.0 - 1.0;
    float fade = 1.0 - smoothstep(0.33, 1.0, length(p));
    float stripes = 0.0;
    for (int i = 0; i < 8; i++) {
      float key = float(i) + 2.0;
      float age = fract(time * (0.37 + roll(key) * 0.20) + roll(key + 12.0));
      vec2 from = vec2(roll(key + 35.0) * 1.55 - 0.775, roll(key + 8.0) * 1.4 - 0.7);
      vec2 gap = p - from - vec2(age * 0.18, age * 0.25);
      float reach = 0.025 + age * (0.12 + roll(key + 42.0) * 0.17);
      stripes += exp(-abs(gap.x) / reach - abs(gap.y) * 48.0) * sin(age * 3.14159);
    }
    gl_FragColor = vec4(0.31, 0.57, 0.54, min(0.42, stripes * 0.61) * fade);
  `;
  const flame = `
    vec2 p = vec2(uvLocal.x * 2.0 - 1.0, uvLocal.y);
    float density = 0.0;
    float heat = 0.0;
    for (int i = 0; i < 3; i++) {
      float k = float(i);
      float base = (k - 1.0) * 0.46;
      float tip = 0.43 + 0.42 * noise1(time * (4.1 + k) + k * 12.3);
      float rise = p.y / tip;
      float bend = (noise1(time * 6.2 - rise * 2.6 + k * 9.0) - 0.43) * rise * 0.65;
      float taper = max(0.042, (0.43 - 0.32 * rise) * (1.0 - rise * 0.4));
      float tongue = (1.0 - smoothstep(taper * 0.25, taper, abs(p.x - base - bend)))
        * smoothstep(0.0, 0.085, rise) * (1.0 - smoothstep(0.72, 1.0, rise));
      density = max(density, tongue);
      heat = max(heat, tongue * (1.0 - smoothstep(0.13, 0.84, rise)));
    }
    float glow = exp(-length((p - vec2(0.0, 0.24)) * vec2(2.4, 3.8)) * 2.2);
    vec3 color = mix(vec3(0.52, 0.052, 0.005), vec3(1.0, 0.39, 0.04), density);
    color = mix(color, vec3(1.0, 0.86, 0.39), heat);
    gl_FragColor = vec4(color, min(0.93, density * 0.86 + glow * 0.26));
  `;
  const town = routeSpacing * 3;
  const props = [
    // x, y, width, height in painting coordinates; stream y is the lip of the drop.
    ...[
      [0.777, 0.493, 0.021, 0.028], [0.738, 0.461, 0.021, 0.026],
      [0.706, 0.424, 0.023, 0.026], [0.728, 0.391, 0.025, 0.034],
      [0.836, 0.400, 0.033, 0.032], [0.639, 0.300, 0.026, 0.032],
      [town + 0.542, 0.757, 0.031, 0.067], [town + 0.775, 0.852, 0.025, 0.064],
      [town + 0.466, 0.422, 0.012, 0.070], [town + 0.478, 0.426, 0.010, 0.064],
      [town + 0.504, 0.428, 0.013, 0.068], [town + 0.515, 0.428, 0.013, 0.068],
      [town + 0.548, 0.425, 0.009, 0.066], [town + 0.557, 0.423, 0.014, 0.068],
    ].map(([x, y, w, h]) => ({ x, y: y - h / 2, w, h, fragment: stream, z: 0.43 })),
    ...[
      [0.510, 0.314, 0.141, 0.046], [0.606, 0.289, 0.091, 0.039],
      [0.672, 0.314, 0.065, 0.024], [town + 0.510, 0.365, 0.100, 0.021],
    ].map(([x, y, w, h]) => ({ x, y, w, h, fragment: pool, z: 0.44 })),
    ...[
      [0.907, 0.293, 0.017, 0.032], [1.950, 0.355, 0.011, 0.025],
      [town + 0.339, 0.570, 0.013, 0.028], [town + 0.445, 0.553, 0.012, 0.026],
      [town + 0.670, 0.570, 0.012, 0.026], [town + 0.702, 0.592, 0.012, 0.028],
      [town + 0.394, 0.389, 0.014, 0.034], [town + 0.630, 0.385, 0.014, 0.034],
    ].map(([x, y, w, h]) => ({ x, y: y + h * 0.58, w: w * 0.83, h: h * 0.77, fragment: flame, z: 0.49 })),
    // The forge art is scaled from a square rather than the full painting.
    { x: town + 0.80, y: 0.348, w: 0.046, h: 0.058, fragment: flame, z: 0.50, square: true },
  ].map((prop, i) => {
    const mesh = new THREE.Mesh(plane, makeMaterial(prop.fragment, i + 1));
    scene.add(mesh);
    return { ...prop, mesh };
  });

  return (sceneryCenter, clock) => {
    time.value = clock;
    for (const { mesh, x, y, w, h, z, square } of props) {
      const screenX = sceneryCenter + (x - 0.5) * backgroundWidth - (square ? backgroundHeight * 0.019 : 0);
      const span = w * (square ? backgroundHeight : backgroundWidth);
      mesh.visible = screenX + span / 2 > 0 && screenX - span / 2 < width;
      if (!mesh.visible) continue;
      mesh.position.set(screenX, y * backgroundHeight, z);
      mesh.scale.set(span, h * backgroundHeight, 1);
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
    `).replace('#include <map_fragment>', `
      vec2 uv = vMapUv;
      // De hangende bladeren en de kruin bewegen. De stam en gebouwen staan vast.
      vec2 sway = leafSway(uv, vec2(0.16, 0.95), vec2(0.17, -0.07), 0.0)
        + leafSway(uv, vec2(0.46, 0.94), vec2(0.15, -0.07), 1.8)
        + leafSway(uv, vec2(0.69, 0.89), vec2(0.16, 0.09), 3.2)
        + leafSway(uv, vec2(0.82, 0.77), vec2(0.15, 0.065), 4.7);
      diffuseColor *= texture2D(map, clamp(uv + sway, 0.0, 1.0));
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
  return (time, visible, sceneryCenter, glow) => {
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
      mesh.material.opacity = glow * (0.055 + pulse * (foreground ? 0.82 : 0.62));
    }
  };
}


function makeBirds(scene) {
  const random = (min, max) => THREE.MathUtils.randFloat(min, max);
  const textures = Array.from({ length: 8 }, (_, pose) => {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 54;
    const ctx = canvas.getContext('2d');
    const flying = pose < 6;
    const wing = [5, 10, 24, 43, 37, 19][pose];
    const shape = (color, ...points) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      for (const point of points.slice(1)) ctx.lineTo(...point);
      ctx.closePath();
      ctx.fill();
    };
    if (flying) shape('#323b3c', [38, 31], [22, 22], [10, 32 + (28 - wing) * 0.55], [24, 33], [42, 35]);
    shape('#444443', [32, 35], [10, 38], [15, 31], [36, 29]);
    ctx.fillStyle = '#6e6660';
    ctx.beginPath();
    ctx.ellipse(41, 31, 20, 9, -0.13, 0, Math.PI * 2);
    ctx.fill();
    if (flying) {
      shape('#575653', [49, 31], [37, wing + 8], [18, wing], [25, wing + 13], [36, 38]);
      shape('#84796b', [48, 30], [37, wing + 8], [18, wing], [36, wing + 13], [43, 31]);
    } else {
      shape('#514c49', [54, 30], [41, 22], [17, 33], [36, 38], [48, 34]);
      shape('#837363', [49, 28], [38, 24], [22, 32], [38, 30]);
      ctx.strokeStyle = '#98765f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 36);
      ctx.lineTo(41, 44);
      ctx.lineTo(47, 44);
      ctx.stroke();
    }
    const headY = flying ? 25 : pose === 6 ? 21 : 32;
    ctx.fillStyle = '#92918a';
    ctx.beginPath();
    ctx.ellipse(56, headY, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    shape('#c2a583', [62, headY], [72, headY + (pose === 7 ? 5 : 1)], [63, headY + 3]);
    ctx.fillStyle = '#1d2222';
    ctx.fillRect(58, headY - 3, 2, 2);
    return makeTexture(new THREE.CanvasTexture(canvas));
  });
  const featherCanvas = document.createElement('canvas');
  featherCanvas.width = 32;
  featherCanvas.height = 16;
  const quill = featherCanvas.getContext('2d');
  quill.fillStyle = '#d7c4a6';
  quill.beginPath();
  quill.moveTo(2, 13);
  quill.quadraticCurveTo(11, 1, 30, 3);
  quill.quadraticCurveTo(27, 13, 2, 13);
  quill.fill();
  const featherTexture = makeTexture(new THREE.CanvasTexture(featherCanvas));
  const feathers = Array.from({ length: 22 }, () => {
    const mesh = sprite(featherTexture, 3.4);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, age: Infinity };
  });
  const birds = Array.from({ length: 3 }, () => {
    const mesh = sprite(textures[0], 0.53);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, state: 'away' };
  });
  const town = routeSpacing * routeScenes.length;
  const branches = [[0.10, 0.85], [0.67, 0.76], [0.92, 0.80], [1.84, 0.55]];
  // Building anchors follow the painted roofs or the square shop facade overlays.
  const rooftops = [[0.636, 0.597], [0.824, 0.761], [0.616, 0.445], [0.527, 0.387]];
  const shopRoofs = [
    [town + 0.27, 0.53, 0.84], [town + 0.27, 0.69, 0.958],
    [town + 0.80, 0.48, 0.882],
  ];
  let nextVisit = 1.5;
  let visits = 0;
  let featherIndex = 0;
  const screenX = (x, depth, sceneryCenter) =>
    THREE.MathUtils.lerp(backgroundCenter, sceneryCenter, depth) + (x - 0.5) * backgroundWidth;

  function depart(bird, direction) {
    Object.assign(bird, { state: 'depart', age: 0, direction, startY: bird.y });
  }

  return (dt, visible, sceneryCenter, footX, footY, facing, reach) => {
    if (!visible) {
      for (const bird of birds) { bird.state = 'away'; bird.mesh.visible = false; }
      for (const feather of feathers) { feather.age = Infinity; feather.mesh.visible = false; }
      nextVisit = 1.5;
      return false;
    }
    const aspect = backgroundHeight / backgroundWidth;
    const body = THREE.MathUtils.clamp(height * 0.030, 19, 36);
    const lead = birds[0];
    if (lead.state === 'away' && (nextVisit -= dt) <= 0) {
      const visiblePerches = points => points.filter(([x, y]) => {
        const onScreen = screenX(x, 1, sceneryCenter);
        return onScreen > width * 0.13 && onScreen < width * 0.90 && y * backgroundHeight < height - body;
      });
      const roofs = visiblePerches([...rooftops, ...shopRoofs.map(([x, u, v]) =>
        [x + (u - 0.5) * aspect * 0.56, 0.238 + v * 0.56])]);
      const trees = visiblePerches(branches);
      const stop = visits++ % 3;
      const preferred = stop === 1 ? roofs : trees;
      const candidates = stop === 0 ? [] : preferred.length ? preferred : [...roofs, ...trees];
      const perch = candidates[Math.floor(Math.random() * candidates.length)];
      const direction = visits % 2 === 1 ? -1 : 1;
      const ahead = footX < width * 0.7 ? 1 : -1;
      const targetX = perch ? perch[0] : THREE.MathUtils.clamp(
        0.5 + (footX - backgroundCenter + ahead * height * 0.27) / backgroundWidth, 0.08, routeEnd - 0.08);
      const targetY = perch ? perch[1] : 1 - THREE.MathUtils.clamp(heroPosition.y + random(-0.009, 0.009), 0.848, 0.939);
      birds.forEach((bird, i) => {
        if (i && bird.state !== 'away') return;
        const depth = perch || i ? 1 : 0;
        const entry = direction > 0 ? -body : width + body;
        Object.assign(bird, {
          state: i ? 'pass' : 'approach', age: -i * 0.27, direction, depth,
          startX: 0.5 + (entry - THREE.MathUtils.lerp(backgroundCenter, sceneryCenter, depth)) / backgroundWidth,
          startY: Math.max(0.68 + i * 0.055, targetY + 0.045), x: targetX, y: targetY, targetX, targetY,
          duration: random(2.1, 2.7), elevated: Boolean(perch), rest: random(2.8, 5.5),
        });
      });
      nextVisit = random(5, 8);
    }

    let hit = false;
    for (const bird of birds) {
      bird.age += dt;
      const { mesh } = bird;
      mesh.visible = bird.state !== 'away' && bird.age >= 0;
      if (!mesh.visible) continue;
      let frame = 6;
      if (bird.state === 'pass') {
        bird.x = bird.startX + bird.direction * bird.age * 0.46 * aspect;
        bird.y = bird.startY + Math.sin(bird.age * 1.45) * 0.023;
        frame = bird.age % 1.27 > 0.79 ? 2 : Math.floor(bird.age * 20) % 6;
      } else if (bird.state === 'approach') {
        const t = Math.min(1, bird.age / bird.duration);
        bird.x = THREE.MathUtils.lerp(bird.startX, bird.targetX, 1 - (1 - t) ** 1.35);
        bird.y = THREE.MathUtils.lerp(bird.startY, bird.targetY, THREE.MathUtils.smoothstep(t, 0.18, 1))
          + Math.sin(t * Math.PI) * 0.06;
        frame = t > 0.81 || t % 0.4 < 0.26 ? Math.floor(bird.age * 21) % 6 : 2;
        if (t === 1) { bird.state = 'perch'; bird.age = 0; }
      } else if (bird.state === 'perch') {
        const gap = screenX(bird.x, bird.depth, sceneryCenter) - footX;
        const close = !bird.elevated && Math.abs(gap) < body * 4.8 && Math.abs(bird.y * backgroundHeight - footY) < body * 1.9;
        if (close || bird.age > bird.rest) depart(bird, close ? (Math.sign(gap) || facing) : bird.direction);
        else frame = bird.age % 1.2 < 0.30 ? 7 : 6;
      } else if (bird.state === 'depart') {
        const t = Math.max(0, bird.age - 0.12);
        bird.x += bird.direction * dt * aspect * (t > 0 ? Math.min(0.48, 0.055 + t * 0.36) : 0);
        bird.y = bird.startY + Math.min(Math.max(0.055, 0.90 - bird.startY), 0.16 * t + 0.12 * t * t);
        frame = t > 0 ? Math.floor(t * 27) % 6 : 7;
      }
      const x = screenX(bird.x, bird.depth, sceneryCenter);
      const y = bird.y * backgroundHeight;
      if ((bird.state === 'pass' || bird.state === 'depart') &&
          (bird.direction * (x - width / 2) > width / 2 + body * 2 || bird.age > 9)) {
        bird.state = 'away';
        mesh.visible = false;
        continue;
      }
      const gap = (x - footX) * facing;
      if (reach > 0 && !bird.elevated && (bird.state === 'perch' || bird.state === 'depart')
          && gap >= -body * 0.25 && gap < reach && y >= footY - body && y < footY + body * 2.1) {
        bird.state = 'away';
        mesh.visible = false;
        hit = true;
        for (let i = 0; i < 11; i++) {
          const feather = feathers[featherIndex++ % feathers.length];
          Object.assign(feather, {
            age: 0, x: bird.x, y: bird.y + body * 0.27 / backgroundHeight, vx: random(-0.14, 0.14) + facing * 0.065,
            vy: random(0.035, 0.21), spin: random(-8, 8), size: random(0.19, 0.36) * body, life: random(0.48, 0.99),
          });
        }
        continue;
      }
      mesh.material.map = textures[frame];
      mesh.material.color.setScalar(bird.depth ? 0.70 : 0.97);
      mesh.scale.set(bird.direction * body, body * 0.675, 1);
      mesh.position.set(x, y + body * 0.22, bird.depth ? 0.53 : 2.65);
    }
    for (const feather of feathers) {
      feather.age += dt;
      const { mesh, age, life } = feather;
      mesh.visible = age < life;
      if (!mesh.visible) continue;
      feather.x += feather.vx * dt * aspect;
      feather.y += feather.vy * dt;
      feather.vy -= dt * 0.43;
      mesh.position.set(screenX(feather.x, 0, sceneryCenter), feather.y * backgroundHeight, 3.4);
      mesh.scale.set(feather.size, feather.size * 0.5, 1);
      mesh.rotation.z = feather.spin * age;
      mesh.material.opacity = 1 - THREE.MathUtils.smoothstep(age, life * 0.32, life);
    }
    return hit;
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
      const spawnX = direction > 0 ? -animal.size : width + animal.size;
      visit = {
        animal, direction, started: time, distance: 0, lane,
        x: (spawnX - backgroundCenter) / backgroundWidth,
        worldPace: (width + 2 * animal.size) / (backgroundWidth * Math.min(width, 1050)),
        climb: 0,
        fleeing: false,
      };
      mesh.visible = true;
    }
    if (!visit) return;
    const { animal, started, lane } = visit;
    const age = time - started;
    const animalX = visit.x + 0.5;
    if (!visit.climb && Math.abs(animalX - heroPosition.x) < 0.071 && Math.abs(lane - heroPosition.y) < 0.055) {
      visit.fleeing = true;
      visit.direction = animalX < heroPosition.x ? -1 : 1;
    }
    const nearTrunk = [1.01, 1.34, 1.52].some(x => Math.abs(animalX - x) < 0.023);
    if (visit.climb || (visit.fleeing && nearTrunk)) visit.climb += dt;
    const moving = visit.fleeing || age % 2.1 < 1.68;
    if (moving && !visit.climb) {
      const step = animal.pace * dt * (visit.fleeing ? 2.3 : 1);
      visit.distance += step;
      visit.x += visit.direction * step * visit.worldPace;
    }
    const size = THREE.MathUtils.clamp(height / 850, 0.78, 1.25) * animal.size;
    const texture = animal.textures[moving ? Math.floor(age * (visit.fleeing ? 22 : 12)) % 2 : 0];
    const spriteHeight = size * texture.image.height / texture.image.width;
    mesh.material.map = texture;
    mesh.scale.set(visit.direction * size, spriteHeight, 1);
    mesh.rotation.z = visit.climb ? visit.direction * Math.PI / 2 : 0;
    mesh.material.opacity = 1 - THREE.MathUtils.smoothstep(visit.climb, 0.72, 1.22);
    const groundY = (1 - lane) * backgroundHeight;
    mesh.position.set(
      backgroundCenter + visit.x * backgroundWidth,
      groundY + spriteHeight / 2 + visit.climb * backgroundHeight * 0.19,
      lane > heroPosition.y ? 4 : 1.8,
    );
    const trampled = running && !visit.climb && Math.abs(mesh.position.x - footX) < size * 0.40
      && Math.abs(groundY - footY) < Math.max(9, backgroundHeight * 0.009);
    if (trampled) {
      spill = { time, x: (mesh.position.x - backgroundCenter) / backgroundWidth, y: 1 - lane };
      puddle.scale.set(size * 0.76, size * 0.23, 1);
    }
    if (trampled || visit.distance > 1100 || visit.climb > 1.22) {
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
  const coinCanvas = document.createElement('canvas');
  coinCanvas.width = coinCanvas.height = 32;
  const gold = coinCanvas.getContext('2d');
  const disk = (radius, color) => {
    gold.beginPath();
    gold.arc(16, 16, radius, 0, Math.PI * 2);
    gold.fillStyle = color;
    gold.fill();
  };
  disk(14, '#633a18');
  disk(12, '#ffc867');
  disk(9, '#ac6828');
  disk(7, '#e6a849');
  gold.fillStyle = '#734218';
  gold.beginPath();
  gold.moveTo(16, 10);
  gold.lineTo(20, 16);
  gold.lineTo(16, 22);
  gold.lineTo(12, 16);
  gold.closePath();
  gold.fill();
  const coinTexture = makeTexture(new THREE.CanvasTexture(coinCanvas));
  const dummies = [1.19, 1.43, 1.66].map((home, index) => {
    const mesh = sprite(frames[1], 2.8);
    scene.add(mesh);
    const coinMesh = sprite(coinTexture, 3.2);
    coinMesh.visible = false;
    scene.add(coinMesh);
    const bar = document.createElement('div');
    bar.className = 'dummy-health';
    bar.append(document.createElement('span'));
    const popup = document.createElement('div');
    popup.className = 'damage-number';
    document.querySelector('#combat-hud').append(bar, popup);
    return { mesh, bar, popup, coinMesh, drop: null, hp: 20, popupTime: 0, home, x: home,
      facing: -1, phase: index * 0.29, stagger: 0, struck: false, scratch: 0, recovery: 0, hop: 0 };
  });

  return (dt, player, reach, facing, baseHeight, damage, strike, grounded, guarding) => {
    const lane = 0.91;
    const footY = (1 - lane) * backgroundHeight;
    const size = baseHeight * 1.11;
    const stopDistance = size * 0.32 / backgroundWidth;
    let hits = 0;
    let killed = false;
    let scratched = false;
    let blocked = false;
    let pickedUp = 0;
    for (const dummy of dummies) {
      if (!reach) dummy.struck = false;
      const distance = player.x - dummy.x;
      const gap = Math.abs(distance);
      if (gap > 0.004) dummy.facing = Math.sign(distance);
      if (dummy.hp > 0 && reach && !dummy.struck && gap * backgroundWidth <= reach
        && distance * facing <= 0.015 && Math.abs(player.y - lane) < 0.026) {
        dummy.struck = true;
        dummy.stagger = strike === 0 ? 0.45 : strike === 3 ? 0.21 : 0.32;
        dummy.recoil = facing;
        dummy.hop = strike === 2 ? 1 : 0;
        dummy.scratch = 0;
        dummy.recovery = 0.4;
        const dealt = Math.min(dummy.hp, damage);
        dummy.hp -= dealt;
        dummy.popup.textContent = `−${dealt}`;
        dummy.popupTime = 0.78;
        hits++;
        if (dummy.hp === 0) {
          killed = true;
          dummy.drop = { x: dummy.x, age: 0, direction: facing };
        }
      }

      const stunned = dummy.stagger > 0;
      const active = dummy.hp > 0 && player.x < routeSpacing * 3 && !stunned;
      const inClawRange = gap < stopDistance * 1.55 && Math.abs(player.y - lane) < 0.025;
      dummy.recovery = Math.max(0, dummy.recovery - dt);
      if (active && inClawRange && dummy.recovery === 0 && dummy.scratch === 0) dummy.scratch = 0.43;
      if (dummy.scratch > 0) {
        dummy.scratch = Math.max(0, dummy.scratch - dt);
        if (dummy.scratch === 0) {
          if (active && inClawRange && grounded) {
            if (guarding && distance * facing <= 0) blocked = true;
            else scratched = true;
          }
          dummy.recovery = 1.45;
        }
      }
      const following = active && dummy.scratch === 0 && gap > stopDistance && gap < 0.27;
      const movement = stunned ? dummy.recoil * (dummy.hop ? 0.052 : 0.085) : following ? dummy.facing * 0.032 : 0;
      const nextX = THREE.MathUtils.clamp(dummy.x + movement * dt, dummy.home - 0.11, dummy.home + 0.11);
      const walking = following && nextX !== dummy.x;
      dummy.x = nextX;
      dummy.stagger = Math.max(0, dummy.stagger - dt);
      if (walking) dummy.phase = (dummy.phase + dt / 1.08) % 1;

      const screenX = backgroundCenter + (dummy.x - 0.5) * backgroundWidth;
      const onScreen = screenX + size > 0 && screenX - size < width;
      dummy.mesh.visible = onScreen && (dummy.hp > 0 || stunned);
      dummy.mesh.material.map = frames[stunned || dummy.scratch > 0 ? 3 : walking ? Math.floor(dummy.phase * 3) : 1];
      dummy.mesh.material.opacity = dummy.hp > 0 ? 1 : Math.min(1, dummy.stagger / 0.24);
      dummy.mesh.material.color.set(dummy.scratch > 0 ? 0xffb082 : stunned ? 0xffaa8a : 0xffffff);
      const recoilHeight = stunned && dummy.hop ? Math.sin(Math.PI * dummy.stagger / 0.32) * size * 0.20 : 0;
      dummy.mesh.position.set(screenX, footY + size * 0.46 + recoilHeight, player.y < lane ? 3.15 : 2.8);
      dummy.mesh.scale.set(size * dummy.facing, size, 1);
      const headY = height - footY - size;
      dummy.bar.hidden = !onScreen || dummy.hp <= 0;
      dummy.bar.style.left = `${screenX}px`;
      dummy.bar.style.top = `${headY}px`;
      dummy.bar.firstElementChild.style.width = `${dummy.hp * 5}%`;
      dummy.popup.hidden = !onScreen || dummy.popupTime <= 0;
      dummy.popup.style.left = `${screenX}px`;
      dummy.popup.style.top = `${headY - 13 - (reducedMotion.matches ? 0 : (0.78 - dummy.popupTime) * 48)}px`;
      dummy.popup.style.opacity = Math.min(1, dummy.popupTime / 0.22);
      dummy.popupTime = Math.max(0, dummy.popupTime - dt);

      const drop = dummy.drop;
      if (!drop) continue;
      drop.age += dt;
      const flight = Math.min(drop.age / 0.38, 1);
      const coinSize = THREE.MathUtils.clamp(size * 0.19, 14, 24);
      const coinX = drop.x + drop.direction * 0.012 * flight;
      const screenCoinX = backgroundCenter + (coinX - 0.5) * backgroundWidth;
      const animated = !reducedMotion.matches;
      const lift = animated ? 4 * flight * (1 - flight) * coinSize * 1.6 : 0;
      if (flight === 1 && grounded && Math.abs(player.y - lane) * backgroundHeight < coinSize
        && Math.abs(player.x - coinX) * backgroundWidth < coinSize * 1.1) {
        dummy.drop = null;
        dummy.coinMesh.visible = false;
        pickedUp++;
      } else {
        const spin = animated ? 0.34 + 0.66 * Math.abs(Math.cos(drop.age * 5)) : 1;
        dummy.coinMesh.visible = screenCoinX > -coinSize && screenCoinX < width + coinSize;
        dummy.coinMesh.position.set(screenCoinX, footY + coinSize * 0.55 + lift, 3.2);
        dummy.coinMesh.scale.set(coinSize * spin, coinSize, 1);
      }
    }
    return { hits, killed, scratched, pickedUp, blocked };
  };
}

function makeWeaponShops() {
  const entry = document.querySelector('#shop-entry');
  const dialog = document.querySelector('#weapon-shop');
  const items = document.querySelector('#shop-items');
  const feedback = document.querySelector('#shop-feedback');
  const balances = document.querySelectorAll('[data-balance]');
  const wallet = document.querySelector('.wallet');
  const weapons = {
    iron: { name: 'IJzeren zwaard', price: 35, damage: 7, reach: 1.08 },
    bronze: { name: 'Bronzen kling', price: 55, damage: 9, reach: 1.12 },
    long: { name: 'Langzwaard', price: 75, damage: 10, reach: 1.28 },
  };
  const shops = [
    { name: 'Wapenhandel', interior: 'merchant', x: 0.27, goods: ['iron', 'bronze'] },
    { name: 'Smidse', interior: 'smith', x: 0.80, goods: ['bronze', 'long'] },
  ];
  let nearby;
  let activeShop;
  let coins = 100;
  let equipped;
  const owned = new Set();

  function changeCoins(amount) {
    coins += amount;
    for (const balance of balances) balance.textContent = coins;
    wallet.setAttribute('aria-label', `${coins} munten`);
  }

  function renderItems() {
    items.replaceChildren();
    for (const id of activeShop.goods) {
      const weapon = weapons[id];
      const row = document.createElement('div');
      row.className = 'shop-item';
      const label = document.createElement('div');
      label.textContent = weapon.name;
      const details = document.createElement('small');
      details.textContent = `${weapon.damage} schade · +${Math.round((weapon.reach - 1) * 100)}% bereik`;
      label.append(details);
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.textContent = equipped === id ? 'Uitgerust' : owned.has(id) ? 'Uitrusten' : `Koop · ${weapon.price}`;
      buy.disabled = equipped === id || (!owned.has(id) && coins < weapon.price);
      buy.addEventListener('click', () => {
        if (!owned.has(id)) {
          if (coins < weapon.price) return;
          changeCoins(-weapon.price);
          owned.add(id);
        }
        equipped = id;
        renderItems();
        feedback.textContent = `${weapon.name} uitgerust.`;
        dialog.querySelector('.shop-close').focus();
      });
      row.append(label, buy);
      items.append(row);
    }
  }

  function open() {
    if (!nearby || dialog.open) return;
    activeShop = nearby;
    keys.clear();
    touchDirections.clear();
    sprintDirection = 0;
    motion.set(0, 0);
    dialog.dataset.interior = activeShop.interior;
    dialog.querySelector('#shop-title').textContent = activeShop.name;
    feedback.textContent = '';
    renderItems();
    dialog.showModal();
  }

  entry.addEventListener('click', open);
  dialog.querySelector('.shop-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    keys.clear();
    touchDirections.clear();
  });
  window.addEventListener('keydown', event => {
    if (!event.repeat && event.key.toLowerCase() === 'e' && !event.ctrlKey && !event.metaKey && !event.altKey) open();
  });
  return {
    get open() { return dialog.open; },
    get damage() { return weapons[equipped]?.damage ?? 5; },
    get reach() { return weapons[equipped]?.reach ?? 1; },
    collectCoins: changeCoins,
    update(sceneryCenter, footX) {
      nearby = shops.find(shop => {
        const screenX = sceneryCenter + (routeSpacing * 3 + shop.x - 0.5) * backgroundWidth;
        return Math.abs(footX - screenX) < Math.max(65, backgroundWidth * 0.047)
          && screenX >= 25 && screenX <= width - 25;
      });
      entry.hidden = !nearby;
      if (!nearby) return;
      entry.textContent = nearby.name + ' betreden';
      entry.style.left = `${sceneryCenter + (routeSpacing * 3 + nearby.x - 0.5) * backgroundWidth}px`;
      entry.style.top = `${Math.max(70, height - backgroundHeight * 0.32)}px`;
    },
  };
}

function makeWeather(scene) {
  const modes = [
    { label: 'Nacht', values: [0, 0, 0, 0], duration: 32 },
    { label: 'Dag', values: [0.85, 0, 0, 0], duration: 31 },
    { label: 'Zonnig', values: [1, 1, 0, 0], duration: 36 },
    { label: 'Regen', values: [0.21, 0, 0.72, 0], duration: 29 },
    { label: 'Storm', values: [0.04, 0, 1, 1], duration: 23 },
  ];
  const weather = { value: new THREE.Vector4() };
  const target = new THREE.Vector4();
  const clock = { value: 0 };
  const lightning = { value: 0 };
  const canvasSize = { value: new THREE.Vector2() };
  const view = { value: 0 };
  const button = document.querySelector('#weather');
  let mode = 0;
  let duration = modes[0].duration;
  let nextFlash = 10;
  let flashAge = 2;
  const atmosphere = new THREE.Mesh(plane, new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { weather, clock, lightning, canvasSize, view },
    vertexShader: `
      varying vec2 screenUv;
      void main() {
        screenUv = uv;
        gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 screenUv;
      uniform vec2 canvasSize;
      uniform vec4 weather;
      uniform float clock, lightning, view;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.54);
      }
      float drops(vec2 p, float scale, float speed, float offset) {
        vec2 grid = p * vec2(scale, scale * 0.32);
        grid.y += clock * speed;
        grid.x += view * scale * 0.54 + offset;
        vec2 id = floor(grid);
        float seed = hash(id);
        vec2 cell = fract(grid);
        float streak = 1.0 - smoothstep(0.012, 0.034, abs(cell.x - (0.15 + seed * 0.7)));
        float lengthFade = smoothstep(0.10, 0.25, cell.y) * (1.0 - smoothstep(0.44, 0.86, cell.y));
        return streak * lengthFade * smoothstep(0.40, 0.88, seed);
      }
      void main() {
        float aspect = canvasSize.x / max(canvasSize.y, 1.0);
        vec2 uv = screenUv;
        vec2 p = vec2(uv.x * aspect, uv.y);
        p.x -= p.y * mix(0.12, 0.40, weather.w);
        float rain = (0.32 * drops(p, 59.0, 21.0, 3.0) + 0.47 * drops(p, 34.0, 17.0, 17.0)) * weather.z;
        float mistHeight = (uv.y - 0.47) * 3.0;
        float haze = exp(-mistHeight * mistHeight) * weather.z * (0.045 + weather.w * 0.048);
        vec2 sunward = vec2((uv.x - 0.79) * aspect, uv.y - 1.13);
        float sun = exp(-dot(sunward, sunward) * 2.8) * weather.y * 0.16;
        float flash = lightning * (0.035 + smoothstep(0.35, 0.96, uv.y) * 0.15);
        vec3 tint = (vec3(0.34, 0.50, 0.60) * rain + vec3(0.22, 0.32, 0.38) * haze
          + vec3(1.0, 0.76, 0.42) * sun + vec3(0.68, 0.80, 1.0) * flash);
        float alpha = rain + haze + sun + flash;
        gl_FragColor = vec4(tint / max(0.001, alpha), min(alpha, 0.90));
        #include <colorspace_fragment>
      }
    `,
  }));
  atmosphere.frustumCulled = false;
  atmosphere.renderOrder = 10;
  atmosphere.visible = false;
  scene.add(atmosphere);

  function next() {
    mode = (mode + 1) % modes.length;
    const { label, values, duration: hold } = modes[mode];
    target.set(...values);
    duration = hold;
    button.textContent = label;
    button.setAttribute('aria-label', `Weer wisselen, nu ${label.toLowerCase()}`);
  }
  button.addEventListener('click', () => { next(); button.blur(); });
  return {
    weather,
    applyLighting() {
      // Grade each painted layer and character in linear light, after their own shading.
      const graded = new Set();
      scene.traverse(({ material }) => {
        if (!material?.isMeshBasicMaterial || graded.has(material)) return;
        graded.add(material);
        const compile = material.onBeforeCompile;
        const key = material.customProgramCacheKey();
        material.customProgramCacheKey = () => `${key}-weather`;
        material.onBeforeCompile = function (shader, renderer) {
          compile.call(this, shader, renderer);
          shader.uniforms.weatherGrade = weather;
          shader.uniforms.stormLight = lightning;
          shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
            #include <common>
            uniform vec4 weatherGrade;
            uniform float stormLight;
          `).replace('#include <opaque_fragment>', `
            vec3 gradeInput = max(outgoingLight, vec3(0.0));
            float gradeLuma = dot(gradeInput, vec3(0.2126, 0.7152, 0.0722));
            vec3 daylight = pow(gradeInput, vec3(0.66)) * vec3(1.15, 1.09, 0.98);
            daylight += gradeLuma * vec3(0.083, 0.060, 0.025) * weatherGrade.y;
            outgoingLight = mix(gradeInput, daylight, weatherGrade.x);
            vec3 overcast = mix(outgoingLight, vec3(gradeLuma), 0.24) * vec3(0.64, 0.78, 0.88);
            outgoingLight = mix(outgoingLight, overcast, weatherGrade.z);
            outgoingLight *= (1.0 - weatherGrade.w * 0.17) + stormLight * 0.51;
            #include <opaque_fragment>
          `);
        };
      });
    },
    update(dt, scroll) {
      const reduced = reducedMotion.matches;
      duration -= dt;
      if (duration <= 0 && !reduced) next();
      weather.value.lerp(target, 1 - Math.exp(-dt * 0.64));
      clock.value = reduced ? 0 : clock.value + dt;
      nextFlash -= dt;
      if (nextFlash <= 0) {
        nextFlash = 8 + Math.random() * 8;
        if (mode === 4 && !reduced) flashAge = 0;
      }
      flashAge += dt;
      lightning.value = reduced ? 0 : weather.value.w * Math.max(0, 1 - Math.abs(flashAge - 0.12) / 0.12);
      canvasSize.value.set(width, height);
      view.value = scroll;
      atmosphere.visible = weather.value.y + weather.value.z > 0.015;
    },
  };
}

function makeIdleGestures(hero, bellmaker) {
  const clips = [
    { length: 1.85, poses: [[0,'#16'], [0.24,0], [1.57,'#16']], lean: -0.88, lift: -0.65 },
    { length: 2.15, poses: [[0,'#16'], [0.25,1], [1.92,'#16']], lean: 0.30, lift: 0.36 },
    { length: 2.58, poses: [
      [0,'#16'], [0.22,'#8'], [0.32,'#30'], [0.43,'#31',-1], [0.52,1,-1],
      [1.50,'#8',-1], [1.59,'#30',-1], [1.70,'#31'], [1.83,1], [2.39,'#16'],
    ], lean: 0.34, lift: 0.24 },
    { length: 2.42, poses: [[0,'#16'], [0.20,'#8'], [0.37,2], [2.13,'#8'], [2.27,'#16']], lean: 0.12, lift: 0.75 },
    { length: 3.88, poses: [
      [0,'#16'], [0.20,'#21'], [0.51,3], [1.11,5], [1.50,4], [1.98,5], [2.28,4], [2.76,5],
      [3.19,3], [3.51,'#24'], [3.72,'#16'],
    ], lean: 0.18, lift: 0.20, tosses: [1.50, 2.28] },
    { length: 2.25, poses: [[0,'#16'], [0.25,6], [1.96,'#16']], lean: 0.44, lift: 0.56 },
    { length: 1.70, poses: [[0,'#16'], [0.19,7], [1.47,'#16']], lean: -0.53, lift: 0.38 },
    { length: 1.90, poses: [[0,'#16'], [0.24,8], [1.67,'#16']], lean: 0.42, lift: 0.43 },
  ];
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = stoneCanvas.height = 16;
  const brush = stoneCanvas.getContext('2d');
  brush.fillStyle = '#766554';
  brush.beginPath();
  brush.moveTo(1, 9);
  brush.lineTo(4, 3);
  brush.lineTo(10, 2);
  brush.lineTo(15, 7);
  brush.lineTo(11, 12);
  brush.lineTo(5, 13);
  brush.closePath();
  brush.fill();
  brush.fillStyle = '#a09278';
  brush.fillRect(5, 4, 5, 2);
  const stone = sprite(makeTexture(new THREE.CanvasTexture(stoneCanvas)), 0.01);
  stone.scale.set(0.018, 0.018, 1);
  stone.visible = false;
  hero.add(stone);

  const motion = { value: new THREE.Vector2() };
  // The head height above the boots guides the in-between poses, particularly when sitting down.
  const headHeight = { 0: 0.74, 1: 0.76, 2: 0.76, 3: 0.58, 4: 0.62, 5: 0.60, 6: 0.76, 7: 0.75, 8: 0.72,
    '#16': 0.76, '#8': 0.77, '#21': 0.60, '#24': 0.61, '#30': 0.72, '#31': 0.72 };
  let clipIndex = 0;
  let clip;
  let time = 0;
  let delay = 5;
  return {
    motion,
    update(dt, idle) {
      stone.visible = false;
      motion.value.set(0, 0);
      if (!idle || reducedMotion.matches) {
        if (clip) clipIndex = (clipIndex + 1) % clips.length;
        clip = undefined;
        time = 0;
        delay = 5;
        return;
      }
      if (!clip) {
        delay -= dt;
        if (delay > 0) return;
        clip = clips[clipIndex];
        time = 0;
      }
      time += dt;
      if (time >= clip.length) {
        clip = undefined;
        delay = 5 + Math.random() * 3;
        clipIndex = (clipIndex + 1) % clips.length;
        return;
      }
      const index = clip.poses.findLastIndex(([start]) => time >= start);
      const [start, pose, direction = 1] = clip.poses[index];
      const frame = bellmaker.idleFrame(pose);
      if (!frame) return;
      const next = clip.poses[index + 1];
      let transition;
      if (next) {
        const [end, nextPose, nextDirection = 1] = next;
        const blend = THREE.MathUtils.smoothstep(time, end - Math.min(0.23, (end - start) * 0.82), end);
        const nextFrame = blend > 0 ? bellmaker.idleFrame(nextPose) : undefined;
        if (nextFrame) transition = {
          frame: nextFrame, blend, flip: direction * nextDirection,
          height: headHeight[nextPose] - headHeight[pose],
        };
      }
      const envelope = Math.sin(Math.PI * time / clip.length);
      motion.value.set(clip.lean * envelope * (0.72 + 0.28 * Math.sin(time * 5)),
        clip.lift * envelope * (0.65 + 0.35 * Math.cos(time * 7)));
      const toss = clip.tosses?.find(start => time >= start && time < start + 0.48);
      if (toss !== undefined) {
        const progress = (time - toss) / 0.48;
        stone.visible = true;
        stone.position.set(0.083 + progress * 0.008, 0.064 + 0.096 * 4 * progress * (1 - progress), 0.02);
        stone.rotation.z = progress * 6.3;
      }
      return { frame, direction, transition };
    },
  };
}

function makeIdleInbetweens(materials) {
  const nextMap = { value: null };
  const fromUv = { value: new THREE.Vector4() };
  const toUv = { value: new THREE.Vector4() };
  const inbetween = { value: new THREE.Vector3() };
  for (const material of materials) {
    const compile = material.onBeforeCompile;
    const baseProgramKey = material.customProgramCacheKey();
    material.customProgramCacheKey = () => `${baseProgramKey}-idle-inbetweens`;
    material.onBeforeCompile = function (shader, renderer) {
      compile.call(this, shader, renderer);
      Object.assign(shader.uniforms, { idleNextMap: nextMap, idleFromUv: fromUv, idleToUv: toUv, idleInbetween: inbetween });
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform sampler2D idleNextMap;
        uniform vec4 idleFromUv, idleToUv;
        uniform vec3 idleInbetween;
      `).replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 poseColor = texture2D(map, vMapUv);
          if (idleInbetween.x > 0.0) {
            vec2 local = (vMapUv - idleFromUv.xy) / idleFromUv.zw;
            // Anchor the boots while the head and torso travel between the two poses.
            float upper = smoothstep(0.22, 0.75, local.y);
            vec2 earlier = local - vec2(0.0, idleInbetween.z * upper * idleInbetween.x);
            vec2 later = vec2(0.5 + (local.x - 0.5) * idleInbetween.y,
              local.y + idleInbetween.z * upper * (1.0 - idleInbetween.x));
            vec4 a = texture2D(map, idleFromUv.xy + clamp(earlier, 0.0, 1.0) * idleFromUv.zw);
            vec4 b = texture2D(idleNextMap, idleToUv.xy + clamp(later, 0.0, 1.0) * idleToUv.zw);
            float alpha = mix(a.a, b.a, idleInbetween.x);
            vec3 color = mix(a.rgb * a.a, b.rgb * b.a, idleInbetween.x) / max(alpha, 0.001);
            poseColor = vec4(color, alpha);
          }
          diffuseColor *= poseColor;
        #endif
      `);
    };
  }
  return (frame, transition) => {
    nextMap.value = transition?.frame ?? frame;
    if (!transition) {
      inbetween.value.x = 0;
      return;
    }
    fromUv.value.set(frame.offset.x, frame.offset.y, frame.repeat.x, frame.repeat.y);
    const next = transition.frame;
    toUv.value.set(next.offset.x, next.offset.y, next.repeat.x, next.repeat.y);
    inbetween.value.set(transition.blend, transition.flip, transition.height);
  };
}

async function showMenu() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 30);
  camera.position.z = 10;
  const loader = new THREE.TextureLoader();
  const [worldTexture, bellmaker, scenery, foliage, entranceTree, closeFoliage, dummyAtlas, street, storefronts] = await Promise.all([
    loader.loadAsync('./assets/wereldboom.webp'),
    loadBellmakerSprites(loader),
    Promise.all(routeScenes.map(name => loader.loadAsync(`./assets/route-${name}.webp`))),
    loader.loadAsync('./assets/route-voorgrond.webp'),
    loader.loadAsync('./assets/route-bosstam.webp'),
    loader.loadAsync('./assets/route-dichte-voorgrond.webp'),
    loader.loadAsync('./assets/oefenpoppen.webp'),
    loader.loadAsync('./assets/straatstenen.webp'),
    loader.loadAsync('./assets/open-winkels.webp'),
  ]);
  const world = makeTexture(worldTexture);
  const climate = makeWeather(scene);
  const { mesh: background, time: landscapeTime } = makeLandscape(world);
  scene.add(background);
  const routeEffects = makeRouteEffects(scene);
  const updateRoute = makeRoute(scene, world, scenery, foliage, entranceTree, closeFoliage, street, storefronts, routeEffects, climate.weather);
  const updateLivingScenery = makeLivingScenery(scene);
  let routeOrigin;
  let cameraScroll = 0;
  let lookAhead = 0;
  const hero = sprite(bellmaker.frame('idle', false, 0, 0), 3);
  hero.frustumCulled = false;
  hero.geometry = new THREE.PlaneGeometry(1, 1, 48, 64);
  const idleBreath = { value: 0 };
  const swordBreath = { value: 0 };
  const idleGestures = makeIdleGestures(hero, bellmaker);
  let idleTime = 0;
  hero.material.onBeforeCompile = shader => {
    shader.uniforms.idleBreath = idleBreath;
    shader.uniforms.swordBreath = swordBreath;
    shader.uniforms.idleGesture = idleGestures.motion;
    shader.vertexShader = 'uniform float idleBreath;\nuniform float swordBreath;\nuniform vec2 idleGesture;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n'
        + `float heightFromChest = (position.y * ${bellmaker.scale.toFixed(6)} - 0.15) / 0.095;\n`
        + 'float chest = exp(-heightFromChest * heightFromChest);\n'
        + 'float upperBody = smoothstep(-0.16, 0.045, position.y);\n'
        + 'transformed.xy += idleGesture * upperBody * vec2(0.014, 0.009);\n'
        + 'transformed.x += position.x * chest * idleBreath * 0.018;\n'
        + `transformed.y += upperBody * idleBreath * ${(0.004 / bellmaker.scale).toFixed(6)};\n`
        + `
          // The grip and tip are measured in the stationary drawn-sword atlas cell.
          vec2 grip = vec2(-0.094, -0.013);
          vec2 blade = vec2(0.154, -0.081);
          vec2 fromGrip = position.xy - grip;
          float along = clamp(dot(fromGrip, blade) / dot(blade, blade), 0.0, 1.0);
          float swordMask = 1.0 - smoothstep(0.014, 0.035, length(fromGrip - blade * along));
          vec2 swordMotion = vec2(-fromGrip.y, fromGrip.x) * 0.035 + vec2(0.0, 0.002);
          transformed.xy += swordMotion * swordMask * swordBreath;
        `
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
  const castShadow = sprite(hero.material.map, 1.78);
  const shadowLean = { value: 0 };
  castShadow.material.onBeforeCompile = shader => {
    shader.uniforms.shadowLean = shadowLean;
    shader.vertexShader = 'uniform float shadowLean;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      transformed.x += (position.y + 0.28) * shadowLean;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      diffuseColor.rgb = vec3(0.008, 0.014, 0.018);
      diffuseColor.a *= 1.0 - smoothstep(0.45, 0.89, vMapUv.y);
    `);
  };
  scene.add(castShadow);
  const reflection = sprite(hero.material.map, 1.48);
  const reflectionWorld = { value: new THREE.Vector3() };
  reflection.material.color.set(0x88b8bc);
  reflection.material.opacity = 0.34;
  reflection.material.onBeforeCompile = shader => {
    shader.uniforms.reflectionWorld = reflectionWorld;
    shader.vertexShader = 'varying vec2 roadPoint;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      roadPoint = (modelMatrix * vec4(position, 1.0)).xy;
    `);
    shader.fragmentShader = `varying vec2 roadPoint;\nuniform vec3 reflectionWorld;\n${puddleGLSL}` +
      shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        vec2 ground = vec2(0.5 + (roadPoint.x - reflectionWorld.x) / reflectionWorld.y, roadPoint.y / reflectionWorld.z);
        diffuseColor.a *= puddleAt(ground) * (1.0 - smoothstep(0.11, 0.17, ground.y));
      `);
  };
  scene.add(reflection);
  const updateIdleInbetweens = makeIdleInbetweens([hero.material, castShadow.material, reflection.material]);

  const animateFireflies = makeFireflies(scene);
  const animateCritters = makeCritters(scene);
  const animateBirds = makeBirds(scene);
  const animateDummies = makeTrainingDummies(scene, dummyAtlas);
  climate.applyLighting();
  const weaponShops = makeWeaponShops();
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
  let playerHealth = 5;
  let recoveryTime = 0;
  const playerDamage = document.createElement('div');
  playerDamage.className = 'damage-number player-damage-number';
  document.querySelector('#combat-hud').append(playerDamage);
  let damageAnimation;
  const hearts = [...document.querySelectorAll('.health use')];
  const renderHealth = () => {
    hearts.forEach((heart, index) => heart.style.opacity = index < playerHealth ? 1 : 0.22);
    hearts[0].closest('svg').setAttribute('aria-label', `Levens: ${playerHealth} van 5`);
  };
  let scratchCooldown = 0;
  let scratchFlash = 0;
  let guardTime = 0;
  let guardImpact = 0;
  const jumpDrift = new THREE.Vector2();
  let jumpDuration = 0.54;
  let jumpTime = jumpDuration;
  function jump() {
    if (weaponShops.open) return;
    if (demoTime >= 0 || jumpTime < jumpDuration) return;
    jumpDrift.set(0, 0);
    if (motion.lengthSq() > 0.14) jumpDrift.copy(motion);
    jumpDuration = jumpDrift.lengthSq() > 0 ? 0.59 : 0.50;
    jumpTime = 0;
  }

  const duration = { turn: 0.24, 'armed-turn': 0.24, draw: 0.48, slash: 0.42, recover: 0.20, sheathe: 0.48, punch: 0.31 };
  let brakeTime = 0;
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
    cameraScroll = 0;
    lookAhead = 0;

    phase = 0;
    attack = 0;
    jumpTime = jumpDuration;
    facing = 1;
    motion.set(0, 0);
    brakeTime = 0;
    sprintDirection = 0;
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

  function draw(dt, weatherDt = dt) {
    if (weaponShops.open) {
      idleGestures.update(0, false);
      return;
    }
    if (recoveryTime > 0) {
      recoveryTime = Math.max(0, recoveryTime - dt);
      if (recoveryTime > 0) return;
      playerHealth = 5;
      renderHealth();
      heroPosition.set(0.68, 0.91);
      cameraScroll = 0;
      facing = 1;
      keys.clear();
      touchDirections.clear();
      sprintDirection = 0;
      motion.set(0, 0);
      brakeTime = 0;
      startAction('idle');
      status.hidden = true;
    }
    scratchCooldown = Math.max(0, scratchCooldown - dt);
    scratchFlash = Math.max(0, scratchFlash - dt);
    guardImpact = Math.max(0, guardImpact - dt);
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
    const sprinting = sprintDirection !== 0 && Math.sign(stepDirection.x) === sprintDirection;
    if (!stepDirection.x) sprintDirection = 0;
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
    let guarding = false;
    if (!demoStage) {
      if (duration[action] && actionTime >= duration[action]) {
        startAction(['draw', 'recover', 'armed-turn'].includes(action) ? 'ready' : action === 'slash' ? 'recover' : 'idle');
      }
      const canTurn = ['idle', 'run', 'ready'].includes(action);
      guarding = !wasInAir && canTurn && (shieldKey || shieldPointers.size > 0);
      if (guarding) {
        if (stepDirection.x) facing = Math.sign(stepDirection.x);
        stepDirection.multiplyScalar(0.37);
      } else if (!wasInAir && canTurn && stepDirection.x && Math.sign(stepDirection.x) !== facing) {
        facing = Math.sign(stepDirection.x);
        startAction(action === 'ready' ? 'armed-turn' : 'turn');
      }
      if (action === 'idle' || action === 'run') action = stepDirection.lengthSq() ? 'run' : 'idle';
      if (['turn', 'armed-turn'].includes(action)) {
        // Plant on the first half of the turn. The exit step can already take input.
        stepDirection.multiplyScalar(THREE.MathUtils.smoothstep(actionTime / duration[action], 0.48, 0.94));
      }
      if (['slash', 'recover', 'punch'].includes(action)) stepDirection.set(0, 0);
      // Keep moving during weapon transitions. Defer reversing until the animation ends.
      if (stepDirection.x && Math.sign(stepDirection.x) !== facing) stepDirection.x = 0;
      if (wasInAir) stepDirection.copy(jumpDrift);
    }
    guardTime = guarding ? guardTime + dt : 0;
    const turning = action === 'turn' || action === 'armed-turn';
    const movingInput = stepDirection.lengthSq() > 0.001;
    const braking = !wasInAir && !movingInput && (action === 'idle' || action === 'ready') && motion.lengthSq() > 0.0144;
    brakeTime = braking ? brakeTime + dt : 0;
    const attackSlide = action === 'slash' || action === 'punch';
    const sliding = !wasInAir && !movingInput && (attackSlide || (braking && Math.abs(motion.x) > 0.7));
    if (sprinting && !wasInAir && !guarding) stepDirection.x *= 1.66;
    const response = wasInAir ? 20 : turning && actionTime < duration[action] * 0.48 ? 29
      : attackSlide ? 9 : movingInput ? 15 : 17;
    motion.lerp(stepDirection, 1 - Math.exp(-dt * response));
    if (!wasInAir && !movingInput && motion.lengthSq() < 0.0144) motion.set(0, 0);
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
    const maxScroll = Math.max(0, routeEnd - 0.5 + (routeOrigin - width) / backgroundWidth);
    lookAhead = THREE.MathUtils.lerp(lookAhead, reducedMotion.matches ? 0 : THREE.MathUtils.clamp(motion.x, -1, 1), 1 - Math.exp(-dt * 4));
    const cameraFocus = width * (0.62 - lookAhead * 0.12);
    const playerOnScreen = routeOrigin + (heroPosition.x - 0.5 - cameraScroll) * backgroundWidth;
    const offset = playerOnScreen - cameraFocus;
    const deadZone = width * 0.085;
    const correction = offset - THREE.MathUtils.clamp(offset, -deadZone, deadZone);
    let targetScroll = cameraScroll + correction / backgroundWidth;
    const visitEnd = heroPosition.x >= viewRight - 0.0001;
    if (visitEnd) targetScroll = maxScroll;
    const unscrolledX = playerOnScreen + cameraScroll * backgroundWidth;
    const minVisibleScroll = Math.max(0, (unscrolledX - width + margin) / backgroundWidth);
    const maxVisibleScroll = Math.min(maxScroll, (unscrolledX - margin) / backgroundWidth);
    const scroll = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(cameraScroll, targetScroll, 1 - Math.exp(-dt * 9)), minVisibleScroll, maxVisibleScroll);
    cameraScroll = scroll;
    backgroundCenter = routeOrigin - scroll * backgroundWidth;
    // Limit the offset over long walks so the far end of the town stays in view.
    const sceneryLag = scroll * (1 - sceneryParallax) / Math.hypot(1, scroll / 0.48);
    const sceneryCenter = backgroundCenter + sceneryLag * backgroundWidth;
    background.position.x = sceneryCenter;
    background.visible = sceneryCenter + backgroundWidth / 2 > 0;
    climate.update(weatherDt, scroll);
    updateRoute(routeOrigin, scroll, sceneryCenter);
    updateLivingScenery(sceneryCenter, reducedMotion.matches ? 0 : elapsed);
    const nextPhase = phase + dt * speed * 1.22 / bellmaker.cycle;
    const stepped = !wasInAir && movingInput && !turning && speed > 0.12
      && (heroPosition.x !== oldX || heroPosition.y !== oldY)
      && Math.floor(nextPhase * 2) !== Math.floor(phase * 2);
    const airProgress = jumpTime / jumpDuration;
    audio.update(stepped, previousJumpProgress < 0.88 && airProgress >= 0.88);
    if (movingInput && !turning && !wasInAir) phase = nextPhase % 1;
    else if (speed <= 0.12 || turning) phase = 0;
    const progress = THREE.MathUtils.clamp(actionTime / (duration[action] ?? 1), 0, 1);
    const footX = backgroundCenter + (heroPosition.x - 0.5) * backgroundWidth;
    const footY = (1 - heroPosition.y) * backgroundHeight;
    if (stepped || (previousJumpProgress < 0.88 && airProgress >= 0.88)) {
      routeEffects.footstep(heroPosition.x, footY / backgroundHeight);
    }
    const lighting = routeEffects.update(dt, sceneryCenter, footX, footY,
      sliding && Math.abs(motion.x) > 0.15, motion.x);
    weaponShops.update(sceneryCenter, footX);
    const flight = THREE.MathUtils.clamp((airProgress - 0.12) / 0.76, 0, 1);
    const lift = 4 * flight * (1 - flight);
    const airborne = jumpTime < jumpDuration && ['idle', 'run', 'ready', 'turn', 'armed-turn'].includes(action);
    const runningJump = jumpDrift.lengthSq() > 0;
    const armed = action === 'ready' || action === 'armed-turn';
    const jumpAction = `${armed ? 'armed-' : ''}${runningJump ? 'run-jump' : 'jump'}`;
    const pose = guarding ? (guardImpact > 0 ? 'guard-impact' : 'guard')
      : airborne ? jumpAction : brakeTime > 0 ? (armed ? 'armed-stop' : 'stop') : action;
    const guardProgress = guardImpact > 0 ? 1 - guardImpact / 0.18 : Math.min(guardTime / 0.16, 1);
    const gesture = idleGestures.update(Math.min(weatherDt, 0.18), !guarding && action === 'idle' && speed <= 0.12
      && !activeDirections.size && !airborne && demoTime < 0 && scratchFlash === 0);
    const frame = gesture?.frame ?? bellmaker.frame(pose, speed > 0.12, phase,
      guarding ? guardProgress : airborne ? airProgress : brakeTime > 0 ? Math.min(brakeTime / 0.16, 1) : progress, attack);
    hero.material.map = frame;
    updateIdleInbetweens(frame, gesture?.transition);
    const blockGlow = guarding ? guardImpact / 0.18 : 0;
    hero.material.color.setRGB(0.82 + lighting.strength * 0.24 + blockGlow * 0.35, 0.87 + lighting.strength * 0.11 + blockGlow * 0.17,
      scratchFlash > 0 ? 0.58 : 0.96 - lighting.strength * 0.04);
    const standingArmed = action === 'ready' && speed <= 0.12;
    idleTime = (action === 'idle' || standingArmed) && brakeTime === 0 && !airborne && !reducedMotion.matches ? idleTime + dt : 0;
    idleBreath.value = 0.5 - Math.cos(idleTime * 1.62) * 0.5;
    swordBreath.value = standingArmed ? idleBreath.value : 0;
    const facingSprite = (turning && progress < 0.5 && !airborne ? -facing : facing) * (gesture?.direction ?? 1);
    const spriteHeight = renderHeight * bellmaker.scale;
    hero.scale.set(heroWidth * bellmaker.scale * facingSprite, spriteHeight, 1);
    hero.position.set(footX, footY + spriteHeight * (0.5 - bellmaker.baseline)
      + lift * characterHeight * (runningJump ? 0.52 : 0.73), 3);
    updateSlashTrail(action, progress, attack);
    shadow.scale.set(characterHeight * (0.54 + lighting.strength * 0.62), characterHeight * 0.125, 1);
    shadow.material.opacity = (0.66 + lighting.strength * 0.34) * (1 - lift * 0.55);
    shadow.position.set(footX + lighting.direction * lighting.strength * characterHeight * 0.24, footY + 1, 2);
    const castHeight = spriteHeight * 0.15;
    shadowLean.value = lighting.direction * facingSprite * (0.20 + lighting.strength * 0.56);
    castShadow.material.map = frame;
    castShadow.material.opacity = (0.08 + lighting.strength * 0.31) * (1 - lift * 0.65);
    castShadow.scale.set(heroWidth * bellmaker.scale * facingSprite, castHeight, 1);
    castShadow.position.set(footX, footY + castHeight * (0.5 - bellmaker.baseline), 1.78);
    const reflectedHeight = spriteHeight * 0.54;
    reflection.material.map = frame;
    reflection.material.opacity = 0.34 - lift * 0.19;
    reflection.scale.set(heroWidth * bellmaker.scale * facingSprite, -reflectedHeight, 1);
    reflection.position.set(footX, footY - reflectedHeight * (0.5 - bellmaker.baseline), 1.48);
    reflectionWorld.value.set(backgroundCenter, backgroundWidth, backgroundHeight);

    landscapeTime.value = reducedMotion.matches ? 0 : elapsed;
    const { x: daylight, z: rain } = climate.weather.value;
    animateFireflies(elapsed, !reducedMotion.matches, sceneryCenter, (1 - daylight) * (1 - rain));
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
    const reach = attacking ? characterHeight * (swinging ? 0.97 * weaponShops.reach : action === 'punch' ? 0.49 : 0) : 0;
    const { hits, killed, scratched, pickedUp, blocked } = animateDummies(dt, heroPosition, reach, facing,
      THREE.MathUtils.clamp(height * 0.31, 100, 285) * (mobileLandscape.matches ? 0.65 : 0.5),
      swinging ? weaponShops.damage : 5, swinging ? attack : -1, lift < 0.16, guarding);
    if (blocked) {
      guardImpact = 0.18;
      audio.block();
    }
    if (pickedUp) weaponShops.collectCoins(pickedUp);
    const birdHit = animateBirds(dt, !reducedMotion.matches, sceneryCenter, footX, footY, facing, swinging ? reach : 0);
    if (swinging && (hits || birdHit)) audio.swordHit(attack);
    if (hits) audio.arcadeHit(killed);
    if (scratched && scratchCooldown === 0 && demoTime < 0) {
      const previousHealth = playerHealth;
      playerHealth--;
      renderHealth();
      playerDamage.textContent = `−${previousHealth - playerHealth}`;
      playerDamage.style.left = `${footX}px`;
      playerDamage.style.top = `${height - footY - characterHeight * (1.19 + lift * 0.73) - 12}px`;
      damageAnimation?.cancel();
      damageAnimation = playerDamage.animate([
        { opacity: 1, transform: 'translateY(0)', offset: 0 },
        { opacity: 1, offset: 0.3 },
        { opacity: 0, transform: reducedMotion.matches ? 'translateY(0)' : 'translateY(-34px)', offset: 1 },
      ], { duration: 810, easing: 'ease-out' });
      scratchCooldown = 1.15;
      scratchFlash = 0.20;
      audio.scratch();
      if (!playerHealth) {
        recoveryTime = 0.95;
        status.textContent = 'Je keert terug naar de Wereldboom.';
        status.hidden = false;
      }
    }
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
    if (demoTime >= 0 || weaponShops.open) return;
    if ((key === 'f' || key === 'draw') && (action === 'idle' || action === 'run')) startAction('draw');
    else if (key === 'f' && action === 'ready') startAction('sheathe');
    else if (key === ' ' && action === 'ready') startAction('slash');
    else if (key === ' ' && (action === 'idle' || action === 'run' || action === 'turn')) {
      if (action === 'turn' && actionTime < duration.turn * 0.5) facing *= -1;
      startAction('punch');
    }
  }, jump);
  new ResizeObserver(resize).observe(host);
  resize();
  draw(0);
  loadingScreen.hidden = true;
  controls.hidden = false;
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const frameTime = Math.max(0, (now - last) / 1000);
    draw(Math.min(frameTime, 0.04), Math.min(frameTime, 0.5));
    last = now;
  });
}

showMenu().catch(error => {
  console.error(error);
  loadingScreen.hidden = true;
  status.textContent = 'De interactieve scène kon niet laden. Vernieuw de pagina om het opnieuw te proberen.';
  status.hidden = false;
});





