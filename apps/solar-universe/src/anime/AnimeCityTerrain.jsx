import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ANIME_CHARCOAL,
  ANIME_IVORY,
  cityElevation,
  cityTier
} from './animeCityLayout.js';

const COLORS = {
  outside: new THREE.Color(ANIME_CHARCOAL),
  outskirts: new THREE.Color('#202228'),
  lower: new THREE.Color('#15161a'),
  middle: new THREE.Color('#24262b'),
  upper: new THREE.Color('#6c6d70'),
  crown: new THREE.Color(ANIME_IVORY)
};

function createCityTerrain(radius, quality) {
  const detail = quality === 'quality' ? 5 : 4;
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const color = new THREE.Color();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    normal.copy(vertex).normalize();
    const elevation = cityElevation(normal, radius);
    const targetRadius = radius + elevation;
    position.setXYZ(index, normal.x * targetRadius, normal.y * targetRadius, normal.z * targetRadius);

    const tier = cityTier(normal);
    color.copy(COLORS[tier]);

    const directionalShade = 0.88 + Math.max(normal.y, -0.25) * 0.08 + Math.max(normal.z, 0) * 0.035;
    color.multiplyScalar(directionalShade);

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

export default function AnimeCityTerrain({ radius, quality }) {
  const geometry = useMemo(() => createCityTerrain(radius, quality), [quality, radius]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.91}
        metalness={0.015}
        dithering
        flatShading={quality !== 'quality'}
      />
    </mesh>
  );
}
