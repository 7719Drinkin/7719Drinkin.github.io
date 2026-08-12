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
    ? [34, 39, 44, 49, 54, 59, 64, 69, 74, 79, 82]
    : [37, 46, 55, 64, 73, 81];
  const specs = [];

  radialBands.forEach((degrees, bandIndex) => {
    const baseCount = quality === 'quality'
      ? 28 + bandIndex * 3
      : 15 + bandIndex * 2;

    for (let column = 0; column < baseCount; column += 1) {
      const jitter = (hash(column + bandIndex * 41, 13) - 0.5) * 0.11;
      const azimuth = column / baseCount * Math.PI * 2 + jitter + bandIndex * 0.075;
      const sectorDistance = angleDistance(azimuth, AXIS_AZIMUTH);

      if (sectorDistance < 0.19) continue;

      const sectorFrontness = THREE.MathUtils.clamp(1 - sectorDistance / Math.PI, 0, 1);
      const keepProbability = 0.06 + Math.pow(sectorFrontness, 1.18) * 0.94;
      if (hash(column + bandIndex * 211, 173) > keepProbability) continue;

      const radialJitter = (hash(column + bandIndex * 17, 29) - 0.5) * 2.45;
      const direction = cityPolarDirection(
        THREE.MathUtils.degToRad(degrees + radialJitter),
        azimuth
      );

      const scaleHash = hash(column + bandIndex * 53, 71);
      const typeHash = hash(column + bandIndex * 79, 101);
      const inner = THREE.MathUtils.clamp(1 - (degrees - 34) / 48, 0, 1);
      const outerDensity = THREE.MathUtils.clamp((degrees - 34) / 48, 0, 1);
      const rearScale = 0.56 + sectorFrontness * 0.44;
      const height = radius * (
        0.042
        + scaleHash * 0.06
        + inner * 0.065
        - outerDensity * 0.01
      ) * rearScale;
      const width = radius * (0.018 + hash(column, 83) * 0.025 + inner * 0.004) * (0.78 + sectorFrontness * 0.22);
      const depth = radius * (0.019 + hash(column, 97) * 0.028 + inner * 0.004);

      let material = 'dark';
      if (typeHash > 0.91 && sectorFrontness > 0.28) material = 'ivory';
      else if (typeHash < 0.035 && sectorFrontness > 0.48) material = 'red';

      specs.push({
        direction,
        height,
        width,
        depth,
        material,
        yaw: (hash(column + bandIndex * 131, 151) - 0.5) * 0.16
      });
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
      dummy.rotateY(spec.yaw + (index % 3 - 1) * 0.025);
      dummy.scale.set(spec.width, spec.height, spec.depth);
      dummy.updateMatrix();
      ref.current.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [radius, selected]);

  const color = material === 'ivory' ? ANIME_IVORY : material === 'red' ? ANIME_RED : ANIME_BLACK;
  const emissive = material === 'red' ? '#350407' : material === 'dark' ? '#020203' : '#000000';
  const emissiveIntensity = material === 'red' ? 0.05 : material === 'dark' ? 0.015 : 0;

  return (
    <instancedMesh ref={ref} args={[null, null, selected.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={material === 'ivory' ? 0.7 : 0.82}
        metalness={material === 'red' ? 0.035 : 0.018}
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
