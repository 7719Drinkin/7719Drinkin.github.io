import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function buildClouds(radius, quality) {
  const random = seeded(771904);
  const count = quality === 'quality' ? 18 : 9;
  return Array.from({ length: count }, (_, index) => {
    const upper = index >= count * 0.68;
    const laneT = upper
      ? (index - Math.floor(count * 0.68)) / Math.max(count - Math.floor(count * 0.68) - 1, 1)
      : index / Math.max(Math.floor(count * 0.68) - 1, 1);
    return {
      x: radius * THREE.MathUtils.lerp(upper ? -0.55 : -1.0, upper ? 0.58 : 1.02, laneT),
      y: radius * (upper ? 1.08 : 0.82) + radius * (random() - 0.5) * 0.055,
      z: radius * (upper ? 0.06 : 0.15) + radius * (random() - 0.5) * 0.07,
      sx: radius * (upper ? 0.16 : 0.2) * (0.72 + random() * 0.72),
      sy: radius * (upper ? 0.026 : 0.034) * (0.72 + random() * 0.62),
      sz: radius * (upper ? 0.07 : 0.1) * (0.7 + random() * 0.65),
      opacity: (upper ? 0.045 : 0.065) + random() * 0.035,
      phase: random() * Math.PI * 2
    };
  });
}

export default function AnimeCloudBands({ radius, quality }) {
  const root = useRef();
  const clouds = useMemo(() => buildClouds(radius, quality), [quality, radius]);

  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.position.x = Math.sin(clock.elapsedTime * 0.045) * radius * 0.055;
    root.current.position.z = Math.cos(clock.elapsedTime * 0.032) * radius * 0.018;
  });

  return (
    <group ref={root} renderOrder={10}>
      {clouds.map((cloud, index) => (
        <mesh
          key={index}
          position={[cloud.x, cloud.y, cloud.z]}
          scale={[cloud.sx, cloud.sy, cloud.sz]}
          rotation-y={cloud.phase * 0.18}
          raycast={() => null}
        >
          <sphereGeometry args={[1, quality === 'quality' ? 12 : 8, quality === 'quality' ? 8 : 6]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? '#c6e3e9' : '#8fbfce'}
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
