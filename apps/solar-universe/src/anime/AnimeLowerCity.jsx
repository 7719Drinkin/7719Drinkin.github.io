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

function fract(value) {
  return value - Math.floor(value);
}

function hash(value, seed = 0) {
  return fract(Math.sin(value * 91.73 + seed * 17.31) * 43758.5453123);
}

function angleDistance(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function buildSpecs(radius, quality) {
  const radialBands = quality === 'quality'
    ? [33, 39, 45, 51, 57, 63, 69]
    : [35, 44, 53, 62, 69];
  const specs = [];

  radialBands.forEach((degrees, bandIndex) => {
    const baseCount = quality === 'quality' ? 24 + bandIndex * 3 : 13 + bandIndex * 2;

    for (let column = 0; column < baseCount; column += 1) {
      const jitter = (hash(column + bandIndex * 41, 13) - 0.5) * 0.12;
      const azimuth = column / baseCount * Math.PI * 2 + jitter + bandIndex * 0.08;
      if (angleDistance(azimuth, AXIS_AZIMUTH) < 0.16) continue;

      const radialJitter = (hash(column + bandIndex * 17, 29) - 0.5) * 2.7;
      const direction = cityPolarDirection(
        THREE.MathUtils.degToRad(degrees + radialJitter),
        azimuth
      );

      const scaleHash = hash(column + bandIndex * 53, 71);
      const typeHash = hash(column + bandIndex * 79, 101);
      const inner = 1 - (degrees - 33) / 40;
      const height = radius * (0.055 + scaleHash * 0.075 + inner * 0.045);
      const width = radius * (0.025 + hash(column, 83) * 0.026);
      const depth = radius * (0.024 + hash(column, 97) * 0.03);

      let material = 'dark';
      if (typeHash > 0.84) material = 'ivory';
      else if (typeHash < 0.055) material = 'red';

      specs.push({ direction, height, width, depth, material });
    }
  });

  return specs;
}

function BuildingInstances({ radius, specs, material }) {
  const ref = useRef();
  const selected = useMemo(() => specs.filter((spec) => spec.material === material), [material, specs]);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();

    selected.forEach((spec, index) => {
      const surface = citySurfaceRadius(spec.direction, radius, radius * 0.004);
      dummy.position.copy(spec.direction).multiplyScalar(surface + spec.height * 0.5);
      dummy.quaternion.copy(surfaceQuaternion(spec.direction));
      dummy.rotateY((index % 5 - 2) * 0.055);
      dummy.scale.set(spec.width, spec.height, spec.depth);
      dummy.updateMatrix();
      ref.current.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [radius, selected]);

  const color = material === 'ivory' ? ANIME_IVORY : material === 'red' ? ANIME_RED : ANIME_BLACK;
  const emissive = material === 'red' ? '#5f070c' : material === 'dark' ? '#08090c' : '#000000';
  const emissiveIntensity = material === 'red' ? 0.16 : material === 'dark' ? 0.08 : 0;

  return (
    <instancedMesh ref={ref} args={[null, null, selected.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={material === 'ivory' ? 0.76 : 0.88}
        metalness={0.018}
      />
    </instancedMesh>
  );
}

export default function AnimeLowerCity({ radius, quality }) {
  const specs = useMemo(() => buildSpecs(radius, quality), [quality, radius]);

  return (
    <group>
      <BuildingInstances radius={radius} specs={specs} material="dark" />
      <BuildingInstances radius={radius} specs={specs} material="ivory" />
      <BuildingInstances radius={radius} specs={specs} material="red" />
    </group>
  );
}
