import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ANIME_BLACK,
  ANIME_IVORY,
  ANIME_RED,
  cityPolarDirection,
  citySurfaceRadius,
  surfaceQuaternion
} from './animeCityLayout.js';

const AXIS_AZIMUTH = -Math.PI * 0.52;

export default function AnimeAxisGate({ radius }) {
  const transform = useMemo(() => {
    const direction = cityPolarDirection(THREE.MathUtils.degToRad(49), AXIS_AZIMUTH);
    return {
      position: direction.clone().multiplyScalar(citySurfaceRadius(direction, radius, radius * 0.012)),
      quaternion: surfaceQuaternion(direction)
    };
  }, [radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * radius * 0.13}>
          <mesh position-y={radius * 0.085} castShadow receiveShadow>
            <boxGeometry args={[radius * 0.075, radius * 0.17, radius * 0.08]} />
            <meshStandardMaterial
              color={ANIME_BLACK}
              emissive="#08090c"
              emissiveIntensity={0.1}
              roughness={0.86}
            />
          </mesh>
          <mesh position-y={radius * 0.181} castShadow>
            <boxGeometry args={[radius * 0.09, radius * 0.022, radius * 0.095]} />
            <meshStandardMaterial color={ANIME_IVORY} roughness={0.77} />
          </mesh>
          <mesh position-y={radius * 0.225} rotation-y={Math.PI / 4} castShadow>
            <coneGeometry args={[radius * 0.035, radius * 0.085, 4]} />
            <meshStandardMaterial color={ANIME_IVORY} roughness={0.75} />
          </mesh>
        </group>
      ))}

      <mesh position-y={radius * 0.18} castShadow>
        <boxGeometry args={[radius * 0.335, radius * 0.052, radius * 0.09]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#69070d"
          emissiveIntensity={0.2}
          roughness={0.54}
          metalness={0.025}
        />
      </mesh>

      <mesh position={[0, radius * 0.205, radius * 0.049]} castShadow>
        <boxGeometry args={[radius * 0.038, radius * 0.095, radius * 0.018]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.76} />
      </mesh>
    </group>
  );
}
