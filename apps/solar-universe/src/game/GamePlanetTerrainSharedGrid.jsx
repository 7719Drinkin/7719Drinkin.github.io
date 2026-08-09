import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sampleGameTerrain } from './GamePlanetTerrain.jsx';

const UP = new THREE.Vector3(0, 1, 0);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function fract(value) {
  return value - Math.floor(value);
}

function hash3(x, y, z, seed) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453123);
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
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
      if (sample.biome !== 'forest' || hash < 0.2) continue;
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

function vertexKey(vector) {
  const precision = 100000;
  return [
    Math.round(vector.x * precision),
    Math.round(vector.y * precision),
    Math.round(vector.z * precision)
  ].join(',');
}

function edgeKey(a, b) {
  const aKey = vertexKey(a);
  const bKey = vertexKey(b);
  return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
}

function surfacePoint(direction, radius) {
  const normal = direction.clone().normalize();
  const sample = sampleGameTerrain(normal, radius);
  const surfaceRadius = sample.land > 0.18
    ? radius + Math.max(sample.height, 0) + radius * 0.008
    : radius + radius * 0.009;
  return normal.multiplyScalar(surfaceRadius);
}

function createSharedGridGeometry(radius, quality) {
  // The dual of a subdivided icosahedron gives a true shared-edge spherical
  // cell grid: almost every cell is hexagonal, with the 12 pentagons required
  // by spherical topology. Each boundary is emitted only once.
  const detail = quality === 'quality' ? 3 : 2;
  const source = new THREE.IcosahedronGeometry(1, detail);
  const triangles = source.index ? source.toNonIndexed() : source;
  const position = triangles.attributes.position;
  const faceCount = Math.floor(position.count / 3);
  const faceCenters = new Array(faceCount);
  const edgeOwners = new Map();
  const adjacency = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
    a.fromBufferAttribute(position, faceIndex * 3);
    b.fromBufferAttribute(position, faceIndex * 3 + 1);
    c.fromBufferAttribute(position, faceIndex * 3 + 2);

    faceCenters[faceIndex] = a.clone().add(b).add(c).multiplyScalar(1 / 3).normalize();

    [[a, b], [b, c], [c, a]].forEach(([start, end]) => {
      const key = edgeKey(start, end);
      const owner = edgeOwners.get(key);
      if (owner === undefined) {
        edgeOwners.set(key, faceIndex);
      } else {
        adjacency.push([owner, faceIndex]);
      }
    });
  }

  const subdivisions = quality === 'quality' ? 3 : 2;
  const vertices = [];
  const direction = new THREE.Vector3();

  adjacency.forEach(([faceA, faceB]) => {
    const start = faceCenters[faceA];
    const end = faceCenters[faceB];
    let previous = surfacePoint(start, radius);

    for (let step = 1; step <= subdivisions; step += 1) {
      const t = step / subdivisions;
      direction.copy(start).lerp(end, t).normalize();
      const current = surfacePoint(direction, radius);
      vertices.push(
        previous.x, previous.y, previous.z,
        current.x, current.y, current.z
      );
      previous = current;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeBoundingSphere();

  if (triangles !== source) triangles.dispose();
  source.dispose();
  return geometry;
}

function SharedHexGrid({ radius, quality }) {
  const geometry = useMemo(() => createSharedGridGeometry(radius, quality), [quality, radius]);

  return (
    <lineSegments geometry={geometry} renderOrder={5}>
      <lineBasicMaterial
        color="#d7c48d"
        transparent
        opacity={quality === 'quality' ? 0.11 : 0.08}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        toneMapped={false}
      />
    </lineSegments>
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

export default function GamePlanetTerrainSharedGrid({ radius, quality }) {
  const landGeometry = useMemo(() => createLandGeometry(radius, quality), [quality, radius]);

  return (
    <group>
      <mesh receiveShadow>
        <sphereGeometry args={[radius, quality === 'quality' ? 128 : 72, quality === 'quality' ? 84 : 44]} />
        <meshStandardMaterial color="#204e6a" roughness={0.34} metalness={0.03} />
      </mesh>

      <mesh geometry={landGeometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.88} metalness={0.015} dithering />
      </mesh>

      <SharedHexGrid radius={radius} quality={quality} />
      <ForestLayer radius={radius} quality={quality} />
      <MountainLayer radius={radius} quality={quality} />
      <Atmosphere radius={radius} quality={quality} />
    </group>
  );
}
