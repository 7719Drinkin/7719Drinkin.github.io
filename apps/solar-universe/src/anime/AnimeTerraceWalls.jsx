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

const RINGS = [
  { degrees: CITY_TIER_DEGREES.crown, material: 'red', height: 0.028, depth: 0.028 },
  { degrees: CITY_TIER_DEGREES.upper, material: 'ivory', height: 0.024, depth: 0.026 },
  { degrees: CITY_TIER_DEGREES.middle, material: 'red', height: 0.021, depth: 0.024 },
  { degrees: CITY_TIER_DEGREES.lower, material: 'ivory', height: 0.018, depth: 0.022 },
  { degrees: CITY_TIER_DEGREES.outskirts, material: 'red', height: 0.015, depth: 0.02 }
];

function buildSpecs(radius, quality) {
  const specs = [];

  RINGS.forEach((ring, ringIndex) => {
    const segments = quality === 'quality'
      ? 64 + ringIndex * 8
      : 34 + ringIndex * 4;
    const radial = THREE.MathUtils.degToRad(ring.degrees);

    for (let index = 0; index < segments; index += 1) {
      const azimuth = index / segments * Math.PI * 2;
      const direction = cityPolarDirection(radial, azimuth);
      const surfaceRadius = citySurfaceRadius(direction, radius, radius * 0.004);
      const ringRadius = surfaceRadius * Math.sin(radial);
      const arcWidth = Math.max(
        radius * 0.025,
        (Math.PI * 2 * ringRadius / segments) * 1.08
      );

      specs.push({
        direction,
        material: ring.material,
        width: arcWidth,
        height: radius * ring.height,
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
      const surface = citySurfaceRadius(spec.direction, radius, radius * 0.004);
      dummy.position.copy(spec.direction).multiplyScalar(surface + spec.height * 0.48);
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
        emissive={red ? '#5f070c' : '#000000'}
        emissiveIntensity={red ? 0.16 : 0}
        roughness={red ? 0.58 : 0.8}
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
