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
      citySurfaceRadius(CITY_DIRECTION, radius, radius * 0.009)
    ),
    quaternion: heroQuaternion(CITY_DIRECTION)
  }), [radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position-y={radius * 0.038} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.42, radius * 0.46, radius * 0.076, 8]} />
        <meshStandardMaterial
          color={ANIME_BLACK}
          emissive="#030407"
          emissiveIntensity={0.025}
          roughness={0.82}
          metalness={0.02}
        />
      </mesh>

      <mesh position-y={radius * 0.083} rotation-y={Math.PI / 8} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.375, radius * 0.405, radius * 0.021, 8]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.66} metalness={0.015} />
      </mesh>

      <mesh position={[0, radius * 0.096, radius * 0.028]} castShadow>
        <boxGeometry args={[radius * 0.058, radius * 0.014, radius * 0.60]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#350306"
          emissiveIntensity={0.04}
          roughness={0.56}
          metalness={0.028}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position-x={side * radius * 0.37}>
          <mesh position-y={radius * 0.12} castShadow>
            <boxGeometry args={[radius * 0.09, radius * 0.16, radius * 0.22]} />
            <meshStandardMaterial color={ANIME_BLACK} roughness={0.82} />
          </mesh>
          <mesh position-y={radius * 0.21}>
            <boxGeometry args={[radius * 0.11, radius * 0.021, radius * 0.245]} />
            <meshStandardMaterial color={ANIME_IVORY} roughness={0.66} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, radius * 0.14, -radius * 0.31]} castShadow receiveShadow>
        <boxGeometry args={[radius * 0.62, radius * 0.072, radius * 0.075]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.83} />
      </mesh>

      <mesh position={[0, radius * 0.183, -radius * 0.31]} receiveShadow>
        <boxGeometry args={[radius * 0.46, radius * 0.012, radius * 0.082]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.67} />
      </mesh>
    </group>
  );
}
