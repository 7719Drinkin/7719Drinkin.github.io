import * as THREE from 'three';

const HOME_DATA_URL = '/data/music/home.json';
const DEFAULT_QUOTES = ['只是狂歌一曲，恍惚间就化入无穷'];

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

const COLORS = {
  cabinet: 0x11131b,
  cabinetTop: 0x1b1d27,
  cabinetEdge: 0x40495d,
  brass: 0xb58b4f,
  brassLight: 0xd1b16d,
  brassDark: 0x765632,
  hornInner: 0x613b3f,
  hornInnerDark: 0x241821,
  record: 0x05070b,
  recordEdge: 0x31435f,
  coolAccent: 0x657a9a
};

const lambert = (color, emissive = 0x000000, intensity = 0, extra = {}) => new THREE.MeshLambertMaterial({
  color,
  emissive,
  emissiveIntensity: intensity,
  flatShading: true,
  ...extra
});

const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

const addEdges = (mesh, color, opacity = .16, threshold = 28) => {
  if (!mesh.geometry?.attributes?.position) return;
  const geometry = new THREE.EdgesGeometry(mesh.geometry, threshold);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 4;
  mesh.add(lines);
};

const addBox = (group, size, position, material, edge = null) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  if (edge) addEdges(mesh, edge.color, edge.opacity, edge.threshold);
  group.add(mesh);
  return mesh;
};

const addCylinderBetween = (group, start, end, radius, material, radialSegments = 8) => {
  const startVector = new THREE.Vector3(...start);
  const endVector = new THREE.Vector3(...end);
  const direction = endVector.clone().sub(startVector);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, false),
    material
  );
  mesh.position.copy(startVector).add(endVector).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
  return mesh;
};

const addTube = (group, points, radius, material, radialSegments = 6, tubularSegments = 24) => {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false),
    material
  );
  group.add(mesh);
  return mesh;
};

const addHorn = (group, throat, bell, materials) => {
  const throatVector = new THREE.Vector3(...throat);
  const bellVector = new THREE.Vector3(...bell);
  const direction = bellVector.clone().sub(throatVector);
  const length = direction.length();
  const center = throatVector.clone().add(bellVector).multiplyScalar(.5);
  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.06, .29, length, 10, 2, true),
    materials.shell
  );
  shell.position.copy(center);
  shell.quaternion.copy(orientation);
  group.add(shell);
  addEdges(shell, COLORS.brassLight, .22, 20);

  const insetDirection = direction.clone().normalize();
  const innerStart = throatVector.clone().addScaledVector(insetDirection, .08);
  const innerEnd = bellVector.clone().addScaledVector(insetDirection, -.055);
  const innerDirection = innerEnd.clone().sub(innerStart);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(.91, .23, innerDirection.length(), 10, 2, true),
    materials.inner
  );
  inner.position.copy(innerStart).add(innerEnd).multiplyScalar(.5);
  inner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), innerDirection.clone().normalize());
  group.add(inner);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.06, .045, 6, 20),
    materials.rim
  );
  rim.position.copy(bellVector);
  rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
  group.add(rim);

  const throatRing = new THREE.Mesh(
    new THREE.TorusGeometry(.29, .026, 6, 16),
    materials.rim
  );
  throatRing.position.copy(throatVector);
  throatRing.quaternion.copy(rim.quaternion);
  group.add(throatRing);

  return shell;
};

const buildProceduralGramophone = () => {
  const root = new THREE.Group();
  root.name = 'MusicHeroProceduralGramophone';

  const materials = {
    cabinet: lambert(COLORS.cabinet, 0x03050a, .12),
    cabinetTop: lambert(COLORS.cabinetTop, 0x05070d, .12),
    brass: lambert(COLORS.brass, 0x1c1005, .08),
    brassLight: lambert(COLORS.brassLight, 0x211306, .07),
    brassDark: lambert(COLORS.brassDark, 0x120904, .09),
    horn: lambert(COLORS.brass, 0x1b1006, .08, { side: THREE.DoubleSide }),
    hornInner: lambert(COLORS.hornInner, COLORS.hornInnerDark, .14, { side: THREE.DoubleSide }),
    record: lambert(COLORS.record, 0x010308, .18),
    cool: lambert(COLORS.coolAccent, 0x080d16, .08)
  };

  const cabinet = new THREE.Group();
  cabinet.name = 'cabinet';
  root.add(cabinet);

  addBox(cabinet, [3.75, .18, 2.75], [0, -1.42, 0], materials.cabinetTop, {
    color: COLORS.cabinetEdge,
    opacity: .16,
    threshold: 25
  });
  addBox(cabinet, [3.42, 1.62, 2.43], [0, -.58, 0], materials.cabinet, {
    color: COLORS.cabinetEdge,
    opacity: .15,
    threshold: 25
  });
  addBox(cabinet, [3.58, .16, 2.63], [0, .27, 0], materials.cabinetTop, {
    color: COLORS.brassDark,
    opacity: .18,
    threshold: 25
  });

  const panelZ = 1.236;
  addBox(cabinet, [2.48, .74, .025], [0, -.58, panelZ], basic(0x0c0f17));
  const frameEdge = .035;
  addBox(cabinet, [2.50, frameEdge, .04], [0, -.19, panelZ + .022], materials.brassDark);
  addBox(cabinet, [2.50, frameEdge, .04], [0, -.97, panelZ + .022], materials.brassDark);
  addBox(cabinet, [frameEdge, .82, .04], [-1.25, -.58, panelZ + .022], materials.brassDark);
  addBox(cabinet, [frameEdge, .82, .04], [1.25, -.58, panelZ + .022], materials.brassDark);

  [[-1.55, -1.58, -.98], [1.55, -1.58, -.98], [-1.55, -1.58, .98], [1.55, -1.58, .98]].forEach((position) => {
    addBox(cabinet, [.22, .26, .24], position, materials.cabinetTop);
  });

  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.29, 1.29, .09, 32),
    materials.cabinetTop
  );
  platter.position.set(-.10, .405, .06);
  cabinet.add(platter);
  addEdges(platter, COLORS.coolAccent, .11, 28);

  const recordGroup = new THREE.Group();
  recordGroup.name = 'record';
  recordGroup.position.set(-.10, .495, .06);
  cabinet.add(recordGroup);

  const record = new THREE.Mesh(
    new THREE.CylinderGeometry(1.16, 1.16, .045, 48),
    materials.record
  );
  recordGroup.add(record);
  addEdges(record, COLORS.recordEdge, .12, 28);

  [0.44, 0.72, 0.96].forEach((radius, index) => {
    const groove = new THREE.Mesh(
      new THREE.TorusGeometry(radius, .006 + index * .001, 4, 40),
      basic(COLORS.recordEdge, { transparent: true, opacity: .34 - index * .05 })
    );
    groove.rotation.x = Math.PI / 2;
    groove.position.y = .026;
    recordGroup.add(groove);
  });

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(.205, .205, .052, 24),
    basic(COLORS.brassLight)
  );
  label.position.y = .034;
  recordGroup.add(label);

  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(.025, .025, .085, 12),
    materials.cool
  );
  spindle.position.y = .075;
  recordGroup.add(spindle);

  const tonearm = new THREE.Group();
  tonearm.name = 'tonearm';
  cabinet.add(tonearm);
  const tonearmTube = addTube(tonearm, [
    [1.24, .55, -.69],
    [1.30, .86, -.58],
    [1.10, 1.00, -.19],
    [.78, .97, .25],
    [.46, .80, .58]
  ], .055, materials.brassDark, 6, 24);
  addEdges(tonearmTube, COLORS.brassLight, .16, 30);

  const tonearmPivot = new THREE.Mesh(
    new THREE.CylinderGeometry(.15, .19, .20, 10),
    materials.brass
  );
  tonearmPivot.position.set(1.24, .55, -.69);
  tonearm.add(tonearmPivot);

  const cartridge = new THREE.Mesh(
    new THREE.BoxGeometry(.28, .10, .17),
    materials.brassLight
  );
  cartridge.position.set(.43, .77, .61);
  cartridge.rotation.set(0, -.22, -.18);
  tonearm.add(cartridge);

  const crank = addTube(cabinet, [
    [1.70, -.60, 1.23],
    [1.88, -.51, 1.34],
    [1.83, -.27, 1.39]
  ], .047, materials.brass, 6, 12);
  addEdges(crank, COLORS.brassLight, .16, 30);
  const crankKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(.095, .095, .20, 10),
    materials.brassLight
  );
  crankKnob.position.set(1.83, -.18, 1.39);
  crankKnob.rotation.x = Math.PI / 2;
  cabinet.add(crankKnob);

  const hornSystem = new THREE.Group();
  hornSystem.name = 'horn-system';
  root.add(hornSystem);

  const pipe = addTube(hornSystem, [
    [1.48, .43, -.83],
    [1.62, 1.18, -.76],
    [1.42, 1.70, -.67],
    [1.02, 1.98, -.55],
    [.60, 2.13, -.45]
  ], .105, materials.brassDark, 7, 28);
  addEdges(pipe, COLORS.brassLight, .14, 30);

  addHorn(
    hornSystem,
    [.60, 2.13, -.45],
    [-1.02, 3.13, .67],
    {
      shell: materials.horn,
      inner: materials.hornInner,
      rim: materials.brassLight
    }
  );

  const neck = addCylinderBetween(
    hornSystem,
    [.93, 1.95, -.58],
    [.60, 2.13, -.45],
    .16,
    materials.brass,
    8
  );
  addEdges(neck, COLORS.brassLight, .13, 30);

  root.rotation.set(-.035, -.34, .018);
  root.scale.setScalar(1.02);

  return { root, recordGroup };
};

const initGramophone = () => {
  const stage = document.querySelector('[data-music-gramophone]');
  const canvas = stage?.querySelector('[data-gramophone-canvas]');
  if (!stage || !canvas) return;

  const credit = stage.querySelector('.collection-gramophone-credit');
  if (credit) {
    credit.textContent = '3D · PROCEDURAL · THREE.JS';
    credit.removeAttribute('href');
    credit.removeAttribute('target');
    credit.removeAttribute('rel');
  }

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

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .01, 100);
  const composition = new THREE.Group();
  scene.add(composition);

  scene.add(new THREE.AmbientLight(0xaab5c8, .72));
  scene.add(new THREE.HemisphereLight(0x6e84a8, 0x2f1817, .74));

  const warmKey = new THREE.DirectionalLight(0xd6ad68, .66);
  warmKey.position.set(4.5, 7.4, 6.2);
  scene.add(warmKey);

  const coolFill = new THREE.DirectionalLight(0x6d86aa, .33);
  coolFill.position.set(-5.2, 3.2, -4.0);
  scene.add(coolFill);

  const warmRim = new THREE.DirectionalLight(0xd6a665, .20);
  warmRim.position.set(-2.4, 5.5, 3.8);
  scene.add(warmRim);

  const { root, recordGroup } = buildProceduralGramophone();
  composition.add(root);
  composition.updateMatrixWorld(true);

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

    const box = new THREE.Box3().setFromObject(composition);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const fitHeight = size.y / (2 * Math.tan(verticalFov / 2));
    const fitWidth = size.x / (2 * Math.tan(horizontalFov / 2));
    const compact = camera.aspect < .95;
    const distance = Math.max(fitHeight, fitWidth) * (compact ? 1.31 : 1.12);
    const direction = new THREE.Vector3(.58, .30, 1.08).normalize();

    camera.position.copy(center).add(direction.multiplyScalar(distance));
    camera.lookAt(
      center.x - size.x * .06,
      center.y - size.y * .015,
      center.z
    );
    camera.updateProjectionMatrix();
  };

  const render = () => renderer.render(scene, camera);

  const handleResize = () => {
    setPixelRatio();
    frameComposition();
    render();
  };

  setPixelRatio();
  frameComposition();
  render();
  stage.classList.remove('is-loading', 'is-error');
  stage.classList.add('is-ready');

  const clockFrame = (time) => {
    if (disposed) return;
    const deltaSeconds = Math.min(.05, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;

    if (!reducedMotion.matches && !document.hidden) {
      recordGroup.rotation.y += deltaSeconds * .82;
      render();
    }

    frameRequest = window.requestAnimationFrame(clockFrame);
  };

  frameRequest = window.requestAnimationFrame(clockFrame);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(stage);
  } else {
    window.addEventListener('resize', handleResize, { passive: true });
  }

  const renderCurrentFrame = () => render();
  reducedMotion.addEventListener?.('change', renderCurrentFrame);

  window.addEventListener('pagehide', () => {
    disposed = true;
    window.cancelAnimationFrame(frameRequest);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleResize);
    reducedMotion.removeEventListener?.('change', renderCurrentFrame);

    composition.traverse((node) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material?.dispose?.());
      } else {
        node.material?.dispose?.();
      }
    });
    renderer.dispose();
  }, { once: true });
};

initHeroTypewriter();
initGramophone();
