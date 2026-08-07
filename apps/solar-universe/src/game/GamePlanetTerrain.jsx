import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function fract(value) {
  return value - Math.floor(value);
}

function hash3(x, y, z, seed) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453123);
}

function valueNoise3(point, seed) {
  const ix = Math.floor(point.x);
  const iy = Math.floor(point.y);
  const iz = Math.floor(point.z);
  const fx = point.x - ix;
  const fy = point.y - iy;
  const fz = point.z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);

  const sample = (x, y, z) => hash3(x, y, z, seed);
  const n000 = sample(ix, iy, iz);
  const n100 = sample(ix + 1, iy, iz);
  const n010 = sample(ix, iy + 1, iz);
  const n110 = sample(ix + 1, iy + 1, iz);
  const n001 = sample(ix, iy, iz + 1);
  const n101 = sample(ix + 1, iy, iz + 1);
  const n011 = sample(ix, iy + 1, iz + 1);
  const n111 = sample(ix + 1, iy + 1, iz + 1);

  const nx00 = THREE.MathUtils.lerp(n000, n100, sx);
  const nx10 = THREE.MathUtils.lerp(n010, n110, sx);
  const nx01 = THREE.MathUtils.lerp(n001, n101, sx);
  const nx11 = THREE.MathUtils.lerp(n011, n111, sx);
  const nxy0 = THREE.MathUtils.lerp(nx00, nx10, sy);
  const nxy1 = THREE.MathUtils.lerp(nx01, nx11, sy);
  return THREE.MathUtils.lerp(nxy0, nxy1, sz);
}

function fbm(point, seed, octaves = 4) {
  let total = 0;
  let weight = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise3(
      new THREE.Vector3(
        point.x * frequency,
        point.y * frequency,
        point.z * frequency
      ),
      seed + octave * 17.17
    ) * amplitude;
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }

  return total / weight;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function sampleGameTerrain(direction, radius = 1) {
  const normal = direction.clone().normalize();

  const continentA = fbm(
    normal.clone().multiplyScalar(1.42).add(new THREE.Vector3(1.7, -0.6, 2.4)),
    213,
    5
  );
  const continentB = fbm(
    normal.clone().multiplyScalar(2.55).add(new THREE.Vector3(-2.1, 1.2, -0.8)),
    297,
    4
  );
  const continental = continentA * 0.72 + continentB * 0.28;
  const latitudeBias = Math.cos(normal.y * Math.PI * 0.8) * 0.018;
  const landSignal = continental + latitudeBias;
  const land = smoothstep(0.505, 0.565, landSignal);

  const regional = fbm(
    normal.clone().multiplyScalar(4.2).add(new THREE.Vector3(0.4, 3.1, -1.5)),
    361,
    4
  );
  const detail = fbm(
    normal.clone().multiplyScalar(9.3).add(new THREE.Vector3(-1.7, 0.8, 2.8)),
    419,
    3
  );
  const ridgeSource = fbm(
    normal.clone().multiplyScalar(5.8).add(new THREE.Vector3(2.6, -2.2, 0.9)),
    487,
    4
  );
  const ridge = Math.pow(1 - Math.abs(ridgeSource * 2 - 1), 3.2);
  const mountainField = smoothstep(0.52, 0.8, regional * 0.54 + ridge * 0.46);
  const coast = 1 - smoothstep(0.02, 0.38, land);

  const baseHeight = radius * (0.007 + regional * 0.018 + detail * 0.005);
  const mountainHeight = radius * mountainField * (0.018 + ridge * 0.045);
  const height = land > 0.02
    ? land * (baseHeight + mountainHeight)
    : -radius * 0.012;

  const moisture = fbm(
    normal.clone().multiplyScalar(3.75).add(new THREE.Vector3(-0.5, 1.8, 3.4)),
    557,
    4
  );
  const temperature = THREE.MathUtils.clamp(1 - Math.abs(normal.y) * 0.82 + (regional - 0.5) * 0.16, 0, 1);

  let biome = 'ocean';
  if (land > 0.18) {
    if (coast > 0.5) biome = 'coast';
    else if (mountainField > 0.68 || height > radius * 0.052) biome = 'mountain';
    else if (moisture > 0.61 && temperature > 0.28) biome = 'forest';
    else if (moisture > 0.46) biome = 'grassland';
    else biome = 'plain';
  }

  return {
    normal,
    land,
    height,
    moisture,
    temperature,
    mountainField,
    coast,
    biome
  };
}

function createLandGeometry(radius, quality) {
  const widthSegments = quality === 'quality' ? 144 : 88;
  const heightSegments = quality === 'quality' ? 96 : 58;
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const vertex = new THREE.Vector3();

  const palette = {
    submerged: new THREE.Color('#24475c'),
    coast: new THREE.Color('#b8aa7b'),
    grassland: new THREE.Color('#6f8d52'),
    forest: new THREE.Color('#31583b'),
    plain: new THREE.Color('#9b8f59'),
    mountain: new THREE.Color('#7c7569'),
    snow: new THREE.Color('#d4d3ca')
  };
  const color = new THREE.Color();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index).normalize();
    const sample = sampleGameTerrain(vertex, radius);
    const targetRadius = radius + sample.height;
    position.setXYZ(index, vertex.x * targetRadius, vertex.y * targetRadius, vertex.z * targetRadius);

    if (sample.land <= 0.18) {
      color.copy(palette.submerged);
    } else if (sample.biome === 'coast') {
      color.copy(palette.coast);
    } else if (sample.biome === 'forest') {
      color.copy(palette.forest);
    } else if (sample.biome === 'grassland') {
      color.copy(palette.grassland);
    } else if (sample.biome === 'plain') {
      color.copy(palette.plain);
    } else {
      const snow = smoothstep(radius * 0.06, radius * 0.085, sample.height);
      color.copy(palette.mountain).lerp(palette.snow, snow);
    }

    const shade = 0.88 + sample.moisture * 0.06 + sample.temperature * 0.035;
    color.multiplyScalar(shade);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function fibonacciDirection(index, count) {
  const y = 1 - (index / Math.max(count - 1, 1)) * 2;
  const radial = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * index;
  return new THREE.Vector3(Math.cos(theta) * radial, y, Math.sin(theta) * radial).normalize();
}

function selectFeaturePoints(radius, quality, kind) {
  const scanCount = quality === 'quality' ? 760 : 420;
  const targetCount = kind === 'forest'
    ? (quality === 'quality' ? 78 : 38)
    : (quality === 'quality' ? 20 : 11);
  const points = [];

  for (let index = 0; index < scanCount && points.length < targetCount; index += 1) {
    const direction = fibonacciDirection(index + (kind === 'forest' ? 17 : 83), scanCount + 120);
    const sample = sampleGameTerrain(direction, radius);
    const hash = hash3(index, Math.floor(direction.y * 100), kind === 'forest' ? 7 : 19, 701);

    if (kind === 'forest') {
      if (sample.biome !== 'forest') continue;
      if (hash < 0.2) continue;
      points.push({ direction, sample, size: 0.72 + hash * 0.5 });
    } else {
      if (sample.biome !== 'mountain') continue;
      if (sample.mountainField < 0.69 || hash < 0.16) continue;
      points.push({ direction, sample, size: 0.72 + hash * 0.65 });
    }
  }

  return points;
}

function ForestLayer({ radius, quality }) {
  const trunkRef = useRef();
  const crownRef = useRef();
  const points = useMemo(() => selectFeaturePoints(radius, quality, 'forest'), [quality, radius]);

  useEffect(() => {
    if (!trunkRef.current || !crownRef.current) return;
    const trunk = new THREE.Object3D();
    const crown = new THREE.Object3D();

    points.forEach(({ direction, sample, size }, index) => {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction);
      const treeHeight = radius * 0.095 * size;
      const trunkHeight = treeHeight * 0.46;
      const surfaceRadius = radius + sample.height;

      trunk.position.copy(direction).multiplyScalar(surfaceRadius + trunkHeight * 0.5);
      trunk.quaternion.copy(quaternion);
      trunk.scale.set(radius * 0.012 * size, trunkHeight, radius * 0.012 * size);
      trunk.updateMatrix();
      trunkRef.current.setMatrixAt(index, trunk.matrix);

      crown.position.copy(direction).multiplyScalar(surfaceRadius + trunkHeight + treeHeight * 0.28);
      crown.quaternion.copy(quaternion);
      crown.scale.set(radius * 0.055 * size, treeHeight * 0.58, radius * 0.055 * size);
      crown.updateMatrix();
      crownRef.current.setMatrixAt(index, crown.matrix);
    });

    trunkRef.current.instanceMatrix.needsUpdate = true;
    crownRef.current.instanceMatrix.needsUpdate = true;
  }, [points, radius]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[null, null, points.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.7, 1, 5]} />
        <meshStandardMaterial color="#4a3c2c" roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[null, null, points.length]} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial color="#274b34" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function MountainLayer({ radius, quality }) {
  const mountainRef = useRef();
  const points = useMemo(() => selectFeaturePoints(radius, quality, 'mountain'), [quality, radius]);

  useEffect(() => {
    if (!mountainRef.current) return;
    const dummy = new THREE.Object3D();

    points.forEach(({ direction, sample, size }, index) => {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction);
      const height = radius * 0.16 * size;
      const surfaceRadius = radius + sample.height * 0.76;
      dummy.position.copy(direction).multiplyScalar(surfaceRadius + height * 0.43);
      dummy.quaternion.copy(quaternion);
      dummy.rotateY(hash3(index, 4, 9, 811) * Math.PI);
      dummy.scale.set(radius * 0.07 * size, height, radius * 0.06 * size);
      dummy.updateMatrix();
      mountainRef.current.setMatrixAt(index, dummy.matrix);
    });

    mountainRef.current.instanceMatrix.needsUpdate = true;
  }, [points, radius]);

  return (
    <instancedMesh ref={mountainRef} args={[null, null, points.length]} castShadow receiveShadow>
      <coneGeometry args={[1, 1, 5]} />
      <meshStandardMaterial color="#777269" roughness={0.94} flatShading />
    </instancedMesh>
  );
}

function buildHexCells(radius, quality) {
  const latitudeStep = quality === 'quality' ? 13 : 18;
  const cells = [];
  let row = 0;

  for (let latitude = -78; latitude <= 78; latitude += latitudeStep) {
    const lat = THREE.MathUtils.degToRad(latitude);
    const circumferenceFactor = Math.max(0.24, Math.cos(lat));
    const count = Math.max(6, Math.round((360 / latitudeStep) * circumferenceFactor));
    const longitudeStep = 360 / count;
    const offset = row % 2 ? longitudeStep * 0.5 : 0;

    for (let column = 0; column < count; column += 1) {
      const longitude = THREE.MathUtils.degToRad(column * longitudeStep + offset);
      const direction = new THREE.Vector3(
        Math.cos(lat) * Math.cos(longitude),
        Math.sin(lat),
        Math.cos(lat) * Math.sin(longitude)
      ).normalize();
      const sample = sampleGameTerrain(direction, radius);
      cells.push({ direction, sample, rotation: (column + row * 0.5) * 0.08 });
    }
    row += 1;
  }

  return cells;
}

function HexGrid({ radius, quality }) {
  const ref = useRef();
  const cells = useMemo(() => buildHexCells(radius, quality), [quality, radius]);
  const cellRadius = radius * (quality === 'quality' ? 0.105 : 0.145);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();

    cells.forEach(({ direction, sample, rotation }, index) => {
      const surfaceRadius = sample.land > 0.18
        ? radius + Math.max(sample.height, 0) + radius * 0.008
        : radius + radius * 0.009;
      dummy.position.copy(direction).multiplyScalar(surfaceRadius);
      dummy.quaternion.setFromUnitVectors(FORWARD, direction);
      dummy.rotateZ(rotation);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [cells, radius]);

  return (
    <instancedMesh ref={ref} args={[null, null, cells.length]} renderOrder={5}>
      <ringGeometry args={[cellRadius * 0.94, cellRadius, 6]} />
      <meshBasicMaterial
        color="#d7c48d"
        transparent
        opacity={quality === 'quality' ? 0.105 : 0.075}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 3.2);
    gl_FragColor = vec4(vec3(0.28, 0.55, 0.72), rim * 0.12);
  }
`;

function Atmosphere({ radius, quality }) {
  return (
    <mesh scale={1.045} renderOrder={8}>
      <sphereGeometry args={[radius, quality === 'quality' ? 64 : 36, quality === 'quality' ? 42 : 24]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX}
        fragmentShader={ATMOSPHERE_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function GamePlanetTerrain({ radius, quality }) {
  const landGeometry = useMemo(() => createLandGeometry(radius, quality), [quality, radius]);

  return (
    <group>
      <mesh receiveShadow>
        <sphereGeometry args={[radius, quality === 'quality' ? 128 : 72, quality === 'quality' ? 84 : 44]} />
        <meshStandardMaterial
          color="#204e6a"
          roughness={0.34}
          metalness={0.03}
        />
      </mesh>

      <mesh geometry={landGeometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.88} metalness={0.015} dithering />
      </mesh>

      <HexGrid radius={radius} quality={quality} />
      <ForestLayer radius={radius} quality={quality} />
      <MountainLayer radius={radius} quality={quality} />
      <Atmosphere radius={radius} quality={quality} />
    </group>
  );
}
