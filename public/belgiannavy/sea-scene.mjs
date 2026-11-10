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
      vec3 warm=vec3(1.12,.43,.12);
      vec3 sky=mix(horizon,vec3(.021,.045,.066),smoothstep(0.,.44,above));
      sky+=warm*pow(toward,21.)*exp(-above*4.);
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
      float disc=smoothstep(.99989,.99997,toward);
      sky+=vec3(1.,.52,.16)*pow(toward,230.)*1.10;
      sky+=vec3(1.,.56,.19)*disc*(1.-cover*.47)*10.;
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
  const geometry = new PlaneGeometry(2, 2, 112, 112).rotateX(-Math.PI / 2);
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

  const shipWave = `
    vec3 hullWave(vec2 p, float transit) {
      float x=abs(p.x), bowDistance=p.y+23.8, aft=max(0.,p.y-24.);
      float bowShoulder=mix(.18,4.45,smoothstep(0.,15.,bowDistance));
      float along=smoothstep(-1.8,1.,bowDistance)*(1.-smoothstep(12.,28.,bowDistance));
      float shoulder=x-bowShoulder;
      float contact=exp(-abs(shoulder-.62)*.91)*along;
      float bowOffset=.48*sin(x*1.46+transit*.93)+.23*sin(p.x*3.1-transit*.45);
      float bowCrest=exp(-abs(bowDistance-x*.62+1.0+bowOffset)*.72)*exp(-x*.23);
      float diverging=x-(1.1+max(0.,bowDistance)*.43);
      float shoulderTrain=exp(-abs(diverging)*.39)
        *smoothstep(-1.,3.,bowDistance)*(1.-smoothstep(28.,52.,bowDistance));
      float wakeSpread=3.6+aft*.34+sin(aft*.23+transit*.19)*min(1.9,aft*.085);
      float wakeEnvelope=exp(-abs(x-wakeSpread)/(1.4+aft*.055))
        *smoothstep(0.,6.,aft)*(1.-smoothstep(53.,133.,aft));
      float irregular=.84*sin(x*.83+p.y*.26)+.56*sin(p.x*1.51-p.y*.51);
      float bowPhase=diverging*1.5-bowDistance*.47+irregular;
      float wakePhase=x*.74-aft*.96+irregular+sin(transit*.72)*.31;
      float sternDrift=sin(aft*.28-transit*.41)*min(1.5,aft*.12);
      float sternCentre=exp(-pow((p.x-sternDrift)/(2.25+aft*.11),2.))
        *smoothstep(.5,3.5,aft)*(1.-smoothstep(33.,85.,aft));
      float pump=.86+.14*sin(transit*1.12+p.y*.41);
      float height=(bowCrest*.76+contact*.28)*pump
        + shoulderTrain*sin(bowPhase)*.20
        + wakeEnvelope*sin(wakePhase)*.29
        + sternCentre*sin(aft*1.65-transit*1.3+irregular)*.12;
      float breaking=(bowCrest*.98+contact*.72)*pump
        + shoulderTrain*smoothstep(.53,.97,sin(bowPhase))*.60
        + wakeEnvelope*smoothstep(.32,.91,sin(wakePhase))*.89;
      return vec3(height,breaking,sternCentre);
    }
  `;

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: `
      ${displacement}
      uniform vec3 hull;
      uniform float transit;
      varying vec2 p;
      varying vec3 world;
      varying float wakeHeight;
      ${shipWave}
      void main() {
        p = position.xz;
        vec3 d = ${[0,1,2].map(i => sample('disp',i) + '.xyz').join('+')};
        // Feather the water into the same plane as the hull near its waterline.
        float clearance = max(abs(p.x)-4.6,abs(p.y)-25.);
        float freeWave = smoothstep(.25,9.,clearance);
        float distant = 1.-smoothstep(210.,700.,length(p));
        world = position + d * vec3(.34,.28,.34) * freeWave * distant;
        world.y += (hull.x+hull.y*p.y+hull.z*p.x) * (1.-freeWave);
        wakeHeight = hullWave(p,transit).x;
        world.y += wakeHeight;
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
      varying float wakeHeight;
      ${shipWave}
      void main() {
        vec2 slope = ${[0,1,2,3].map(i => sample('slope',i) + '.xy').join('+')};
        vec3 nearHull = hullWave(p,transit);
        vec2 across = dFdx(p), down = dFdy(p);
        float determinant = across.x*down.y-across.y*down.x;
        float riseAcross = dFdx(wakeHeight), riseDown = dFdy(wakeHeight);
        vec2 wakeSlope = abs(determinant) > .00001
          ? vec2(riseAcross*down.y-riseDown*across.y,across.x*riseDown-down.x*riseAcross)/determinant
          : vec2(0.);
        vec3 n = normalize(vec3(-slope.x*.56-wakeSlope.x,1.,-slope.y*.56-wakeSlope.y));
        vec3 v = normalize(cameraPosition-world);
        float fresnel = .02 + .98 * pow(1.-clamp(dot(v,n),0.,1.),5.);
        vec3 reflection = reflect(-v,n);
        vec3 sky = mix(vec3(.115,.151,.177), vec3(.037,.068,.096), smoothstep(0.,.65,reflection.y));
        vec3 sea = mix(vec3(.009,.027,.043), sky, fresnel);
        float glint = pow(max(0.,dot(reflection,sun)),110.) * 3.1 + pow(max(0.,dot(reflection,sun)),24.) * .16;
        float fold = min(${sample('disp',1)}.a,${sample('disp',2)}.a);
        float grain = smoothstep(.10,.50,length(${sample('slope',3)}.xy));
        float foam = (1.-smoothstep(.33,.78,fold)) * (.28 + .52*grain);

        vec2 eddies=texture2D(slope2,vec2(p.x*.075,p.y*.065-transit*.047)).xy;
        float breakup=smoothstep(.17,.85,grain*.62+length(eddies)*1.9);
        float froth=smoothstep(.26,.72,breakup+grain*.34);
        foam=clamp(foam+nearHull.y*(.15+1.10*froth)+nearHull.z*(.25+.85*froth),0.,.96);
        vec3 color = mix(sea+glint*vec3(1.,.47,.16),vec3(.77,.83,.85),foam);
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
  return { mesh, update(time) {
    uniforms.transit.value = time * 6.6;
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


function addTourHardware(ship, engine) {
  const { BoxGeometry, CanvasTexture, CatmullRomCurve3, Mesh, MeshBasicMaterial,
    MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, TubeGeometry, Vector3 } = engine;
  const enclosure = new MeshStandardMaterial({ color: 0x141b1d, roughness: .62 });
  const metal = new MeshStandardMaterial({ color: 0x68777b, metalness: .48, roughness: .48 });
  function box(size, at, material) {
    const part = new Mesh(new BoxGeometry(...size), material);
    part.position.set(...at);
    ship.add(part);
    return part;
  }
  box([.35,.024,.25],[1.18,4.05,-19],metal);
  box([.32,.08,.22],[1.18,4.10,-19],enclosure);
  box([.29,.015,.19],[1.18,4.147,-19],enclosure);
  const label = new MeshBasicMaterial({color:0xa7cb70});
  box([.067,.004,.012],[1.18,4.156,-18.95],label);
  const route = new CatmullRomCurve3([
    [1.34,4.10,-19],[2.08,4.10,-19],[2.30,4.48,-18.6],[2.65,4.54,-17.4],
    [3.28,4.55,-14],[3.85,4.54,-10],[4.10,4.45,-6],[4.12,4.42,-2],
    [4.06,4.45,1],[3.83,4.65,3.6],[3.60,5.92,3.8],[3.55,7.36,3.7],
    [3.23,7.52,3.45],[2.92,7.56,2.7],[2.98,7.30,-.3],[2.47,7.30,-2.8],[2.30,8.36,-2.88]
  ].map(point => new Vector3(...point)), false, 'centripetal');
  const cable = new Mesh(new TubeGeometry(route, 120,.009,7,false),
    new MeshStandardMaterial({color:0xbd8b3f,roughness:.76}));
  ship.add(cable);
  const display = box([.85,.48,.085],[2.27,8.58,-2.88],enclosure);
  display.rotation.x = -.12;
  box([.17,.22,.15],[2.27,8.27,-2.97],enclosure);
  const pixels = document.createElement('canvas');
  pixels.width = 512;
  pixels.height = 288;
  const ctx = pixels.getContext('2d');
  const texture = new CanvasTexture(pixels);
  texture.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new PlaneGeometry(.78,.40),new MeshBasicMaterial({map:texture,toneMapped:false}));
  screen.position.set(0,0,.047);
  display.add(screen);

  // Read the same status copy and colors used by the page's bridge display.
  const statuses = [...document.querySelectorAll('#bridge-status .status-panel')].map(panel => ({
    color: getComputedStyle(panel).getPropertyValue('--state-color').trim(),
    heading: panel.querySelector('h3').innerText.split('\n'),
    icon: panel.querySelector('.status-icon').textContent.trim(),
    detail: panel.querySelector('p').textContent.trim(),
    response: panel.querySelector('.status-mode strong').textContent.trim(),
  }));
  let previous = -1;
  function updateScreen(progress) {
    const index = Math.min(statuses.length-1,Math.max(0,Math.floor(progress*statuses.length)));
    if (index === previous || index < 0) return;
    previous = index;
    const {color,heading,icon,detail,response} = statuses[index];
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,512,288);
    ctx.fillStyle = '#151c1d';
    ctx.font = 'bold 21px monospace';
    ctx.fillText('NORTHWATCH',22,32);
    ctx.fillRect(22,44,468,2);
    ctx.fillStyle = color;
    ctx.fillRect(432,12,58,25);
    ctx.fillRect(419,65,71,71);
    ctx.fillStyle = '#151c1d';
    ctx.fillText('PNT',441,32);
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(icon,454,115);
    ctx.textAlign = 'left';
    heading.forEach((line,i) => ctx.fillText(line,22,94+i*43,383));
    ctx.font = '17px sans-serif';
    let line = '', row = 0;
    for (const word of detail.split(' ')) {
      const next = line ? line+' '+word : word;
      if (ctx.measureText(next).width > 468) {
        ctx.fillText(line,22,169+row++*20);
        line = word;
      } else line = next;
    }
    ctx.fillText(line,22,169+row*20);
    ctx.fillRect(22,231,468,2);
    ctx.font = '15px monospace';
    ctx.fillText('WATCH RESPONSE',22,252);
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(response,22,275,468);
    texture.needsUpdate = true;
  }

  updateScreen(0);

  const sectionWalls = [];
  const wall = new MeshStandardMaterial({color:0x66757a,roughness:.84});
  const cutEdge = new MeshStandardMaterial({color:0xa7b8b7,roughness:.72});
  const outline = [[-3.24,8.8],[3.24,8.8],[3.24,-3.55],[1.96,-4.84],
    [-1.96,-4.84],[-3.24,-3.55],[-3.24,8.8]];
  for (let i=1;i<outline.length;i++) {
    const [ax,az] = outline[i-1], [bx,bz] = outline[i];
    const length = Math.hypot(bx-ax,bz-az);
    const x = (ax+bx)/2, z = (az+bz)/2;
    const angle = -Math.atan2(bz-az,bx-ax);
    const lowerWall = box([length,.49,.13],[x,7.44,z],wall);
    const cutLip = box([length,.045,.18],[x,7.70,z],cutEdge);
    lowerWall.rotation.y = cutLip.rotation.y = angle;
    sectionWalls.push(lowerWall,cutLip);
  }
  function setCutaway(enabled) {
    for (const wall of sectionWalls) wall.visible = enabled;
  }
  setCutaway(false);

  return { route, updateScreen, setCutaway };
}

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
    let touring = view === 'exterior' && !reduceMotion.matches;
    let tourElapsed = 0;
    const viewControls = new Map();
    const controls = document.createElement('div');
    controls.className = 'pollux-views';
    controls.setAttribute('role','group');
    controls.setAttribute('aria-label','Pollux inspection views');
    for (const [value,label] of [['tour','Tour'],['exterior','Exterior'],['deck','Deck'],['helm','Helm cutaway']]) {
      const control = document.createElement('button');
      control.type = 'button';
      control.textContent = label;
      control.setAttribute('aria-pressed',String(value === (touring ? 'tour' : view)));
      control.addEventListener('click', () => changeView(value));
      viewControls.set(value,control);
      controls.append(control);
    }
    const engine = await import("./sea-engine.mjs?v=12");
    const {
      ACESFilmicToneMapping, DirectionalLight, HemisphereLight, PerspectiveCamera,
      Scene, Vector3, WebGLRenderer, GLTFLoader, Sky, CatmullRomCurve3
    } = engine;
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = .85;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const scene = new Scene();
    scene.add(new HemisphereLight(0xa7c0db, 0x536974, 1.72));
    const sun = new DirectionalLight(0xffae65, 4.0);
    sun.position.set(-91, 3.2, 31);
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
    const hardware = addTourHardware(ship,engine);

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
      hardware.setCutaway(enabled);
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

    // Follow the routed cable from outside the rail before entering the bridge cutaway.
    const bowAim = new Vector3(1.55,4.37,-18.9);
    const helmAim = new Vector3(2.23,8.46,-2.91);
    const bowPosition = new Vector3(6.2,7.1,-17.65);
    const helmPosition = new Vector3(3.34,9.61,.40);
    const cableCamera = new CatmullRomCurve3([
      bowPosition, new Vector3(6.6,7.15,-12), new Vector3(7.1,7.4,-4),
      new Vector3(6.7,8.7,2.8), new Vector3(5.2,10.3,2.45), helmPosition
    ]);
    const tourLength = 26;
    const smooth = value => value*value*(3-2*value);
    const tourPosition = new Vector3();
    const tourAim = new Vector3();
    function applyTourPose(position,target) {
      ship.updateMatrixWorld(true);
      camera.position.copy(ship.localToWorld(position));
      aim.copy(ship.localToWorld(target));
      camera.lookAt(aim);
    }
    function tourOrbit(fromPosition,fromTarget,toPosition,toTarget,progress) {
      const [fromAngle,fromElevation,fromRadius] = orbit(fromPosition,fromTarget);
      const [toAngle,toElevation,toRadius] = orbit(toPosition,toTarget);
      const turn = Math.atan2(Math.sin(toAngle-fromAngle),Math.cos(toAngle-fromAngle));
      const angle = fromAngle + turn*progress;
      const elevation = fromElevation + (toElevation-fromElevation)*progress;
      const radius = fromRadius + (toRadius-fromRadius)*progress;
      const horizontal = Math.cos(elevation)*radius;
      tourAim.lerpVectors(fromTarget,toTarget,progress);
      tourPosition.set(Math.sin(angle)*horizontal,Math.sin(elevation)*radius,Math.cos(angle)*horizontal).add(tourAim);
      applyTourPose(tourPosition,tourAim);
    }
    function animateTour() {
      const elapsed = tourElapsed;
      const phase = elapsed < 4 ? 0 : 4+(elapsed-4)%tourLength;
      const [exteriorPosition,exteriorAim] = cameraPose('exterior');
      let shot = 'exterior';
      if (phase < 4 || phase >= 20) {
        placeCamera('exterior');
      } else if (phase < 7) {
        shot = 'bow-approach';
        const progress = smooth((phase-4)/3);
        tourOrbit(exteriorPosition,exteriorAim,bowPosition,bowAim,progress);
        inspectionLight.intensity = progress*.9;
        setCutaway(false);
      } else if (phase < 8) {
        shot = 'bow-device';
        applyTourPose(tourPosition.copy(bowPosition),tourAim.copy(bowAim));
      } else if (phase < 12) {
        shot = 'cable';
        const progress = smooth((phase-8)/4);
        cableCamera.getPointAt(progress,tourPosition);
        hardware.route.getPointAt(Math.min(1,progress+.055),tourAim);
        if (progress > .78) tourAim.lerp(helmAim,smooth((progress-.78)/.22));
        applyTourPose(tourPosition,tourAim);
        setCutaway(progress > .78);
        inspectionLight.intensity = .9+progress*.65;
      } else if (phase < 17) {
        shot = 'helm-display';
        applyTourPose(tourPosition.copy(helmPosition),tourAim.copy(helmAim));
        hardware.updateScreen((phase-12)/5);
        setCutaway(true);
      } else {
        shot = 'return';
        const progress = smooth((phase-17)/3);
        tourOrbit(helmPosition,helmAim,exteriorPosition,exteriorAim,progress);
        setCutaway(progress < .52);
        inspectionLight.intensity = 1.55*(1-progress);
      }
      frame.dataset.tourShot = shot;
    }

    function changeView(next) {
      if (failed || (!touring && next === view) || (touring && next === 'tour')) return;
      touring = next === 'tour' && !reduceMotion.matches;
      tourElapsed = 0;
      view = next === 'tour' ? 'exterior' : next;
      delete frame.dataset.tourShot;
      for (const [name,control] of viewControls) {
        control.setAttribute('aria-pressed', String(name === (touring ? 'tour' : view)));
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
      ocean.update(time);
      if (!paused) ocean.move(ship);
      if (touring && !cameraMove) animateTour();
      renderer.render(scene, camera);
    }

    function render(now) {
      renderId = undefined;
      if (lastFrame === undefined || now - lastFrame >= 30) {
        if (!paused && lastFrame !== undefined) {
          const delta = (now-lastFrame)/1000;
          time += Math.min(delta,.08);
          if (touring && !cameraMove) tourElapsed += delta;
        }
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
    reduceMotion.addEventListener('change', event => {
      paused = event.matches;
      if (event.matches && touring) changeView('exterior');
      sync();
    });
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
