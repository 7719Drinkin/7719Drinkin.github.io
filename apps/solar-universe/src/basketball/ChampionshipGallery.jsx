import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Trophy({ position, scale = 1, phase = 0 }) {
  const ball = useRef();
  useFrame(({ clock }) => {
    if (ball.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.75 + phase) * 0.018;
      ball.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.025}>
        <cylinderGeometry args={[0.075, 0.086, 0.05, 24]} />
        <meshStandardMaterial color="#5e431e" roughness={0.38} metalness={0.72} />
      </mesh>
      <mesh position-y={0.065}>
        <cylinderGeometry args={[0.055, 0.068, 0.035, 24]} />
        <meshStandardMaterial color="#d2aa54" roughness={0.24} metalness={0.86} />
      </mesh>

      <group rotation-z={-0.17} position={[0.018, 0.08, 0]}>
        <mesh position-y={0.12}>
          <cylinderGeometry args={[0.018, 0.033, 0.24, 18]} />
          <meshStandardMaterial color="#d8ae57" roughness={0.22} metalness={0.9} />
        </mesh>
        <mesh position={[0.052, 0.235, 0]} rotation-z={-0.58}>
          <cylinderGeometry args={[0.012, 0.018, 0.14, 14]} />
          <meshStandardMaterial color="#d8ae57" roughness={0.22} metalness={0.9} />
        </mesh>
        <group ref={ball} position={[0.105, 0.31, 0]} rotation={[0.2, 0.35, -0.2]}>
          <mesh>
            <sphereGeometry args={[0.092, 28, 20]} />
            <meshStandardMaterial color="#e0b75d" emissive="#3e2508" emissiveIntensity={0.22} roughness={0.31} metalness={0.78} />
          </mesh>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.093, 0.004, 6, 40]} />
            <meshStandardMaterial color="#76531d" roughness={0.55} metalness={0.48} />
          </mesh>
          <mesh rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.093, 0.004, 6, 40]} />
            <meshStandardMaterial color="#76531d" roughness={0.55} metalness={0.48} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function ChampionshipGallery({ radius }) {
  const anchor = useMemo(() => {
    const normal = new THREE.Vector3(-0.74, 0.14, -0.66).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return { position: normal.multiplyScalar(radius + 0.03), quaternion };
  }, [radius]);

  const positions = [
    [-0.22, 0.085, 0.08], [0, 0.085, 0.08], [0.22, 0.085, 0.08],
    [-0.22, 0.08, -0.13], [0, 0.08, -0.13], [0.22, 0.08, -0.13]
  ];

  return (
    <group position={anchor.position.toArray()} quaternion={anchor.quaternion}>
      <mesh position-y={0.035}>
        <cylinderGeometry args={[0.43, 0.48, 0.07, 14]} />
        <meshStandardMaterial color="#4c382c" roughness={0.92} flatShading />
      </mesh>
      <mesh position={[0, 0.18, -0.22]}>
        <boxGeometry args={[0.82, 0.31, 0.055]} />
        <meshStandardMaterial color="#2c211b" roughness={0.84} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.19, -0.188]}>
        <boxGeometry args={[0.68, 0.21, 0.012]} />
        <meshStandardMaterial color="#6e101d" emissive="#280008" emissiveIntensity={0.18} roughness={0.6} />
      </mesh>
      <group position-y={0.075}>
        {positions.map((position, index) => (
          <Trophy key={index} position={position} scale={index < 3 ? 0.72 : 0.64} phase={index * 0.6} />
        ))}
      </group>
      <pointLight position={[0, 0.42, 0.18]} color="#ffd27f" intensity={1.45} distance={2.7} decay={2} />
    </group>
  );
}
