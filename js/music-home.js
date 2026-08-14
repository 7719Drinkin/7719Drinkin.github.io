import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HOME_DATA_URL = '/data/music/home.json';
const DEFAULT_QUOTES = ['只是狂歌一曲，恍惚间就化入无穷'];
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/explearning/threejs-react@a720ced527eefbaa54df783f44e44a07647edf4a/public/old_gramophone/scene.gltf';

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

  // Avoid flashing the complete fallback sentence before the local quote data
  // arrives. No-JS users still keep the server-rendered fallback text.
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

    if (deleting) {
      characterIndex = Math.max(0, characterIndex - 1);
    } else {
      characterIndex = Math.min(characters.length, characterIndex + 1);
    }

    textNode.textContent = characters.slice(0, characterIndex).join('');
    root.dataset.quoteIndex = String(quoteIndex);

    if (!deleting && characterIndex === characters.length) {
      root.setAttribute('aria-label', quote);

      // With one configured quote, type it once and leave the cursor blinking.
      // Adding a second item to data/music/home.json automatically enables rotation.
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

const createHeroMaterial = (kind) => {
  if (kind === 'record') {
    return new THREE.MeshStandardMaterial({
      color: 0x070d17,
      roughness: .58,
      metalness: .08,
      emissive: 0x020812,
      emissiveIntensity: .18
    });
  }

  if (kind === 'tonearm') {
    return new THREE.MeshStandardMaterial({
      color: 0x8c7a52,
      roughness: .76,
      metalness: .28,
      emissive: 0x0b0803,
      emissiveIntensity: .1
    });
  }

  return new THREE.MeshStandardMaterial({
    color: 0x0a1422,
    roughness: .9,
    metalness: .04,
    emissive: 0x020914,
    emissiveIntensity: .22
  });
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
  if (identity.includes('Object002')) return 'tonearm';
  return 'body';
};

const addStylizedEdges = (node, kind) => {
  const edgeColor = kind === 'record' ? 0x586985 : 0xc6a45d;
  const opacity = kind === 'record' ? .18 : kind === 'tonearm' ? .46 : .32;
  const geometry = new THREE.EdgesGeometry(node.geometry, 24);
  const material = new THREE.LineBasicMaterial({
    color: edgeColor,
    transparent: true,
    opacity,
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

  const label = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({ color: 0xc9a04b, transparent: true, opacity: .9, side: THREE.DoubleSide })
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

const disposeSourceMaterial = (material) => {
  if (!material) return;
  [
    material.map,
    material.normalMap,
    material.roughnessMap,
    material.metalnessMap,
    material.aoMap,
    material.emissiveMap
  ].filter(Boolean).forEach((texture) => texture.dispose());
  material.dispose?.();
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
  const composition = new THREE.Group();
  scene.add(composition);

  // The hero is intentionally illustration-like rather than photorealistic:
  // broad ambient light, restrained directional accents, no dramatic shadows.
  scene.add(new THREE.AmbientLight(0xa7b4c9, 1.05));

  const hemisphere = new THREE.HemisphereLight(0x7386a3, 0x050914, 1.8);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xd8bb78, 1.3);
  keyLight.position.set(4.5, 7.5, 6.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x6f89ad, 1.45);
  rimLight.position.set(-5, 3.5, -4);
  scene.add(rimLight);

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
    // Aim a little below the geometric center so the cabinet sits safely above
    // the hero's lower crop while the horn can still breathe into the top-right.
    camera.lookAt(center.x - .12, center.y - size.y * .055, center.z);
    camera.updateProjectionMatrix();
  };

  const loader = new GLTFLoader();
  loader.setCrossOrigin('anonymous');
  loader.load(
    MODEL_URL,
    (gltf) => {
      if (disposed) return;

      const asset = gltf.scene;
      asset.updateMatrixWorld(true);

      asset.traverse((node) => {
        if (!node.isMesh) return;

        const kind = classifyGramophoneMesh(node);
        const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
        const material = createHeroMaterial(kind);

        node.material = material;
        node.castShadow = false;
        node.receiveShadow = false;
        addStylizedEdges(node, kind);

        if (kind === 'record') addRecordLabel(node);

        // Once the replacement material is installed, the source PBR textures
        // are no longer part of the hero's visual language.
        sourceMaterials.filter(Boolean).forEach(disposeSourceMaterial);
      });

      // Object001 is the separate record group supplied by the source asset.
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
