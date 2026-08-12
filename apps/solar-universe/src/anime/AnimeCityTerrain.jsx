import { useMemo } from 'react';
import * as THREE from 'three';
import {
  cityElevation,
  cityTier
} from './animeCityLayout.js';

const COLORS = {
  outside: new THREE.Color('#202b35'),
  outskirts: new THREE.Color('#32343a'),
  lower: new THREE.Color('#17181c'),
  middle: new THREE.Color('#4b4b50'),
  upper: new THREE.Color('#b9b6af'),
  crown: new THREE.Color('#f0eee7')
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

    // Do not bake a fake directional light into vertex colors. The planet's
    // day/night shape should be produced by the real system-star PointLight.
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
        roughness={0.7}
        metalness={0.025}
        clearcoat={quality === 'quality' ? 0.12 : 0.06}
        clearcoatRoughness={0.48}
        emissive="#000000"
        emissiveIntensity={0}
        dithering
        flatShading={quality !== 'quality'}
      />
    </mesh>
  );
}
