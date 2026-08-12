import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  ANIME_IVORY,
  ANIME_RED,
  CITY_TIER_DEGREES,
  cityPolarDirection,
  citySurfaceRadius,
  surfaceQuaternion
} from './animeCityLayout.js';

const AXIS_AZIMUTH = -Math.PI * 0.52;

const RINGS = [
  { degrees: CITY_TIER_DEGREES.crown, material: 'red', height: 0.05, depth: 0.038, halfSpan: 2.7, gapRate: 0.045 },
  { degrees: CITY_TIER_DEGREES.upper, material: 'ivory', height: 0.044, depth: 0.035, halfSpan: 2.48, gapRate: 0.065 },
  { degrees: CITY_TIER_DEGREES.middle, material: 'red', height: 0.039, depth: 0.032, halfSpan: 2.28, gapRate: 0.085 },
  { degrees: CITY_TIER_DEGREES.lower, material: 'ivory', height: 0.034, depth: 0.03, halfSpan: 2.08, gapRate: 0.105 },
  { degrees: CITY_TIER_DEGREES.outskirts, material: 'red', height: 0.029, depth: 0.027, halfSpan: 1.86, gapRate: 0.14 }
];

function fract(value) {
  return value - Math.floor(value);
}

function hash(value, seed = 0) {
  return fract(Math.sin(value * 71.37 + seed * 19.11) * 43758.5453123);
}

function angleDistance(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function buildSpecs(radius, quality) {
  const specs = [];

  RINGS.forEach((ring, ringIndex) => {
    const segments = quality === 'quality'
      ? 72 + ringIndex * 8
      : 38 + ringIndex * 4;
    const radial = THREE.MathUtils.degToRad(ring.degrees);

    for (let index = 0; index < segments; index += 1) {
      const azimuth = index / segments * Math.PI * 2;
      const sectorDistance = angleDistance(azimuth, AXIS_AZIMUTH);
      if (sectorDistance > ring.halfSpan) continue;

      if (
        sectorDistance > 0.42
        && hash(index + ringIndex * 97, 31) < ring.gapRate
      ) continue;

      const direction = cityPolarDirection(radial, azimuth);
      const surfaceRadius = citySurfaceRadius(direction, radius, radius * 0.004);
      const ringRadius = surfaceRadius * Math.sin(radial);
      const arcWidth = Math.max(
        radius * 0.026,
        (Math.PI * 2 * ringRadius / segments) * 1.14
      );
      const edgeTaper = THREE.MathUtils.clamp(1 - sectorDistance / ring.halfSpan, 0, 1);

      specs.push({
        direction,
        material: ring.material,
        width: arcWidth,
        height: radius * ring.height * (0.7 + edgeTaper * 0.3),
        depth: radius * ring.depth
      });
    }
  });

  return specs;
}

function WallInstances({ radius, specs, material }) {
  const ref = useRef();
  const selected = useMemo(() => specs.filter((spec) => spec.material === material), [material, specs]);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();

    selected.forEach((spec, index) => {
      const surface = citySurfaceRadius(spec.direction, radius, radius * 0.002);
      dummy.position.copy(spec.direction).multiplyScalar(surface + spec.height * 0.5);
      dummy.quaternion.copy(surfaceQuaternion(spec.direction));
      dummy.scale.set(spec.width, spec.height, spec.depth);
      dummy.updateMatrix();
      ref.current.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [radius, selected]);

  const red = material === 'red';
  return (
    <instancedMesh ref={ref} args={[null, null, selected.length]} castShadow receiveShadow renderOrder={red ? 5 : 4}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={red ? ANIME_RED : ANIME_IVORY}
        emissive={red ? '#430408' : '#000000'}
        emissiveIntensity={red ? 0.08 : 0}
        roughness={red ? 0.56 : 0.78}
        metalness={0.018}
      />
    </instancedMesh>
  );
}

export default function AnimeTerraceWalls({ radius, quality }) {
  const specs = useMemo(() => buildSpecs(radius, quality), [quality, radius]);

  return (
    <group>
      <WallInstances radius={radius} specs={specs} material="ivory" />
      <WallInstances radius={radius} specs={specs} material="red" />
    </group>
  );
}
