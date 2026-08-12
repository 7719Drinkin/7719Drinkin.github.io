import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ANIME_IVORY,
  ANIME_RED,
  CITY_TIER_DEGREES,
  cityPolarDirection,
  citySurfaceRadius
} from './animeCityLayout.js';

const AXIS_AZIMUTH = -Math.PI * 0.52;

function fract(value) {
  return value - Math.floor(value);
}

function hash(value, seed = 0) {
  return fract(Math.sin(value * 59.17 + seed * 23.09) * 43758.5453123);
}

function angleDistance(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function buildRimGeometry(radius, quality, rings) {
  const segments = quality === 'quality' ? 176 : 96;
  const vertices = [];

  rings.forEach((ring, ringIndex) => {
    const radial = THREE.MathUtils.degToRad(ring.degrees);

    for (let index = 0; index < segments; index += 1) {
      const a0 = index / segments * Math.PI * 2;
      const a1 = (index + 1) / segments * Math.PI * 2;
      const midpoint = a0 + (a1 - a0) * 0.5;
      const sectorDistance = angleDistance(midpoint, AXIS_AZIMUTH);
      if (sectorDistance > ring.halfSpan) continue;
      if (
        sectorDistance > 0.42
        && hash(index + ringIndex * 127, 47) < ring.gapRate
      ) continue;

      const d0 = cityPolarDirection(radial, a0);
      const d1 = cityPolarDirection(radial, a1);
      const p0 = d0.clone().multiplyScalar(citySurfaceRadius(d0, radius, radius * 0.008));
      const p1 = d1.clone().multiplyScalar(citySurfaceRadius(d1, radius, radius * 0.008));

      vertices.push(
        p0.x, p0.y, p0.z,
        p1.x, p1.y, p1.z
      );
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

export default function AnimeTerraceRims({ radius, quality }) {
  const ivoryGeometry = useMemo(() => buildRimGeometry(radius, quality, [
    { degrees: CITY_TIER_DEGREES.upper, halfSpan: 2.45, gapRate: 0.055 },
    { degrees: CITY_TIER_DEGREES.lower, halfSpan: 2.05, gapRate: 0.085 }
  ]), [quality, radius]);

  const redGeometry = useMemo(() => buildRimGeometry(radius, quality, [
    { degrees: CITY_TIER_DEGREES.crown, halfSpan: 2.7, gapRate: 0.045 },
    { degrees: CITY_TIER_DEGREES.middle, halfSpan: 2.25, gapRate: 0.075 },
    { degrees: CITY_TIER_DEGREES.outskirts, halfSpan: 1.82, gapRate: 0.13 }
  ]), [quality, radius]);

  return (
    <group>
      <lineSegments geometry={ivoryGeometry} renderOrder={5}>
        <lineBasicMaterial
          color={ANIME_IVORY}
          transparent
          opacity={quality === 'quality' ? 0.46 : 0.34}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
      <lineSegments geometry={redGeometry} renderOrder={6}>
        <lineBasicMaterial
          color={ANIME_RED}
          transparent
          opacity={quality === 'quality' ? 0.6 : 0.43}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
