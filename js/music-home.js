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
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
  const composition = new THREE.Group();
  scene.add(composition);

  const hemisphere = new THREE.HemisphereLight(0x9aabc5, 0x080a10, 1.45);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xf2cf84, 3.5);
  keyLight.position.set(4.5, 7.5, 6.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x637fa9, 2.2);
  rimLight.position.set(-5, 4, -4);
  scene.add(rimLight);

  const hornGlow = new THREE.PointLight(0xd8a84e, 14, 13, 2);
  hornGlow.position.set(-2.5, 3.8, 2.8);
  scene.add(hornGlow);

  let mixer = null;
  let recordNode = null;
  let useManualRecordSpin = false;
  let modelReady = false;
  let ground = null;
  let disposed = false;
  let frameRequest = 0;
  let previousTime = performance.now();
  let resizeObserver = null;

  const setPixelRatio = () => {
    const compact = window.matchMedia('(max-width: 760px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.3 : 1.7));
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
    const distance = Math.max(fitHeight, fitWidth) * (camera.aspect < .95 ? 1.16 : 1.02);
    const direction = new THREE.Vector3(.54, .31, 1).normalize();

    camera.position.copy(center).add(direction.multiplyScalar(distance));
    camera.lookAt(center.x - .18, center.y + .18, center.z);
    camera.updateProjectionMatrix();
  };

  const installGround = () => {
    const box = new THREE.Box3().setFromObject(composition);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const material = new THREE.ShadowMaterial({ opacity: .24 });
    const geometry = new THREE.PlaneGeometry(Math.max(8, size.x * 1.55), Math.max(8, size.z * 1.55));
    ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(center.x, box.min.y - .035, center.z);
    ground.receiveShadow = true;
    scene.add(ground);
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
        node.castShadow = true;
        node.receiveShadow = true;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.filter(Boolean).forEach((material) => {
          const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
          [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]
            .filter(Boolean)
            .forEach((texture) => { texture.anisotropy = Math.min(8, maxAnisotropy); });
          material.needsUpdate = true;
        });
      });

      // The source asset exposes its record and tonearm as separate animated
      // nodes. Object001 is the thin circular record mesh. Keep the tonearm
      // static and reuse only the source-authored record rotation track.
      recordNode = asset.getObjectByName('Object001');

      const rawBox = new THREE.Box3().setFromObject(asset);
      const rawCenter = rawBox.getCenter(new THREE.Vector3());
      const rawSize = rawBox.getSize(new THREE.Vector3());
      asset.position.sub(rawCenter);

      const normalization = new THREE.Group();
      normalization.add(asset);
      normalization.scale.setScalar(5.75 / Math.max(rawSize.x, rawSize.y, rawSize.z));
      composition.add(normalization);
      composition.rotation.set(-.055, -.52, .018);
      composition.position.set(.12, -.08, 0);
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
      installGround();
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
    ground?.geometry?.dispose();
    ground?.material?.dispose();
    renderer.dispose();
  }, { once: true });
};

initHeroTypewriter();
initGramophone();
