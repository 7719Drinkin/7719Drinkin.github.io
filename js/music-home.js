import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HOME_DATA_URL = '/data/music/home.json';
const DEFAULT_QUOTES = ['只是狂歌一曲，恍惚间就化入无穷'];
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/explearning/threejs-react@a720ced527eefbaa54df783f44e44a07647edf4a/public/old_gramophone/scene.gltf';
const MODEL_TEXTURE_PATH = '/public/old_gramophone/textures/';
const ONE_PIXEL_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/0Wq7WQAAAABJRU5ErkJggg==';

const TYPE_DELAY_MS = 120;
const DELETE_DELAY_MS = 50;
const HOLD_DELAY_MS = 1500;
const BETWEEN_QUOTES_MS = 280;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const loadHeroQuotes = async () => {
  try {
    const response = await fetch(HOME_DATA_URL, {
      credentials: 'same-origin',
      cache: 'force-cache',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Music home data ${response.status}`);
    const data = await response.json();
    const quotes = Array.isArray(data?.heroQuotes)
      ? data.heroQuotes.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    return quotes.length ? quotes : DEFAULT_QUOTES;
  } catch {
    return DEFAULT_QUOTES;
  }
};

const initHeroTypewriter = async () => {
  const root = document.querySelector('[data-music-hero-quote]');
  const textNode = root?.querySelector('[data-music-hero-quote-text]');
  if (!root || !textNode) return;

  const fallbackQuote = textNode.textContent?.trim() || DEFAULT_QUOTES[0];
  if (!reducedMotion.matches) textNode.textContent = '';

  const quotes = await loadHeroQuotes();
  const firstQuote = quotes[0] || fallbackQuote;

  if (reducedMotion.matches) {
    textNode.textContent = firstQuote;
    root.dataset.quoteIndex = '0';
    root.setAttribute('aria-label', firstQuote);
    return;
  }

  let quoteIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  let timer = 0;

  const write = () => {
    const quote = quotes[quoteIndex] || firstQuote;
    const characters = Array.from(quote);

    characterIndex = deleting
      ? Math.max(0, characterIndex - 1)
      : Math.min(characters.length, characterIndex + 1);

    textNode.textContent = characters.slice(0, characterIndex).join('');
    root.dataset.quoteIndex = String(quoteIndex);

    if (!deleting && characterIndex === characters.length) {
      root.setAttribute('aria-label', quote);
      if (quotes.length === 1) return;
      timer = window.setTimeout(() => {
        deleting = true;
        write();
      }, HOLD_DELAY_MS);
      return;
    }

    if (deleting && characterIndex === 0) {
      deleting = false;
      quoteIndex = (quoteIndex + 1) % quotes.length;
      root.setAttribute('aria-label', quotes[quoteIndex]);
      timer = window.setTimeout(write, BETWEEN_QUOTES_MS);
      return;
    }

    timer = window.setTimeout(write, deleting ? DELETE_DELAY_MS : TYPE_DELAY_MS);
  };

  root.setAttribute('aria-label', firstQuote);
  timer = window.setTimeout(write, 260);
  window.addEventListener('pagehide', () => window.clearTimeout(timer), { once: true });
};

const HERO_PALETTE = {
  record: new THREE.Color(0x070b12),
  bodyLow: new THREE.Color(0x0b1420),
  bodyMid: new THREE.Color(0x17212d),
  brassDark: new THREE.Color(0x5e472a),
  brass: new THREE.Color(0x9b7440),
  brassLight: new THREE.Color(0xb58b50),
  hardware: new THREE.Color(0x8f6d3f)
};

const smoothstep = (value, min, max) => {
  const t = THREE.MathUtils.clamp((value - min) / Math.max(max - min, Number.EPSILON), 0, 1);
  return t * t * (3 - 2 * t);
};

const classifyGramophoneMesh = (node) => {
  const lineage = [];
  let current = node;
  while (current) {
    lineage.push(current.name || '');
    current = current.parent;
  }
  const identity = lineage.join(' / ');
  if (identity.includes('Object001')) return 'record';
  if (identity.includes('Object002')) return 'hardware';
  return 'body';
};

const applyBodyVertexPalette = (node) => {
  if (!node.geometry?.attributes?.position) return;

  node.geometry = node.geometry.clone();
  node.geometry.computeBoundingBox();
  const box = node.geometry.boundingBox;
  const position = node.geometry.attributes.position;
  if (!box || !position) return;

  const zMin = box.min.z;
  const zRange = Math.max(box.max.z - zMin, Number.EPSILON);
  const colors = new Float32Array(position.count * 3);
  const mixed = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    const height = (position.getZ(i) - zMin) / zRange;

    if (height < .43) {
      mixed.lerpColors(
        HERO_PALETTE.bodyLow,
        HERO_PALETTE.bodyMid,
        smoothstep(height, .04, .43)
      );
    } else if (height < .60) {
      mixed.lerpColors(
        HERO_PALETTE.bodyMid,
        HERO_PALETTE.brassDark,
        smoothstep(height, .43, .60)
      );
    } else {
      mixed.lerpColors(
        HERO_PALETTE.brass,
        HERO_PALETTE.brassLight,
        smoothstep(height, .60, .94) * .72
      );
    }

    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  node.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
};

const createHeroMaterial = (kind) => {
  if (kind === 'record') {
    return new THREE.MeshLambertMaterial({
      color: HERO_PALETTE.record,
      emissive: 0x020711,
      emissiveIntensity: .16,
      side: THREE.DoubleSide
    });
  }

  if (kind === 'hardware') {
    return new THREE.MeshLambertMaterial({
      color: HERO_PALETTE.hardware,
      emissive: 0x120b04,
      emissiveIntensity: .09,
      side: THREE.DoubleSide
    });
  }

  return new THREE.MeshLambertMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0x02060c,
    emissiveIntensity: .08,
    side: THREE.DoubleSide
  });
};

const addStylizedEdges = (node, kind) => {
  if (!node.geometry?.attributes?.position) return;

  const edgePreset = kind === 'record'
    ? { color: 0x52627b, opacity: .08 }
    : kind === 'hardware'
      ? { color: 0xc3a064, opacity: .16 }
      : { color: 0x8b7a59, opacity: .10 };

  const geometry = new THREE.EdgesGeometry(node.geometry, 32);
  const material = new THREE.LineBasicMaterial({
    color: edgePreset.color,
    transparent: true,
    opacity: edgePreset.opacity,
    depthWrite: false
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = `MusicHeroEdges:${node.name}`;
  lines.renderOrder = 3;
  node.add(lines);
};

const addRecordLabel = (recordMesh) => {
  if (!recordMesh?.geometry) return;

  recordMesh.geometry.computeBoundingBox();
  const box = recordMesh.geometry.boundingBox;
  if (!box) return;

  const centerX = (box.min.x + box.max.x) / 2;
  const centerY = (box.min.y + box.max.y) / 2;
  const topZ = box.max.z + .025;
  const radius = Math.min(box.max.x - box.min.x, box.max.y - box.min.y) * .085;
  if (!Number.isFinite(radius) || radius <= 0) return;

  const label = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({
      color: 0xc19a50,
      transparent: true,
      opacity: .78,
      side: THREE.DoubleSide
    })
  );
  label.position.set(centerX, centerY, topZ);
  label.renderOrder = 4;
  recordMesh.add(label);

  const spindle = new THREE.Mesh(
    new THREE.CircleGeometry(radius * .12, 24),
    new THREE.MeshBasicMaterial({ color: 0x07101e, side: THREE.DoubleSide })
  );
  spindle.position.set(centerX, centerY, topZ + .008);
  spindle.renderOrder = 5;
  recordMesh.add(spindle);
};

const stylizeGramophoneAsset = (asset) => {
  const meshes = [];
  asset.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });

  meshes.forEach((node) => {
    const kind = classifyGramophoneMesh(node);
    if (kind === 'body') applyBodyVertexPalette(node);
    node.material = createHeroMaterial(kind);
    node.castShadow = false;
    node.receiveShadow = false;
    addStylizedEdges(node, kind);
    if (kind === 'record') addRecordLabel(node);
  });
};

const installEmergencyFlatMaterials = (asset) => {
  asset.traverse((node) => {
    if (!node.isMesh) return;
    const kind = classifyGramophoneMesh(node);
    node.material = new THREE.MeshBasicMaterial({
      color: kind === 'hardware' ? 0x8f6d3f : kind === 'record' ? 0x070b12 : 0x17212d,
      wireframe: false,
      side: THREE.DoubleSide
    });
    node.castShadow = false;
    node.receiveShadow = false;
  });
};

const initGramophone = () => {
  const stage = document.querySelector('[data-music-gramophone]');
  const canvas = stage?.querySelector('[data-gramophone-canvas]');
  if (!stage || !canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (error) {
    stage.classList.add('is-error');
    console.warn('Music gramophone WebGL unavailable.', error);
    return;
  }

  stage.classList.add('is-loading');
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
  const composition = new THREE.Group();
  scene.add(composition);

  scene.add(new THREE.AmbientLight(0x97a6bc, .96));

  const hemisphere = new THREE.HemisphereLight(0x607ca4, 0x120d08, .92);
  scene.add(hemisphere);

  const warmKey = new THREE.DirectionalLight(0xd0a35b, .70);
  warmKey.position.set(4.8, 7.2, 6.4);
  scene.add(warmKey);

  const coolFill = new THREE.DirectionalLight(0x627fa8, .46);
  coolFill.position.set(-5.2, 3.4, -3.6);
  scene.add(coolFill);

  const topAccent = new THREE.DirectionalLight(0xe1c27b, .22);
  topAccent.position.set(.8, 8.5, 2.6);
  scene.add(topAccent);

  let mixer = null;
  let recordNode = null;
  let useManualRecordSpin = false;
  let modelReady = false;
  let disposed = false;
  let frameRequest = 0;
  let previousTime = performance.now();
  let resizeObserver = null;

  const setPixelRatio = () => {
    const compact = window.matchMedia('(max-width: 760px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.2 : 1.55));
  };

  const frameComposition = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (!modelReady) return;

    const box = new THREE.Box3().setFromObject(composition);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const fitHeight = size.y / (2 * Math.tan(verticalFov / 2));
    const fitWidth = size.x / (2 * Math.tan(horizontalFov / 2));
    const compact = camera.aspect < .95;
    const distance = Math.max(fitHeight, fitWidth) * (compact ? 1.34 : 1.18);
    const direction = new THREE.Vector3(.5, .26, 1).normalize();

    camera.position.copy(center).add(direction.multiplyScalar(distance));
    camera.lookAt(center.x - .12, center.y - size.y * .055, center.z);
    camera.updateProjectionMatrix();
  };

  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (url.includes(MODEL_TEXTURE_PATH)) return ONE_PIXEL_TEXTURE;
    return url;
  });
  manager.onError = (url) => {
    console.warn('Music gramophone dependent asset failed to load.', url);
  };

  const loader = new GLTFLoader(manager);
  loader.setCrossOrigin('anonymous');
  loader.load(
    MODEL_URL,
    (gltf) => {
      if (disposed) return;

      const asset = gltf.scene;
      asset.updateMatrixWorld(true);

      try {
        stylizeGramophoneAsset(asset);
      } catch (error) {
        console.warn('Music gramophone stylization degraded gracefully.', error);
        installEmergencyFlatMaterials(asset);
      }

      recordNode = asset.getObjectByName('Object001');

      const rawBox = new THREE.Box3().setFromObject(asset);
      const rawCenter = rawBox.getCenter(new THREE.Vector3());
      const rawSize = rawBox.getSize(new THREE.Vector3());
      asset.position.sub(rawCenter);

      const normalization = new THREE.Group();
      normalization.add(asset);
      normalization.scale.setScalar(5.55 / Math.max(rawSize.x, rawSize.y, rawSize.z));
      composition.add(normalization);
      composition.rotation.set(-.04, -.5, .014);
      composition.position.set(.08, .08, 0);
      composition.updateMatrixWorld(true);

      const sourceClip = gltf.animations?.find((clip) => clip.name === 'Gramofon_Anim') || gltf.animations?.[0];
      const recordTracks = sourceClip?.tracks?.filter((track) => track.name.includes('Object001')) || [];
      if (recordTracks.length) {
        const recordClip = new THREE.AnimationClip('record-spin', sourceClip.duration, recordTracks);
        mixer = new THREE.AnimationMixer(asset);
        const action = mixer.clipAction(recordClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
        action.play();
      } else if (recordNode) {
        useManualRecordSpin = true;
      }

      modelReady = true;
      setPixelRatio();
      frameComposition();
      renderer.render(scene, camera);
      stage.classList.remove('is-loading', 'is-error');
      stage.classList.add('is-ready');
    },
    undefined,
    (error) => {
      stage.classList.remove('is-loading');
      stage.classList.add('is-error');
      console.warn('Music gramophone model failed to load; keeping CSS fallback.', error);
    }
  );

  const clockFrame = (time) => {
    if (disposed) return;

    const deltaSeconds = Math.min(.05, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;

    if (modelReady && !reducedMotion.matches && !document.hidden) {
      mixer?.update(deltaSeconds);
      if (useManualRecordSpin && recordNode) recordNode.rotateZ(deltaSeconds * .78);
      renderer.render(scene, camera);
    }

    frameRequest = window.requestAnimationFrame(clockFrame);
  };

  const handleResize = () => {
    setPixelRatio();
    frameComposition();
    if (modelReady) renderer.render(scene, camera);
  };

  setPixelRatio();
  frameComposition();
  frameRequest = window.requestAnimationFrame(clockFrame);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(stage);
  } else {
    window.addEventListener('resize', handleResize, { passive: true });
  }

  const renderCurrentFrame = () => {
    if (modelReady) renderer.render(scene, camera);
  };
  reducedMotion.addEventListener?.('change', renderCurrentFrame);

  window.addEventListener('pagehide', () => {
    disposed = true;
    window.cancelAnimationFrame(frameRequest);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleResize);
    reducedMotion.removeEventListener?.('change', renderCurrentFrame);
    mixer?.stopAllAction();
    renderer.dispose();
  }, { once: true });
};

initHeroTypewriter();
initGramophone();
