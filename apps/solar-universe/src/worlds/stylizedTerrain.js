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

function terrainSegments(detail) {
  if (detail >= 5) return [144, 88];
  if (detail >= 4) return [112, 68];
  return [72, 44];
}

function prepareFeatures(features = []) {
  return features.map((feature) => ({
    ...feature,
    direction: new THREE.Vector3(...feature.direction).normalize(),
    colorValue: feature.color ? new THREE.Color(feature.color) : null,
    rimColorValue: feature.rimColor ? new THREE.Color(feature.rimColor) : null
  }));
}

function prepareBands(bands = []) {
  return bands.map((band) => ({
    ...band,
    normal: new THREE.Vector3(...band.normal).normalize(),
    colorValue: band.color ? new THREE.Color(band.color) : null
  }));
}

function prepareFlattenZones(flattenZones = []) {
  return flattenZones.map((zone) => ({
    ...zone,
    direction: new THREE.Vector3(...zone.direction).normalize(),
    colorValue: zone.color ? new THREE.Color(zone.color) : null
  }));
}

export function createStylizedTerrain({
  radius,
  detail,
  seed,
  palette,
  relief = 1,
  features = [],
  bands = [],
  flattenZones = []
}) {
  const [widthSegments, heightSegments] = terrainSegments(detail);
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const sample = new THREE.Vector3();
  const colors = new Float32Array(position.count * 3);

  const lowColor = new THREE.Color(palette.low);
  const midColor = new THREE.Color(palette.mid);
  const highColor = new THREE.Color(palette.high);
  const accentColor = new THREE.Color(palette.accent);
  const accent2Color = new THREE.Color(palette.accent2 ?? palette.accent);
  const shadowTint = new THREE.Color(palette.shadowTint ?? palette.low);
  const highlightTint = new THREE.Color(palette.highlightTint ?? palette.high);
  const resultColor = new THREE.Color();
  const authoredFeatures = prepareFeatures(features);
  const authoredBands = prepareBands(bands);
  const authoredFlattenZones = prepareFlattenZones(flattenZones);
  const featureState = authoredFeatures.map(() => ({ mask: 0, rim: 0 }));
  const bandState = authoredBands.map(() => 0);
  const flattenState = authoredFlattenZones.map(() => 0);

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    normal.copy(vertex).normalize();

    sample.copy(normal).multiplyScalar(1.65).addScalar(seed * 0.013);
    const continental = fbm(sample, seed, 4);

    sample.copy(normal).multiplyScalar(3.8).add(new THREE.Vector3(3.1, -1.7, 2.4));
    const regional = fbm(sample, seed + 31, 3);

    sample.copy(normal).multiplyScalar(7.2).add(new THREE.Vector3(-2.2, 4.6, 1.3));
    const secondaryRegion = fbm(sample, seed + 49, 3);

    sample.copy(normal).multiplyScalar(12.0).add(new THREE.Vector3(1.4, -3.5, 2.8));
    const surface = fbm(sample, seed + 67, 2);

    const latitudeBand = Math.sin((normal.y + regional * 0.1) * Math.PI * 2.8) * 0.5 + 0.5;
    const broadRelief = (continental - 0.5) * radius * 0.052 * relief;
    const regionalRelief = (regional - 0.5) * radius * 0.018 * relief;
    const surfaceRelief = (surface - 0.5) * radius * 0.0038 * relief;
    const bandRelief = (latitudeBand - 0.5) * radius * 0.0035 * relief;
    let displacement = broadRelief + regionalRelief + surfaceRelief + bandRelief;

    authoredFeatures.forEach((feature, featureIndex) => {
      const angle = Math.acos(THREE.MathUtils.clamp(normal.dot(feature.direction), -1, 1));
      const mask = 1 - smoothstep(feature.radius, feature.radius + (feature.softness ?? 0.18), angle);
      const rimAt = feature.rimAt ?? feature.radius;
      const rimWidth = feature.rimWidth ?? 0.075;
      const rimDistance = Math.abs(angle - rimAt);
      const rim = 1 - smoothstep(rimWidth * 0.35, rimWidth, rimDistance);
      featureState[featureIndex].mask = mask;
      featureState[featureIndex].rim = rim;
      displacement += mask * (feature.elevation ?? 0) * radius;
      displacement += rim * (feature.rimElevation ?? 0) * radius;
    });

    authoredBands.forEach((band, bandIndex) => {
      const distance = Math.abs(normal.dot(band.normal));
      const mask = 1 - smoothstep(band.width, band.width + (band.softness ?? 0.08), distance);
      const longitude = Math.atan2(normal.z, normal.x);
      const rhythm = 0.62 + Math.sin(longitude * (band.frequency ?? 8) + seed) * 0.38;
      const shapedMask = mask * rhythm;
      bandState[bandIndex] = shapedMask;
      displacement += shapedMask * (band.elevation ?? 0) * radius;
    });

    authoredFlattenZones.forEach((zone, zoneIndex) => {
      const angle = Math.acos(THREE.MathUtils.clamp(normal.dot(zone.direction), -1, 1));
      const mask = 1 - smoothstep(zone.radius, zone.radius + (zone.softness ?? 0.16), angle);
      const strength = mask * (zone.strength ?? 1);
      const targetDisplacement = (zone.target ?? 0) * radius;
      displacement = THREE.MathUtils.lerp(displacement, targetDisplacement, strength);
      flattenState[zoneIndex] = mask;
    });

    vertex.addScaledVector(normal, displacement);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);

    const normalizedHeight = THREE.MathUtils.clamp(
      0.5 + displacement / (radius * 0.11 * Math.max(relief, 0.001)),
      0,
      1
    );

    const middleBlend = smoothstep(0.16, 0.58, normalizedHeight);
    const highBlend = smoothstep(0.58, 0.9, normalizedHeight);
    const redEarthMask = smoothstep(0.57, 0.82, regional)
      * (1 - smoothstep(0.83, 0.98, normalizedHeight));
    const weatheredMask = smoothstep(0.58, 0.86, secondaryRegion)
      * smoothstep(0.5, 0.88, normalizedHeight);
    const coolLowlandMask = smoothstep(0.25, 0.58, 1 - normalizedHeight)
      * smoothstep(0.48, 0.8, 1 - continental);

    resultColor.copy(lowColor).lerp(midColor, middleBlend);
    resultColor.lerp(highColor, highBlend);
    resultColor.lerp(accentColor, redEarthMask * 0.36);
    resultColor.lerp(accent2Color, weatheredMask * 0.29);
    resultColor.lerp(shadowTint, coolLowlandMask * 0.18);
    resultColor.lerp(highlightTint, smoothstep(0.72, 0.96, normalizedHeight) * 0.1);

    authoredFeatures.forEach((feature, featureIndex) => {
      const state = featureState[featureIndex];
      if (feature.colorValue) {
        resultColor.lerp(feature.colorValue, state.mask * (feature.colorStrength ?? 0.5));
      }
      if (feature.rimColorValue) {
        resultColor.lerp(feature.rimColorValue, state.rim * (feature.rimColorStrength ?? 0.42));
      }
    });

    authoredBands.forEach((band, bandIndex) => {
      if (band.colorValue) {
        resultColor.lerp(band.colorValue, bandState[bandIndex] * (band.colorStrength ?? 0.45));
      }
    });

    authoredFlattenZones.forEach((zone, zoneIndex) => {
      if (zone.colorValue) {
        resultColor.lerp(
          zone.colorValue,
          flattenState[zoneIndex] * (zone.colorStrength ?? 0.36)
        );
      }
    });

    const handPaintedShade = 0.9
      + continental * 0.055
      + regional * 0.035
      + surface * 0.018;
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
