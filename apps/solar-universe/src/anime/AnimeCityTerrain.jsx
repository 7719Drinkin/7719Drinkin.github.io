import { useMemo } from 'react';
import * as THREE from 'three';
import {
  cityElevation,
  cityTier
} from './animeCityLayout.js';

const COLORS = {
  outside: new THREE.Color('#273743'),
  outskirts: new THREE.Color('#3b3d43'),
  lower: new THREE.Color('#1c1d22'),
  middle: new THREE.Color('#5a595e'),
  upper: new THREE.Color('#c8c3b8'),
  crown: new THREE.Color('#f5f1e8')
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
      <meshPhysicalMaterial
        vertexColors
        roughness={0.62}
        metalness={0.018}
        clearcoat={quality === 'quality' ? 0.1 : 0.05}
        clearcoatRoughness={0.42}
        emissive="#000000"
        emissiveIntensity={0}
        dithering
        flatShading={quality !== 'quality'}
      />
    </mesh>
  );
}
