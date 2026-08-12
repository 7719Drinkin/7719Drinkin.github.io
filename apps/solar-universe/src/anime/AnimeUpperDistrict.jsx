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
  const count = quality === 'quality' ? 20 : 12;
  const specs = [];

  for (let index = 0; index < count; index += 1) {
    const azimuth = index / count * Math.PI * 2 + 0.18;
    const radialDegrees = 14.5 + (index % 4) * 2.7 + (index % 2) * 0.7;
    const direction = cityPolarDirection(THREE.MathUtils.degToRad(radialDegrees), azimuth);
    const height = radius * (0.12 + (index % 4) * 0.022);
    specs.push({
      direction,
      height,
      width: radius * (0.041 + (index % 3) * 0.009),
      depth: radius * (0.046 + ((index + 1) % 3) * 0.008),
      light: index % 4 !== 1
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
        roughness={light ? 0.66 : 0.84}
        metalness={0.012}
      />
    </instancedMesh>
  );
}

function UpperPlaza({ radius }) {
  const transform = useMemo(() => {
    const direction = cityPolarDirection(THREE.MathUtils.degToRad(13.5), AXIS_AZIMUTH);
    return {
      direction,
      position: direction.clone().multiplyScalar(citySurfaceRadius(direction, radius, radius * 0.014)),
      quaternion: surfaceQuaternion(direction)
    };
  }, [radius]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position-y={radius * 0.021} castShadow receiveShadow>
        <boxGeometry args={[radius * 0.54, radius * 0.042, radius * 0.27]} />
        <meshStandardMaterial color={ANIME_BLACK} roughness={0.83} metalness={0.018} />
      </mesh>
      <mesh position-y={radius * 0.048} receiveShadow>
        <boxGeometry args={[radius * 0.46, radius * 0.012, radius * 0.218]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.68} metalness={0.01} />
      </mesh>
      <mesh position={[0, radius * 0.057, 0]}>
        <boxGeometry args={[radius * 0.046, radius * 0.009, radius * 0.232]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#360306"
          emissiveIntensity={0.045}
          roughness={0.58}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * radius * 0.255}>
          <mesh position-y={radius * 0.09} castShadow>
            <boxGeometry args={[radius * 0.042, radius * 0.18, radius * 0.24]} />
            <meshStandardMaterial color={ANIME_BLACK} roughness={0.82} />
          </mesh>
          <mesh position-y={radius * 0.185}>
            <boxGeometry args={[radius * 0.064, radius * 0.02, radius * 0.258]} />
            <meshStandardMaterial color={ANIME_IVORY} roughness={0.66} />
          </mesh>
        </group>
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
