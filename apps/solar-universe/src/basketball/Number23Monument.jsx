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
      depth: 0.082,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.018,
      bevelThickness: 0.016,
      curveSegments: 4
    });
    result.center();
    result.computeVertexNormals();
    return result;
  }, [points]);

  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={geometry} scale={[1.2, 1.2, 1]} position-z={-0.055}>
        <meshStandardMaterial color="#050506" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh geometry={geometry} scale={[1.1, 1.1, 1]} position-z={0.005}>
        <meshStandardMaterial color="#f4f0e8" roughness={0.58} metalness={0.03} />
      </mesh>
      <mesh geometry={geometry} position-z={0.07}>
        <meshStandardMaterial
          color="#d31132"
          emissive="#3d0010"
          emissiveIntensity={0.16}
          roughness={0.5}
          metalness={0.09}
        />
      </mesh>
    </group>
  );
}

export default function Number23Monument({ radius }) {
  return (
    <group position={[0, -0.06, radius * 0.975]} scale={0.66}>
      <mesh position-z={-0.115}>
        <boxGeometry args={[1.72, 1.18, 0.16, 4, 4, 1]} />
        <meshStandardMaterial color="#2c201a" roughness={0.96} metalness={0} />
      </mesh>
      <mesh position-z={-0.035}>
        <boxGeometry args={[1.58, 1.06, 0.055]} />
        <meshStandardMaterial color="#050507" roughness={0.78} metalness={0.12} />
      </mesh>
      <mesh position-z={0.005}>
        <boxGeometry args={[1.48, 0.98, 0.022]} />
        <meshBasicMaterial color="#a10b25" />
      </mesh>
      <mesh position-z={0.036}>
        <boxGeometry args={[1.39, 0.9, 0.018]} />
        <meshBasicMaterial color="#050506" />
      </mesh>
      <group position={[0.015, 0, 0.145]} scale={0.76}>
        <Digit points={DIGIT_2} x={-0.39} />
        <Digit points={DIGIT_3} x={0.39} />
      </group>
      <pointLight position={[0, 0.04, 0.5]} color="#e83043" intensity={0.6} distance={1.6} decay={2} />
    </group>
  );
}
