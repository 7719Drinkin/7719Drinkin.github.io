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
  { id: 'basketball', title: 'Basketball', subtitle: 'The game never stops.', description: 'Legends, iconic frames and the moments that made the game larger than life.', route: '/basketball/', theme: 'basketball', status: 'published', number: '01' },
  { id: 'games', title: 'Games', subtitle: 'Worlds built one decision at a time.', description: 'Strategy, civilization building and memorable virtual worlds.', route: '/games/', theme: 'games', status: 'preview', number: '02' },
  { id: 'music', title: 'Music', subtitle: 'Soundtracks for different versions of me.', description: 'Artists, albums and songs collected over time.', route: '/music/', theme: 'music', status: 'preview', number: '03' }
];

const themes = {
  basketball: { kind: 'basketball', color: 0x9c3f20, emissive: 0x120301, css: '#dc7443', size: .82, roughness: .9, metalness: .0, clearcoat: .025, bumpScale: .05 },
  games: { kind: 'games', color: 0x17364b, emissive: 0x061d33, css: '#6cc7ff', size: .7, roughness: .48, metalness: .38, clearcoat: .22, bumpScale: .026 },
  music: { kind: 'music', color: 0x2d1b3b, emissive: 0x170625, css: '#c796ff', size: .76, roughness: .4, metalness: .22, clearcoat: .34, bumpScale: .018 },
  default: { kind: 'default', color: 0x445461, emissive: 0x0a1117, css: '#b8d6ec', size: .72, roughness: .7, metalness: .08, clearcoat: .08, bumpScale: .03 }
};

const params = new URLSearchParams(location.search);
const mobileDevice = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const forcedMode = params.get('mode');
const ecoMode = forcedMode === 'eco' || (forcedMode !== 'quality' && mobileDevice);
const quality = ecoMode ? {
  pixelRatio: 1.15, starCount: 1400, dustCount: 180, segments: 32, textureSize: 384,
  antialias: false, bloom: false, anisotropy: 2, power: 'low-power'
} : {
  pixelRatio: 2.15, starCount: 6200, dustCount: 650, segments: 96, textureSize: 1024,
  antialias: true, bloom: true, anisotropy: 8, power: 'high-performance'
};

let scene;
let camera;
let renderer;
let controls;
let composer;
let bloomPass;
let starField;
let dustField;
let sunMaterial;
let sunMesh;
let planets = [];
let hovered = null;
let selected = null;
let focusCameraPosition = null;
let focusTarget = null;
let animationStart = performance.now();

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

function makeCanvas(size, fill = '#000') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext('2d');
  context.fillStyle = fill;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

function toTexture(canvas, { color = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(quality.anisotropy, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function drawBasketball(size, seed) {
  const height = size / 2;
  const colorLayer = makeCanvas(size, '#8b331a');
  const bumpLayer = makeCanvas(size, '#777');
  const roughLayer = makeCanvas(size, '#e2e2e2');
  const glowLayer = makeCanvas(size, '#000');
  const color = colorLayer.context;
  const bump = bumpLayer.context;
  const rough = roughLayer.context;
  const random = seededRandom(seed + 31);

  const base = color.createLinearGradient(0, 0, size, height);
  base.addColorStop(0, '#4c160b');
  base.addColorStop(.22, '#96351b');
  base.addColorStop(.55, '#bb5228');
  base.addColorStop(.82, '#7c2715');
  base.addColorStop(1, '#3d1109');
  color.fillStyle = base;
  color.fillRect(0, 0, size, height);

  const pores = ecoMode ? 6500 : 24000;
  for (let i = 0; i < pores; i += 1) {
    const x = random() * size;
    const y = random() * height;
    const radius = .25 + random() * (ecoMode ? 1.2 : 1.7);
    const raised = random() > .44;
    color.fillStyle = raised ? 'rgba(255,190,115,.05)' : 'rgba(16,2,0,.15)';
    color.beginPath(); color.arc(x, y, radius, 0, Math.PI * 2); color.fill();
    bump.fillStyle = raised ? '#b7b7b7' : '#393939';
    bump.beginPath(); bump.arc(x, y, radius * .9, 0, Math.PI * 2); bump.fill();
    rough.fillStyle = raised ? '#ededed' : '#c5c5c5';
    rough.fillRect(x, y, 1.3, 1.3);
  }

  const seam = Math.max(7, size * .011);
  const drawSeams = (ctx, stroke, width, offset = 0) => {
    ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineCap = 'round';
    for (const x of [size * .25, size * .75]) { ctx.beginPath(); ctx.moveTo(x + offset, 0); ctx.lineTo(x + offset, height); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, height * .5 + offset); ctx.lineTo(size, height * .5 + offset); ctx.stroke();
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 4) {
        const y = height * .5 + direction * Math.sin((x / size) * Math.PI * 2) * height * .29 + offset;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };
  drawSeams(color, '#140302', seam + 4);
  drawSeams(color, '#3c0c06', seam);
  drawSeams(color, 'rgba(255,172,108,.12)', Math.max(1, seam * .12), -seam * .32);
  drawSeams(bump, '#151515', seam + 3);

  return { map: toTexture(colorLayer.canvas), bumpMap: toTexture(bumpLayer.canvas, { color: false }), roughnessMap: toTexture(roughLayer.canvas, { color: false }), emissiveMap: toTexture(glowLayer.canvas) };
}

function drawHexGrid(ctx, width, height, radius, stroke, lineWidth) {
  const h = Math.sqrt(3) * radius;
  const columnWidth = radius * 1.5;
  ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth;
  for (let column = -1; column < width / columnWidth + 1; column += 1) {
    for (let row = -1; row < height / h + 1; row += 1) {
      const cx = column * columnWidth;
      const cy = row * h + (column % 2 ? h / 2 : 0);
      ctx.beginPath();
      for (let side = 0; side < 6; side += 1) {
        const angle = side * Math.PI / 3;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (side === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
  }
}

function drawGames(size, seed) {
  const height = size / 2;
  const colorLayer = makeCanvas(size, '#061018');
  const bumpLayer = makeCanvas(size, '#777');
  const roughLayer = makeCanvas(size, '#999');
  const glowLayer = makeCanvas(size, '#000');
  const color = colorLayer.context;
  const bump = bumpLayer.context;
  const rough = roughLayer.context;
  const glow = glowLayer.context;
  const random = seededRandom(seed + 211);

  const base = color.createLinearGradient(0, 0, size, height);
  base.addColorStop(0, '#02070b'); base.addColorStop(.38, '#15344b'); base.addColorStop(.68, '#071a29'); base.addColorStop(1, '#020509');
  color.fillStyle = base; color.fillRect(0, 0, size, height);

  for (let i = 0; i < (ecoMode ? 55 : 145); i += 1) {
    const x = random() * size, y = random() * height, radius = size * (.015 + random() * .065);
    const cloud = color.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, random() > .5 ? 'rgba(63,137,182,.15)' : 'rgba(0,0,0,.3)'); cloud.addColorStop(1, 'rgba(0,0,0,0)');
    color.fillStyle = cloud; color.beginPath(); color.arc(x, y, radius, 0, Math.PI * 2); color.fill();
  }

  const hex = ecoMode ? 18 : 27;
  drawHexGrid(color, size, height, hex, 'rgba(114,211,255,.08)', .8);
  drawHexGrid(bump, size, height, hex, 'rgba(190,190,190,.35)', 1.1);
  drawHexGrid(rough, size, height, hex, 'rgba(210,210,210,.22)', .8);

  const nodes = [];
  const count = ecoMode ? 140 : 430;
  for (let i = 0; i < count; i += 1) {
    const node = { x: random() * size, y: random() * height, r: .8 + random() * 2.2 };
    nodes.push(node);
    glow.fillStyle = random() > .88 ? '#d4f3ff' : '#238fc8';
    glow.beginPath(); glow.arc(node.x, node.y, node.r, 0, Math.PI * 2); glow.fill();
  }
  glow.strokeStyle = 'rgba(35,155,210,.34)'; glow.lineWidth = .7;
  for (let i = 0; i < nodes.length - 1; i += 3) {
    const a = nodes[i], b = nodes[i + 1];
    if (!b || Math.hypot(a.x - b.x, a.y - b.y) > size * .11) continue;
    glow.beginPath(); glow.moveTo(a.x, a.y); glow.lineTo(b.x, b.y); glow.stroke();
  }

  return { map: toTexture(colorLayer.canvas), bumpMap: toTexture(bumpLayer.canvas, { color: false }), roughnessMap: toTexture(roughLayer.canvas, { color: false }), emissiveMap: toTexture(glowLayer.canvas) };
}

function drawMusic(size, seed) {
  const height = size / 2;
  const colorLayer = makeCanvas(size, '#08030d');
  const bumpLayer = makeCanvas(size, '#7d7d7d');
  const roughLayer = makeCanvas(size, '#858585');
  const glowLayer = makeCanvas(size, '#000');
  const color = colorLayer.context;
  const bump = bumpLayer.context;
  const glow = glowLayer.context;
  const random = seededRandom(seed + 409);

  const base = color.createLinearGradient(0, 0, size, height);
  base.addColorStop(0, '#040207'); base.addColorStop(.28, '#261333'); base.addColorStop(.55, '#0c2d3b'); base.addColorStop(.8, '#35133d'); base.addColorStop(1, '#050208');
  color.fillStyle = base; color.fillRect(0, 0, size, height);

  const bands = ecoMode ? 28 : 64;
  for (let band = 0; band < bands; band += 1) {
    const y0 = (band + .5) / bands * height;
    const amplitude = height * (.008 + random() * .045);
    const frequency = 1.2 + random() * 6;
    const phase = random() * Math.PI * 2;
    const rgb = band % 3 === 0 ? [105, 224, 255] : band % 3 === 1 ? [201, 145, 255] : [242, 111, 205];
    const paths = [[color, `rgba(${rgb.join(',')},.12)`, 1.2], [glow, `rgba(${rgb.join(',')},.38)`, 1], [bump, band % 2 ? '#969696' : '#686868', 1]];
    for (const [ctx, stroke, width] of paths) {
      ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.beginPath();
      for (let x = 0; x <= size; x += 4) {
        const y = y0 + Math.sin((x / size) * Math.PI * 2 * frequency + phase) * amplitude;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  for (let i = 0; i < (ecoMode ? 45 : 130); i += 1) {
    glow.fillStyle = random() > .5 ? '#7de9ff' : '#d89dff';
    glow.beginPath(); glow.arc(random() * size, random() * height, 1 + random() * 3, 0, Math.PI * 2); glow.fill();
  }

  return { map: toTexture(colorLayer.canvas), bumpMap: toTexture(bumpLayer.canvas, { color: false }), roughnessMap: toTexture(roughLayer.canvas, { color: false }), emissiveMap: toTexture(glowLayer.canvas) };
}

function drawDefault(size, seed) {
  const colorLayer = makeCanvas(size, '#35434e');
  const bumpLayer = makeCanvas(size, '#777');
  const roughLayer = makeCanvas(size, '#c4c4c4');
  const glowLayer = makeCanvas(size, '#000');
  const random = seededRandom(seed + 701);
  for (let i = 0; i < (ecoMode ? 120 : 380); i += 1) {
    const x = random() * size, y = random() * size / 2, r = 2 + random() * size * .025;
    colorLayer.context.fillStyle = `rgba(120,145,160,${.04 + random() * .1})`;
    colorLayer.context.beginPath(); colorLayer.context.arc(x, y, r, 0, Math.PI * 2); colorLayer.context.fill();
    bumpLayer.context.fillStyle = random() > .5 ? '#999' : '#555';
    bumpLayer.context.beginPath(); bumpLayer.context.arc(x, y, r, 0, Math.PI * 2); bumpLayer.context.fill();
  }
  return { map: toTexture(colorLayer.canvas), bumpMap: toTexture(bumpLayer.canvas, { color: false }), roughnessMap: toTexture(roughLayer.canvas, { color: false }), emissiveMap: toTexture(glowLayer.canvas) };
}

function createMaps(theme, index) {
  const size = quality.textureSize;
  if (theme.kind === 'basketball') return drawBasketball(size, index * 101 + 7);
  if (theme.kind === 'games') return drawGames(size, index * 101 + 7);
  if (theme.kind === 'music') return drawMusic(size, index * 101 + 7);
  return drawDefault(size, index * 101 + 7);
}

function createStarField(count, near = false) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const radius = near ? 22 + Math.random() * 45 : 55 + Math.random() * 135;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    const palette = Math.random();
    color.set(palette > .88 ? 0xa9ccff : palette > .72 ? 0xd0baff : 0xffffff);
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: near ? .055 : .13, sizeAttenuation: true, transparent: true, opacity: near ? .28 : .86, vertexColors: true, depthWrite: false });
  return new THREE.Points(geometry, material);
}

function createOrbit(radius, inclination, color) {
  const points = [];
  const segments = ecoMode ? 128 : 320;
  for (let i = 0; i < segments; i += 1) {
    const angle = i / segments * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: ecoMode ? .07 : .09, depthWrite: false }));
  line.rotation.z = inclination;
  return line;
}

function createSun() {
  const geometry = new THREE.SphereGeometry(1.25, ecoMode ? 48 : 128, ecoMode ? 28 : 72);
  sunMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uExposure: { value: 1 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition; void main(){ vNormal=normalize(normalMatrix*normal); vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vPosition; uniform float uTime;
      float hash(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float f=0.; f+=.5*noise(p); p*=2.03; f+=.25*noise(p); p*=2.01; f+=.125*noise(p); p*=2.04; f+=.0625*noise(p); return f; }
      void main(){ float n=fbm(normalize(vPosition)*4.4+vec3(uTime*.045,uTime*.018,0.)); float hot=smoothstep(.34,.92,n); vec3 dark=vec3(.45,.035,.005); vec3 orange=vec3(1.,.24,.015); vec3 light=vec3(1.,.82,.34); vec3 col=mix(dark,orange,n); col=mix(col,light,hot*.75); float rim=pow(1.-max(dot(normalize(vNormal),vec3(0,0,1)),0.),2.); col+=vec3(1.,.18,.01)*rim*.2; gl_FragColor=vec4(col,1.); }`
  });
  sunMesh = new THREE.Mesh(geometry, sunMaterial);
  scene.add(sunMesh);

  const light = new THREE.PointLight(0xffa34f, ecoMode ? 75 : 105, 95, 1.7);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x38445c, ecoMode ? .34 : .42));

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256; glowCanvas.height = 256;
  const ctx = glowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,246,196,.95)'); gradient.addColorStop(.18, 'rgba(255,151,47,.58)'); gradient.addColorStop(.52, 'rgba(255,78,18,.13)'); gradient.addColorStop(1, 'rgba(255,60,10,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: toTexture(glowCanvas), transparent: true, opacity: ecoMode ? .62 : .76, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.set(6.8, 6.8, 1);
  scene.add(sprite);
}

function createAccessories(mesh, theme) {
  const accessories = [];
  if (theme.kind === 'games') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(theme.size * 1.48, .014, 12, ecoMode ? 96 : 220), new THREE.MeshBasicMaterial({ color: 0x57c8ff, transparent: true, opacity: .42, depthWrite: false }));
    ring.rotation.x = 1.12; ring.rotation.y = .28; mesh.add(ring); accessories.push(ring);
    const ring2 = ring.clone(); ring2.scale.setScalar(1.13); ring2.rotation.x = .78; ring2.material = ring.material.clone(); ring2.material.opacity = .18; mesh.add(ring2); accessories.push(ring2);
  }
  if (theme.kind === 'music') {
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(theme.size * (1.38 + i * .15), .012 + i * .004, 12, ecoMode ? 96 : 240), new THREE.MeshBasicMaterial({ color: i === 1 ? 0x70dfff : 0xc68fff, transparent: true, opacity: .34 - i * .07, depthWrite: false, blending: THREE.AdditiveBlending }));
      ring.rotation.x = .9 + i * .2; ring.rotation.y = .2 - i * .35; mesh.add(ring); accessories.push(ring);
    }
  }
  return accessories;
}

function createPlanet(interests, interest, index) {
  const theme = themes[interest.theme] ?? themes.default;
  const orbitRadius = 7.2 + index * 4.8;
  const inclination = THREE.MathUtils.degToRad(((index % 4) - 1.5) * 3.1);
  const initialAngle = .72 + index * 2.15;
  const orbitSpeed = .06 / Math.pow(index + 1, .45);
  const orbit = createOrbit(orbitRadius, inclination, theme.color);
  scene.add(orbit);

  const plane = new THREE.Group(); plane.rotation.z = inclination; scene.add(plane);
  const pivot = new THREE.Group(); pivot.rotation.y = initialAngle; plane.add(pivot);
  const maps = createMaps(theme, index);
  const material = new THREE.MeshPhysicalMaterial({
    color: theme.color,
    map: maps.map,
    bumpMap: maps.bumpMap,
    bumpScale: theme.bumpScale,
    roughnessMap: maps.roughnessMap,
    roughness: theme.roughness,
    metalness: theme.metalness,
    clearcoat: theme.clearcoat,
    clearcoatRoughness: .42,
    emissive: theme.emissive,
    emissiveMap: maps.emissiveMap,
    emissiveIntensity: theme.kind === 'games' ? 1.4 : theme.kind === 'music' ? 1.15 : .18
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(theme.size, quality.segments, Math.max(24, quality.segments / 2)), material);
  mesh.position.x = orbitRadius;
  mesh.rotation.z = THREE.MathUtils.degToRad(index % 2 ? 11 : -6);
  pivot.add(mesh);

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(theme.size * 1.035, ecoMode ? 32 : 72, ecoMode ? 20 : 42), new THREE.MeshBasicMaterial({ color: theme.color, transparent: true, opacity: theme.kind === 'basketball' ? .018 : .045, side: THREE.BackSide, depthWrite: false }));
  mesh.add(atmosphere);
  const accessories = createAccessories(mesh, theme);

  const label = document.createElement('div');
  label.className = 'planet-label';
  label.style.setProperty('--planet-color', theme.css);
  label.innerHTML = `<strong>${interest.title.toUpperCase()}</strong><span>PLANET ${interest.number ?? String(index + 1).padStart(2, '0')}</span>`;
  labelLayer?.append(label);

  const entry = { interest, theme, mesh, pivot, orbit, label, accessories, orbitSpeed, initialAngle, spinSpeed: .09 + index * .025, index };
  mesh.userData.entry = entry;
  return entry;
}

function buildScene(interests) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000106);
  scene.fog = new THREE.FogExp2(0x000106, ecoMode ? .0055 : .0034);
  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 360);
  camera.position.set(0, mobileDevice ? 22 : 16, mobileDevice ? 36 : 31);

  renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: false, powerPreference: quality.power, failIfMajorPerformanceCaveat: false });
  renderer.domElement.className = 'solar-canvas';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = ecoMode ? 1.02 : 1.14;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  stage?.prepend(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .055; controls.enablePan = false;
  controls.minDistance = 7; controls.maxDistance = Math.max(55, 24 + interests.length * 8); controls.target.set(0, 0, 0);

  createSun();
  starField = createStarField(quality.starCount, false); scene.add(starField);
  dustField = createStarField(quality.dustCount, true); scene.add(dustField);
  planets = interests.map((interest, index) => createPlanet(interests, interest, index));

  if (quality.bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .42, .52, .88);
    composer.addPass(bloomPass);
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

function hitPlanet() {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(planets.map((entry) => entry.mesh), false)[0]?.object?.userData?.entry ?? null;
}

function updateHover(entry) {
  if (hovered === entry) return;
  hovered?.label?.classList.remove('is-active');
  hovered = entry;
  hovered?.label?.classList.add('is-active');
  stage?.classList.toggle('is-targeting', Boolean(entry));
}

function showPanel(entry) {
  selected = entry;
  panel.style.setProperty('--planet-color', entry.theme.css);
  panelIndex.textContent = `PLANET ${entry.interest.number ?? String(entry.index + 1).padStart(2, '0')}`;
  panelStatus.textContent = entry.interest.status === 'published' ? 'ACTIVE SYSTEM' : 'FORMING SYSTEM';
  panelTitle.textContent = entry.interest.title;
  panelDescription.textContent = entry.interest.description ?? entry.interest.subtitle ?? '';
  panelLink.href = entry.interest.route;
  panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
  const world = new THREE.Vector3(); entry.mesh.getWorldPosition(world);
  const outward = world.clone().normalize();
  focusCameraPosition = world.clone().add(outward.multiplyScalar(mobileDevice ? 6.2 : 5.1)).add(new THREE.Vector3(0, entry.theme.size * 1.6, 0));
  focusTarget = world;
}

function closePanel({ reset = false } = {}) {
  panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); selected = null;
  if (reset) resetView();
}

function resetView() {
  focusCameraPosition = new THREE.Vector3(0, mobileDevice ? 22 : 16, mobileDevice ? 36 : 31);
  focusTarget = new THREE.Vector3(0, 0, 0);
  panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); selected = null;
}

function updateLabels() {
  const cameraDirection = new THREE.Vector3(); camera.getWorldDirection(cameraDirection);
  for (const entry of planets) {
    const world = new THREE.Vector3(); entry.mesh.getWorldPosition(world);
    const projected = world.clone().project(camera);
    const visible = cameraDirection.dot(world.clone().sub(camera.position)) > 0 && projected.z > -1 && projected.z < 1;
    entry.label.classList.toggle('is-hidden', !visible);
    if (!visible) continue;
    entry.label.style.transform = `translate3d(${(projected.x * .5 + .5) * innerWidth + 13}px, ${(-projected.y * .5 + .5) * innerHeight}px, 0) translateY(-50%)`;
  }
}

function applyFocus() {
  if (!focusCameraPosition || !focusTarget) return;
  camera.position.lerp(focusCameraPosition, .07); controls.target.lerp(focusTarget, .08);
  if (camera.position.distanceTo(focusCameraPosition) < .03 && controls.target.distanceTo(focusTarget) < .03) { focusCameraPosition = null; focusTarget = null; }
}

function animate(time) {
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = (time - animationStart) / 1000;
  if (sunMaterial) sunMaterial.uniforms.uTime.value = elapsed;
  if (!reduceMotion) {
    for (const entry of planets) {
      entry.pivot.rotation.y = entry.initialAngle + elapsed * entry.orbitSpeed;
      entry.mesh.rotation.y += delta * entry.spinSpeed;
      entry.accessories.forEach((ring, index) => {
        ring.rotation.z += delta * (.05 + index * .025);
        if (entry.theme.kind === 'music') ring.scale.setScalar(1 + Math.sin(elapsed * (1.1 + index * .25) + index) * .018);
      });
    }
    starField.rotation.y = elapsed * .0015;
    dustField.rotation.y = -elapsed * .003;
    if (sunMesh) sunMesh.rotation.y = elapsed * .025;
  }
  applyFocus(); controls.update(); updateLabels();
  if (composer) composer.render(); else renderer.render(scene, camera);
}

function switchMode() {
  const url = new URL(location.href);
  url.searchParams.set('mode', ecoMode ? 'quality' : 'eco');
  location.href = url.toString();
}

function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pixelRatio)); renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
}

function bindInteraction() {
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => pointerStart.set(event.clientX, event.clientY));
  canvas.addEventListener('pointermove', (event) => { setPointer(event); updateHover(hitPlanet()); });
  canvas.addEventListener('pointerleave', () => { pointer.set(2, 2); updateHover(null); });
  canvas.addEventListener('pointerup', (event) => {
    if (pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 8) return;
    setPointer(event); const entry = hitPlanet(); if (entry) showPanel(entry);
  });
  canvas.addEventListener('dblclick', (event) => { setPointer(event); const entry = hitPlanet(); if (entry?.interest?.route) location.href = entry.interest.route; });
  panelClose?.addEventListener('click', () => closePanel());
  resetButton?.addEventListener('click', resetView);
  performanceButton?.addEventListener('click', switchMode);
  addEventListener('resize', resize, { passive: true });
  addEventListener('keydown', (event) => { if (event.key === 'Escape') closePanel({ reset: true }); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else { clock.getDelta(); renderer.setAnimationLoop(animate); }
  });
}

async function init() {
  const interests = await loadInterests();
  if (!WebGL.isWebGL2Available()) { renderFallback(interests); return; }
  try {
    buildScene(interests); bindInteraction();
    document.documentElement.dataset.solarReady = 'true';
    loader?.classList.add('is-complete');
    renderer.setAnimationLoop(animate);
  } catch (error) {
    console.error('Unable to initialize high fidelity solar universe:', error);
    renderFallback(interests, '高质量 3D 场景初始化失败，已切换为静态兴趣入口。');
  }
}

init();
