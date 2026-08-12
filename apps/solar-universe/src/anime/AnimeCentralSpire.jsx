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

export default function AnimeCentralSpire({ radius }) {
  const transform = useMemo(() => ({
    position: CITY_DIRECTION.clone().multiplyScalar(citySurfaceRadius(CITY_DIRECTION, radius, radius * 0.075)),
    quaternion: heroQuaternion(CITY_DIRECTION)
  }), [radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position-y={radius * 0.04} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.24, radius * 0.27, radius * 0.08, 8]} />
        <meshStandardMaterial color={ANIME_BLACK} emissive="#07080a" emissiveIntensity={0.09} roughness={0.86} metalness={0.035} />
      </mesh>

      <mesh position-y={radius * 0.092} rotation-y={Math.PI / 8} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.205, radius * 0.225, radius * 0.032, 8]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.68} metalness={0.025} />
      </mesh>

      <mesh position-y={radius * 0.325} rotation-y={Math.PI / 4} castShadow>
        <cylinderGeometry args={[radius * 0.06, radius * 0.105, radius * 0.46, 4]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.62} metalness={0.03} />
      </mesh>

      <mesh position={[0, radius * 0.325, radius * 0.073]} castShadow>
        <boxGeometry args={[radius * 0.026, radius * 0.47, radius * 0.014]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#64070d"
          emissiveIntensity={0.16}
          roughness={0.42}
          metalness={0.05}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position-x={side * radius * 0.14}>
          <mesh position-y={radius * 0.33} castShadow>
            <boxGeometry args={[radius * 0.18, radius * 0.055, radius * 0.19]} />
            <meshStandardMaterial color={ANIME_BLACK} emissive="#07080a" emissiveIntensity={0.07} roughness={0.84} metalness={0.025} />
          </mesh>
          <mesh position-y={radius * 0.43} rotation-y={Math.PI / 4} castShadow>
            <cylinderGeometry args={[radius * 0.029, radius * 0.049, radius * 0.2, 4]} />
            <meshStandardMaterial color={ANIME_IVORY} roughness={0.64} metalness={0.025} />
          </mesh>
          <mesh position-y={radius * 0.55}>
            <coneGeometry args={[radius * 0.034, radius * 0.085, 4]} />
            <meshStandardMaterial color={ANIME_RED} emissive="#52060a" emissiveIntensity={0.08} roughness={0.38} metalness={0.045} />
          </mesh>
        </group>
      ))}

      <mesh position-y={radius * 0.655} rotation-y={Math.PI / 4} castShadow>
        <cylinderGeometry args={[radius * 0.022, radius * 0.049, radius * 0.27, 4]} />
        <meshStandardMaterial color={ANIME_BLACK} emissive="#08090c" emissiveIntensity={0.08} roughness={0.72} metalness={0.045} />
      </mesh>

      <mesh position-y={radius * 0.86} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[radius * 0.046, radius * 0.16, 4]} />
        <meshStandardMaterial
          color="#e5232f"
          emissive="#420509"
          emissiveIntensity={0.07}
          roughness={0.3}
          metalness={0.06}
        />
      </mesh>
    </group>
  );
}
