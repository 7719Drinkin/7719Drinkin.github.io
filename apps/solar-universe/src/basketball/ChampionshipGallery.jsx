import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Trophy({ position, scale = 1, phase = 0 }) {
  const ball = useRef();
  useFrame(({ clock }) => {
    if (ball.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.75 + phase) * 0.012;
      ball.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.025}>
        <cylinderGeometry args={[0.078, 0.09, 0.05, 28]} />
        <meshStandardMaterial color="#4b3517" roughness={0.4} metalness={0.76} />
      </mesh>
      <mesh position-y={0.066}>
        <cylinderGeometry args={[0.057, 0.07, 0.038, 28]} />
        <meshStandardMaterial color="#d4aa50" roughness={0.22} metalness={0.9} />
      </mesh>

      <group rotation-z={-0.18} position={[0.018, 0.084, 0]}>
        <mesh position-y={0.125}>
          <cylinderGeometry args={[0.017, 0.034, 0.25, 20]} />
          <meshStandardMaterial color="#dcb45e" roughness={0.2} metalness={0.92} />
        </mesh>
        <mesh position={[0.052, 0.242, 0]} rotation-z={-0.6}>
          <cylinderGeometry args={[0.011, 0.018, 0.145, 16]} />
          <meshStandardMaterial color="#dcb45e" roughness={0.2} metalness={0.92} />
        </mesh>
        <group ref={ball} position={[0.108, 0.322, 0]} rotation={[0.18, 0.38, -0.22]}>
          <mesh>
            <sphereGeometry args={[0.094, 32, 22]} />
            <meshStandardMaterial color="#e3bb63" emissive="#301b05" emissiveIntensity={0.14} roughness={0.29} metalness={0.82} />
          </mesh>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.095, 0.004, 6, 44]} />
            <meshStandardMaterial color="#72501c" roughness={0.54} metalness={0.5} />
          </mesh>
          <mesh rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.095, 0.004, 6, 44]} />
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
      position: southPole.clone().multiplyScalar(radius + 0.045),
      quaternion
    };
  }, [radius]);

  const positions = [
    [-0.24, 0.088, 0.09], [0, 0.088, 0.09], [0.24, 0.088, 0.09],
    [-0.24, 0.082, -0.14], [0, 0.082, -0.14], [0.24, 0.082, -0.14]
  ];

  return (
    <group position={anchor.position.toArray()} quaternion={anchor.quaternion}>
      <group rotation-y={0.12} scale={0.84}>
        <mesh position-y={0.036}>
          <cylinderGeometry args={[0.47, 0.52, 0.075, 24]} />
          <meshStandardMaterial color="#443126" roughness={0.9} />
        </mesh>
        <mesh position-y={0.084}>
          <cylinderGeometry args={[0.4, 0.45, 0.035, 24]} />
          <meshStandardMaterial color="#201814" roughness={0.82} metalness={0.12} />
        </mesh>
        <mesh position={[0, 0.2, -0.235]}>
          <boxGeometry args={[0.88, 0.34, 0.06]} />
          <meshStandardMaterial color="#251b16" roughness={0.86} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.205, -0.202]}>
          <boxGeometry args={[0.73, 0.23, 0.014]} />
          <meshStandardMaterial color="#711020" emissive="#210006" emissiveIntensity={0.1} roughness={0.62} />
        </mesh>
        <group position-y={0.078}>
          {positions.map((position, index) => (
            <Trophy key={index} position={position} scale={index < 3 ? 0.76 : 0.68} phase={index * 0.6} />
          ))}
        </group>
        <pointLight position={[0, 0.45, 0.2]} color="#ffd17a" intensity={0.7} distance={2.1} decay={2} />
      </group>
    </group>
  );
}
