import { useMemo } from 'react';
import * as THREE from 'three';

function createGeometry(radius, detail, seed) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const normal = vertex.clone().normalize();
    const noise = Math.sin(normal.x * 91.7 + normal.y * 171.3 + normal.z * 47.9 + seed) * 0.5 + 0.5;
    vertex.addScaledVector(normal, (noise - 0.5) * radius * 0.08);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export default function PlaceholderWorld({ interest, quality }) {
  const geometry = useMemo(
    () => createGeometry(interest.size, quality === 'quality' ? 4 : 2, interest.id === 'games' ? 77 : 91),
    [interest.id, interest.size, quality]
  );

  const palette = interest.id === 'games'
    ? { color: '#163b54', emissive: '#0b2c42' }
    : { color: '#35204d', emissive: '#251338' };

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={palette.color} emissive={palette.emissive} emissiveIntensity={0.22} roughness={0.78} metalness={0.12} flatShading />
      </mesh>
      <mesh rotation-x={interest.id === 'games' ? 1.05 : 0.82} rotation-y={interest.id === 'music' ? 0.35 : 0}>
        <torusGeometry args={[interest.size * 1.18, 0.014, 8, quality === 'quality' ? 160 : 72]} />
        <meshBasicMaterial color={interest.accent} transparent opacity={0.44} />
      </mesh>
      {interest.id === 'music' && [1.35, 1.52].map((scale, index) => (
        <mesh key={scale} rotation-x={0.9 + index * 0.16} rotation-y={-0.25 + index * 0.35}>
          <torusGeometry args={[interest.size * scale, 0.01, 8, quality === 'quality' ? 160 : 72]} />
          <meshBasicMaterial color={interest.accent} transparent opacity={0.24} />
        </mesh>
      ))}
    </group>
  );
}
