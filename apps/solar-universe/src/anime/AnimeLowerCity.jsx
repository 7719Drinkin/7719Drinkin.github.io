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
    ? [29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 77, 81, 84]
    : [32, 39, 46, 53, 60, 67, 74, 81, 84];
  const specs = [];

  radialBands.forEach((degrees, bandIndex) => {
    const baseCount = quality === 'quality'
      ? 32 + bandIndex * 4
      : 18 + bandIndex * 2;

    for (let column = 0; column < baseCount; column += 1) {
      const jitter = (hash(column + bandIndex * 41, 13) - 0.5) * 0.095;
      const azimuth = column / baseCount * Math.PI * 2 + jitter + bandIndex * 0.061;
      const sectorDistance = angleDistance(azimuth, AXIS_AZIMUTH);

      // Keep the monumental scarlet stair visible through the densest districts.
      if (sectorDistance < 0.165) continue;

      const sectorFrontness = THREE.MathUtils.clamp(1 - sectorDistance / Math.PI, 0, 1);
      const keepProbability = 0.035 + Math.pow(sectorFrontness, 0.92) * 0.965;
      if (hash(column + bandIndex * 211, 173) > keepProbability) continue;

      const radialJitter = (hash(column + bandIndex * 17, 29) - 0.5) * 2.15;
      const direction = cityPolarDirection(
        THREE.MathUtils.degToRad(degrees + radialJitter),
        azimuth
      );

      const scaleHash = hash(column + bandIndex * 53, 71);
      const typeHash = hash(column + bandIndex * 79, 101);
      const inner = THREE.MathUtils.clamp(1 - (degrees - 29) / 55, 0, 1);
      const outer = THREE.MathUtils.clamp((degrees - 29) / 55, 0, 1);
      const rearScale = 0.48 + sectorFrontness * 0.52;

      // Lower districts are deliberately more crowded and somewhat taller than
      // before so the planet reads as an inhabited vertical city instead of a
      // bare terraced hill.
      const height = radius * (
        0.052
        + scaleHash * 0.074
        + inner * 0.072
        + outer * 0.01
      ) * rearScale;
      const width = radius * (0.019 + hash(column, 83) * 0.026 + inner * 0.005) * (0.72 + sectorFrontness * 0.28);
      const depth = radius * (0.021 + hash(column, 97) * 0.031 + inner * 0.005);

      let material = 'dark';
      if (typeHash > 0.895 && sectorFrontness > 0.24) material = 'ivory';
      else if (typeHash < 0.045 && sectorFrontness > 0.42) material = 'red';

      specs.push({
        direction,
        height,
        width,
        depth,
        material,
        yaw: (hash(column + bandIndex * 131, 151) - 0.5) * 0.18
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
  const emissiveIntensity = material === 'red' ? 0.05 : material === 'dark' ? 0.012 : 0;

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
