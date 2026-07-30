import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGL from 'three/addons/capabilities/WebGL.js';

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
  {
    id: 'basketball',
    title: 'Basketball',
    subtitle: 'The game never stops.',
    description: 'Legends, iconic frames and the moments that made the game larger than life.',
    route: '/basketball/',
    theme: 'basketball',
    status: 'published',
    number: '01'
  },
  {
    id: 'games',
    title: 'Games',
    subtitle: 'Worlds built one decision at a time.',
    description: 'Strategy, civilization building and memorable virtual worlds.',
    route: '/games/',
    theme: 'games',
    status: 'preview',
    number: '02'
  },
  {
    id: 'music',
    title: 'Music',
    subtitle: 'Soundtracks for different versions of me.',
    description: 'Artists, albums and songs collected over time.',
    route: '/music/',
    theme: 'music',
    status: 'preview',
    number: '03'
  }
];

const planetThemes = {
  basketball: {
    color: 0xd84a55,
    emissive: 0x4c0d13,
    css: '#ff6b77',
    size: 1.55,
    roughness: 0.78,
    metalness: 0.08,
    ring: false
  },
  games: {
    color: 0x2f7fb8,
    emissive: 0x0b294c,
    css: '#69bfff',
    size: 1.25,
    roughness: 0.46,
    metalness: 0.32,
    ring: true
  },
  music: {
    color: 0x7a4cb4,
    emissive: 0x2c1046,
    css: '#c49aff',
    size: 1.38,
    roughness: 0.55,
    metalness: 0.18,
    ring: true
  },
  default: {
    color: 0x7894aa,
    emissive: 0x172a3b,
    css: '#b8d6ec',
    size: 1.2,
    roughness: 0.66,
    metalness: 0.12,
    ring: false
  }
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileDevice = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
let ecoMode = mobileDevice;
let scene;
let camera;
let renderer;
let controls;
let starField;
let planetEntries = [];
let selectedEntry = null;
let hoveredEntry = null;
let animationStart = performance.now();
let focusCameraPosition = null;
let focusTarget = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(2, 2);
const pointerStart = new THREE.Vector2();
const clock = new THREE.Clock();

function sanitizeInterests(data) {
  if (!Array.isArray(data)) return fallbackInterests;
  const valid = data.filter((item) => item && item.title && item.route);
  return valid.length ? valid : fallbackInterests;
}

async function loadInterests() {
  try {
    const response = await fetch('/data/interests.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Interest registry ${response.status}`);
    return sanitizeInterests(await response.json());
  } catch (error) {
    console.warn('Using fallback interests for 3D prototype:', error);
    return fallbackInterests;
  }
}

function renderFallback(interests, message = '当前设备无法启动 WebGL 2，已切换为静态兴趣入口。') {
  document.documentElement.dataset.solarReady = 'fallback';
  if (loader) loader.classList.add('is-complete');
  if (stage) stage.setAttribute('aria-hidden', 'true');
  if (fallback) fallback.classList.add('is-visible');

  const explanation = fallback?.querySelector('[data-fallback-message]');
  if (explanation) explanation.textContent = message;

  if (!fallbackGrid) return;
  fallbackGrid.replaceChildren(...interests.map((interest) => {
    const link = document.createElement('a');
    link.className = 'fallback-card';
    link.href = interest.route;
    link.innerHTML = `
      <small>PLANET ${interest.number ?? '--'} · ${interest.status === 'published' ? 'ACTIVE' : 'FORMING'}</small>
      <h2>${interest.title}</h2>
      <p>${interest.description ?? interest.subtitle ?? ''}</p>
    `;
    return link;
  }));
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,235,1)');
  gradient.addColorStop(.16, 'rgba(255,198,82,.92)');
  gradient.addColorStop(.44, 'rgba(255,112,32,.28)');
  gradient.addColorStop(1, 'rgba(255,85,20,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarField(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const radius = 55 + Math.random() * 115;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const palette = Math.random();
    color.set(palette > .82 ? 0xb8d4ff : palette > .65 ? 0xd4c1ff : 0xffffff);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: ecoMode ? .12 : .17,
    sizeAttenuation: true,
    transparent: true,
    opacity: ecoMode ? .72 : .9,
    vertexColors: true,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}

function createOrbit(radius, inclination, color) {
  const segments = ecoMode ? 96 : 180;
  const points = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: .16,
    depthWrite: false
  });
  const line = new THREE.LineLoop(geometry, material);
  line.rotation.z = inclination;
  return line;
}

function createPlanetTexture(theme, index) {
  const size = ecoMode ? 256 : 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext('2d');
  const base = new THREE.Color(theme.color);

  context.fillStyle = `#${base.getHexString()}`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const stripeCount = 22;
  for (let stripe = 0; stripe < stripeCount; stripe += 1) {
    const y = (stripe / stripeCount) * canvas.height;
    const wave = Math.sin(stripe * 1.7 + index) * 12;
    context.fillStyle = stripe % 3 === 0
      ? 'rgba(255,255,255,.07)'
      : 'rgba(0,0,0,.08)';
    context.fillRect(wave, y, canvas.width, canvas.height / stripeCount + 2);
  }

  const spotCount = ecoMode ? 18 : 42;
  for (let spot = 0; spot < spotCount; spot += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 3 + Math.random() * (ecoMode ? 12 : 22);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, spot % 2 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.16)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = ecoMode ? 1 : Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createPlanet(interests, interest, index) {
  const theme = planetThemes[interest.theme] ?? planetThemes.default;
  const orbitRadius = 8.4 + index * 5.8;
  const inclination = THREE.MathUtils.degToRad(((index % 4) - 1.5) * 4.2);
  const initialAngle = .72 + index * 2.15;
  const orbitSpeed = .075 / Math.pow(index + 1, .45);
  const segments = ecoMode ? 24 : 48;

  const orbitLine = createOrbit(orbitRadius, inclination, theme.color);
  scene.add(orbitLine);

  const orbitPlane = new THREE.Group();
  orbitPlane.rotation.z = inclination;
  scene.add(orbitPlane);

  const pivot = new THREE.Group();
  pivot.rotation.y = initialAngle;
  orbitPlane.add(pivot);

  const geometry = new THREE.SphereGeometry(theme.size, segments, Math.max(16, segments / 2));
  const material = new THREE.MeshStandardMaterial({
    color: theme.color,
    map: createPlanetTexture(theme, index),
    emissive: theme.emissive,
    emissiveIntensity: .42,
    roughness: theme.roughness,
    metalness: theme.metalness
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = orbitRadius;
  mesh.rotation.z = THREE.MathUtils.degToRad(index % 2 ? 13 : -7);
  pivot.add(mesh);

  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: theme.color,
    transparent: true,
    opacity: .075,
    side: THREE.BackSide,
    depthWrite: false
  });
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(theme.size * 1.08, segments, Math.max(16, segments / 2)),
    atmosphereMaterial
  );
  mesh.add(atmosphere);

  if (theme.ring) {
    const ringGeometry = new THREE.RingGeometry(theme.size * 1.42, theme.size * 1.9, ecoMode ? 48 : 96);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: theme.color,
      transparent: true,
      opacity: .28,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.35;
    ring.rotation.z = THREE.MathUtils.degToRad(index % 2 ? 18 : -22);
    mesh.add(ring);
  }

  const label = document.createElement('div');
  label.className = 'planet-label';
  label.style.setProperty('--planet-color', theme.css);
  label.innerHTML = `<strong>${interest.title.toUpperCase()}</strong><span>PLANET ${interest.number ?? String(index + 1).padStart(2, '0')}</span>`;
  labelLayer?.append(label);

  const entry = {
    interest,
    theme,
    mesh,
    pivot,
    orbitPlane,
    orbitLine,
    label,
    orbitRadius,
    orbitSpeed,
    initialAngle,
    spinSpeed: .14 + index * .035,
    index,
    systemSize: interests.length
  };

  mesh.userData.entry = entry;
  return entry;
}

function buildScene(interests) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010208);
  scene.fog = new THREE.FogExp2(0x010208, ecoMode ? .0065 : .0045);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, .1, 320);
  camera.position.set(0, mobileDevice ? 25 : 19, mobileDevice ? 38 : 34);

  renderer = new THREE.WebGLRenderer({
    antialias: !ecoMode,
    alpha: false,
    powerPreference: ecoMode ? 'low-power' : 'high-performance',
    failIfMajorPerformanceCaveat: false
  });
  renderer.domElement.className = 'solar-canvas';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ecoMode ? 1.15 : 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  stage?.prepend(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.enablePan = false;
  controls.minDistance = 11;
  controls.maxDistance = Math.max(64, 30 + interests.length * 8);
  controls.target.set(0, 0, 0);

  const ambient = new THREE.AmbientLight(0x61708b, .5);
  scene.add(ambient);

  const sunLight = new THREE.PointLight(0xffc46b, 155, 135, 1.55);
  scene.add(sunLight);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, ecoMode ? 30 : 56, ecoMode ? 18 : 32),
    new THREE.MeshBasicMaterial({ color: 0xffb33f })
  );
  scene.add(sun);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffa13b,
    transparent: true,
    opacity: .92,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  glow.scale.set(13, 13, 1);
  scene.add(glow);

  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(3.15, ecoMode ? 24 : 44, ecoMode ? 16 : 28),
    new THREE.MeshBasicMaterial({
      color: 0xff7d26,
      transparent: true,
      opacity: .08,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  scene.add(sunHalo);

  starField = createStarField(ecoMode ? 1100 : 3300);
  scene.add(starField);

  planetEntries = interests.map((interest, index) => createPlanet(interests, interest, index));

  readoutCount.textContent = String(interests.length).padStart(2, '0');
  readoutMode.textContent = ecoMode ? 'ECO' : 'QUALITY';
  performanceButton.textContent = ecoMode ? 'MODE / ECO' : 'MODE / QUALITY';
}

function setPointer(event) {
  const canvas = renderer?.domElement;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function findPlanetAtPointer() {
  if (!camera || !planetEntries.length) return null;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(planetEntries.map((entry) => entry.mesh), false);
  return hits[0]?.object?.userData?.entry ?? null;
}

function updateHover(entry) {
  if (hoveredEntry === entry) return;
  if (hoveredEntry) hoveredEntry.label?.classList.remove('is-active');
  hoveredEntry = entry;
  if (hoveredEntry) hoveredEntry.label?.classList.add('is-active');
  stage?.classList.toggle('is-targeting', Boolean(entry));
}

function showPlanetPanel(entry) {
  selectedEntry = entry;
  panel.style.setProperty('--planet-color', entry.theme.css);
  panelIndex.textContent = `PLANET ${entry.interest.number ?? String(entry.index + 1).padStart(2, '0')}`;
  panelStatus.textContent = entry.interest.status === 'published' ? 'ACTIVE SYSTEM' : 'FORMING SYSTEM';
  panelTitle.textContent = entry.interest.title;
  panelDescription.textContent = entry.interest.description ?? entry.interest.subtitle ?? '';
  panelLink.href = entry.interest.route;
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');

  const worldPosition = new THREE.Vector3();
  entry.mesh.getWorldPosition(worldPosition);
  const outward = worldPosition.clone().normalize();
  const cameraDistance = mobileDevice ? 8.5 : 7;
  focusCameraPosition = worldPosition.clone()
    .add(outward.multiplyScalar(cameraDistance))
    .add(new THREE.Vector3(0, entry.theme.size * 1.7, 0));
  focusTarget = worldPosition;
}

function closePlanetPanel({ resetFocus = false } = {}) {
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  selectedEntry = null;
  if (resetFocus) resetView();
}

function resetView() {
  focusCameraPosition = new THREE.Vector3(0, mobileDevice ? 25 : 19, mobileDevice ? 38 : 34);
  focusTarget = new THREE.Vector3(0, 0, 0);
  closePlanetPanel();
}

function updateLabels() {
  if (!camera || !labelLayer) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  for (const entry of planetEntries) {
    const worldPosition = new THREE.Vector3();
    entry.mesh.getWorldPosition(worldPosition);
    const toPlanet = worldPosition.clone().sub(camera.position);
    const projected = worldPosition.clone().project(camera);
    const visible = cameraDirection.dot(toPlanet) > 0 && projected.z > -1 && projected.z < 1;

    entry.label.classList.toggle('is-hidden', !visible);
    if (!visible) continue;

    const x = (projected.x * .5 + .5) * width;
    const y = (-projected.y * .5 + .5) * height;
    entry.label.style.transform = `translate3d(${x + 14}px, ${y}px, 0) translateY(-50%)`;
  }
}

function applyFocus() {
  if (!focusCameraPosition || !focusTarget) return;
  camera.position.lerp(focusCameraPosition, .075);
  controls.target.lerp(focusTarget, .085);

  if (camera.position.distanceTo(focusCameraPosition) < .035 && controls.target.distanceTo(focusTarget) < .035) {
    focusCameraPosition = null;
    focusTarget = null;
  }
}

function animate(time) {
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = (time - animationStart) / 1000;

  if (!reduceMotion) {
    for (const entry of planetEntries) {
      entry.pivot.rotation.y = entry.initialAngle + elapsed * entry.orbitSpeed;
      entry.mesh.rotation.y += delta * entry.spinSpeed;
    }
    if (starField) starField.rotation.y = elapsed * .0025;
  }

  applyFocus();
  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}

function updatePerformanceMode() {
  ecoMode = !ecoMode;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ecoMode ? 1.1 : 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.imageRendering = ecoMode ? 'auto' : '';
  if (starField?.material) {
    starField.material.opacity = ecoMode ? .68 : .9;
    starField.material.size = ecoMode ? .11 : .17;
  }
  readoutMode.textContent = ecoMode ? 'ECO' : 'QUALITY';
  performanceButton.textContent = ecoMode ? 'MODE / ECO' : 'MODE / QUALITY';
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function bindInteraction() {
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (event) => {
    pointerStart.set(event.clientX, event.clientY);
  });

  canvas.addEventListener('pointermove', (event) => {
    setPointer(event);
    updateHover(findPlanetAtPointer());
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.set(2, 2);
    updateHover(null);
  });

  canvas.addEventListener('pointerup', (event) => {
    const movement = pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
    if (movement > 8) return;
    setPointer(event);
    const entry = findPlanetAtPointer();
    if (entry) showPlanetPanel(entry);
  });

  canvas.addEventListener('dblclick', (event) => {
    setPointer(event);
    const entry = findPlanetAtPointer();
    if (entry?.interest?.route) window.location.href = entry.interest.route;
  });

  panelClose?.addEventListener('click', () => closePlanetPanel());
  resetButton?.addEventListener('click', resetView);
  performanceButton?.addEventListener('click', updatePerformanceMode);
  window.addEventListener('resize', onResize, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
    } else {
      clock.getDelta();
      renderer.setAnimationLoop(animate);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePlanetPanel({ resetFocus: true });
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
    console.error('Unable to initialize 3D solar universe:', error);
    renderFallback(interests, '3D 场景初始化失败，已切换为静态兴趣入口。');
  }
}

init();
