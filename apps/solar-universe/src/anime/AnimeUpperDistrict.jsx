import { useEffect, useMemo, useRef } from 'react';
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

function createTowerSpecs(radius, quality) {
  const count = quality === 'quality' ? 18 : 10;
  const specs = [];

  for (let index = 0; index < count; index += 1) {
    const azimuth = index / count * Math.PI * 2 + 0.18;
    const radialDegrees = 13.5 + (index % 3) * 2.6 + (index % 2) * 0.8;
    const direction = cityPolarDirection(THREE.MathUtils.degToRad(radialDegrees), azimuth);
    const height = radius * (0.11 + (index % 4) * 0.018);
    specs.push({
      direction,
      height,
      width: radius * (0.035 + (index % 3) * 0.008),
      depth: radius * (0.04 + ((index + 1) % 3) * 0.007),
      light: index % 3 !== 1
    });
  }

  return specs;
}

function TowerInstances({ radius, specs, light }) {
  const ref = useRef();
  const selected = useMemo(() => specs.filter((spec) => spec.light === light), [light, specs]);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();

    selected.forEach((spec, index) => {
      const surface = citySurfaceRadius(spec.direction, radius, radius * 0.006);
      dummy.position.copy(spec.direction).multiplyScalar(surface + spec.height * 0.5);
      dummy.quaternion.copy(surfaceQuaternion(spec.direction));
      dummy.scale.set(spec.width, spec.height, spec.depth);
      dummy.updateMatrix();
      ref.current.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [radius, selected]);

  return (
    <instancedMesh ref={ref} args={[null, null, selected.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={light ? ANIME_IVORY : ANIME_BLACK}
        roughness={light ? 0.78 : 0.88}
        metalness={0.015}
      />
    </instancedMesh>
  );
}

function UpperPlaza({ radius }) {
  const transform = useMemo(() => {
    const direction = cityPolarDirection(THREE.MathUtils.degToRad(12.5), AXIS_AZIMUTH);
    return {
      direction,
      position: direction.clone().multiplyScalar(citySurfaceRadius(direction, radius, radius * 0.012)),
      quaternion: surfaceQuaternion(direction)
    };
  }, [radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position-y={radius * 0.018} castShadow receiveShadow>
        <boxGeometry args={[radius * 0.42, radius * 0.036, radius * 0.22]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh position-y={radius * 0.039} receiveShadow>
        <boxGeometry args={[radius * 0.36, radius * 0.009, radius * 0.176]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.82} metalness={0.01} />
      </mesh>
      <mesh position={[0, radius * 0.046, 0]}>
        <boxGeometry args={[radius * 0.032, radius * 0.007, radius * 0.184]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#57070b"
          emissiveIntensity={0.14}
          roughness={0.6}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * radius * 0.205, radius * 0.071, 0]} castShadow>
          <boxGeometry args={[radius * 0.025, radius * 0.14, radius * 0.20]} />
          <meshStandardMaterial color={ANIME_BLACK} roughness={0.86} />
        </mesh>
      ))}
    </group>
  );
}

export default function AnimeUpperDistrict({ radius, quality }) {
  const towerSpecs = useMemo(() => createTowerSpecs(radius, quality), [quality, radius]);

  return (
    <group>
      <TowerInstances radius={radius} specs={towerSpecs} light />
      <TowerInstances radius={radius} specs={towerSpecs} light={false} />
      <UpperPlaza radius={radius} />
    </group>
  );
}
