import { useMemo } from 'react';
import * as THREE from 'three';

function shapeFrom(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

const DIGIT_2 = [
  [-0.30, 0.50], [0.15, 0.50], [0.29, 0.39], [0.29, 0.19], [0.20, 0.08],
  [-0.08, -0.12], [-0.25, -0.27], [-0.25, -0.50], [0.30, -0.50], [0.30, -0.28],
  [-0.03, -0.28], [0.10, -0.17], [0.28, -0.02], [0.30, 0.08], [0.30, 0.32],
  [0.16, 0.48], [-0.30, 0.48]
];

const DIGIT_3 = [
  [-0.30, 0.50], [0.13, 0.50], [0.29, 0.38], [0.29, 0.15], [0.20, 0.04],
  [0.29, -0.07], [0.29, -0.38], [0.13, -0.50], [-0.30, -0.50], [-0.30, -0.28],
  [0.04, -0.28], [0.10, -0.23], [0.10, -0.11], [0.04, -0.06], [-0.16, -0.06],
  [-0.16, 0.11], [0.04, 0.11], [0.10, 0.17], [0.10, 0.25], [0.04, 0.30],
  [-0.30, 0.30]
];

function Digit({ points, x }) {
  const geometry = useMemo(() => {
    const shape = shapeFrom(points);
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.018,
      bevelThickness: 0.014,
      curveSegments: 4
    });
    result.center();
    return result;
  }, [points]);

  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={geometry} scale={[1.18, 1.18, 1]} position-z={-0.045}>
        <meshStandardMaterial color="#090909" roughness={0.68} metalness={0.12} />
      </mesh>
      <mesh geometry={geometry} scale={[1.09, 1.09, 1]} position-z={-0.01}>
        <meshStandardMaterial color="#f1eee7" roughness={0.62} metalness={0.04} />
      </mesh>
      <mesh geometry={geometry} position-z={0.035}>
        <meshStandardMaterial color="#c70f2e" emissive="#3b0010" emissiveIntensity={0.18} roughness={0.55} metalness={0.08} />
      </mesh>
    </group>
  );
}

export default function Number23Monument({ radius }) {
  return (
    <group position={[0, -0.07, radius * 0.96]} scale={0.78}>
      <mesh position-z={-0.09}>
        <boxGeometry args={[1.45, 1.08, 0.12, 4, 4, 1]} />
        <meshStandardMaterial color="#241a16" roughness={0.96} metalness={0} />
      </mesh>
      <mesh position-z={-0.02}>
        <boxGeometry args={[1.34, 0.98, 0.035]} />
        <meshStandardMaterial color="#060607" roughness={0.82} metalness={0.12} />
      </mesh>
      <mesh position-z={0.005}>
        <boxGeometry args={[1.27, 0.91, 0.018]} />
        <meshBasicMaterial color="#8f0c25" />
      </mesh>
      <mesh position-z={0.025}>
        <boxGeometry args={[1.22, 0.86, 0.015]} />
        <meshBasicMaterial color="#050506" />
      </mesh>
      <group position-z={0.12} scale={0.82}>
        <Digit points={DIGIT_2} x={-0.35} />
        <Digit points={DIGIT_3} x={0.35} />
      </group>
      <pointLight position={[0, 0.05, 0.42]} color="#e53a43" intensity={1.2} distance={2.1} decay={2} />
    </group>
  );
}
