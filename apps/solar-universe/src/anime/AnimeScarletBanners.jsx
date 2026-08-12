import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ANIME_BLACK,
  ANIME_RED,
  cityPolarDirection,
  citySurfaceRadius,
  surfaceQuaternion
} from './animeCityLayout.js';

const AXIS_AZIMUTH = -Math.PI * 0.52;

const QUALITY_SPECS = [
  { degrees: 18, offset: -0.62, length: 0.22, width: 0.034, lift: 0.155 },
  { degrees: 19.5, offset: 0.58, length: 0.205, width: 0.032, lift: 0.148 },
  { degrees: 22, offset: -0.95, length: 0.17, width: 0.029, lift: 0.13 },
  { degrees: 23, offset: 0.91, length: 0.182, width: 0.03, lift: 0.135 },
  { degrees: 26, offset: -0.43, length: 0.145, width: 0.025, lift: 0.112 },
  { degrees: 27.5, offset: 0.4, length: 0.155, width: 0.026, lift: 0.118 }
];

const ECO_SPECS = QUALITY_SPECS.slice(0, 4);

function Banner({ radius, spec }) {
  const transform = useMemo(() => {
    const direction = cityPolarDirection(
      THREE.MathUtils.degToRad(spec.degrees),
      AXIS_AZIMUTH + spec.offset
    );
    const surface = citySurfaceRadius(direction, radius, radius * 0.008);
    return {
      position: direction.clone().multiplyScalar(surface + radius * spec.lift),
      quaternion: surfaceQuaternion(direction)
    };
  }, [radius, spec]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position={[0, radius * 0.014, 0]} castShadow receiveShadow>
        <boxGeometry args={[radius * spec.width * 2.15, radius * 0.018, radius * 0.024]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.84} metalness={0.025} />
      </mesh>

      <mesh
        position={[0, -radius * spec.length * 0.46, radius * 0.002]}
        castShadow
        receiveShadow
        renderOrder={8}
      >
        <boxGeometry args={[radius * spec.width, radius * spec.length, radius * 0.009]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#330306"
          emissiveIntensity={0.035}
          roughness={0.64}
          metalness={0.015}
        />
      </mesh>

      <mesh position={[0, -radius * spec.length * 0.98, radius * 0.002]}>
        <coneGeometry args={[radius * spec.width * 0.51, radius * spec.width * 0.9, 3]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#260204"
          emissiveIntensity={0.025}
          roughness={0.68}
        />
      </mesh>
    </group>
  );
}

export default function AnimeScarletBanners({ radius, quality }) {
  const specs = quality === 'quality' ? QUALITY_SPECS : ECO_SPECS;

  return (
    <group>
      {specs.map((spec, index) => (
        <Banner key={index} radius={radius} spec={spec} />
      ))}
    </group>
  );
}
