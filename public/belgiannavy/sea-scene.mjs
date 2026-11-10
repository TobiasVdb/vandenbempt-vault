function refinePolluxMaterials(vessel) {
  const tuned = new Set();
  const finishes = {
    'Naval grey': { color: 0x82919b, roughness: .69, grain: .06, seams: .065 },
    'Light superstructure': { color: 0x9ba8ae, roughness: .62, grain: .043, seams: .038 },
    'Non-slip deck': { color: 0x545957, roughness: .88, grain: .1, seams: 0 },
  };
  vessel.traverse(object => {
    if (!object.isMesh) return;
    for (const material of [].concat(object.material)) {
      if (tuned.has(material)) continue;
      tuned.add(material);
      if (material.name === 'Bridge glass') {
        material.color.setHex(0x253d4a);
        material.roughness = .24;
        continue;
      }
      const finish = finishes[material.name];
      if (!finish) continue;
      material.map = null;
      material.color.setHex(finish.color);
      material.roughness = finish.roughness;
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vPaintPosition;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPosition = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
            varying vec3 vPaintPosition;
            float paintHash(vec3 p) {
              p = fract(p * .1031);
              p += dot(p, p.yzx + 33.33);
              return fract((p.x+p.y)*p.z);
            }`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            vec3 paintGrid = vPaintPosition * 14.;
            float paintGrain = (paintHash(floor(paintGrid))-.5)
              * (1.-smoothstep(.35,1.35,length(fwidth(paintGrid))));
            float plateCoordinate = vPaintPosition.z / 4.6 + .22;
            float plateDistance = abs(fract(plateCoordinate+.5)-.5);
            float aa = max(fwidth(plateCoordinate),.001);
            float plateJoint = (1.-smoothstep(.003,.003+aa,plateDistance)) * (1.-smoothstep(.014,.065,aa));
            diffuseColor.rgb *= 1. + paintGrain*${finish.grain.toFixed(3)} - plateJoint*${finish.seams.toFixed(3)};`);
      };
      material.customProgramCacheKey = () => material.name + ':pollux-paint-v1';
      material.needsUpdate = true;
    }
  });
}

function eveningSky(sky, sun) {
  sky.material.uniforms.sunDirection = { value: sun.position.clone().normalize() };
  sky.material.fragmentShader = `
    varying vec3 vWorldPosition;
    uniform vec3 sunDirection;
    float hash(vec2 p) {
      vec3 q = fract(vec3(p.xyx)*.1031);
      q += dot(q,q.yzx+33.33);
      return fract((q.x+q.y)*q.z);
    }
    float noise(vec2 p) {
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
    }
    float clouds(vec2 p) {
      return .51*noise(p)+.25*noise(p*2.07)+.13*noise(p*4.15)+.07*noise(p*8.33)+.04*noise(p*16.7);
    }
    void main() {
      vec3 d=normalize(vWorldPosition-cameraPosition);
      float above=max(0.,d.y);
      float toward=max(0.,dot(d,sunDirection));
      vec3 horizon=vec3(.128,.166,.197);
      vec3 warm=vec3(.93,.43,.15);
      vec3 sky=mix(horizon,vec3(.021,.045,.066),smoothstep(0.,.44,above));
      sky+=warm*pow(toward,18.)*exp(-above*5.);
      vec2 p=vec2(atan(d.z,-d.x)*9.,above*23.)+vec2(12.3,8.4);
      p += .72*vec2(noise(p*.54),noise(p*.54+7.));
      float density=clouds(p);
      float lowBand=clouds(p*vec2(1.19,1.55)+vec2(4.2,5.4));
      density=max(density,lowBand*.86+.06);
      float cover=smoothstep(.40,.58,density)*smoothstep(.004,.054,above);
      float edge=clamp((density-clouds(p+vec2(.17,-.12)))*5.+.25,0.,1.);
      vec3 cloud=mix(vec3(.020,.032,.043),vec3(.116,.147,.170),edge);
      cloud+=warm*edge*pow(toward,11.)*.85;
      sky=mix(sky,cloud,cover);
      float disc=smoothstep(.99978,.99991,toward);
      sky+=vec3(1.,.72,.39)*disc*(1.-cover*.92)*5.;
      gl_FragColor=vec4(sky,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
}


function openOcean(renderer, { OceanSim, Mesh, ShaderMaterial, PlaneGeometry, WebGLRenderTarget, FullscreenQuad, rawPass, Vector3 }, sun) {
  const gl = renderer.getContext();
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('Floating point render targets unavailable');
  const sim = new OceanSim(renderer);
  sim.params.choppiness *= .73;
  const uniforms = { transit: { value: 0 }, hull: { value: new Vector3() }, sun: { value: sun.position.clone().normalize() } };
  for (let i = 0; i < 4; i++) {
    uniforms['disp' + i] = { value: sim.displacement[i] };
    uniforms['slope' + i] = { value: sim.slope[i] };
  }
  const geometry = new PlaneGeometry(2, 2, 96, 96).rotateX(-Math.PI / 2);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), z = vertices.getZ(i);
    vertices.setXYZ(i, 900 * x ** 3, 0, 900 * z ** 3);
  }
  const displacement = sim.lengths.map((length, i) => 'uniform sampler2D disp' + i + ';').join('\n');
  const slopes = sim.lengths.map((length, i) => 'uniform sampler2D slope' + i + ';').join('\n');
  const sample = (name, i) => 'texture2D(' + name + i + ', (p-vec2(0.,transit))/' + sim.lengths[i].toFixed(2) + ')';
  const heightAt = `float heightAt(vec2 p) {
    return .28 * (${[0,1,2].map(i => sample('disp',i).replace('texture2D(', 'texture(') + '.y').join('+')});
  }`;
  // Read one packed pixel asynchronously; never stall rendering to retrieve wave heights.
  const probe = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  const probeQuad = new FullscreenQuad(rawPass(`
    precision highp float;
    ${displacement}
    uniform float transit;
    ${heightAt}
    out vec4 packedHeight;
    void main() {
      packedHeight = .5 + .25 * vec4(heightAt(vec2(0.,-18.)),heightAt(vec2(0.,18.)),
        heightAt(vec2(-3.8,0.)),heightAt(vec2(3.8,0.)));
    }
  `, uniforms));
  const bytes = new Uint8Array(4);
  const targetPose = new Vector3();
  let pending = false, probeFailed = false;
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: `
      ${displacement}
      uniform vec3 hull;
      uniform float transit;
      varying vec2 p;
      varying vec3 world;
      void main() {
        p = position.xz;
        vec3 d = ${[0,1,2].map(i => sample('disp',i) + '.xyz').join('+')};
        // Feather the water into the same plane as the hull near its waterline.
        float clearance = max(abs(p.x)-4.6,abs(p.y)-25.);
        float freeWave = smoothstep(.25,9.,clearance);
        float distant = 1.-smoothstep(210.,700.,length(p));
        world = position + d * vec3(.34,.28,.34) * freeWave * distant;
        world.y += (hull.x+hull.y*p.y+hull.z*p.x) * (1.-freeWave);
        float lateral = abs(p.x);
        float bowCrest = exp(-abs(p.y+24.1-lateral*.73)*1.1)*exp(-lateral*.28);
        float sternTrail = max(p.y-25.,0.);
        float sternCrest = exp(-abs(lateral-3.5-sternTrail*.34)*.58)
          * smoothstep(24.,30.,p.y)*(1.-smoothstep(72.,140.,p.y));
        world.y += bowCrest*(.20+.12*sin(p.x*3.4+transit*.7))
          + sternCrest*(.11+.08*sin(p.y*1.46-transit*1.7));
        gl_Position = projectionMatrix * viewMatrix * vec4(world,1.);
      }
    `,
    fragmentShader: `
      ${displacement}
      ${slopes}
      uniform vec3 sun;
      uniform vec3 hull;
      uniform float transit;
      varying vec2 p;
      varying vec3 world;
      void main() {
        vec2 slope = ${[0,1,2,3].map(i => sample('slope',i) + '.xy').join('+')};
        vec3 n = normalize(vec3(-slope.x*.56, 1., -slope.y*.56));
        vec3 v = normalize(cameraPosition-world);
        float fresnel = .02 + .98 * pow(1.-clamp(dot(v,n),0.,1.),5.);
        vec3 reflection = reflect(-v,n);
        vec3 sky = mix(vec3(.115,.151,.177), vec3(.037,.068,.096), smoothstep(0.,.65,reflection.y));
        vec3 sea = mix(vec3(.009,.027,.043), sky, fresnel);
        float glint = pow(max(0.,dot(reflection,sun)),110.) * 1.8 + pow(max(0.,dot(reflection,sun)),24.) * .16;
        float fold = min(${sample('disp',1)}.a,${sample('disp',2)}.a);
        float grain = smoothstep(.10,.50,length(${sample('slope',3)}.xy));
        float foam = (1.-smoothstep(.33,.78,fold)) * (.28 + .52*grain);

        float trail = max(0.,p.y-25.);
        float lateral = abs(p.x);
        float wakeLife = smoothstep(24.,28.,p.y)*(1.-smoothstep(72.,148.,p.y));
        vec2 foamUV = vec2(p.x*.27,p.y*.18-transit*.15);
        vec2 eddies = texture2D(slope2,foamUV*.21).xy;
        float patches = smoothstep(.04,.44,length(eddies));
        float broken = .52+.48*sin(p.y*.87-transit*.85+eddies.x*14.+p.x*.41);
        float outer = 3.5+trail*.34+.76*sin(trail*.31-transit*.26);
        float kelvin = exp(-abs(lateral-outer)*(.77/(1.+trail*.018)));
        float inner = exp(-abs(lateral-(2.+trail*.17))*.87);
        float propeller = exp(-pow(p.x/(2.+trail*.085),2.));
        float churn = smoothstep(.22,.82,grain*.54+broken*.26+patches*.69);
        float wake = wakeLife*(kelvin*.85+inner*.54+propeller*.80)*(.18+.93*churn);
        float bowRun = clamp((p.y+23.2)/17.,0.,1.);
        float hullWidth = mix(.18,4.4,smoothstep(0.,1.,bowRun));
        float surge = .48*sin(p.y*2.7+transit*.8+grain*3.8);
        float shoulder = exp(-abs(lateral-hullWidth-.75-surge)*1.5)
          * smoothstep(-24.4,-22.5,p.y)*(1.-smoothstep(-12.,15.,p.y));
        float crest = exp(-abs(p.y+24.1-lateral*.73)*1.9)*exp(-lateral*.30);
        float spray = smoothstep(.18,.77,grain+.34*broken);
        float side = exp(-abs(lateral-5.15)*1.15)*smoothstep(-12.,-5.,p.y)*(1.-smoothstep(17.,27.,p.y));
        foam = clamp(foam + wake + (crest*1.95+shoulder*1.26)*(.43+.75*spray)
          + side*(.34+.52*churn),0.,.97);

        vec3 color = mix(sea+glint*vec3(1.,.61,.27),vec3(.77,.83,.85),foam);
        color = mix(color, vec3(.112,.151,.175),smoothstep(140.,820.,distance(cameraPosition,world)));
        gl_FragColor = vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  let last = -1;
  return { mesh, update(time, underway) {
    uniforms.transit.value = underway ? time * 6.6 : 0;
    if (last >= 0 && time - last < .060) return;
    sim.update(last < 0 ? 0 : time - last);
    last = time;
    for (let i = 0; i < 4; i++) {
      uniforms['disp' + i].value = sim.displacement[i];
      uniforms['slope' + i].value = sim.slope[i];
    }
    if (!pending && !probeFailed) {
      pending = true;
      probeQuad.render(renderer, probe);
      renderer.readRenderTargetPixelsAsync(probe, 0, 0, 1, 1, bytes).then(([bow,stern,port,starboard]) => {
        const step = 4 / 255;
        targetPose.set(((bow+stern+port+starboard)*step*.25-2)*.59,
          (stern-bow)*step/36*.48, (starboard-port)*step/7.6*.32);
      }).catch(error => {
        probeFailed = true;
        console.warn('Pollux wave sampling unavailable.', error);
      }).finally(() => { pending = false; });
    }
    renderer.setRenderTarget(null);
  }, move(ship) {
    const pose = uniforms.hull.value.lerp(targetPose, .17);
    ship.position.y = pose.x;
    ship.rotation.x = -Math.atan(pose.y);
    ship.rotation.z = Math.atan(pose.z);

  }};
}

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
  frame.querySelector('.pollux-views')?.remove();
}

async function start() {
  try {
    const query = new URLSearchParams(location.search);

    let view = ['deck','helm'].includes(query.get('view')) ? query.get('view') : 'exterior';
    const viewControls = new Map();
    const controls = document.createElement('div');
    controls.className = 'pollux-views';
    controls.setAttribute('role','group');
    controls.setAttribute('aria-label','Pollux inspection views');
    for (const [value,label] of [['exterior','Exterior'],['deck','Deck'],['helm','Helm cutaway']]) {
      const control = document.createElement('button');
      control.type = 'button';
      control.textContent = label;
      control.setAttribute('aria-pressed',String(value === view));
      control.addEventListener('click', () => changeView(value));
      viewControls.set(value,control);
      controls.append(control);
    }
    const engine = await import("./sea-engine.mjs?v=8");
    const {
      ACESFilmicToneMapping, DirectionalLight, HemisphereLight, PerspectiveCamera,
      Scene, Vector3, WebGLRenderer, GLTFLoader, Sky
    } = engine;
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = .85;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const scene = new Scene();
    scene.add(new HemisphereLight(0xa7c0db, 0x536974, 1.72));
    const sun = new DirectionalLight(0xffbe7c, 2.7);
    sun.position.set(-91, 5.8, 31);
    scene.add(sun);
    const fill = new DirectionalLight(0xb9d4ea, .58);
    fill.position.set(27, 23, -13);
    scene.add(fill);
    const inspectionLight = new DirectionalLight(0xe0edf2,0);
    inspectionLight.position.set(10,22,14);
    scene.add(inspectionLight);
    const camera = new PerspectiveCamera(37, 1, .2, 1700);
    const sky = new Sky();
    sky.scale.setScalar(1200);
    const atmosphere = sky.material.uniforms;
    atmosphere.turbidity.value = 3.5;
    atmosphere.rayleigh.value = 1.8;
    atmosphere.mieCoefficient.value = .007;
    atmosphere.mieDirectionalG.value = .81;
    atmosphere.sunPosition.value.copy(sun.position).normalize();
    eveningSky(sky, sun);
    scene.add(sky);
    const ocean = openOcean(renderer, engine, sun);
    scene.add(ocean.mesh);

    ship = (await new GLTFLoader().loadAsync(new URL('./pollux.glb?v=8', import.meta.url).href)).scene;
    refinePolluxMaterials(ship);

    const roof = ship.getObjectByName('Bridge_roof_and_mast');
    const windows = ship.getObjectByName('Bridge_glazing_and_mullions');
    scene.add(ship);

    const aim = new Vector3();
    let cameraMove;
    let distance = 1;

    function cameraPose(name) {
      if (name === 'deck') return [new Vector3(29*distance,38*distance,48*distance),new Vector3(0,3.1,3.5)];
      if (name === 'helm') return [new Vector3(10*distance,8+12*distance,13*distance),new Vector3(0,7.4,2)];
      return [new Vector3(43,15.5,-37).multiplyScalar(distance),new Vector3(0,4.9,1)];
    }
    function setCutaway(enabled) {
      if (roof) roof.visible = !enabled;
      if (windows) windows.visible = !enabled;
    }
    function placeCamera(name) {
      const [position,target] = cameraPose(name);
      camera.position.copy(position);
      aim.copy(target);
      camera.lookAt(aim);
      setCutaway(name === 'helm');
      inspectionLight.intensity = name === 'exterior' ? 0 : 1.55;
    }
    function orbit(position,target) {
      const offset = position.clone().sub(target);
      return [Math.atan2(offset.x,offset.z),Math.atan2(offset.y,Math.hypot(offset.x,offset.z)),offset.length()];
    }
    function changeView(next) {
      if (next === view || failed) return;
      view = next;
      for (const [name,control] of viewControls) {
        control.setAttribute('aria-pressed', String(name === view));
      }
      if (reduceMotion.matches || !visible || document.hidden) {
        cameraMove = undefined;
        placeCamera(view);
      } else {
        cameraMove = { start: performance.now(), aim: aim.clone(), orbit: orbit(camera.position,aim),
          light: inspectionLight.intensity };
      }
      sync();
    }
    function animateCamera(now) {
      if (!cameraMove) return;
      const fraction = Math.min(1, (now-cameraMove.start)/950);
      if (fraction >= 1 || reduceMotion.matches) {
        cameraMove = undefined;
        placeCamera(view);
        return;
      }
      const eased = fraction*fraction*(3-2*fraction);
      const [position,target] = cameraPose(view);
      const [fromAngle,fromElevation,fromRadius] = cameraMove.orbit;
      const [toAngle,toElevation,toRadius] = orbit(position,target);
      const turn = Math.atan2(Math.sin(toAngle-fromAngle),Math.cos(toAngle-fromAngle));
      const angle = fromAngle + turn*eased;
      const elevation = fromElevation + (toElevation-fromElevation)*eased;
      const radius = fromRadius + (toRadius-fromRadius)*eased;
      const horizontal = Math.cos(elevation)*radius;
      aim.lerpVectors(cameraMove.aim,target,eased);
      camera.position.set(Math.sin(angle)*horizontal,Math.sin(elevation)*radius,Math.cos(angle)*horizontal).add(aim);
      camera.lookAt(aim);
      if (view === 'helm' && fraction > .55) setCutaway(true);
      if (view !== 'helm' && fraction > .40) setCutaway(false);
      inspectionLight.intensity = cameraMove.light + ((view === 'exterior' ? 0 : 1.55)-cameraMove.light)*eased;
    }
    placeCamera(view);


    function draw() {
      ocean.update(time, true);
      if (!paused) ocean.move(ship);
      renderer.render(scene, camera);
    }

    function render(now) {
      renderId = undefined;
      if (lastFrame === undefined || now - lastFrame >= 30) {
        if (!paused && lastFrame !== undefined) time += Math.min((now-lastFrame)/1000,.08);
        animateCamera(now);
        draw();
        lastFrame = now;
      }
      if (!paused || cameraMove) renderId = requestAnimationFrame(render);
      else lastFrame = undefined;
    }

    function sync() {
      if (failed) return;
      toggle.textContent = motionLabel();
      if ((!paused || cameraMove) && visible && !document.hidden) {
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
      distance = camera.aspect < 1.65 ? 1.33 : 1;
      if (!cameraMove) placeCamera(view);
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
    frame.append(controls);
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
