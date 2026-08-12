import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ANIME_IVORY,
  ANIME_RED,
  CITY_TIER_DEGREES,
  cityPolarDirection,
  citySurfaceRadius
} from './animeCityLayout.js';

function buildRimGeometry(radius, quality, thresholds) {
  const segments = quality === 'quality' ? 160 : 88;
  const vertices = [];

  thresholds.forEach((degrees) => {
    let previous = null;
    let first = null;

    for (let index = 0; index <= segments; index += 1) {
      const azimuth = index / segments * Math.PI * 2;
      const radial = THREE.MathUtils.degToRad(degrees);
      const direction = cityPolarDirection(radial, azimuth);
      const point = direction.clone().multiplyScalar(
        citySurfaceRadius(direction, radius, radius * 0.008)
      );

      if (!first) first = point.clone();
      if (previous) {
        vertices.push(
          previous.x, previous.y, previous.z,
          point.x, point.y, point.z
        );
      }
      previous = point;
    }

    if (previous && first) {
      vertices.push(
        previous.x, previous.y, previous.z,
        first.x, first.y, first.z
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
    CITY_TIER_DEGREES.upper,
    CITY_TIER_DEGREES.lower
  ]), [quality, radius]);

  const redGeometry = useMemo(() => buildRimGeometry(radius, quality, [
    CITY_TIER_DEGREES.crown,
    CITY_TIER_DEGREES.middle,
    CITY_TIER_DEGREES.outskirts
  ]), [quality, radius]);

  return (
    <group>
      <lineSegments geometry={ivoryGeometry} renderOrder={5}>
        <lineBasicMaterial
          color={ANIME_IVORY}
          transparent
          opacity={quality === 'quality' ? 0.52 : 0.38}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
      <lineSegments geometry={redGeometry} renderOrder={6}>
        <lineBasicMaterial
          color={ANIME_RED}
          transparent
          opacity={quality === 'quality' ? 0.68 : 0.48}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
