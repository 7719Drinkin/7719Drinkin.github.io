import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ANIME_BLACK,
  ANIME_IVORY,
  ANIME_RED,
  CITY_DIRECTION,
  citySurfaceRadius,
  heroQuaternion
} from './animeCityLayout.js';

export default function AnimeCrownPlatform({ radius }) {
  const transform = useMemo(() => ({
    position: CITY_DIRECTION.clone().multiplyScalar(
      citySurfaceRadius(CITY_DIRECTION, radius, radius * 0.008)
    ),
    quaternion: heroQuaternion(CITY_DIRECTION)
  }), [radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position-y={radius * 0.033} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.35, radius * 0.39, radius * 0.066, 8]} />
        <meshStandardMaterial
          color={ANIME_BLACK}
          emissive="#08090c"
          emissiveIntensity={0.1}
          roughness={0.87}
          metalness={0.025}
        />
      </mesh>

      <mesh position-y={radius * 0.071} rotation-y={Math.PI / 8} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.31, radius * 0.335, radius * 0.018, 8]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.76} metalness={0.018} />
      </mesh>

      <mesh position={[0, radius * 0.083, radius * 0.025]} castShadow>
        <boxGeometry args={[radius * 0.045, radius * 0.012, radius * 0.49]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#65070d"
          emissiveIntensity={0.18}
          roughness={0.5}
          metalness={0.04}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position-x={side * radius * 0.305}>
          <mesh position-y={radius * 0.10} castShadow>
            <boxGeometry args={[radius * 0.07, radius * 0.13, radius * 0.18]} />
            <meshStandardMaterial color={ANIME_BLACK} roughness={0.86} />
          </mesh>
          <mesh position-y={radius * 0.171}>
            <boxGeometry args={[radius * 0.085, radius * 0.018, radius * 0.20]} />
            <meshStandardMaterial color={ANIME_IVORY} roughness={0.76} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, radius * 0.115, -radius * 0.25]}>
        <boxGeometry args={[radius * 0.48, radius * 0.055, radius * 0.065]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.87} />
      </mesh>
    </group>
  );
}
