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
    ? [30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70, 74, 78, 82, 86, 90, 94, 97]
    : [32, 39, 46, 53, 60, 67, 74, 81, 88, 95, 97];
  const specs = [];

  radialBands.forEach((degrees, bandIndex) => {
    const baseCount = quality === 'quality'
      ? 34 + bandIndex * 4
      : 19 + bandIndex * 2;

    for (let column = 0; column < baseCount; column += 1) {
      const jitter = (hash(column + bandIndex * 41, 13) - 0.5) * 0.09;
      const azimuth = column / baseCount * Math.PI * 2 + jitter + bandIndex * 0.055;
      const sectorDistance = angleDistance(azimuth, AXIS_AZIMUTH);

      // Keep the monumental scarlet stair visible through the densest districts.
      if (sectorDistance < 0.18) continue;

      const sectorFrontness = THREE.MathUtils.clamp(1 - sectorDistance / Math.PI, 0, 1);
      const keepProbability = 0.025 + Math.pow(sectorFrontness, 0.84) * 0.975;
      if (hash(column + bandIndex * 211, 173) > keepProbability) continue;

      const radialJitter = (hash(column + bandIndex * 17, 29) - 0.5) * 2.0;
      const direction = cityPolarDirection(
        THREE.MathUtils.degToRad(degrees + radialJitter),
        azimuth
      );

      const scaleHash = hash(column + bandIndex * 53, 71);
      const typeHash = hash(column + bandIndex * 79, 101);
      const inner = THREE.MathUtils.clamp(1 - (degrees - 30) / 67, 0, 1);
      const outer = THREE.MathUtils.clamp((degrees - 30) / 67, 0, 1);
      const rearScale = 0.5 + sectorFrontness * 0.5;

      // The lower city should read as a continuous urban mass rather than a
      // field of thin spikes. Outer districts therefore get lower, broader
      // blocks while the inner districts become progressively more vertical.
      const height = radius * (
        0.04
        + scaleHash * 0.058
        + inner * 0.092
        - outer * 0.006
      ) * rearScale;
      const width = radius * (
        0.023
        + hash(column, 83) * 0.031
        + outer * 0.013
        + inner * 0.004
      ) * (0.74 + sectorFrontness * 0.26);
      const depth = radius * (
        0.025
        + hash(column, 97) * 0.034
        + outer * 0.012
        + inner * 0.004
      );

      let material = 'dark';
      if (typeHash > 0.84 && sectorFrontness > 0.2) material = 'ivory';
      else if (typeHash < 0.06 && sectorFrontness > 0.36) material = 'red';

      specs.push({
        direction,
        height,
        width,
        depth,
        material,
        yaw: (hash(column + bandIndex * 131, 151) - 0.5) * 0.24
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
  const emissive = material === 'red' ? '#2c0306' : material === 'dark' ? '#010102' : '#000000';
  const emissiveIntensity = material === 'red' ? 0.035 : material === 'dark' ? 0.006 : 0;

  return (
    <instancedMesh ref={ref} args={[null, null, selected.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={material === 'ivory' ? 0.66 : 0.8}
        metalness={material === 'red' ? 0.03 : 0.015}
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
