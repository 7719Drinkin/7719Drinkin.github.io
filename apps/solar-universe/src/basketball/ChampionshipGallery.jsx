import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Trophy({ position, scale = 1, phase = 0 }) {
  const ball = useRef();
  useFrame(({ clock }) => {
    if (ball.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.75 + phase) * 0.009;
      ball.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.025}>
        <cylinderGeometry args={[0.078, 0.09, 0.05, 24]} />
        <meshStandardMaterial color="#4b3517" roughness={0.4} metalness={0.76} />
      </mesh>
      <mesh position-y={0.066}>
        <cylinderGeometry args={[0.057, 0.07, 0.038, 24]} />
        <meshStandardMaterial color="#d4aa50" roughness={0.22} metalness={0.9} />
      </mesh>

      <group rotation-z={-0.18} position={[0.018, 0.084, 0]}>
        <mesh position-y={0.125}>
          <cylinderGeometry args={[0.017, 0.034, 0.25, 18]} />
          <meshStandardMaterial color="#dcb45e" roughness={0.2} metalness={0.92} />
        </mesh>
        <mesh position={[0.052, 0.242, 0]} rotation-z={-0.6}>
          <cylinderGeometry args={[0.011, 0.018, 0.145, 14]} />
          <meshStandardMaterial color="#dcb45e" roughness={0.2} metalness={0.92} />
        </mesh>
        <group ref={ball} position={[0.108, 0.322, 0]} rotation={[0.18, 0.38, -0.22]}>
          <mesh>
            <sphereGeometry args={[0.094, 26, 18]} />
            <meshStandardMaterial color="#e3bb63" emissive="#301b05" emissiveIntensity={0.1} roughness={0.29} metalness={0.82} />
          </mesh>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.095, 0.004, 6, 36]} />
            <meshStandardMaterial color="#72501c" roughness={0.54} metalness={0.5} />
          </mesh>
          <mesh rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.095, 0.004, 6, 36]} />
            <meshStandardMaterial color="#72501c" roughness={0.54} metalness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function ChampionshipGallery({ radius }) {
  const anchor = useMemo(() => {
    const southPole = new THREE.Vector3(0, -1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), southPole);
    return {
      position: southPole.clone().multiplyScalar(radius + 0.035),
      quaternion
    };
  }, [radius]);

  const positions = [
    [-0.22, 0.086, 0.085], [0, 0.086, 0.085], [0.22, 0.086, 0.085],
    [-0.22, 0.08, -0.125], [0, 0.08, -0.125], [0.22, 0.08, -0.125]
  ];

  return (
    <group position={anchor.position.toArray()} quaternion={anchor.quaternion}>
      <group rotation-y={0.12} scale={0.67}>
        <mesh position-y={0.034}>
          <cylinderGeometry args={[0.45, 0.49, 0.068, 24]} />
          <meshStandardMaterial color="#443126" roughness={0.9} />
        </mesh>
        <mesh position-y={0.078}>
          <cylinderGeometry args={[0.38, 0.43, 0.032, 24]} />
          <meshStandardMaterial color="#201814" roughness={0.82} metalness={0.12} />
        </mesh>
        <mesh position={[0, 0.188, -0.22]}>
          <boxGeometry args={[0.82, 0.31, 0.055]} />
          <meshStandardMaterial color="#251b16" roughness={0.86} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.193, -0.19]}>
          <boxGeometry args={[0.68, 0.21, 0.012]} />
          <meshStandardMaterial color="#711020" emissive="#210006" emissiveIntensity={0.08} roughness={0.62} />
        </mesh>
        <group position-y={0.073}>
          {positions.map((position, index) => (
            <Trophy key={index} position={position} scale={index < 3 ? 0.7 : 0.62} phase={index * 0.6} />
          ))}
        </group>
        <pointLight position={[0, 0.4, 0.18]} color="#ffd17a" intensity={0.48} distance={1.65} decay={2} />
      </group>
    </group>
  );
}
