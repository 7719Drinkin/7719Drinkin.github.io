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
  cabinet: 0x151923,
  cabinetSide: 0x0d111a,
  cabinetTop: 0x242935,
  cabinetEdge: 0x4b566e,
  panel: 0x0b1018,
  brass: 0xb58a4a,
  brassLight: 0xd4b36c,
  brassDark: 0x73522e,
  hornInner: 0x6c3b42,
  hornInnerDeep: 0x25151c,
  record: 0x05070b,
  recordEdge: 0x354761,
  coolAccent: 0x687d9b
};

const lambert = (color, emissive = 0x000000, intensity = 0, extra = {}) => new THREE.MeshLambertMaterial({
  color,
  emissive,
  emissiveIntensity: intensity,
  flatShading: true,
  ...extra
});

const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

const addEdges = (mesh, color, opacity = .13, threshold = 30) => {
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
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
    false,
    'catmullrom',
    .55
  );

  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false),
    material
  );

  group.add(mesh);
  return mesh;
};

const addHornMouthRibs = (group, bellVector, direction, radius, material) => {
  const normal = direction.clone().normalize();
  const basisX = new THREE.Vector3(0, 1, 0);

  if (Math.abs(normal.dot(basisX)) > .92) {
    basisX.set(1, 0, 0);
  }

  basisX.cross(normal).normalize();
  const basisY = normal.clone().cross(basisX).normalize();
  const center = bellVector.clone().addScaledVector(normal, -.045);

  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const end = center.clone()
      .addScaledVector(basisX, Math.cos(angle) * radius)
      .addScaledVector(basisY, Math.sin(angle) * radius);

    addCylinderBetween(
      group,
      center.toArray(),
      end.toArray(),
      .007,
      material,
      5
    );
  }
};

const addHorn = (group, throat, bell, materials) => {
  const throatVector = new THREE.Vector3(...throat);
  const bellVector = new THREE.Vector3(...bell);
  const direction = bellVector.clone().sub(throatVector);
  const directionNormal = direction.clone().normalize();
  const length = direction.length();
  const center = throatVector.clone().add(bellVector).multiplyScalar(.5);

  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    directionNormal
  );

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, .27, length, 12, 3, true),
    materials.shell
  );
  shell.position.copy(center);
  shell.quaternion.copy(orientation);
  group.add(shell);
  addEdges(shell, COLORS.brassLight, .18, 22);

  const innerStart = throatVector.clone().addScaledVector(directionNormal, .10);
  const innerEnd = bellVector.clone().addScaledVector(directionNormal, -.07);
  const innerDirection = innerEnd.clone().sub(innerStart);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, .22, innerDirection.length(), 12, 2, true),
    materials.inner
  );
  inner.position.copy(innerStart).add(innerEnd).multiplyScalar(.5);
  inner.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    innerDirection.clone().normalize()
  );
  group.add(inner);

  const mouth = new THREE.Mesh(
    new THREE.CircleGeometry(.98, 12),
    materials.mouth
  );
  mouth.position.copy(bellVector).addScaledVector(directionNormal, -.075);
  mouth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), directionNormal);
  group.add(mouth);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, .045, 6, 24),
    materials.rim
  );
  rim.position.copy(bellVector);
  rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), directionNormal);
  group.add(rim);

  addHornMouthRibs(group, bellVector, direction, .90, materials.rib);

  const throatRing = new THREE.Mesh(
    new THREE.TorusGeometry(.27, .026, 6, 16),
    materials.rim
  );
  throatRing.position.copy(throatVector);
  throatRing.quaternion.copy(rim.quaternion);
  group.add(throatRing);
};

const buildProceduralGramophone = () => {
  const root = new THREE.Group();
  root.name = 'MusicHeroProceduralGramophone';

  const materials = {
    cabinet: lambert(COLORS.cabinet, 0x03050a, .10),
    cabinetSide: lambert(COLORS.cabinetSide, 0x020409, .10),
    cabinetTop: lambert(COLORS.cabinetTop, 0x05070d, .11),
    panel: basic(COLORS.panel),
    brass: lambert(COLORS.brass, 0x1b1005, .07),
    brassLight: lambert(COLORS.brassLight, 0x211306, .07),
    brassDark: lambert(COLORS.brassDark, 0x110804, .08),
    horn: lambert(COLORS.brass, 0x1a0e04, .07, { side: THREE.DoubleSide }),
    hornInner: lambert(COLORS.hornInner, COLORS.hornInnerDeep, .15, { side: THREE.DoubleSide }),
    hornMouth: lambert(COLORS.hornInnerDeep, 0x090308, .18, { side: THREE.DoubleSide }),
    record: lambert(COLORS.record, 0x010308, .16),
    cool: lambert(COLORS.coolAccent, 0x080d16, .07)
  };

  const cabinet = new THREE.Group();
  cabinet.name = 'cabinet';
  root.add(cabinet);

  addBox(cabinet, [3.80, .18, 2.78], [0, -1.43, 0], materials.cabinetTop, {
    color: COLORS.cabinetEdge,
    opacity: .14,
    threshold: 26
  });

  addBox(cabinet, [3.46, 1.64, 2.45], [0, -.59, 0], materials.cabinet, {
    color: COLORS.cabinetEdge,
    opacity: .13,
    threshold: 26
  });

  const rightSide = addBox(cabinet, [.045, 1.48, 2.28], [1.755, -.58, -.03], materials.cabinetSide);
  addEdges(rightSide, COLORS.coolAccent, .07, 28);

  addBox(cabinet, [3.62, .16, 2.66], [0, .28, 0], materials.cabinetTop, {
    color: COLORS.brassDark,
    opacity: .15,
    threshold: 26
  });

  const panelZ = 1.245;
  addBox(cabinet, [2.52, .76, .025], [0, -.58, panelZ], materials.panel);

  const frameEdge = .035;
  addBox(cabinet, [2.54, frameEdge, .04], [0, -.18, panelZ + .022], materials.brassDark);
  addBox(cabinet, [2.54, frameEdge, .04], [0, -.98, panelZ + .022], materials.brassDark);
  addBox(cabinet, [frameEdge, .84, .04], [-1.27, -.58, panelZ + .022], materials.brassDark);
  addBox(cabinet, [frameEdge, .84, .04], [1.27, -.58, panelZ + .022], materials.brassDark);

  [[-1.58, -1.59, -.99], [1.58, -1.59, -.99], [-1.58, -1.59, .99], [1.58, -1.59, .99]].forEach((position) => {
    addBox(cabinet, [.22, .27, .24], position, materials.cabinetTop);
  });

  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.29, 1.29, .09, 32),
    materials.cabinetTop
  );
  platter.position.set(-.18, .41, .04);
  cabinet.add(platter);
  addEdges(platter, COLORS.coolAccent, .10, 28);

  const recordGroup = new THREE.Group();
  recordGroup.name = 'record';
  recordGroup.position.set(-.18, .50, .04);
  cabinet.add(recordGroup);

  const record = new THREE.Mesh(
    new THREE.CylinderGeometry(1.16, 1.16, .045, 48),
    materials.record
  );
  recordGroup.add(record);
  addEdges(record, COLORS.recordEdge, .11, 28);

  [0.44, 0.72, 0.96].forEach((radius, index) => {
    const groove = new THREE.Mesh(
      new THREE.TorusGeometry(radius, .006 + index * .001, 4, 40),
      basic(COLORS.recordEdge, {
        transparent: true,
        opacity: .32 - index * .05
      })
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
    [1.26, .56, -.72],
    [1.32, .87, -.58],
    [1.12, 1.01, -.17],
    [.80, .98, .26],
    [.47, .81, .60]
  ], .055, materials.brassDark, 6, 24);
  addEdges(tonearmTube, COLORS.brassLight, .14, 30);

  const tonearmPivot = new THREE.Mesh(
    new THREE.CylinderGeometry(.15, .19, .20, 10),
    materials.brass
  );
  tonearmPivot.position.set(1.26, .56, -.72);
  tonearm.add(tonearmPivot);

  const cartridge = new THREE.Mesh(
    new THREE.BoxGeometry(.28, .10, .17),
    materials.brassLight
  );
  cartridge.position.set(.44, .78, .63);
  cartridge.rotation.set(0, -.22, -.18);
  tonearm.add(cartridge);

  const crank = addTube(cabinet, [
    [1.72, -.62, 1.24],
    [1.90, -.53, 1.36],
    [1.85, -.29, 1.41]
  ], .047, materials.brass, 6, 12);
  addEdges(crank, COLORS.brassLight, .14, 30);

  const crankKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(.095, .095, .20, 10),
    materials.brassLight
  );
  crankKnob.position.set(1.85, -.20, 1.41);
  crankKnob.rotation.x = Math.PI / 2;
  cabinet.add(crankKnob);

  const hornSystem = new THREE.Group();
  hornSystem.name = 'horn-system';
  root.add(hornSystem);

  const throat = [1.00, 2.05, -.56];
  const bell = [2.54, 3.02, 1.56];

  const pipe = addTube(hornSystem, [
    [1.50, .44, -.86],
    [1.66, 1.18, -.78],
    [1.52, 1.65, -.70],
    [1.28, 1.91, -.64],
    throat
  ], .105, materials.brassDark, 7, 28);
  addEdges(pipe, COLORS.brassLight, .13, 30);

  addHorn(hornSystem, throat, bell, {
    shell: materials.horn,
    inner: materials.hornInner,
    mouth: materials.hornMouth,
    rim: materials.brassLight,
    rib: materials.brassDark
  });

  const neck = addCylinderBetween(
    hornSystem,
    [1.25, 1.92, -.66],
    throat,
    .15,
    materials.brass,
    8
  );
  addEdges(neck, COLORS.brassLight, .12, 30);

  root.rotation.set(-.045, -.16, .01);

  return { root, recordGroup };
};

const initGramophone = () => {
  const stage = document.querySelector('[data-music-gramophone]');
  const canvas = stage?.querySelector('[data-gramophone-canvas]');
  if (!stage || !canvas) return;

  const credit = stage.querySelector('.collection-gramophone-credit');
  if (credit) {
    credit.textContent = 'OBJECT 01 · LISTENING MACHINE';
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
  const camera = new THREE.PerspectiveCamera(33, 1, .01, 100);
  const composition = new THREE.Group();
  scene.add(composition);

  scene.add(new THREE.AmbientLight(0xaeb9cb, .78));
  scene.add(new THREE.HemisphereLight(0x6f86aa, 0x2c1718, .76));

  const warmKey = new THREE.DirectionalLight(0xdab36f, .64);
  warmKey.position.set(4.8, 7.4, 6.5);
  scene.add(warmKey);

  const coolFill = new THREE.DirectionalLight(0x708caf, .38);
  coolFill.position.set(-5.1, 3.0, -4.2);
  scene.add(coolFill);

  const warmRim = new THREE.DirectionalLight(0xe1bc75, .18);
  warmRim.position.set(-2.0, 5.8, 4.2);
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
    const distance = Math.max(fitHeight, fitWidth) * (compact ? 1.25 : 1.07);
    const direction = new THREE.Vector3(.64, .28, 1.18).normalize();

    camera.position.copy(center).add(direction.multiplyScalar(distance));
    camera.lookAt(
      center.x + size.x * .015,
      center.y - size.y * .025,
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
