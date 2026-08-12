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

function Bridge({ radius, degrees, width, depth, thickness, color, stripe = true }) {
  const transform = useMemo(() => {
    const direction = cityPolarDirection(THREE.MathUtils.degToRad(degrees), AXIS_AZIMUTH);
    const surface = citySurfaceRadius(direction, radius, radius * 0.018);
    return {
      position: direction.multiplyScalar(surface + radius * 0.012),
      quaternion: surfaceQuaternion(direction)
    };
  }, [degrees, radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[radius * width, radius * thickness, radius * depth]} />
        <meshStandardMaterial
          color={color}
          roughness={color === ANIME_IVORY ? 0.68 : 0.82}
          metalness={0.025}
        />
      </mesh>

      {stripe && (
        <mesh position={[0, radius * thickness * 0.56, 0]} renderOrder={7}>
          <boxGeometry args={[radius * width * 0.94, radius * 0.009, radius * depth * 0.24]} />
          <meshStandardMaterial
            color={ANIME_RED}
            emissive="#4b0509"
            emissiveIntensity={0.08}
            roughness={0.5}
            metalness={0.035}
          />
        </mesh>
      )}

      <mesh position={[-radius * width * 0.42, -radius * thickness * 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[radius * 0.045, radius * 0.13, radius * depth * 0.62]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.86} />
      </mesh>
      <mesh position={[radius * width * 0.42, -radius * thickness * 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[radius * 0.045, radius * 0.13, radius * depth * 0.62]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.86} />
      </mesh>
    </group>
  );
}

export default function AnimeMonumentalBridges({ radius, quality }) {
  return (
    <group>
      <Bridge
        radius={radius}
        degrees={46}
        width={quality === 'quality' ? 0.94 : 0.84}
        depth={0.1}
        thickness={0.042}
        color={ANIME_IVORY}
      />
      <Bridge
        radius={radius}
        degrees={61}
        width={quality === 'quality' ? 0.76 : 0.66}
        depth={0.082}
        thickness={0.034}
        color={ANIME_BLACK}
      />
    </group>
  );
}
