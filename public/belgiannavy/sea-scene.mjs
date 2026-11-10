const helmRadarArtwork = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288" viewBox="0 0 512 288">
  <rect width="512" height="288" fill="#091a1a"/>
  <rect width="512" height="28" fill="#203b3b"/>
  <g fill="#a3c9c3" font-family="monospace" font-size="13">
    <text x="12" y="19">RADAR / X-BAND</text><text x="384" y="19">HEAD UP</text>
    <text x="354" y="60">RANGE</text><text x="354" y="83" font-size="20">6.0 NM</text>
    <text x="354" y="125">HEADING</text><text x="354" y="148" font-size="20">037°</text>
    <text x="354" y="190">TARGETS</text><text x="354" y="213" font-size="20">03</text>
    <text x="354" y="263" fill="#779891">DEMO</text>
  </g>
  <path d="M332 40V274" stroke="#335454"/>
  <g transform="translate(173 154)">
    <circle r="111" fill="#0b2924" stroke="#6c9a86"/>
    <path d="M0 0V-110A110 110 0 0 1 84 -71Z" fill="#1a503a"/>
    <g fill="none" stroke="#548572">
      <circle r="28"/><circle r="55"/><circle r="83"/>
      <path d="M-111 0H111M0-111V111M-78-78 78 78M-78 78 78-78" stroke-dasharray="4 5"/>
    </g>
    <path d="M0 0V-106" stroke="#a9ead2" stroke-width="2"/>
    <path d="m-76-39 7-4 8 1 7 6-11 4zm107 62 4-7 8 2 4 6-7 6zm24-77 4-3 5 2-2 5-5 1z" fill="#8ae5a5"/>
    <g fill="none" stroke="#c5eab2" stroke-width="2">
      <circle cx="38" cy="24" r="8"/><circle cx="59" cy="-54" r="7"/>
      <path d="m38 24 16 11m5-89 12-10"/>
    </g>
    <path d="m0-6 5 11-5-2-5 2z" fill="#d9f8f2"/>
  </g>
</svg>`;

const helmChartArtwork = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288" viewBox="0 0 512 288">
  <rect width="512" height="288" fill="#0d333f"/>
  <g fill="none" stroke="#416773" opacity=".75">
    <path d="M0 79H366M0 130H366M0 181H366M0 232H366M70 28V288M140 28V288M210 28V288M280 28V288"/>
  </g>
  <path d="M0 28H124L111 52 129 72 96 92 106 124 76 144 84 163 43 196 52 216 23 244 32 288H0Z" fill="#b0a47a" stroke="#e1d6a7" stroke-width="2"/>
  <path d="M145 28 140 63 157 75 126 103 136 133 109 153 112 178 67 212 76 232 57 253 61 288M167 28 165 61 181 81 154 112 160 143 136 165 133 196 93 230 98 257 83 288" fill="none" stroke="#69969c" stroke-width="1.5"/>
  <path d="M129 277 176 212 226 162 259 111 302 57" fill="none" stroke="#e89bcf" stroke-width="3"/>
  <g fill="#d9aed2" stroke="#492a50" stroke-width="2">
    <circle cx="176" cy="212" r="5"/><circle cx="259" cy="111" r="5"/><circle cx="302" cy="57" r="5"/>
  </g>
  <path d="m226 152 5 18-6-4-7 1z" fill="#fff6cc" stroke="#142d35" stroke-width="2"/>
  <g fill="#afc9c7" font-family="monospace" font-size="12">
    <text x="186" y="103">18</text><text x="246" y="221">27</text><text x="303" y="160">32</text>
    <text x="131" y="185">12</text><text x="277" y="99">WP 02</text>
  </g>
  <rect x="366" width="146" height="288" fill="#10272d"/>
  <rect width="512" height="28" fill="#29494d"/>
  <g fill="#c1d7d2" font-family="monospace" font-size="13">
    <text x="12" y="19">NAVIGATION / CHART</text><text x="384" y="19">NORTH UP</text>
    <text x="382" y="61">COG</text><text x="382" y="84" font-size="20">037°</text>
    <text x="382" y="125">SOG</text><text x="382" y="148" font-size="20">15.2 kn</text>
    <text x="382" y="190">NEXT WP</text><text x="382" y="213" font-size="20">02</text>
    <text x="382" y="263" fill="#829f9b">DEMO CHART</text>
  </g>
</svg>`;

const helmTelemetryArtwork = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288">
  <rect width="512" height="288" fill="#081c26"/>
  <path d="M0 0H512V29H0Z" fill="#243e49"/>
  <g fill="#b0cacc" font-family="monospace" font-size="14">
    <text x="14" y="20">VESSEL TELEMETRY</text><text x="414" y="20">CONNING</text>
    <text x="24" y="57">HEADING</text><text x="189" y="57">SPEED</text><text x="357" y="57">DEPTH</text>
    <text x="24" y="88" font-size="24" fill="#e3f4ec">037°</text>
    <text x="189" y="88" font-size="24" fill="#e3f4ec">15.2 kn</text>
    <text x="357" y="88" font-size="24" fill="#e3f4ec">68 m</text>
    <text x="24" y="134">DEPTH TREND</text><text x="24" y="271">60 S</text>
  </g>
  <path d="M24 151H488V247H24Z M24 183H488M24 215H488M140 151V247M256 151V247M372 151V247" fill="none" stroke="#31525d"/>
  <path d="M24 177L52 180 82 174 111 185 141 188 169 183 198 196 227 194 256 203 285 198 315 209 343 206 373 218 401 211 431 215 459 211 488 222V247H24Z" fill="#32616d" stroke="#78aeb1" stroke-width="2"/>
</svg>`;

const helmCommsArtwork = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288">
  <rect width="512" height="288" fill="#091b23"/>
  <path d="M0 0H512V29H0Z" fill="#263e49"/>
  <path d="M22 49H490V146H22Z" fill="#143744" stroke="#53727a"/>
  <path d="M22 179H490M22 219H490M22 252H490" stroke="#35535b"/>
  <g fill="#b8d1cf" font-family="monospace" font-size="14">
    <text x="14" y="20">BRIDGE COMMS / VHF</text><text x="424" y="20">WATCH</text>
    <text x="38" y="74">ACTIVE CHANNEL</text><text x="38" y="124" font-size="44" fill="#e0f6ee">16</text>
    <text x="155" y="111" font-size="18">CALLING / DISTRESS</text>
    <text x="385" y="74" fill="#a8d5a1">RX READY</text>
    <text x="24" y="203">DUAL WATCH</text><text x="418" y="203">ON</text>
    <text x="24" y="242">SQUELCH</text><text x="418" y="242">04</text>
  </g>
</svg>`;

function addHelmInstrumentTextures(ship, { MeshBasicMaterial, SRGBColorSpace, TextureLoader }) {
  const loader = new TextureLoader();
  const materials = new Map();
  const artworkByMaterial = new Map([
    ['Helm radar face', helmRadarArtwork],
    ['Helm chart face', helmChartArtwork],
    ['Helm telemetry face', helmTelemetryArtwork],
    ['Helm comms face', helmCommsArtwork],
  ]);
  ship.traverse(object => {
    if (!object.isMesh) return;
    const name = object.material.name;
    const artwork = artworkByMaterial.get(name);
    if (!artwork) return;
    if (!materials.has(name)) {
      const map = loader.load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artwork));
      map.colorSpace = SRGBColorSpace;
      map.flipY = false;
      materials.set(name, new MeshBasicMaterial({ map, toneMapped: false }));
    }
    object.material = materials.get(name);
  });
}

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
    float cloudField(vec2 p) {
      vec2 bend=vec2(noise(p*.48),noise(p*.48+vec2(7.3,4.1)))-.5;
      p+=bend*.93;
      mat2 turn=mat2(.8,.6,-.6,.8);
      vec2 q=turn*p*2.06;
      vec2 r=turn*q*2.09;
      return .54*noise(p)+.25*noise(q)+.13*noise(r)+.055*noise(r*2.1)+.025*noise(r*4.3);
    }
    void main() {
      vec3 d=normalize(vWorldPosition-cameraPosition);
      float above=max(0.,d.y);
      float toward=max(0.,dot(d,sunDirection));
      vec3 horizon=vec3(.069,.105,.138);
      vec3 warm=vec3(1.30,.46,.105);
      vec3 sky=mix(horizon,vec3(.021,.045,.066),smoothstep(0.,.44,above));
      sky+=warm*pow(toward,29.)*exp(-above*14.);
      // Project onto horizontal layers so distant banks compress toward the sea horizon.
      vec2 plane=d.xz/(above+.20);
      vec2 highPoint=plane*vec2(.63,.99)+vec2(6.1,12.8);
      float highCover=smoothstep(.42,.68,cloudField(highPoint))*smoothstep(.008,.09,above);
      sky=mix(sky,vec3(.062,.088,.112)+warm*pow(toward,11.)*.13,highCover*.46);
      vec2 p=vec2(atan(d.z,-d.x)*8.5,above*26.)+vec2(12.8,8.2);
      float density=cloudField(p);
      float cover=smoothstep(.38,.57,density)*smoothstep(.004,.038,above);
      float sunAzimuth=atan(sunDirection.z,-sunDirection.x);
      float azimuth=atan(d.z,-d.x);
      vec2 lightStep=normalize(vec2(sin(sunAzimuth-azimuth),sunDirection.y-above-.12))*.32;
      float litFace=clamp((density-cloudField(p+lightStep))*4.3+.13,0.,1.);
      float thickness=smoothstep(.40,.72,density);
      vec3 cloud=mix(vec3(.052,.082,.105),vec3(.012,.024,.038),thickness);
      cloud+=vec3(.071,.095,.113)*litFace;
      cloud+=warm*pow(litFace,1.7)*pow(toward,7.)*(1.-thickness*.72)*.93;
      sky=mix(sky,cloud,cover);
      float disc=smoothstep(.99995,.99999,toward);
      sky+=vec3(1.,.34,.055)*pow(toward,290.)*1.86;
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
      float wakeEnvelope=exp(-abs(x-wakeSpread)/(1.75+aft*.062))
        *smoothstep(0.,4.,aft)*(1.-smoothstep(61.,138.,aft));
      float irregular=.84*sin(x*.83+p.y*.26)+.56*sin(p.x*1.51-p.y*.51);
      float bowPhase=diverging*1.5-bowDistance*.47+irregular;
      float wakePhase=x*.74-aft*.96+irregular+sin(transit*.54-aft*.19)*.38;
      float sternDrift=sin(aft*.28-transit*.41)*min(1.5,aft*.12);
      float sternCentre=exp(-pow((p.x-sternDrift)/(2.45+aft*.105),2.))
        *smoothstep(0.,2.6,aft)*(1.-smoothstep(40.,94.,aft));
      float pump=.86+.14*sin(transit*1.12+p.y*.41);
      float height=(bowCrest*.93+contact*.31)*pump
        + shoulderTrain*sin(bowPhase)*.20
        + wakeEnvelope*sin(wakePhase)*.43
        + sternCentre*sin(aft*1.65-transit*1.3+irregular)*.12;
      float breaking=(bowCrest*1.18+contact*.89)*pump
        + shoulderTrain*smoothstep(.53,.97,sin(bowPhase))*.60
        + wakeEnvelope*smoothstep(.08,.81,sin(wakePhase))*1.30;
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
        world = position + d * vec3(.41,.47,.41) * freeWave * distant;
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
        vec3 n = normalize(vec3(-slope.x*.67-wakeSlope.x,1.,-slope.y*.67-wakeSlope.y));
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
        float froth=smoothstep(.19,.73,breakup+grain*.37);
        foam=clamp(foam+nearHull.y*(.19+1.18*froth)+nearHull.z*(.22+1.24*froth),0.,.96);
        vec3 color = mix(sea+glint*vec3(1.,.47,.16),vec3(.69,.79,.85),foam);
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
    uniforms.transit.value = time * 7.8;
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



function addNavigationLights(ship, { BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, ShaderMaterial, Vector3 }) {
  const baseMaterial = new MeshStandardMaterial({color:0x20292d,roughness:.65});
  const baseGeometry = new BoxGeometry(.28,.14,.23);
  const lensGeometry = new BoxGeometry(.18,.19,.16);
  const haloGeometry = new PlaneGeometry(1.15,1.15);
  const radians = Math.PI/180;
  const lamps = [
    { name:'Port sidelight', at:[-3.72,8.43,-2.8], color:0xff4248, center:-56.25, width:112.5, roof:true },
    { name:'Starboard sidelight', at:[3.72,8.43,-2.8], color:0x5dff92, center:56.25, width:112.5, roof:true },
    { name:'Forward masthead light', at:[0,9.7,-4.4], color:0xfff6dc, center:0, width:225, roof:true },
    { name:'Aft masthead light', at:[0,15.4,8.35], color:0xfff6dc, center:0, width:225, roof:true },
    { name:'Sternlight', at:[0,2.05,26.62], color:0xfff6dc, center:180, width:135, roof:false },
  ].map(spec => {
    const base = new Mesh(baseGeometry,baseMaterial);
    base.name = spec.name + ' housing';
    base.position.set(...spec.at);
    const lens = new Mesh(lensGeometry,new MeshBasicMaterial({color:spec.color,toneMapped:false}));
    lens.name = spec.name;
    lens.position.y = .135;
    const halo = new Mesh(haloGeometry,new ShaderMaterial({
      transparent:true, depthWrite:false, toneMapped:false,
      uniforms:{ lightColor:{value:lens.material.color} },
      vertexShader:`
        varying vec2 glowUV;
        void main() {
          glowUV = uv;
          vec4 origin = modelViewMatrix * vec4(0.,0.,0.,1.);
          gl_Position = projectionMatrix * (origin + vec4(position.xy,0.,0.));
        }`,
      fragmentShader:`
        varying vec2 glowUV;
        uniform vec3 lightColor;
        void main() {
          float radius = length(glowUV - .5) * 2.;
          float glow = pow(max(0.,1.-radius),3.) * .55;
          gl_FragColor = vec4(lightColor,glow);
          #include <colorspace_fragment>
        }`,
    }));
    halo.position.y = .135;
    base.add(lens,halo);
    ship.add(base);
    return {...spec,base,lens,halo};
  });
  const localCamera = new Vector3();
  return (camera,cutaway) => {
    localCamera.copy(camera.position);
    ship.worldToLocal(localCamera);
    for (const {base,lens,halo,center,width,roof} of lamps) {
      base.visible = !roof || !cutaway;
      const bearing = Math.atan2(localCamera.x-base.position.x,base.position.z-localCamera.z);
      const angle = bearing-center*radians;
      const inSector = Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle))) <= width*radians/2;
      lens.visible = halo.visible = inSector;
    }
  };
}

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
  const displayCenter = new Vector3(2.48,8.21,-2.82);
  const route = new CatmullRomCurve3([
    [1.34,4.10,-19],[2.08,4.10,-19],[2.30,4.48,-18.6],[2.65,4.54,-17.4],
    [3.28,4.55,-14],[3.85,4.54,-10],[4.10,4.45,-6],[4.12,4.42,-2],
    [4.06,4.45,1],[3.83,4.65,3.6],[3.60,5.92,3.8],[3.55,7.36,3.7],
    [3.23,7.52,3.45],[2.92,7.56,2.7],[2.98,7.30,-.3],[2.58,7.30,-2.82],
    [displayCenter.x,8.11,displayCenter.z-.045]
  ].map(point => new Vector3(...point)), false, 'centripetal');
  const cable = new Mesh(new TubeGeometry(route, 120,.009,7,false),
    new MeshStandardMaterial({color:0xbd8b3f,roughness:.76}));
  ship.add(cable);
  const display = box([.425,.24,.0425],displayCenter.toArray(),enclosure);
  display.rotation.x = -.12;
  box([.085,.12,.075],[displayCenter.x,8.055,displayCenter.z-.02],enclosure);
  const pixels = document.createElement('canvas');
  pixels.width = 512;
  pixels.height = 288;
  const ctx = pixels.getContext('2d');
  const texture = new CanvasTexture(pixels);
  texture.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new PlaneGeometry(.39,.20),new MeshBasicMaterial({map:texture,toneMapped:false}));
  screen.position.set(0,0,.0235);
  display.add(screen);

  // Read the same status copy and colors used by the page's bridge display.
  const statuses = [...document.querySelectorAll('#bridge-status .status-panel')].map(panel => ({
    color: getComputedStyle(panel).getPropertyValue('--state-color').trim(),
    heading: panel.querySelector('h3').innerText.split('\n'),
    icon: panel.querySelector('.status-icon').textContent.trim(),
    detail: panel.querySelector('p').textContent.trim(),
    response: panel.querySelector('.status-mode strong').textContent.trim(),
    chart: panel.querySelector('.track-chart'),
  }));
  let previous = -1;
  function updateScreen(progress) {
    const index = Math.min(statuses.length-1,Math.max(0,Math.floor(progress*statuses.length)));
    if (index === previous || index < 0) return;
    previous = index;
    frame.dataset.helmDisplay = statuses[index].chart ? "track" : "status";
    const {color,heading,icon,detail,response,chart} = statuses[index];
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,512,288);
    ctx.fillStyle = '#151c1d';
    ctx.font = 'bold 21px monospace';
    ctx.fillText('NORTHWATCH',22,32);
    ctx.fillRect(22,44,468,2);
    ctx.fillStyle = color;
    ctx.fillRect(432,12,58,25);
    if (chart) {
      ctx.fillStyle = '#151c1d';
      ctx.fillText('PNT',441,32);
      ctx.font = 'bold 27px sans-serif';
      ctx.fillText(heading.join(' '),22,76,468);
      ctx.save();
      ctx.translate(22,85);
      for (const path of chart.querySelectorAll('path')) {
        ctx.strokeStyle = path.getAttribute('stroke');
        ctx.lineWidth = Number(path.getAttribute('stroke-width')) || 1;
        ctx.lineCap = path.getAttribute('stroke-linecap') || 'butt';
        ctx.setLineDash((path.getAttribute('stroke-dasharray') || '').split(' ').filter(Boolean).map(Number));
        ctx.stroke(new Path2D(path.getAttribute('d')));
      }
      ctx.fillStyle = chart.querySelector('g').getAttribute('fill');
      ctx.font = '11px sans-serif';
      for (const label of chart.querySelectorAll('text')) {
        ctx.fillText(label.textContent,Number(label.getAttribute('x')),Number(label.getAttribute('y')));
      }
      ctx.restore();
      ctx.font = 'bold 12px sans-serif';
      let x = 22;
      for (const track of chart.querySelectorAll('[data-track]')) {
        ctx.fillStyle = track.getAttribute('stroke');
        ctx.fillRect(x,241,10,4);
        ctx.fillStyle = '#151c1d';
        const name = track.dataset.track;
        ctx.fillText(name,x+15,248);
        x += ctx.measureText(name).width+32;
      }
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(response,22,274,468);
      texture.needsUpdate = true;
      return;
    }
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
  // Leave the forward window frames in the cutaway to show the bridge enclosure.
  for (const x of [-1.94,-.65,.65,1.94]) {
    const post = box([.062,.88,.085],[x,8.13,-4.86],wall);
    post.rotation.x = -.17;
    sectionWalls.push(post);
  }
  sectionWalls.push(box([3.97,.09,.12],[0,8.57,-4.94],cutEdge));
  setCutaway(false);

  return { route, displayCenter, updateScreen, setCutaway };
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
    scene.add(new HemisphereLight(0xa7c0db, 0x435561, 1.38));
    const sun = new DirectionalLight(0xffb06a, 4.35);
    sun.position.set(-91, 1.6, 28);
    scene.add(sun);
    const fill = new DirectionalLight(0xb9d4ea, .58);
    fill.position.set(27, 23, -13);
    scene.add(fill);
    const bowLight = new DirectionalLight(0xffa964,1.12);
    bowLight.position.set(6,13,-38);
    scene.add(bowLight);
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

    ship = (await new GLTFLoader().loadAsync(new URL('./pollux.glb?v=12', import.meta.url).href)).scene;
    refinePolluxMaterials(ship);
    addHelmInstrumentTextures(ship,engine);
    const hardware = addTourHardware(ship,engine);
    const updateNavigationLights = addNavigationLights(ship,engine);

    const roof = ship.getObjectByName('Bridge_roof_and_mast');
    const windows = ship.getObjectByName('Bridge_glazing_and_mullions');
    scene.add(ship);

    const aim = new Vector3();
    let cameraMove;
    let distance = 1;

    function cameraPose(name) {
      if (name === 'deck') return [new Vector3(29*distance,38*distance,48*distance),new Vector3(0,3.1,3.5)];
      if (name === 'helm') return [new Vector3(10*distance,8+12*distance,13*distance),new Vector3(0,7.4,2)];
      return [new Vector3(43,10.6,-39).multiplyScalar(distance),new Vector3(-1.4,6.2,-.4)];
    }
    let cutaway = false;
    let cutawayAmount = 0;
    const shellFade = { value: 0 };
    const shellReturning = { value: false };
    for (const shell of [roof, windows]) {
      shell?.traverse(mesh => {
        if (!mesh.isMesh) return;
        // Keep the dissolve off materials shared with the rest of the ship.
        const materials = [].concat(mesh.material).map(original => {
          const material = original.clone();
          material.onBeforeCompile = shader => {
            shader.uniforms.shellFade = shellFade;
            shader.uniforms.shellReturning = shellReturning;
            shader.vertexShader = 'varying float vShellHeight;\n' + shader.vertexShader.replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\nvShellHeight = (modelMatrix * vec4(transformed, 1.0)).y;'
            );
            shader.fragmentShader = 'uniform float shellFade;\nuniform bool shellReturning;\nvarying float vShellHeight;\n' +
              shader.fragmentShader.replace('#include <alphatest_fragment>', `
                #include <alphatest_fragment>
                if (shellFade > 0.0) {
                  float edge = mix(18.0, 6.2, shellReturning ? 1.0-shellFade : shellFade);
                  float aboveEdge = smoothstep(edge - 0.75, edge + 0.75, vShellHeight);
                  float coverage = shellReturning ? aboveEdge : 1.0-aboveEdge;
                  float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
                  if (coverage <= grain) discard;
                }`);
          };
          return material;
        });
        mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
      });
    }
    function setCutaway(amount) {
      if (cutawayAmount === 1 && amount < 1) shellReturning.value = true;
      if (cutawayAmount === 0 && amount > 0) shellReturning.value = false;
      cutawayAmount = Number(amount);
      shellFade.value = cutawayAmount;
      cutaway = cutawayAmount > .8;
      hardware.setCutaway(cutaway);
      if (roof) roof.visible = cutawayAmount < 1;
      if (windows) windows.visible = cutawayAmount < 1;
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
    const helmAim = new Vector3(1.65,8.24,-2.9);
    const bowPosition = new Vector3(6.2,7.1,-17.65);
    const helmPosition = new Vector3(3.34,9.61,.40);
    const chartAim = hardware.displayCenter.clone().add(new Vector3(0,.005,.025));
    const chartPosition = chartAim.clone().add(new Vector3(.10,.12,.61));
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
        setCutaway(smooth(Math.min(1,Math.max(0,(progress-.72)/.28))));
        inspectionLight.intensity = .9+progress*.65;
      } else if (phase < 17) {
        shot = 'helm-display';
        const hold = phase-12;
        // Begin the push-in as the track comparison replaces the status cards.
        const zoom = smooth(Math.min(1,Math.max(0,(hold-2.7)/.65)));
        tourPosition.lerpVectors(helmPosition,chartPosition,zoom);
        tourAim.lerpVectors(helmAim,chartAim,zoom);
        applyTourPose(tourPosition,tourAim);
        hardware.updateScreen(hold < 3 ? hold/3*.8 : .8);
        setCutaway(true);
      } else {
        shot = 'return';
        const progress = smooth((phase-17)/3);
        tourOrbit(chartPosition,chartAim,exteriorPosition,exteriorAim,progress);
        setCutaway(1-smooth(Math.min(1,Math.max(0,(progress-.24)/.46))));
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
          light: inspectionLight.intensity, cutaway: cutawayAmount };
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
      const reveal = smooth(Math.min(1,Math.max(0,(fraction-.28)/.72)));
      setCutaway(cameraMove.cutaway + (Number(view === 'helm')-cameraMove.cutaway)*reveal);
      inspectionLight.intensity = cameraMove.light + ((view === 'exterior' ? 0 : 1.55)-cameraMove.light)*eased;
    }
    placeCamera(view);


    function draw() {
      ocean.update(time);
      if (!paused) ocean.move(ship);
      if (touring && !cameraMove) animateTour();
      updateNavigationLights(camera,cutaway);
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
