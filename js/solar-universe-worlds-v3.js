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
  { id: 'basketball', title: 'Basketball', description: 'A small world shaped by courts, memory and championship ambition.', route: '/basketball/', theme: 'basketball', status: 'published', number: '01' },
  { id: 'games', title: 'Games', description: 'Strategy, civilization building and memorable virtual worlds.', route: '/games/', theme: 'games', status: 'preview', number: '02' },
  { id: 'music', title: 'Music', description: 'Artists, albums and songs collected over time.', route: '/music/', theme: 'music', status: 'preview', number: '03' }
];

const worldThemes = {
  basketball: { kind: 'basketball-world', worldName: 'THE LAST COURT', css: '#c98b4c', size: .98, orbitColor: 0x78513a, orbitRadius: 7.4, inclination: -.08, initialAngle: .64, orbitSpeed: .046 },
  games: { kind: 'games', worldName: 'STRATEGY WORLD', css: '#6cc7ff', size: .72, orbitColor: 0x2f779d, orbitRadius: 12.3, inclination: .035, initialAngle: 2.62, orbitSpeed: .036 },
  music: { kind: 'music', worldName: 'SOUND FOREST', css: '#c796ff', size: .77, orbitColor: 0x7a4b9d, orbitRadius: 17.1, inclination: .09, initialAngle: 4.72, orbitSpeed: .029 },
  default: { kind: 'default', worldName: 'UNMAPPED WORLD', css: '#b8d6ec', size: .7, orbitColor: 0x647a8a, orbitRadius: 21, inclination: 0, initialAngle: 1.3, orbitSpeed: .024 }
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
    color.set(Math.random() > .9 ? 0x9ec7ff : Math.random() > .75 ? 0xd6c1ff : 0xffffff);
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
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: theme.orbitColor, transparent: true, opacity: ecoMode ? .045 : .06, depthWrite: false }));
  line.rotation.z = theme.inclination;
  return line;
}

function createSun() {
  const geometry = new THREE.SphereGeometry(1.05, ecoMode ? 48 : 112, ecoMode ? 28 : 64);
  sunMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vPosition; uniform float uTime; float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));} float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);} void main(){float n=noise(normalize(vPosition)*5.0+vec3(uTime*.04,0.,0.));vec3 col=mix(vec3(.42,.025,.003),vec3(1.,.52,.08),n);gl_FragColor=vec4(col,1.);}`
  });
  sunMesh = new THREE.Mesh(geometry, sunMaterial);
  scene.add(sunMesh);
  scene.add(new THREE.PointLight(0xffa253, ecoMode ? 68 : 92, 105, 1.75));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture(), transparent: true, opacity: ecoMode ? .54 : .68, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(5.8, 5.8, 1);
  scene.add(glow);
}

function createRockySphere(size, detail, palette, seed) {
  const geometry = new THREE.IcosahedronGeometry(size, detail);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const colors = [];
  const color = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const normal = vertex.clone().normalize();
    const n1 = hashNoise(normal.x * 4.3, normal.y * 4.3, normal.z * 4.3, seed);
    const n2 = hashNoise(normal.x * 11.7, normal.y * 11.7, normal.z * 11.7, seed + 9);
    const bands = Math.sin(normal.y * 8.2 + n1 * 2.8) * .5 + .5;
    const displacement = (n1 - .5) * size * .075 + (n2 - .5) * size * .026 + (bands - .5) * size * .018;
    vertex.addScaledVector(normal, displacement);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    const slope = Math.abs(normal.y);
    const paletteIndex = n2 > .72 ? 3 : slope > .7 ? 2 : n1 > .48 ? 1 : 0;
    color.set(palette[Math.min(paletteIndex, palette.length - 1)]);
    const shade = .72 + n1 * .24 + slope * .08;
    colors.push(color.r * shade, color.g * shade, color.b * shade);
  }
  position.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createCourtLine(width, depth, height, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function createHoop(scale = 1) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x403832, roughness: .72, metalness: .28 });
  const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d3c7, roughness: .64, metalness: .04 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xa54225, emissive: 0x260702, emissiveIntensity: .24, roughness: .48, metalness: .22 });
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

function createFloodlight(height, index) {
  const group = new THREE.Group();
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2724, roughness: .86, metalness: .14 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffd7a0, emissive: 0xff9830, emissiveIntensity: 1.1, roughness: .28 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.012, .018, height, 6), poleMaterial);
  pole.position.y = height / 2;
  group.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.09, .045, .035), headMaterial);
  head.position.set(0, height, 0);
  head.rotation.x = -.22;
  head.userData.phase = index * .9;
  group.add(head);
  return { group, head };
}

function createSurfaceAnchor(radius, normal, offset = 0) {
  const anchor = new THREE.Group();
  const n = normal.clone().normalize();
  anchor.position.copy(n).multiplyScalar(radius + offset);
  anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  return anchor;
}

function createPlateAnchor(radius, normal, offset = 0) {
  const anchor = new THREE.Group();
  const n = normal.clone().normalize();
  anchor.position.copy(n).multiplyScalar(radius + offset);
  anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  return anchor;
}

function createLocalTube(points, radius, material, segments = 56) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, .018)), false, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, ecoMode ? 24 : segments, radius, 6, false), material);
}

function createNumberCanyon(radius) {
  const anchor = createPlateAnchor(radius, new THREE.Vector3(.04, -.16, .986), .012);
  const basin = new THREE.Mesh(new THREE.CircleGeometry(.46, 18), new THREE.MeshStandardMaterial({ color: 0x17100c, roughness: 1, metalness: 0, transparent: true, opacity: .92, side: THREE.DoubleSide }));
  basin.scale.set(1.34, .9, 1);
  basin.position.z = .006;
  anchor.add(basin);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x6f4b35, roughness: .98, metalness: 0 });
  const trenchMaterial = new THREE.MeshStandardMaterial({ color: 0x080504, roughness: 1, metalness: 0 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xd27735, transparent: true, opacity: .54, blending: THREE.AdditiveBlending, depthWrite: false });
  const two = [[-.34,.28],[-.24,.39],[-.06,.42],[.08,.34],[.12,.2],[.04,.08],[-.12,-.03],[-.31,-.27],[.13,-.27]];
  const three = [[.22,.34],[.38,.4],[.54,.32],[.55,.17],[.42,.06],[.31,.03],[.43,-.02],[.56,-.14],[.52,-.29],[.36,-.36],[.2,-.31]];
  const walls = [createLocalTube(two, .061, wallMaterial), createLocalTube(three, .061, wallMaterial)];
  const trenches = [createLocalTube(two, .044, trenchMaterial), createLocalTube(three, .044, trenchMaterial)];
  const glows = [createLocalTube(two, .009, glowMaterial), createLocalTube(three, .009, glowMaterial)];
  walls.forEach((mesh) => { mesh.position.z = .014; anchor.add(mesh); });
  trenches.forEach((mesh) => { mesh.position.z = .021; anchor.add(mesh); });
  glows.forEach((mesh) => { mesh.position.z = .027; anchor.add(mesh); });

  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 1, flatShading: true });
  const random = seededRandom(2306);
  for (let index = 0; index < (ecoMode ? 22 : 44); index += 1) {
    const angle = index / (ecoMode ? 22 : 44) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.025 + random() * .025, 0), rockMaterial);
    rock.position.set(Math.cos(angle) * (.53 + random() * .07), Math.sin(angle) * (.35 + random() * .05), .02 + random() * .02);
    rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    anchor.add(rock);
  }
  return { anchor, glows };
}

function createTrophy(goldMaterial, darkMaterial, scale = 1) {
  const trophy = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.038 * scale, .052 * scale, .04 * scale, 8), darkMaterial);
  base.position.y = .02 * scale;
  trophy.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.014 * scale, .022 * scale, .14 * scale, 8), goldMaterial);
  stem.position.y = .105 * scale;
  trophy.add(stem);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.009 * scale, .012 * scale, .11 * scale, 7), goldMaterial);
    arm.position.set(side * .035 * scale, .19 * scale, 0);
    arm.rotation.z = side * -.58;
    trophy.add(arm);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.052 * scale, ecoMode ? 12 : 20, ecoMode ? 8 : 14), goldMaterial);
  ball.position.y = .265 * scale;
  trophy.add(ball);
  return { trophy, ball };
}

function createChampionshipSanctuary(radius) {
  const anchor = createSurfaceAnchor(radius, new THREE.Vector3(-.73, .17, -.66), .018);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2d25, roughness: .94, flatShading: true });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x211914, roughness: .88, metalness: .12 });
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xb58a45, emissive: 0x2d1705, emissiveIntensity: .28, roughness: .34, metalness: .58 });
  const terrace = new THREE.Mesh(new THREE.CylinderGeometry(.36, .4, .075, 12), stoneMaterial);
  terrace.position.y = .038;
  anchor.add(terrace);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(.68, .24, .055), stoneMaterial);
  backWall.position.set(0, .16, -.18);
  anchor.add(backWall);

  const trophyGroup = new THREE.Group();
  trophyGroup.position.y = .075;
  anchor.add(trophyGroup);
  const trophyBalls = [];
  const positions = [
    [-.2, .02], [0, .02], [.2, .02],
    [-.2, -.13], [0, -.13], [.2, -.13]
  ];
  positions.forEach(([x, z], index) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(.12, .035, .09), darkMaterial);
    plinth.position.set(x, .018, z);
    trophyGroup.add(plinth);
    const { trophy, ball } = createTrophy(goldMaterial, darkMaterial, index < 3 ? .92 : .82);
    trophy.position.set(x, .035, z);
    trophyGroup.add(trophy);
    trophyBalls.push(ball);
  });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(.29, .018, 8, 40, Math.PI), goldMaterial);
  arch.rotation.z = Math.PI;
  arch.position.set(0, .31, -.145);
  anchor.add(arch);
  const sanctuaryLight = new THREE.PointLight(0xffad52, ecoMode ? .42 : .72, 2.5, 2);
  sanctuaryLight.position.set(0, .28, .12);
  anchor.add(sanctuaryLight);
  return { anchor, trophyGroup, trophyBalls };
}

function createArcStand(radius, angle, y, z, material) {
  const segment = new THREE.Mesh(new THREE.BoxGeometry(.13, .055, .07), material);
  segment.position.set(Math.sin(angle) * radius, y, z + Math.cos(angle) * radius * .16);
  segment.rotation.y = -angle;
  return segment;
}

function createCourtWorld(radius) {
  const root = new THREE.Group();
  const landmarks = new THREE.Group();
  root.add(landmarks);
  const planet = new THREE.Mesh(createRockySphere(radius, ecoMode ? 3 : quality.terrainDetail, [0x171412, 0x352820, 0x5b4434, 0x806147], 23), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .96 }));
  root.add(planet);

  const terraceLow = new THREE.Mesh(new THREE.CylinderGeometry(.72, .86, .14, 14), new THREE.MeshStandardMaterial({ color: 0x493429, roughness: .94, flatShading: true }));
  terraceLow.position.y = radius * .89;
  landmarks.add(terraceLow);
  const terraceHigh = new THREE.Mesh(new THREE.CylinderGeometry(.64, .73, .11, 14), new THREE.MeshStandardMaterial({ color: 0x654738, roughness: .9, flatShading: true }));
  terraceHigh.position.y = radius * .975;
  landmarks.add(terraceHigh);
  const retaining = new THREE.Mesh(new THREE.BoxGeometry(1.13, .12, .7), new THREE.MeshStandardMaterial({ color: 0x30241f, roughness: .94, flatShading: true }));
  retaining.position.y = radius;
  landmarks.add(retaining);
  const court = new THREE.Mesh(new THREE.BoxGeometry(1.02, .03, .59), new THREE.MeshStandardMaterial({ color: 0x5c3328, roughness: .82 }));
  court.position.y = radius * 1.055;
  landmarks.add(court);

  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xe5dccc, transparent: true, opacity: .88 });
  for (const z of [-.278, .278]) {
    const line = createCourtLine(.96, .011, .006, lineMaterial);
    line.position.set(0, radius * 1.073, z);
    landmarks.add(line);
  }
  for (const x of [-.474, 0, .474]) {
    const line = createCourtLine(.011, .55, .006, lineMaterial);
    line.position.set(x, radius * 1.073, 0);
    landmarks.add(line);
  }
  const centerCircle = new THREE.Mesh(new THREE.TorusGeometry(.1, .0055, 6, 32), lineMaterial);
  centerCircle.rotation.x = Math.PI / 2;
  centerCircle.position.y = radius * 1.077;
  landmarks.add(centerCircle);
  const hoopA = createHoop(.92);
  hoopA.position.set(.41, radius * 1.06, 0);
  hoopA.rotation.y = Math.PI / 2;
  landmarks.add(hoopA);
  const hoopB = createHoop(.92);
  hoopB.position.set(-.41, radius * 1.06, 0);
  hoopB.rotation.y = -Math.PI / 2;
  landmarks.add(hoopB);

  const standMaterial = new THREE.MeshStandardMaterial({ color: 0x2b211d, roughness: .92 });
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 3; tier += 1) {
      for (let segment = -3; segment <= 3; segment += 1) {
        landmarks.add(createArcStand(.36 + tier * .06, segment * .18, radius * 1.055 + tier * .035, side * (.36 + tier * .045), standMaterial));
      }
    }
  }

  const floodHeads = [];
  [[-.53, -.38], [.53, -.38], [-.53, .38], [.53, .38]].forEach(([x, z], index) => {
    const { group, head } = createFloodlight(.46, index);
    group.position.set(x, radius * 1.01, z);
    group.lookAt(0, radius * 1.08, 0);
    landmarks.add(group);
    floodHeads.push(head);
  });

  const canyon = createNumberCanyon(radius);
  root.add(canyon.anchor);
  const sanctuary = createChampionshipSanctuary(radius);
  root.add(sanctuary.anchor);

  const tunnelAnchor = createSurfaceAnchor(radius, new THREE.Vector3(.78, -.08, .62), .014);
  root.add(tunnelAnchor);
  const tunnelPortal = new THREE.Mesh(new THREE.TorusGeometry(.11, .025, 7, 18, Math.PI), new THREE.MeshStandardMaterial({ color: 0x24201d, roughness: .9 }));
  tunnelPortal.rotation.z = Math.PI;
  tunnelPortal.position.y = .11;
  tunnelAnchor.add(tunnelPortal);
  const tunnelDark = new THREE.Mesh(new THREE.CircleGeometry(.09, 20), new THREE.MeshBasicMaterial({ color: 0x050403 }));
  tunnelDark.position.set(0, .09, -.012);
  tunnelAnchor.add(tunnelDark);
  const tunnelLamp = new THREE.PointLight(0xff8a34, ecoMode ? .25 : .48, 1.2, 2);
  tunnelLamp.position.set(0, .08, .06);
  tunnelAnchor.add(tunnelLamp);

  const spectatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffb263, transparent: true, opacity: .54 });
  const spectators = new THREE.InstancedMesh(new THREE.SphereGeometry(.009, 5, 4), spectatorMaterial, ecoMode ? 22 : 58);
  const dummy = new THREE.Object3D();
  const random = seededRandom(1998);
  for (let index = 0; index < spectators.count; index += 1) {
    const side = index % 2 ? 1 : -1;
    dummy.position.set((random() - .5) * .56, radius * 1.1 + random() * .055, side * (.37 + random() * .09));
    dummy.scale.setScalar(.55 + random() * .75);
    dummy.updateMatrix();
    spectators.setMatrixAt(index, dummy.matrix);
  }
  spectators.instanceMatrix.needsUpdate = true;
  landmarks.add(spectators);

  const shotCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.34, radius * 1.25, .19), new THREE.Vector3(.02, radius * 1.72, .08), new THREE.Vector3(.45, radius * 1.46, -.04));
  const shotTrail = new THREE.Mesh(new THREE.TubeGeometry(shotCurve, ecoMode ? 24 : 56, .007, 5, false), new THREE.MeshBasicMaterial({ color: 0xffa74c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const shotBall = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  landmarks.add(shotTrail, shotBall);

  return {
    root,
    planet,
    landmarkGroup: landmarks,
    spectators,
    floodHeads,
    canyonGlow: canyon.glows,
    trophyGroup: sanctuary.trophyGroup,
    trophyBalls: sanctuary.trophyBalls,
    shot: { curve: shotCurve, trail: shotTrail, ball: shotBall }
  };
}

function createGamesWorld(radius) {
  const root = new THREE.Group();
  const planet = new THREE.Mesh(createRockySphere(radius, ecoMode ? 2 : 4, [0x07131d, 0x16354a, 0x24566d, 0x2f6f87], 77), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .72, metalness: .18 }));
  root.add(planet);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.12, .012, 8, ecoMode ? 72 : 180), new THREE.MeshBasicMaterial({ color: 0x5fc8f4, transparent: true, opacity: .3 }));
  ring.rotation.x = 1.08;
  root.add(ring);
  return { root, planet, ring };
}

function createMusicWorld(radius) {
  const root = new THREE.Group();
  const planet = new THREE.Mesh(createRockySphere(radius, ecoMode ? 2 : 4, [0x120b1c, 0x2c1840, 0x25435a, 0x41647a], 91), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .65, metalness: .12 }));
  root.add(planet);
  const rings = [];
  for (let index = 0; index < 3; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * (1.12 + index * .14), .011, 8, ecoMode ? 72 : 180), new THREE.MeshBasicMaterial({ color: 0xc38cff, transparent: true, opacity: .28, blending: THREE.AdditiveBlending }));
    ring.rotation.x = .8 + index * .18;
    ring.rotation.y = -.28 + index * .2;
    root.add(ring);
    rings.push(ring);
  }
  return { root, planet, rings };
}

function createGenericWorld(radius) {
  const root = new THREE.Group();
  const planet = new THREE.Mesh(createRockySphere(radius, ecoMode ? 2 : 3, [0x28343d, 0x465864, 0x647987, 0x7d919e], 123), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .86 }));
  root.add(planet);
  return { root, planet };
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
  const entry = { interest, theme, model, mesh: model.planet, root: model.root, pivot, orbit, label, index, initialAngle: theme.initialAngle, orbitSpeed: theme.orbitSpeed, spinSpeed: theme.kind === 'basketball-world' ? .016 : .055 + index * .016 };
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
  const cameraFill = new THREE.DirectionalLight(0xc7d8f4, ecoMode ? .3 : .42);
  cameraFill.position.set(0, 1, 1);
  camera.add(cameraFill);
  renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: false, powerPreference: quality.power, failIfMajorPerformanceCaveat: false });
  renderer.domElement.className = 'solar-canvas';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = ecoMode ? 1.02 : 1.08;
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
  scene.add(new THREE.HemisphereLight(0x71809e, 0x18110d, ecoMode ? .5 : .66));
  createSun();
  starField = createStarField(quality.starCount, false);
  dustField = createStarField(quality.dustCount, true);
  scene.add(starField, dustField);
  worlds = interests.map((interest, index) => createWorld(interests, interest, index));
  if (quality.bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .22, .38, .92));
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
  controls.minDistance = Math.max(entry.theme.size * 1.55, 1.75);
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
  const preferredDirection = currentViewDirection.multiplyScalar(.78).add(sunFacingDirection.multiplyScalar(.22)).normalize();
  const focusDistance = mobileDevice ? Math.max(5.2, entry.theme.size * 6.6) : Math.max(4.35, entry.theme.size * 6.0);
  focusTarget = selectedWorld.clone();
  focusCameraPosition = selectedWorld.clone().add(preferredDirection.multiplyScalar(focusDistance)).add(new THREE.Vector3(0, entry.theme.size * .5, 0));
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

function updateBasketballWorld(entry, elapsed, delta) {
  const model = entry.model;
  model.spectators.material.opacity = .46 + Math.sin(elapsed * 1.25) * .1;
  model.floodHeads.forEach((head, index) => {
    const wave = .5 + .5 * Math.sin(elapsed * 1.15 - index * .78);
    head.material.emissiveIntensity = .62 + wave * 1.15;
  });
  const canyonPulse = .38 + (.5 + .5 * Math.sin(elapsed * .62)) * .24;
  model.canyonGlow.forEach((stroke) => { stroke.material.opacity = canyonPulse; });
  model.trophyGroup.rotation.y = Math.sin(elapsed * .18) * .045;
  model.trophyBalls.forEach((ball, index) => {
    const scale = 1 + Math.sin(elapsed * .8 + index * .65) * .035;
    ball.scale.setScalar(scale);
  });
  const cycle = elapsed % 22;
  const active = cycle > 13 && cycle < 18;
  const local = THREE.MathUtils.clamp((cycle - 13) / 5, 0, 1);
  if (active) {
    model.shot.ball.position.copy(model.shot.curve.getPoint(local));
    const fade = Math.sin(local * Math.PI);
    model.shot.ball.material.opacity = fade;
    model.shot.trail.material.opacity = fade * .32;
  } else {
    model.shot.ball.material.opacity = 0;
    model.shot.trail.material.opacity = 0;
  }
}

function applyFocus() {
  if (!focusCameraPosition || !focusTarget) return;
  camera.position.lerp(focusCameraPosition, .075);
  controls.target.lerp(focusTarget, .09);
  if (camera.position.distanceTo(focusCameraPosition) < .025 && controls.target.distanceTo(focusTarget) < .025) {
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
      entry.root.rotation.y += delta * entry.spinSpeed * (entry === selected ? .22 : 1);
      if (entry.theme.kind === 'basketball-world') updateBasketballWorld(entry, elapsed, delta);
      if (entry.model.ring) entry.model.ring.rotation.z += delta * .045;
      if (entry.model.rings) entry.model.rings.forEach((ring, index) => {
        ring.rotation.z += delta * (.04 + index * .02);
        ring.scale.setScalar(1 + Math.sin(elapsed * (1 + index * .22) + index) * .014);
      });
    }
    starField.rotation.y = elapsed * .0015;
    dustField.rotation.y = -elapsed * .003;
    if (sunMesh) sunMesh.rotation.y = elapsed * .024;
  }
  followSelectedWorld();
  applyFocus();
  controls.update();
  updateLabels();
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
