const frame = document.querySelector('.sea-frame');
const canvas = frame.querySelector('canvas');
const toggle = frame.querySelector('button');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionLabel = () => paused ? 'Play sea motion' : 'Pause sea motion';
let renderer, observer, resizeObserver, renderId;
let visible = false;
let paused = reduceMotion.matches;
let time = 0;
let lastFrame;
let ship;
let failed = false;

// Add ship wake and horizon haze to the bundled Water shader.
const foam = `
  vec2 p = worldPosition.xz;
  float wakeDistance = max(p.y - 22., 0.);
  float wakeWidth = 3.8 + wakeDistance * .21;
  float wakeMask = smoothstep(22.,29.,p.y) * (1.-smoothstep(55.,135.,p.y));
  float bowMask = 1. - smoothstep(.2,2.5,abs(length(vec2(p.x,(p.y+22.)*.74))-4.9));
  bowMask *= 1. - smoothstep(-20.,-12.,p.y);
  vec2 churn = p * vec2(.048,.038) - vec2(0., time*.08);
  vec3 turbulence = texture2D(normalSampler,churn).rgb;
  float lacing = smoothstep(.12,.70,abs(turbulence.r-turbulence.g)*2.);
  float trails = exp(-abs(abs(p.x)-wakeWidth)*.47);
  float propWash = exp(-abs(p.x)*.34) * (1.-smoothstep(9.,65.,wakeDistance));
  float foam = (wakeMask*(trails*.72+propWash*.59)+bowMask*.68) * lacing;
  vec3 tinted = mix(vec3(.021,.070,.102), albedo * vec3(.26,.44,.53),.76);
  vec3 coloredWater = mix(tinted,vec3(.66,.76,.74),clamp(foam*1.35,0.,.82));
  vec3 outgoingLight = mix(coloredWater,vec3(.29,.40,.46),smoothstep(130.,850.,distance));
`;

function suspend() {
  cancelAnimationFrame(renderId);
  renderId = undefined;
  lastFrame = undefined;
}

function fallback() {
  failed = true;
  suspend();
  observer?.disconnect();
  resizeObserver?.disconnect();
  renderer?.dispose();
  frame.classList.remove('is-ready');
  toggle.hidden = true;
}

async function start() {
  try {
    const {
      ACESFilmicToneMapping, DirectionalLight, HemisphereLight, PerspectiveCamera, PlaneGeometry, RepeatWrapping,
      Scene, TextureLoader, Vector3, WebGLRenderer, GLTFLoader, Sky, Water
    } = await import('./sea-engine.mjs?v=4');
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = .85;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const scene = new Scene();
    scene.add(new HemisphereLight(0xcbdde7, 0x536974, 2.0));
    const sun = new DirectionalLight(0xffe5c2, 2.35);
    sun.position.set(-45, 37, 15);
    scene.add(sun);

    const camera = new PerspectiveCamera(37, 1, .2, 1700);
    const normalMap = await new TextureLoader().loadAsync(new URL('./north-sea-normal.jpg', import.meta.url).href);
    normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
    const sky = new Sky();
    sky.scale.setScalar(1200);
    const atmosphere = sky.material.uniforms;
    atmosphere.turbidity.value = 3.5;
    atmosphere.rayleigh.value = 1.8;
    atmosphere.mieCoefficient.value = .007;
    atmosphere.mieDirectionalG.value = .81;
    atmosphere.sunPosition.value.copy(sun.position).normalize();
    scene.add(sky);
    const water = new Water(new PlaneGeometry(1800,1800), {
      textureWidth: 320,
      textureHeight: 192,
      waterNormals: normalMap,
      sunDirection: sun.position.clone().normalize(),
      sunColor: 0xc7d0cb,
      waterColor: 0x143744,
      distortionScale: 3.4
    });
    water.rotation.x = -Math.PI / 2;
    water.material.uniforms.size.value = 8;
    water.material.fragmentShader = water.material.fragmentShader
      .replace('100.0, 2.0, 0.5', '78.0, 0.45, 0.43')
      .replace('float rf0 = 0.3;', 'float rf0 = 0.12;')
      .replace('vec3 outgoingLight = albedo;', foam);
    scene.add(water);

    ship = (await new GLTFLoader().loadAsync(new URL('./pollux.glb?v=2', import.meta.url).href)).scene;
    scene.add(ship);

    function draw() {
      water.material.uniforms.time.value = time * .55;
      ship.position.y = Math.sin(time*.94)*.28;
      ship.rotation.x = Math.sin(time*.76)*.012;
      ship.rotation.z = Math.sin(time*.88)*.022;
      renderer.render(scene, camera);
    }

    function render(now) {
      if (lastFrame === undefined || now - lastFrame >= 30) {
        if (lastFrame !== undefined) time += Math.min((now-lastFrame)/1000,.08);
        lastFrame = now;
        draw();
      }
      renderId = requestAnimationFrame(render);
    }

    function sync() {
      if (failed) return;
      toggle.textContent = motionLabel();
      if (!paused && visible && !document.hidden) {
        if (renderId === undefined) renderId = requestAnimationFrame(render);
      } else {
        suspend();
        draw();
      }
    }

    resizeObserver = new ResizeObserver(() => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      const distance = camera.aspect < 1.65 ? 1.33 : 1;
      camera.position.copy(new Vector3(43, 19.5, -37).multiplyScalar(distance));
      camera.lookAt(0, 4.9, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width,height,false);
      draw();
      frame.classList.add('is-ready');
    });
    resizeObserver.observe(frame);

    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    });
    observer.observe(frame);
    toggle.hidden = false;
    toggle.addEventListener('click', () => { paused = !paused; sync(); });
    reduceMotion.addEventListener('change', event => { paused = event.matches; sync(); });
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', fallback, { once: true });
  } catch (error) {
    console.warn('Northwatch sea scene fell back to its still image.', error);
    fallback();
  }
}

if ('IntersectionObserver' in window && 'ResizeObserver' in window) {
  const preload = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      preload.disconnect();
      start();
    }
  }, { rootMargin: '240px' });
  preload.observe(frame);
}
