import * as THREE from 'three';

function fract(value) {
  return value - Math.floor(value);
}

function hash3(x, y, z, seed) {
  return fract(Math.sin(
    x * 127.1 +
    y * 311.7 +
    z * 74.7 +
    seed * 19.19
  ) * 43758.5453123);
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

  const n000 = hash3(ix, iy, iz, seed);
  const n100 = hash3(ix + 1, iy, iz, seed);
  const n010 = hash3(ix, iy + 1, iz, seed);
  const n110 = hash3(ix + 1, iy + 1, iz, seed);
  const n001 = hash3(ix, iy, iz + 1, seed);
  const n101 = hash3(ix + 1, iy, iz + 1, seed);
  const n011 = hash3(ix, iy + 1, iz + 1, seed);
  const n111 = hash3(ix + 1, iy + 1, iz + 1, seed);

  const nx00 = THREE.MathUtils.lerp(n000, n100, sx);
  const nx10 = THREE.MathUtils.lerp(n010, n110, sx);
  const nx01 = THREE.MathUtils.lerp(n001, n101, sx);
  const nx11 = THREE.MathUtils.lerp(n011, n111, sx);
  const nxy0 = THREE.MathUtils.lerp(nx00, nx10, sy);
  const nxy1 = THREE.MathUtils.lerp(nx01, nx11, sy);
  return THREE.MathUtils.lerp(nxy0, nxy1, sz);
}

function fbm(point, seed, octaves = 4) {
  let frequency = 1;
  let amplitude = 0.5;
  let total = 0;
  let weight = 0;

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
    frequency *= 2.02;
    amplitude *= 0.5;
  }

  return total / weight;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createStylizedTerrain({
  radius,
  detail,
  seed,
  palette,
  relief = 1
}) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const sample = new THREE.Vector3();
  const colors = new Float32Array(position.count * 3);

  const lowColor = new THREE.Color(palette.low);
  const midColor = new THREE.Color(palette.mid);
  const highColor = new THREE.Color(palette.high);
  const accentColor = new THREE.Color(palette.accent);
  const resultColor = new THREE.Color();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    normal.copy(vertex).normalize();

    sample.copy(normal).multiplyScalar(1.7).addScalar(seed * 0.013);
    const continental = fbm(sample, seed, 4);

    sample.copy(normal).multiplyScalar(4.2).add(new THREE.Vector3(3.1, -1.7, 2.4));
    const regional = fbm(sample, seed + 31, 3);

    sample.copy(normal).multiplyScalar(10.5).add(new THREE.Vector3(-2.2, 4.6, 1.3));
    const surface = fbm(sample, seed + 67, 2);

    const latitudeBand = Math.sin((normal.y + regional * 0.12) * Math.PI * 3.2) * 0.5 + 0.5;
    const broadRelief = (continental - 0.5) * radius * 0.062 * relief;
    const regionalRelief = (regional - 0.5) * radius * 0.022 * relief;
    const surfaceRelief = (surface - 0.5) * radius * 0.006 * relief;
    const bandRelief = (latitudeBand - 0.5) * radius * 0.006 * relief;
    const displacement = broadRelief + regionalRelief + surfaceRelief + bandRelief;

    vertex.addScaledVector(normal, displacement);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);

    const normalizedHeight = THREE.MathUtils.clamp(
      0.5 + displacement / (radius * 0.105 * Math.max(relief, 0.001)),
      0,
      1
    );
    const middleBlend = smoothstep(0.2, 0.64, normalizedHeight);
    const highBlend = smoothstep(0.62, 0.94, normalizedHeight);
    const regionalAccent = smoothstep(0.58, 0.84, regional) * (0.08 + latitudeBand * 0.08);

    resultColor.copy(lowColor).lerp(midColor, middleBlend);
    resultColor.lerp(highColor, highBlend);
    resultColor.lerp(accentColor, regionalAccent);

    const handPaintedShade = 0.88 + continental * 0.08 + regional * 0.045 + surface * 0.025;
    resultColor.multiplyScalar(handPaintedShade);

    colors[index * 3] = resultColor.r;
    colors[index * 3 + 1] = resultColor.g;
    colors[index * 3 + 2] = resultColor.b;
  }

  position.needsUpdate = true;
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
