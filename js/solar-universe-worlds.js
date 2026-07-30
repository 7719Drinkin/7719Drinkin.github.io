import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const stage = document.querySelector('#solar-stage');
const labelLayer = document.querySelector('#planet-labels');
const loader = document.querySelector('#solar-loader');
const fallback = document.querySelector('#solar-fallback');
const fallbackGrid = document.querySelector('#fallback-grid');
const resetButton = document.querySelector('#reset-view');
const performanceButton = document.querySelector('#performance-mode');
const panel = document.querySelector('#planet-panel');
const panelClose = document.querySelector('#planet-panel-close');
const panelIndex = document.querySelector('#planet-panel-index');
const panelStatus = document.querySelector('#planet-panel-status');
const panelTitle = document.querySelector('#planet-panel-title');
const panelDescription = document.querySelector('#planet-panel-description');
const panelLink = document.querySelector('#planet-panel-link');
const readoutCount = document.querySelector('#readout-count');
const readoutMode = document.querySelector('#readout-mode');

const fallbackInterests = [
  { id: 'basketball', title: 'Basketball', subtitle: 'The game never stops.', description: 'A miniature world shaped by courts, lights, memory and championship ambition.', route: '/basketball/', theme: 'basketball', status: 'published', number: '01' },
  { id: 'games', title: 'Games', subtitle: 'Worlds built one decision at a time.', description: 'Strategy, civilization building and memorable virtual worlds.', route: '/games/', theme: 'games', status: 'preview', number: '02' },
  { id: 'music', title: 'Music', subtitle: 'Soundtracks for different versions of me.', description: 'Artists, albums and songs collected over time.', route: '/music/', theme: 'music', status: 'preview', number: '03' }
];

const worldThemes = {
  basketball: { kind: 'basketball-world', worldName: 'THE LAST COURT', css: '#d89045', size: 1.12, orbitColor: 0x8a4e2a, orbitRadius: 7.4, inclination: -0.08, initialAngle: 0.64, orbitSpeed: 0.05 },
  games: { kind: 'games', worldName: 'STRATEGY WORLD', css: '#6cc7ff', size: 0.73, orbitColor: 0x2f779d, orbitRadius: 12.3, inclination: 0.035, initialAngle: 2.62, orbitSpeed: 0.036 },
  music: { kind: 'music', worldName: 'SOUND FOREST', css: '#c796ff', size: 0.78, orbitColor: 0x7a4b9d, orbitRadius: 17.1, inclination: 0.09, initialAngle: 4.72, orbitSpeed: 0.029 },
  default: { kind: 'default', worldName: 'UNMAPPED WORLD', css: '#b8d6ec', size: 0.7, orbitColor: 0x647a8a, orbitRadius: 21, inclination: 0, initialAngle: 1.3, orbitSpeed: 0.024 }
};

const params = new URLSearchParams(location.search);
const mobileDevice = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const forcedMode = params.get('mode');
const ecoMode = forcedMode === 'eco' || (forcedMode !== 'quality' && mobileDevice);
const quality = ecoMode
  ? { pixelRatio: 1.15, starCount: 1500, dustCount: 160, terrainDetail: 3, orbitSegments: 128, antialias: false, bloom: false, power: 'low-power' }
  : { pixelRatio: 2.1, starCount: 6800, dustCount: 720, terrainDetail: 5, orbitSegments: 320, antialias: true, bloom: true, power: 'high-performance' };

let scene;
let camera;
let renderer;
let controls;
let composer;
let sunMaterial;
let sunMesh;
let starField;
let dustField;
let worlds = [];
let hovered = null;
let selected = null;
let focusCameraPosition = null;
let focusTarget = null;
let selectedWorldValid = false;
let pendingPlanetLimits = null;
let animationStart = performance.now();

const systemCameraPosition = new THREE.Vector3(0, mobileDevice ? 22 : 16, mobileDevice ? 37 : 32);
const selectedWorld = new THREE.Vector3();
const previousSelectedWorld = new THREE.Vector3();
const tempWorld = new THREE.Vector3();
const tempDelta = new THREE.Vector3();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(2, 2);
const pointerStart = new THREE.Vector2();

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashNoise(x, y, z, seed = 0) {
  const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453123;
  return value - Math.floor(value);
}

async function loadInterests() {
  try {
    const response = await fetch('/data/interests.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Interest registry ${response.status}`);
    const data = await response.json();
    const valid = Array.isArray(data) ? data.filter((item) => item?.title && item?.route) : [];
    return valid.length ? valid : fallbackInterests;
  } catch (error) {
    console.warn('Using fallback interests:', error);
    return fallbackInterests;
  }
}

function renderFallback(interests, message = '当前设备无法启动 WebGL 2，已切换为静态兴趣入口。') {
  document.documentElement.dataset.solarReady = 'fallback';
  loader?.classList.add('is-complete');
  stage?.setAttribute('aria-hidden', 'true');
  fallback?.classList.add('is-visible');
  const explanation = fallback?.querySelector('[data-fallback-message]');
  if (explanation) explanation.textContent = message;
  if (!fallbackGrid) return;
  fallbackGrid.replaceChildren(...interests.map((interest) => {
    const link = document.createElement('a');
    link.className = 'fallback-card';
    link.href = interest.route;
    link.innerHTML = `<small>PLANET ${interest.number ?? '--'} · ${interest.status === 'published' ? 'ACTIVE' : 'FORMING'}</small><h2>${interest.title}</h2><p>${interest.description ?? interest.subtitle ?? ''}</p>`;
    return link;
  }));
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,247,206,.96)');
  gradient.addColorStop(.16, 'rgba(255,164,58,.62)');
  gradient.addColorStop(.48, 'rgba(255,82,21,.13)');
  gradient.addColorStop(1, 'rgba(255,50,10,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarField(count, near = false) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    const radius = near ? 22 + Math.random() * 52 : 58 + Math.random() * 145;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    const palette = Math.random();
    color.set(palette > .9 ? 0x9ec7ff : palette > .75 ? 0xd6c1ff : 0xffffff);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: near ? .05 : .13, sizeAttenuation: true, transparent: true, opacity: near ? .23 : .84, vertexColors: true, depthWrite: false }));
}

function createOrbit(theme) {
  const points = [];
  for (let index = 0; index < quality.orbitSegments; index += 1) {
    const angle = index / quality.orbitSegments * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * theme.orbitRadius, 0, Math.sin(angle) * theme.orbitRadius));
  }
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: theme.orbitColor, transparent: true, opacity: ecoMode ? .055 : .075, depthWrite: false }));
  line.rotation.z = theme.inclination;
  return line;
}

function createSun() {
  const geometry = new THREE.SphereGeometry(1.05, ecoMode ? 48 : 112, ecoMode ? 28 : 64);
  sunMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vNormal; varying vec3 vPosition; uniform float uTime; float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));} float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);} float fbm(vec3 p){float f=0.;f+=.5*noise(p);p*=2.03;f+=.25*noise(p);p*=2.01;f+=.125*noise(p);p*=2.04;f+=.0625*noise(p);return f;} void main(){float n=fbm(normalize(vPosition)*4.6+vec3(uTime*.042,uTime*.017,0.));float hot=smoothstep(.36,.9,n);vec3 dark=vec3(.34,.018,.002);vec3 orange=vec3(1.,.21,.012);vec3 light=vec3(1.,.75,.27);vec3 col=mix(dark,orange,n);col=mix(col,light,hot*.72);gl_FragColor=vec4(col,1.);}`
  });
  sunMesh = new THREE.Mesh(geometry, sunMaterial);
  scene.add(sunMesh);
  scene.add(new THREE.PointLight(0xffa253, ecoMode ? 68 : 92, 105, 1.75));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture(), transparent: true, opacity: ecoMode ? .54 : .68, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(5.8, 5.8, 1);
  scene.add(glow);
}

function colorizeTerrain(geometry, size, palette, seed) {
  const position = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) / size;
    const y = position.getY(index) / size;
    const z = position.getZ(index) / size;
    const noise = hashNoise(x * 3.7, y * 3.7, z * 3.7, seed);
    const height = THREE.MathUtils.clamp((y + 1) * .5, 0, 1);
    const paletteIndex = noise > .68 ? 2 : height > .62 ? 1 : 0;
    color.set(palette[paletteIndex]);
    const shade = .78 + noise * .28;
    colors.push(color.r * shade, color.g * shade, color.b * shade);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function createRockySphere(size, detail, palette, seed) {
  const geometry = new THREE.IcosahedronGeometry(size, detail);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const normal = vertex.clone().normalize();
    const n1 = hashNoise(normal.x * 5.3, normal.y * 5.3, normal.z * 5.3, seed);
    const n2 = hashNoise(normal.x * 12.1, normal.y * 12.1, normal.z * 12.1, seed + 9);
    const displacement = (n1 - .5) * size * .09 + (n2 - .5) * size * .035;
    vertex.addScaledVector(normal, displacement);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  colorizeTerrain(geometry, size, palette, seed);
  return geometry;
}

function createCourtLine(width, depth, height, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function createHoop(scale = 1) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x4e3829, roughness: .66, metalness: .32 });
  const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xe7dfcf, roughness: .58, metalness: .06 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xb44a25, emissive: 0x3a0b02, emissiveIntensity: .32, roughness: .42, metalness: .28 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.018 * scale, .026 * scale, .42 * scale, 8), metal);
  pole.position.y = .21 * scale;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.18 * scale, .025 * scale, .025 * scale), metal);
  arm.position.set(0, .42 * scale, -.075 * scale);
  group.add(arm);
  const board = new THREE.Mesh(new THREE.BoxGeometry(.28 * scale, .18 * scale, .018 * scale), boardMaterial);
  board.position.set(0, .48 * scale, -.17 * scale);
  group.add(board);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.067 * scale, .009 * scale, 8, 28), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, .42 * scale, -.27 * scale);
  group.add(rim);
  return group;
}

function createFloodlight(height, warmMaterial) {
  const group = new THREE.Group();
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x332923, roughness: .82, metalness: .18 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.012, .018, height, 6), poleMaterial);
  pole.position.y = height / 2;
  group.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.09, .045, .035), warmMaterial);
  head.position.set(0, height, 0);
  head.rotation.x = -.22;
  group.add(head);
  return group;
}

function createCourtWorld(radius) {
  const root = new THREE.Group();
  const landmarks = new THREE.Group();
  landmarks.name = 'basketball-landmarks';
  root.add(landmarks);

  const rockGeometry = createRockySphere(radius, ecoMode ? 3 : quality.terrainDetail, [0x2c1712, 0x5a3020, 0x8a4b2c], 23);
  const rockMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .94, metalness: 0 });
  const planet = new THREE.Mesh(rockGeometry, rockMaterial);
  root.add(planet);

  const plateauMaterial = new THREE.MeshStandardMaterial({ color: 0x5b2c1d, roughness: .9, flatShading: true });
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(.72, .84, .17, 12), plateauMaterial);
  plateau.position.y = radius * .91;
  landmarks.add(plateau);

  const courtMaterial = new THREE.MeshStandardMaterial({ color: 0x70331f, roughness: .78, metalness: .02 });
  const court = new THREE.Mesh(new THREE.BoxGeometry(1.08, .035, .62), courtMaterial);
  court.position.y = radius * 1.01;
  landmarks.add(court);

  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xe8ddc9, transparent: true, opacity: .92 });
  const lineHeight = .007;
  const outerA = createCourtLine(1.02, .012, lineHeight, lineMaterial);
  outerA.position.set(0, radius * 1.032, .294);
  landmarks.add(outerA);
  const outerB = outerA.clone(); outerB.position.z = -.294; landmarks.add(outerB);
  const sideA = createCourtLine(.012, .58, lineHeight, lineMaterial); sideA.position.set(.504, radius * 1.032, 0); landmarks.add(sideA);
  const sideB = sideA.clone(); sideB.position.x = -.504; landmarks.add(sideB);
  const center = createCourtLine(.012, .58, lineHeight, lineMaterial); center.position.set(0, radius * 1.032, 0); landmarks.add(center);
  const centerCircle = new THREE.Mesh(new THREE.TorusGeometry(.105, .006, 6, 32), lineMaterial);
  centerCircle.rotation.x = Math.PI / 2;
  centerCircle.position.y = radius * 1.037;
  landmarks.add(centerCircle);

  const hoopA = createHoop(1);
  hoopA.position.set(.43, radius * 1.02, 0);
  hoopA.rotation.y = Math.PI / 2;
  landmarks.add(hoopA);
  const hoopB = createHoop(1);
  hoopB.position.set(-.43, radius * 1.02, 0);
  hoopB.rotation.y = -Math.PI / 2;
  landmarks.add(hoopB);

  const standMaterial = new THREE.MeshStandardMaterial({ color: 0x33201a, roughness: .88, metalness: .04 });
  for (const side of [-1, 1]) {
    for (let step = 0; step < 3; step += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(.72 - step * .08, .055, .08), standMaterial);
      stand.position.set(0, radius * 1.0 + step * .035, side * (.39 + step * .05));
      landmarks.add(stand);
    }
  }

  const warmMaterial = new THREE.MeshStandardMaterial({ color: 0xffd699, emissive: 0xff9b36, emissiveIntensity: ecoMode ? .9 : 1.55, roughness: .24, metalness: .08 });
  for (const [x, z] of [[-.52, -.37], [.52, -.37], [-.52, .37], [.52, .37]]) {
    const floodlight = createFloodlight(.48, warmMaterial);
    floodlight.position.set(x, radius * .98, z);
    floodlight.lookAt(0, radius * 1.02, 0);
    landmarks.add(floodlight);
  }

  const monument = new THREE.Group();
  monument.position.set(-.62, radius * .84, -.16);
  monument.rotation.z = -.22;
  landmarks.add(monument);
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xa77a36, roughness: .38, metalness: .58 });
  for (let index = 0; index < 6; index += 1) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(.045, .34 + index * .018, 5), goldMaterial);
    const angle = (index - 2.5) * .16;
    fin.position.set(Math.sin(angle) * .14, Math.cos(angle) * .1, index * .025);
    fin.rotation.z = angle * .5;
    monument.add(fin);
  }
  const monumentLight = new THREE.PointLight(0xffae4a, ecoMode ? .45 : .8, 2.6, 2);
  monumentLight.position.set(0, .18, 0);
  monument.add(monumentLight);

  const spectatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffb55c, transparent: true, opacity: .66 });
  const spectatorGeometry = new THREE.SphereGeometry(.011, 5, 4);
  const spectators = new THREE.InstancedMesh(spectatorGeometry, spectatorMaterial, ecoMode ? 22 : 54);
  const dummy = new THREE.Object3D();
  const random = seededRandom(1998);
  for (let index = 0; index < spectators.count; index += 1) {
    const side = index % 2 ? 1 : -1;
    dummy.position.set((random() - .5) * .58, radius * 1.06 + random() * .06, side * (.41 + random() * .08));
    dummy.scale.setScalar(.65 + random() * .65);
    dummy.updateMatrix();
    spectators.setMatrixAt(index, dummy.matrix);
  }
  spectators.instanceMatrix.needsUpdate = true;
  landmarks.add(spectators);
  return { root, planet, landmarkGroup: landmarks, monument, spectators };
}

function createGamesWorld(radius) {
  const root = new THREE.Group();
  const geometry = createRockySphere(radius, ecoMode ? 2 : 4, [0x07131d, 0x16354a, 0x24566d], 77);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .72, metalness: .18 });
  const planet = new THREE.Mesh(geometry, material);
  root.add(planet);
  const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x5fc8f4, transparent: true, opacity: .36 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.12, .012, 8, ecoMode ? 72 : 180), gridMaterial);
  ring.rotation.x = 1.08;
  root.add(ring);
  return { root, planet, landmarkGroup: root, ring };
}

function createMusicWorld(radius) {
  const root = new THREE.Group();
  const geometry = createRockySphere(radius, ecoMode ? 2 : 4, [0x120b1c, 0x2c1840, 0x25435a], 91);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .65, metalness: .12 });
  const planet = new THREE.Mesh(geometry, material);
  root.add(planet);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xc38cff, transparent: true, opacity: .32, blending: THREE.AdditiveBlending });
  const rings = [];
  for (let index = 0; index < 3; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * (1.12 + index * .14), .011, 8, ecoMode ? 72 : 180), ringMaterial.clone());
    ring.rotation.x = .8 + index * .18;
    ring.rotation.y = -.28 + index * .2;
    root.add(ring);
    rings.push(ring);
  }
  return { root, planet, landmarkGroup: root, rings };
}

function createGenericWorld(radius) {
  const root = new THREE.Group();
  const geometry = createRockySphere(radius, ecoMode ? 2 : 3, [0x28343d, 0x465864, 0x647987], 123);
  const planet = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .86 }));
  root.add(planet);
  return { root, planet, landmarkGroup: root };
}

function createWorldModel(theme) {
  if (theme.kind === 'basketball-world') return createCourtWorld(theme.size);
  if (theme.kind === 'games') return createGamesWorld(theme.size);
  if (theme.kind === 'music') return createMusicWorld(theme.size);
  return createGenericWorld(theme.size);
}

function createWorld(interests, interest, index) {
  const theme = worldThemes[interest.theme] ?? { ...worldThemes.default, orbitRadius: worldThemes.default.orbitRadius + index * 4.5, initialAngle: 1.3 + index * 1.8 };
  const orbit = createOrbit(theme);
  scene.add(orbit);
  const plane = new THREE.Group();
  plane.rotation.z = theme.inclination;
  scene.add(plane);
  const pivot = new THREE.Group();
  pivot.rotation.y = theme.initialAngle;
  plane.add(pivot);
  const model = createWorldModel(theme);
  model.root.position.x = theme.orbitRadius;
  model.root.rotation.z = THREE.MathUtils.degToRad(index % 2 ? 8 : -5);
  pivot.add(model.root);
  const label = document.createElement('div');
  label.className = 'planet-label';
  label.style.setProperty('--planet-color', theme.css);
  label.innerHTML = `<strong>${interest.title.toUpperCase()}</strong><span>${theme.worldName}</span>`;
  labelLayer?.append(label);
  const entry = { interest, theme, model, mesh: model.planet, root: model.root, pivot, orbit, label, index, initialAngle: theme.initialAngle, orbitSpeed: theme.orbitSpeed, spinSpeed: theme.kind === 'basketball-world' ? .022 : .055 + index * .016 };
  model.planet.userData.entry = entry;
  return entry;
}

function buildScene(interests) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000106);
  scene.fog = new THREE.FogExp2(0x000106, ecoMode ? .0058 : .0034);
  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 380);
  camera.position.copy(systemCameraPosition);
  scene.add(camera);
  const cameraFill = new THREE.DirectionalLight(0xc7d8f4, ecoMode ? .32 : .46);
  cameraFill.position.set(0, 1, 1);
  camera.add(cameraFill);
  renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: false, powerPreference: quality.power, failIfMajorPerformanceCaveat: false });
  renderer.domElement.className = 'solar-canvas';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = ecoMode ? 1.03 : 1.12;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  stage?.prepend(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.enablePan = false;
  controls.minDistance = 6.2;
  controls.maxDistance = Math.max(58, 26 + interests.length * 8);
  controls.target.set(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0x8090b8, 0x1c0b05, ecoMode ? .58 : .76));
  createSun();
  starField = createStarField(quality.starCount, false);
  dustField = createStarField(quality.dustCount, true);
  scene.add(starField, dustField);
  worlds = interests.map((interest, index) => createWorld(interests, interest, index));
  if (quality.bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .28, .42, .9));
    composer.addPass(new OutputPass());
  }
  readoutCount.textContent = String(interests.length).padStart(2, '0');
  readoutMode.textContent = ecoMode ? 'ECO' : 'QUALITY+';
  performanceButton.textContent = ecoMode ? 'MODE / ECO' : 'MODE / QUALITY+';
}

function setPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function hitWorld() {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(worlds.map((entry) => entry.mesh), false)[0]?.object?.userData?.entry ?? null;
}

function updateHover(entry) {
  if (hovered === entry) return;
  hovered?.label?.classList.remove('is-active');
  hovered = entry;
  hovered?.label?.classList.add('is-active');
  stage?.classList.toggle('is-targeting', Boolean(entry));
}

function setPlanetLimits(entry) {
  controls.minDistance = Math.max(entry.theme.size * 1.45, 1.7);
  controls.maxDistance = Math.max(entry.theme.size * 11, 10);
  pendingPlanetLimits = null;
}

function cancelFocusTransition() {
  focusCameraPosition = null;
  focusTarget = null;
  if (selected && pendingPlanetLimits) setPlanetLimits(selected);
}

function showPanel(entry) {
  selected = entry;
  panel.style.setProperty('--planet-color', entry.theme.css);
  panelIndex.textContent = `PLANET ${entry.interest.number ?? String(entry.index + 1).padStart(2, '0')}`;
  panelStatus.textContent = entry.theme.worldName;
  panelTitle.textContent = entry.interest.title;
  panelDescription.textContent = entry.interest.description ?? entry.interest.subtitle ?? '';
  panelLink.href = entry.interest.route;
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  entry.mesh.getWorldPosition(selectedWorld);
  previousSelectedWorld.copy(selectedWorld);
  selectedWorldValid = true;
  const currentViewDirection = camera.position.clone().sub(controls.target).normalize();
  const sunFacingDirection = selectedWorld.clone().multiplyScalar(-1).normalize();
  if (sunFacingDirection.lengthSq() < .001) sunFacingDirection.set(0, .3, 1).normalize();
  const preferredDirection = currentViewDirection.multiplyScalar(.76).add(sunFacingDirection.multiplyScalar(.24)).normalize();
  const focusDistance = mobileDevice ? Math.max(5.2, entry.theme.size * 6.4) : Math.max(4.1, entry.theme.size * 5.6);
  focusTarget = selectedWorld.clone();
  focusCameraPosition = selectedWorld.clone().add(preferredDirection.multiplyScalar(focusDistance)).add(new THREE.Vector3(0, entry.theme.size * .45, 0));
  pendingPlanetLimits = entry;
}

function closePanel({ reset = false } = {}) {
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  if (reset) resetView();
}

function resetView() {
  selected = null;
  selectedWorldValid = false;
  pendingPlanetLimits = null;
  controls.minDistance = 6.2;
  controls.maxDistance = Math.max(58, 26 + worlds.length * 8);
  focusCameraPosition = systemCameraPosition.clone();
  focusTarget = new THREE.Vector3(0, 0, 0);
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
}

function followSelectedWorld() {
  if (!selected) return;
  selected.mesh.getWorldPosition(tempWorld);
  if (selectedWorldValid) {
    tempDelta.copy(tempWorld).sub(previousSelectedWorld);
    camera.position.add(tempDelta);
    controls.target.add(tempDelta);
    focusCameraPosition?.add(tempDelta);
    focusTarget?.add(tempDelta);
  }
  previousSelectedWorld.copy(tempWorld);
  selectedWorldValid = true;
}

function updateLabels() {
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  for (const entry of worlds) {
    const world = new THREE.Vector3();
    entry.mesh.getWorldPosition(world);
    const projected = world.clone().project(camera);
    const visible = cameraDirection.dot(world.clone().sub(camera.position)) > 0 && projected.z > -1 && projected.z < 1;
    entry.label.classList.toggle('is-hidden', !visible || entry === selected);
    if (!visible) continue;
    entry.label.style.transform = `translate3d(${(projected.x * .5 + .5) * innerWidth + 13}px, ${(-projected.y * .5 + .5) * innerHeight}px, 0) translateY(-50%)`;
  }
}

function updateDetailVisibility() {
  for (const entry of worlds) {
    if (entry.theme.kind !== 'basketball-world') continue;
    entry.mesh.getWorldPosition(tempWorld);
    const distance = camera.position.distanceTo(tempWorld);
    entry.model.landmarkGroup.visible = true;
    if (entry.model.spectators) entry.model.spectators.visible = entry === selected || distance < 13;
  }
}

function applyFocus() {
  if (!focusCameraPosition || !focusTarget) return;
  camera.position.lerp(focusCameraPosition, .075);
  controls.target.lerp(focusTarget, .09);
  const complete = camera.position.distanceTo(focusCameraPosition) < .025 && controls.target.distanceTo(focusTarget) < .025;
  if (complete) {
    focusCameraPosition = null;
    focusTarget = null;
    if (selected && pendingPlanetLimits) setPlanetLimits(selected);
  }
}

function animate(time) {
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = (time - animationStart) / 1000;
  if (sunMaterial) sunMaterial.uniforms.uTime.value = elapsed;
  if (!reduceMotion) {
    for (const entry of worlds) {
      entry.pivot.rotation.y = entry.initialAngle + elapsed * entry.orbitSpeed;
      entry.root.rotation.y += delta * entry.spinSpeed;
      if (entry.model.ring) entry.model.ring.rotation.z += delta * .045;
      if (entry.model.rings) {
        entry.model.rings.forEach((ring, index) => {
          ring.rotation.z += delta * (.04 + index * .02);
          ring.scale.setScalar(1 + Math.sin(elapsed * (1 + index * .22) + index) * .014);
        });
      }
      if (entry.model.monument) entry.model.monument.rotation.y += delta * .025;
      if (entry.model.spectators) entry.model.spectators.material.opacity = .52 + Math.sin(elapsed * 1.3) * .12;
    }
    starField.rotation.y = elapsed * .0015;
    dustField.rotation.y = -elapsed * .003;
    if (sunMesh) sunMesh.rotation.y = elapsed * .024;
  }
  followSelectedWorld();
  applyFocus();
  controls.update();
  updateLabels();
  updateDetailVisibility();
  if (composer) composer.render(); else renderer.render(scene, camera);
}

function switchMode() {
  const url = new URL(location.href);
  url.searchParams.set('mode', ecoMode ? 'quality' : 'eco');
  location.href = url.toString();
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
}

function bindInteraction() {
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => pointerStart.set(event.clientX, event.clientY));
  canvas.addEventListener('pointermove', (event) => { setPointer(event); updateHover(hitWorld()); });
  canvas.addEventListener('pointerleave', () => { pointer.set(2, 2); updateHover(null); });
  canvas.addEventListener('pointerup', (event) => {
    if (pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 8) return;
    setPointer(event);
    const entry = hitWorld();
    if (entry) showPanel(entry);
  });
  canvas.addEventListener('dblclick', (event) => {
    setPointer(event);
    const entry = hitWorld();
    if (entry?.interest?.route) location.href = entry.interest.route;
  });
  controls.addEventListener('start', cancelFocusTransition);
  panelClose?.addEventListener('click', () => closePanel());
  resetButton?.addEventListener('click', resetView);
  performanceButton?.addEventListener('click', switchMode);
  addEventListener('resize', resize, { passive: true });
  addEventListener('keydown', (event) => { if (event.key === 'Escape') resetView(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else { clock.getDelta(); renderer.setAnimationLoop(animate); }
  });
}

async function init() {
  const interests = await loadInterests();
  if (!WebGL.isWebGL2Available()) {
    renderFallback(interests);
    return;
  }
  try {
    buildScene(interests);
    bindInteraction();
    document.documentElement.dataset.solarReady = 'true';
    loader?.classList.add('is-complete');
    renderer.setAnimationLoop(animate);
  } catch (error) {
    console.error('Unable to initialize miniature-world solar universe:', error);
    renderFallback(interests, '微型世界 3D 场景初始化失败，已切换为静态兴趣入口。');
  }
}

init();
