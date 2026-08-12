import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  ANIME_IVORY,
  ANIME_RED,
  cityPolarDirection,
  citySurfaceRadius,
  surfaceQuaternion
} from './animeCityLayout.js';

const AXIS_AZIMUTH = -Math.PI * 0.52;

function buildAxisSteps(radius, quality) {
  const count = quality === 'quality' ? 26 : 14;
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0 : index / (count - 1);
    const radialAngle = THREE.MathUtils.degToRad(68 - t * 55);
    const direction = cityPolarDirection(radialAngle, AXIS_AZIMUTH);
    return {
      direction,
      width: radius * (0.155 - t * 0.032),
      depth: radius * (0.052 - t * 0.007),
      thickness: radius * 0.0145
    };
  });
}

export default function AnimeCentralAxis({ radius, quality }) {
  const stairRef = useRef();
  const stripeRef = useRef();
  const steps = useMemo(() => buildAxisSteps(radius, quality), [quality, radius]);

  useEffect(() => {
    if (!stairRef.current || !stripeRef.current) return;

    const stair = new THREE.Object3D();
    const stripe = new THREE.Object3D();

    steps.forEach((step, index) => {
      const surface = citySurfaceRadius(step.direction, radius, radius * 0.006);
      const quaternion = surfaceQuaternion(step.direction);

      stair.position.copy(step.direction).multiplyScalar(surface + step.thickness * 0.5);
      stair.quaternion.copy(quaternion);
      stair.scale.set(step.width, step.thickness, step.depth);
      stair.updateMatrix();
      stairRef.current.setMatrixAt(index, stair.matrix);

      stripe.position.copy(step.direction).multiplyScalar(surface + step.thickness + radius * 0.0034);
      stripe.quaternion.copy(quaternion);
      stripe.scale.set(radius * 0.021, radius * 0.0058, step.depth * 0.94);
      stripe.updateMatrix();
      stripeRef.current.setMatrixAt(index, stripe.matrix);
    });

    stairRef.current.instanceMatrix.needsUpdate = true;
    stripeRef.current.instanceMatrix.needsUpdate = true;
  }, [radius, steps]);

  return (
    <group>
      <instancedMesh ref={stairRef} args={[null, null, steps.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ANIME_IVORY} roughness={0.82} metalness={0.01} />
      </instancedMesh>

      <instancedMesh ref={stripeRef} args={[null, null, steps.length]} renderOrder={4}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={ANIME_RED}
          emissive="#5d070c"
          emissiveIntensity={0.2}
          roughness={0.56}
          metalness={0.04}
        />
      </instancedMesh>
    </group>
  );
}
