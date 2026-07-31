import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function arcGeometry(radius, start, span, tube, quality) {
  const pointCount = quality === 'quality' ? 30 : 18;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const angle = start + span * progress;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 3.0) * tube * 1.8,
      Math.sin(angle) * radius
    );
  });
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, pointCount * 2, tube, quality === 'quality' ? 6 : 4, false);
}

function MotionRing({ radius, quality }) {
  const ring = useRef();
  const arcSpecs = useMemo(() => [
    [0.08, 0.58, '#f1d29b', 0.34],
    [0.88, 0.34, '#b9483d', 0.42],
    [1.42, 0.7, '#d9aa65', 0.3],
    [2.36, 0.42, '#f3dfb8', 0.32],
    [3.02, 0.62, '#9f3c37', 0.36],
    [3.88, 0.32, '#d7b06f', 0.28],
    [4.42, 0.74, '#f0d7a9', 0.3],
    [5.42, 0.38, '#b9483d', 0.4]
  ].map(([start, span, color, opacity], index) => ({
    geometry: arcGeometry(
      radius * (index % 2 === 0 ? 1.34 : 1.39),
      start,
      span,
      radius * (index % 2 === 0 ? 0.006 : 0.0045),
      quality
    ),
    color,
    opacity
  })), [quality, radius]);

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.y += delta * 0.018;
  });

  return (
    <group ref={ring} rotation={[0.17, 0.08, -0.34]}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius * 1.31, radius * 0.0035, 5, quality === 'quality' ? 220 : 120]} />
        <meshBasicMaterial color="#d8b77e" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius * 1.42, radius * 0.0024, 5, quality === 'quality' ? 220 : 120]} />
        <meshBasicMaterial color="#c95a4c" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {arcSpecs.map((arc, index) => (
        <mesh key={index} geometry={arc.geometry}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={arc.opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function TrainingMoon({ radius, quality }) {
  const orbit = useRef();
  const moon = useRef();

  useFrame((_, delta) => {
    if (orbit.current) orbit.current.rotation.y += delta * 0.12;
    if (moon.current) moon.current.rotation.y += delta * 0.24;
  });

  return (
    <group rotation={[0.48, 0.12, 0.28]}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius * 1.86, radius * 0.0018, 4, quality === 'quality' ? 180 : 96]} />
        <meshBasicMaterial color="#e1c994" transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <group ref={orbit}>
        <group position={[radius * 1.86, 0, 0]}>
          <mesh ref={moon}>
            <sphereGeometry args={[radius * 0.105, quality === 'quality' ? 40 : 24, quality === 'quality' ? 28 : 16]} />
            <meshStandardMaterial
              color="#c69a61"
              emissive="#27170b"
              emissiveIntensity={0.05}
              roughness={0.76}
              metalness={0.02}
            />
          </mesh>
          <mesh scale={1.055}>
            <sphereGeometry args={[radius * 0.105, quality === 'quality' ? 32 : 20, quality === 'quality' ? 22 : 14]} />
            <meshBasicMaterial
              color="#f1d6a1"
              transparent
              opacity={0.06}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function BasketballOrbitals({ radius, quality, onSelect }) {
  const select = (event) => {
    event.stopPropagation();
    onSelect();
  };

  return (
    <group onClick={select}>
      <MotionRing radius={radius} quality={quality} />
      <TrainingMoon radius={radius} quality={quality} />
    </group>
  );
}
