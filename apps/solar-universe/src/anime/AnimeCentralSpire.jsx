import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ANIME_BLACK,
  ANIME_IVORY,
  ANIME_RED,
  CITY_DIRECTION,
  citySurfaceRadius,
  surfaceQuaternion
} from './animeCityLayout.js';

export default function AnimeCentralSpire({ radius }) {
  const transform = useMemo(() => ({
    position: CITY_DIRECTION.clone().multiplyScalar(citySurfaceRadius(CITY_DIRECTION, radius, radius * 0.012)),
    quaternion: surfaceQuaternion(CITY_DIRECTION)
  }), [radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position-y={radius * 0.03} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.19, radius * 0.22, radius * 0.06, 8]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.86} metalness={0.035} />
      </mesh>

      <mesh position-y={radius * 0.072} rotation-y={Math.PI / 8} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.17, radius * 0.185, radius * 0.026, 8]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.78} metalness={0.015} />
      </mesh>

      <mesh position-y={radius * 0.245} rotation-y={Math.PI / 4} castShadow>
        <cylinderGeometry args={[radius * 0.052, radius * 0.088, radius * 0.33, 4]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.74} metalness={0.025} />
      </mesh>

      <mesh position={[0, radius * 0.245, radius * 0.061]} castShadow>
        <boxGeometry args={[radius * 0.022, radius * 0.34, radius * 0.012]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#64070d"
          emissiveIntensity={0.19}
          roughness={0.52}
          metalness={0.04}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position-x={side * radius * 0.105}>
          <mesh position-y={radius * 0.247} castShadow>
            <boxGeometry args={[radius * 0.13, radius * 0.045, radius * 0.15]} />
            <meshStandardMaterial color={ANIME_BLACK} roughness={0.84} metalness={0.025} />
          </mesh>
          <mesh position-y={radius * 0.318} rotation-y={Math.PI / 4} castShadow>
            <cylinderGeometry args={[radius * 0.024, radius * 0.041, radius * 0.15, 4]} />
            <meshStandardMaterial color={ANIME_IVORY} roughness={0.76} />
          </mesh>
          <mesh position-y={radius * 0.405}>
            <coneGeometry args={[radius * 0.028, radius * 0.065, 4]} />
            <meshStandardMaterial color={ANIME_RED} roughness={0.56} />
          </mesh>
        </group>
      ))}

      <mesh position-y={radius * 0.49} rotation-y={Math.PI / 4} castShadow>
        <cylinderGeometry args={[radius * 0.018, radius * 0.042, radius * 0.18, 4]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.78} metalness={0.04} />
      </mesh>

      <mesh position-y={radius * 0.635} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[radius * 0.037, radius * 0.11, 4]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#7b0910"
          emissiveIntensity={0.16}
          roughness={0.5}
          metalness={0.03}
        />
      </mesh>
    </group>
  );
}
