import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createFlightSystems, CLIP_LABELS } from './flight-systems.js';

const ships = [
  { id:'tintin', name:'Tintin', category:'Lunar expedition', description:'The red-and-white lunar explorer.', subtitle:'A classic silhouette. Built for the moon.' },
  { id:'futurama', name:'Planet Express', category:'Orbital delivery', description:'Sage alloy. Oxblood flight surfaces.', subtitle:'Special delivery. Somewhere in the universe.' },
  { id:'comet', name:'Comet', category:'Retro racer', description:'Ivory enamel. Vermilion racing stripes.', subtitle:'Swept fins and a little racing heritage.' },
  { id:'wraith', name:'Wraith', category:'Stealth interceptor', description:'Faceted titanium. Cyan running lights.', subtitle:'An angular silhouette with a quiet edge.' },
  { id:'aster', name:'Aster', category:'Sport courier', description:'Porcelain armor. Bronze machinery. Coral markings.', subtitle:'A blade hull wrapped around an exposed mechanical keel.' },
];
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const canvas = $('viewport');
const models = new Map();
const systems = new Map();
let lastAnimationStatus = '';
let selected = ships[0];
let compare = false;
let dark = false;
let scene, renderer, camera, controls;
let reports;
$('idle-animation').checked = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const [i, ship] of ships.entries()) {
  const label = document.createElement('span');
  label.textContent = ship.name.toUpperCase();
  $('fleet-labels').append(label);
  const button = document.createElement('button');
  button.className = 'ship-option';
  button.dataset.ship = ship.id;
  button.setAttribute('aria-pressed', String(i === 0));
  button.innerHTML = `<img src="./ships/${ship.id}.png" alt="" width="41" height="58"><span><strong>${ship.name}</strong><small>${ship.category}</small></span><span class="number">0${i+1}</span>`;
  button.addEventListener('click', () => { select(ship); });
  $('ship-list').append(button);
}

function updateText() {
  const index = ships.indexOf(selected);
  $('category').textContent = compare ? `01—0${ships.length} / FLEET COMPARISON` : `0${index+1} / ${selected.category.toUpperCase()}`;
  $('ship-title').textContent = compare ? 'Five flight studies.' : selected.name;
  $('ship-subtitle').textContent = compare ? 'Same scale. Five very different characters.' : selected.subtitle;
  $('download').href = `./ships/${selected.id}.glb`;
  $('download').firstChild.textContent = compare ? `${selected.name} GLB ` : 'Download GLB ';
  $('blend').href = `./ships/${selected.id}.blend`;
  for (const el of document.querySelectorAll('[data-ship]')) el.setAttribute('aria-pressed', String(el.dataset.ship === selected.id));
  const report = reports?.find(r => r.id === selected.id);
  if (report) {
    $('triangles').textContent = report.triangles.toLocaleString();
    $('file-size').textContent = `${Math.round(report.bytes / 1024)} KB`;
    $('collision-area').textContent = `${report.collisionArea.toFixed(2)} m²`;
    $('textures').textContent = report.textures.toString();
    $('animation-count').textContent = `${report.animations?.length ?? 0} clips`;
    $('validation').textContent = report.passed ? 'Export limits checked · final verdict in the game Garage' : `Export issue: ${report.errors.join(', ')}`;
  }
  updateAnimationControls();
}

function updateAnimationControls() {
  const system = systems.get(selected.id);
  for (const button of document.querySelectorAll('[data-clip]')) button.disabled = !system?.names.includes(button.dataset.clip);
  $('reset-systems').disabled = !system;
  updateAnimationStatus();
}

function updateAnimationStatus() {
  const system = systems.get(selected.id);
  const status = system?.getStatus();
  const text = !status ? 'Loading animation clips…' : status.paused ? 'Animations paused' :
    [status.idle ? 'Idle loop playing' : 'Idle loop off', ...status.triggers.map(clip => `${CLIP_LABELS[clip.name]} ${clip.complete ? 'held' : 'playing'}`)].join(' · ');
  if (text !== lastAnimationStatus) { $('animation-status').textContent=text;lastAnimationStatus=text; }
}

function select(ship) {
  selected = ship;
  if (compare) setCompare(false);
  else { updateLayout(); updateText(); preset('hero'); }
}

function updateLayout() {
  for (const [i, ship] of ships.entries()) {
    const model = models.get(ship.id);
    if (!model) continue;
    model.visible = compare || selected.id === ship.id;
    model.position.set(compare ? (i-(ships.length-1)/2)*1.18 : 0, 0, 0);
    model.rotation.y = 0;
  }
  updateOverlays();
}

function preset(view) {
  if (!camera) return;
  const narrow = stage.clientWidth < 700;
  controls.target.set(0,narrow && !compare ? .08 : 0,0);
  const fleetHalfWidth = (ships.length-1)*1.18/2 + .68;
  const dist = compare ? Math.max(5.2, fleetHalfWidth / (Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect)) : narrow ? 5.4 : 3.9;
  if (view === 'front') camera.position.set(0,0,dist);
  else if (view === 'rear') camera.position.set(0,.12,-dist);
  else camera.position.set(dist*.37,dist*.16,dist);
  camera.far = 100;
  controls.minDistance = compare ? 3 : 1.3;
  controls.maxDistance = compare ? 15 : 9;
  controls.update();
  for (const el of document.querySelectorAll('[data-view]')) {
    const active = el.dataset.view === view;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  }
}

function setCompare(value) {
  compare = value;
  document.body.classList.toggle('comparing', compare);
  $('compare').setAttribute('aria-pressed', String(compare));
  $('compare').firstChild.textContent = compare ? 'Inspect selected ' : 'Compare fleet ';
  updateLayout(); updateText(); preset(compare ? 'front' : 'hero');
}

function updateOverlays() {
  for (const model of models.values()) {
    model.traverse(ob => {
      if (ob.userData.inspection === 'collision') ob.visible = $('collision').checked;
      else if (ob.userData.inspection === 'thruster') ob.visible = $('thrusters').checked;
      else if (ob.isMesh && !ob.userData.inspection) {
        for (const m of Array.isArray(ob.material) ? ob.material : [ob.material]) m.wireframe = $('wireframe').checked;
      }
    });
  }
}

function prepare(model) {
  const collisionObjects = [];
  const markerObjects = [];
  model.traverse(ob => {
    if (ob.name === 'collision') collisionObjects.push(ob);
    if (ob.name.startsWith('thruster_')) markerObjects.push(ob);
    if (ob.isMesh) { ob.castShadow=true; ob.receiveShadow=true; }
  });
  for (const ob of collisionObjects) {
    ob.material = new THREE.MeshBasicMaterial({ color:0xeaa666, transparent:true, opacity:.15, side:THREE.DoubleSide, depthWrite:false });
    ob.userData.inspection='collision';
    ob.castShadow=false;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(ob.geometry), new THREE.LineBasicMaterial({color:0xe79147,depthTest:false}));
    ob.add(edges);
    ob.visible=false;
  }
  const bounds = new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(-.5,-1,-.30),new THREE.Vector3(.5,1,.30)),0xaaa38d);
  bounds.userData.inspection='collision'; bounds.visible=false; model.add(bounds);
  for (const ob of markerObjects) {
    // GLB -Y is the flame direction after Blender's +Y Up conversion.
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(),.22,0xeb7c35,.06,.035);
    arrow.userData.inspection='thruster'; arrow.visible=false; ob.add(arrow);
  }
  return model;
}

async function initialize() {
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.0;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(36,1,.01,100);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04);
  scene.environment=env.texture;
  scene.environmentIntensity=.8;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf4f5ee,0x63716e,2));
  const key = new THREE.DirectionalLight(0xfff7e7,3.5); key.position.set(-3,5,4); key.castShadow=true;
  key.shadow.mapSize.set(2048,2048); key.shadow.camera.left=-4; key.shadow.camera.right=4; key.shadow.camera.top=3; key.shadow.camera.bottom=-3; key.shadow.bias=-.001;
  scene.add(key);
  const rim=new THREE.DirectionalLight(0xc1ddf2,2);rim.position.set(3,2,-3);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-1.025;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(12,48,0x9da49d,0xbbc0b6); grid.position.y=-1.027;grid.material.transparent=true;grid.material.opacity=.18;scene.add(grid);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.07;controls.maxPolarAngle=Math.PI*.92;controls.autoRotateSpeed=.8;
  controls.addEventListener('start', () => { for (const b of document.querySelectorAll('[data-view]')) { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); } });
  const resize = () => {
    const {width,height}=stage.getBoundingClientRect();
    renderer.setSize(width,height,false); camera.aspect=width/height;camera.updateProjectionMatrix();
    if (compare) preset('front');
  };
  new ResizeObserver(resize).observe(stage);
  resize();preset('hero');
  const loader=new GLTFLoader();
  const failures=[];
  await Promise.all(ships.map(async ship => {
    try {
      const gltf=await loader.loadAsync(`./ships/${ship.id}.glb`);
      const model=prepare(gltf.scene);scene.add(model);models.set(ship.id,model);
      const system=createFlightSystems(model,gltf.animations,{idleEnabled:$('idle-animation').checked});
      system.setPaused($('pause-animations').checked);systems.set(ship.id,system);
      updateLayout();updateAnimationControls();
    } catch(error) { failures.push(ship.name); console.error(`Failed to load ${ship.id}`,error); }
  }));
  if (failures.length) { $('status').textContent=`Could not load: ${failures.join(', ')}. Reload to retry.`;$('status').classList.add('error'); }
  else $('status').hidden=true;
  try {
    const res=await fetch('./ships/validation.json');
    if (!res.ok) throw new Error('Validation report unavailable');
    reports=await res.json();updateText();
  } catch(error) { $('validation').textContent='Export report unavailable. Check the files in the game Garage.';console.error(error); }
  let lastFrame = null;
  renderer.setAnimationLoop(time => {
    const dt=lastFrame===null?0:Math.min((time-lastFrame)/1000,.1);lastFrame=time;
    for (const system of systems.values()) system.update(dt);
    updateAnimationStatus();
    controls.autoRotate=$('rotate').checked;
    controls.update(); renderer.render(scene,camera);
    if (compare) {
      for (const [i,ship] of ships.entries()) {
        const model=models.get(ship.id);
        if (!model) continue;
        const label=$('fleet-labels').children[i];
        const screen=new THREE.Vector3(model.position.x,-1.22,0).project(camera);
        label.style.left=`${(screen.x*.5+.5)*100}%`;
        label.style.top=`${(-screen.y*.5+.5)*100}%`;
      }
    }
  });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault();$('status').hidden=false;$('status').textContent='Graphics context lost. Reload the page to restore the viewer.'; });
}

for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => preset(button.dataset.view));
$('reset').addEventListener('click', () => { $('rotate').checked=false;preset(compare?'front':'hero'); });
$('compare').addEventListener('click', () => setCompare(!compare));
for (const id of ['wireframe','collision','thrusters']) $(id).addEventListener('change',updateOverlays);
$('idle-animation').addEventListener('change', () => { for (const system of systems.values()) system.setIdleEnabled($('idle-animation').checked);updateAnimationStatus(); });
$('pause-animations').addEventListener('change', () => { for (const system of systems.values()) system.setPaused($('pause-animations').checked);updateAnimationStatus(); });
for (const button of document.querySelectorAll('[data-clip]')) button.addEventListener('click', () => { systems.get(selected.id)?.playTrigger(button.dataset.clip);updateAnimationStatus(); });
$('reset-systems').addEventListener('click', () => { systems.get(selected.id)?.reset();updateAnimationStatus(); });
$('theme').addEventListener('click', () => { dark=!dark;document.body.classList.toggle('dark',dark);$('theme').textContent=dark?'Light studio':'Dark studio';$('theme').setAttribute('aria-pressed',String(dark)); });
document.addEventListener('keydown',event => {
  if (event.target instanceof HTMLInputElement || event.ctrlKey || event.altKey || event.metaKey) return;
  const index=Number(event.key)-1;
  if (index>=0&&index<ships.length) select(ships[index]);
});
initialize().catch(error => { console.error(error);$('status').textContent='The 3D viewer could not start. Enable WebGL and reload. GLB downloads remain available.';$('status').classList.add('error'); });
