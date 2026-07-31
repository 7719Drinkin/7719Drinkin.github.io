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
  [-0.34, 0.50], [0.15, 0.50], [0.34, 0.37], [0.34, 0.12], [0.24, -0.02],
  [-0.04, -0.23], [-0.15, -0.32], [0.34, -0.32], [0.34, -0.50], [-0.34, -0.50],
  [-0.34, -0.27], [-0.23, -0.12], [0.04, 0.08], [0.13, 0.17], [0.13, 0.29],
  [0.06, 0.34], [-0.34, 0.34]
];

const DIGIT_3 = [
  [-0.34, 0.50], [0.13, 0.50], [0.33, 0.38], [0.33, 0.12], [0.22, 0.01],
  [0.33, -0.10], [0.33, -0.38], [0.13, -0.50], [-0.34, -0.50], [-0.34, -0.32],
  [0.03, -0.32], [0.12, -0.26], [0.12, -0.13], [0.04, -0.07], [-0.17, -0.07],
  [-0.17, 0.10], [0.04, 0.10], [0.12, 0.17], [0.12, 0.27], [0.04, 0.33],
  [-0.34, 0.33]
];

function Digit({ points, x }) {
  const geometry = useMemo(() => {
    const result = new THREE.ExtrudeGeometry(shapeFrom(points), {
      depth: 0.074,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.016,
      bevelThickness: 0.014,
      curveSegments: 4
    });
    result.center();
    result.computeVertexNormals();
    return result;
  }, [points]);

  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={geometry} scale={[1.18, 1.18, 1]} position-z={-0.05}>
        <meshStandardMaterial color="#050506" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh geometry={geometry} scale={[1.09, 1.09, 1]} position-z={0.002}>
        <meshStandardMaterial color="#f4f0e8" roughness={0.58} metalness={0.03} />
      </mesh>
      <mesh geometry={geometry} position-z={0.062}>
        <meshStandardMaterial
          color="#d31132"
          emissive="#3d0010"
          emissiveIntensity={0.14}
          roughness={0.5}
          metalness={0.09}
        />
      </mesh>
    </group>
  );
}

export default function Number23Monument({ radius }) {
  return (
    <group position={[0, -0.045, radius + 0.145]} scale={0.54}>
      <mesh position={[0, -0.5, -0.16]} rotation-x={-0.16}>
        <boxGeometry args={[1.18, 0.2, 0.24]} />
        <meshStandardMaterial color="#3d2b22" roughness={0.94} metalness={0.01} />
      </mesh>
      <mesh position-z={-0.11}>
        <boxGeometry args={[1.68, 1.14, 0.14, 4, 4, 1]} />
        <meshStandardMaterial color="#2c201a" roughness={0.94} metalness={0} />
      </mesh>
      <mesh position-z={-0.035}>
        <boxGeometry args={[1.54, 1.02, 0.05]} />
        <meshStandardMaterial color="#050507" roughness={0.78} metalness={0.12} />
      </mesh>
      <mesh position-z={0.003}>
        <boxGeometry args={[1.44, 0.94, 0.02]} />
        <meshBasicMaterial color="#a10b25" />
      </mesh>
      <mesh position-z={0.032}>
        <boxGeometry args={[1.35, 0.86, 0.016]} />
        <meshBasicMaterial color="#050506" />
      </mesh>
      <group position={[0.012, 0, 0.13]} scale={0.72}>
        <Digit points={DIGIT_2} x={-0.39} />
        <Digit points={DIGIT_3} x={0.39} />
      </group>
      <pointLight position={[0, 0.03, 0.46]} color="#e83043" intensity={0.48} distance={1.35} decay={2} />
    </group>
  );
}
