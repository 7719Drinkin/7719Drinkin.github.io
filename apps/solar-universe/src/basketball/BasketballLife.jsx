import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function surfaceAnchor(direction, radius, offset = 0.02) {
  const normal = new THREE.Vector3(...direction).normalize();
  return {
    position: normal.clone().multiplyScalar(radius + offset),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal)
  };
}

function ParkCluster({ direction, radius, scale = 1, tree = false, golden = false }) {
  const anchor = useMemo(() => surfaceAnchor(direction, radius), [direction, radius]);
  const blades = useMemo(() => [
    [-0.055, 0.01, -0.025, -0.24, 0.88],
    [-0.018, 0.012, 0.018, 0.12, 1.1],
    [0.022, 0.008, -0.018, -0.08, 0.96],
    [0.054, 0.011, 0.026, 0.2, 0.78],
    [0.0, 0.008, -0.055, -0.18, 0.72]
  ], []);

  const groundColor = golden ? '#8f8547' : '#315a3d';
  const lightColor = golden ? '#c4a75d' : '#557d50';

  return (
    <group position={anchor.position.toArray()} quaternion={anchor.quaternion} scale={scale}>
      <mesh position-y={0.004} scale={[1.18, 1, 0.88]}>
        <circleGeometry args={[0.11, 18]} />
        <meshStandardMaterial color={groundColor} roughness={0.96} side={THREE.DoubleSide} />
      </mesh>

      {blades.map(([x, y, z, rotation, height], index) => (
        <mesh key={index} position={[x, y + 0.035 * height, z]} rotation-z={rotation}>
          <coneGeometry args={[0.012, 0.072 * height, 5]} />
          <meshStandardMaterial
            color={index % 2 ? lightColor : groundColor}
            roughness={0.92}
          />
        </mesh>
      ))}

      {tree && (
        <group position={[-0.025, 0.015, 0.01]}>
          <mesh position-y={0.065}>
            <cylinderGeometry args={[0.012, 0.018, 0.13, 7]} />
            <meshStandardMaterial color="#4b3324" roughness={0.96} />
          </mesh>
          <mesh position-y={0.145} scale={[0.9, 1.08, 0.86]}>
            <icosahedronGeometry args={[0.075, 1]} />
            <meshStandardMaterial color={golden ? '#8f8a48' : '#3e7049'} roughness={0.9} />
          </mesh>
          <mesh position={[0.038, 0.128, 0.018]} scale={0.62}>
            <icosahedronGeometry args={[0.062, 1]} />
            <meshStandardMaterial color={golden ? '#b19b55' : '#5a8656'} roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function TrainingTrail({ radius, quality }) {
  const markers = useMemo(() => {
    const count = quality === 'quality' ? 26 : 16;
    return Array.from({ length: count }, (_, index) => {
      const angle = index / count * Math.PI * 2;
      const latitude = -0.13 + Math.sin(angle * 3 + 0.4) * 0.055;
      const horizontal = Math.cos(latitude);
      return {
        angle,
        direction: [
          Math.cos(angle) * horizontal,
          Math.sin(latitude),
          Math.sin(angle) * horizontal
        ],
        lamp: index % 4 === 0
      };
    });
  }, [quality]);

  return (
    <group>
      {markers.map((marker, index) => {
        const anchor = surfaceAnchor(marker.direction, radius, 0.028);
        return (
          <group
            key={index}
            position={anchor.position.toArray()}
            quaternion={anchor.quaternion}
            rotation-y={marker.angle + Math.PI / 2}
          >
            <mesh position-y={0.006}>
              <boxGeometry args={[0.105, 0.008, 0.018]} />
              <meshStandardMaterial
                color={index % 3 === 0 ? '#e6d5ac' : '#a95a40'}
                roughness={0.7}
              />
            </mesh>
            {marker.lamp && (
              <group position={[0, 0.025, 0.035]}>
                <mesh position-y={0.025}>
                  <cylinderGeometry args={[0.004, 0.006, 0.05, 6]} />
                  <meshStandardMaterial color="#3a3029" roughness={0.82} />
                </mesh>
                <mesh position-y={0.055}>
                  <sphereGeometry args={[0.012, 10, 7]} />
                  <meshStandardMaterial
                    color="#ffe2a1"
                    emissive="#ff9b35"
                    emissiveIntensity={1.5}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

function CourtBanners({ radius }) {
  const banners = useRef([]);
  const positions = [
    [-0.67, radius * 1.015, -0.18, '#b51f32'],
    [0.67, radius * 1.015, 0.17, '#e0c17d'],
    [-0.62, radius * 1.015, 0.28, '#496f50']
  ];

  useFrame(({ clock }) => {
    banners.current.forEach((banner, index) => {
      if (!banner) return;
      banner.rotation.y = Math.sin(clock.elapsedTime * 1.25 + index * 1.7) * 0.18;
      banner.rotation.z = Math.sin(clock.elapsedTime * 0.8 + index) * 0.035;
    });
  });

  return (
    <group>
      {positions.map(([x, y, z, color], index) => (
        <group key={index} position={[x, y, z]}>
          <mesh position-y={0.17}>
            <cylinderGeometry args={[0.008, 0.011, 0.34, 7]} />
            <meshStandardMaterial color="#332b27" roughness={0.8} metalness={0.22} />
          </mesh>
          <mesh
            ref={(mesh) => { banners.current[index] = mesh; }}
            position={[0.065, 0.27, 0]}
          >
            <planeGeometry args={[0.13, 0.075, 4, 2]} />
            <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function BasketballLife({ radius, quality }) {
  const parkClusters = [
    { direction: [-0.86, 0.22, 0.46], scale: 1.1, tree: true },
    { direction: [-0.77, 0.08, 0.63], scale: 0.92 },
    { direction: [-0.66, -0.12, 0.74], scale: 1.0, tree: true },
    { direction: [-0.9, -0.08, 0.29], scale: 0.82 },
    { direction: [-0.56, 0.38, 0.73], scale: 0.88 },
    { direction: [-0.69, 0.46, 0.43], scale: 0.76, tree: true },
    { direction: [-0.44, -0.28, 0.85], scale: 0.78 },
    { direction: [-0.84, -0.31, 0.42], scale: 0.9, tree: quality === 'quality' }
  ];

  const goldenClusters = [
    { direction: [0.18, 0.54, 0.82], scale: 0.92, tree: true },
    { direction: [0.36, 0.42, 0.83], scale: 0.72 },
    { direction: [0.05, 0.37, 0.93], scale: 0.8 },
    { direction: [0.46, 0.22, 0.86], scale: 0.7, tree: quality === 'quality' }
  ];

  return (
    <group>
      {parkClusters.map((cluster, index) => (
        <ParkCluster key={`park-${index}`} radius={radius} {...cluster} />
      ))}
      {goldenClusters.map((cluster, index) => (
        <ParkCluster key={`gold-${index}`} radius={radius} golden {...cluster} />
      ))}
      <TrainingTrail radius={radius} quality={quality} />
      <CourtBanners radius={radius} />
    </group>
  );
}
