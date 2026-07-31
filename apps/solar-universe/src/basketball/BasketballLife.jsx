import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function surfaceAnchor(direction, radius, offset = 0.016) {
  const normal = new THREE.Vector3(...direction).normalize();
  return {
    position: normal.clone().multiplyScalar(radius + offset),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal)
  };
}

function ParkCluster({ direction, radius, scale = 1, tree = false, golden = false }) {
  const anchor = useMemo(() => surfaceAnchor(direction, radius), [direction, radius]);
  const blades = useMemo(() => [
    [-0.042, -0.02, -0.24, 0.88],
    [-0.014, 0.014, 0.12, 1.1],
    [0.018, -0.014, -0.08, 0.96],
    [0.041, 0.02, 0.2, 0.78],
    [0, -0.042, -0.18, 0.72]
  ], []);

  const groundColor = golden ? '#8f8547' : '#315a3d';
  const lightColor = golden ? '#c4a75d' : '#557d50';

  return (
    <group position={anchor.position.toArray()} quaternion={anchor.quaternion} scale={scale}>
      <mesh position-y={0.003} rotation-x={-Math.PI / 2} scale={[1.16, 0.86, 1]}>
        <circleGeometry args={[0.082, 16]} />
        <meshStandardMaterial color={groundColor} roughness={0.96} side={THREE.DoubleSide} />
      </mesh>

      {blades.map(([x, z, rotation, height], index) => (
        <mesh key={index} position={[x, 0.027 * height, z]} rotation-z={rotation}>
          <coneGeometry args={[0.009, 0.054 * height, 5]} />
          <meshStandardMaterial color={index % 2 ? lightColor : groundColor} roughness={0.92} />
        </mesh>
      ))}

      {tree && (
        <group position={[-0.018, 0.011, 0.008]} scale={0.78}>
          <mesh position-y={0.065}>
            <cylinderGeometry args={[0.011, 0.016, 0.13, 7]} />
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

function LakePatch({ direction, radius, scale = 1 }) {
  const anchor = useMemo(() => surfaceAnchor(direction, radius, 0.018), [direction, radius]);
  return (
    <group position={anchor.position.toArray()} quaternion={anchor.quaternion} scale={scale}>
      <mesh rotation-x={-Math.PI / 2} scale={[1.35, 0.82, 1]}>
        <circleGeometry args={[0.092, 24]} />
        <meshStandardMaterial
          color="#275d6a"
          emissive="#07171c"
          emissiveIntensity={0.08}
          roughness={0.36}
          metalness={0.04}
        />
      </mesh>
      <mesh position-y={0.002} rotation-x={-Math.PI / 2} scale={[0.93, 0.62, 1]}>
        <circleGeometry args={[0.086, 24]} />
        <meshStandardMaterial color="#3d8490" roughness={0.28} metalness={0.03} />
      </mesh>
    </group>
  );
}

function TrainingTrail({ radius, quality }) {
  const markers = useMemo(() => {
    const count = quality === 'quality' ? 30 : 20;
    return Array.from({ length: count }, (_, index) => {
      const angle = index / count * Math.PI * 2;
      const monumentGap = angle > 0.72 && angle < 2.38;
      if (monumentGap) return null;
      const latitude = -0.15 + Math.sin(angle * 3 + 0.4) * 0.045;
      const horizontal = Math.cos(latitude);
      return {
        angle,
        direction: [
          Math.cos(angle) * horizontal,
          Math.sin(latitude),
          Math.sin(angle) * horizontal
        ],
        lamp: index % 6 === 0
      };
    }).filter(Boolean);
  }, [quality]);

  return (
    <group>
      {markers.map((marker, index) => {
        const anchor = surfaceAnchor(marker.direction, radius, 0.021);
        return (
          <group
            key={index}
            position={anchor.position.toArray()}
            quaternion={anchor.quaternion}
            rotation-y={marker.angle + Math.PI / 2}
          >
            <mesh position-y={0.004}>
              <boxGeometry args={[0.072, 0.006, 0.012]} />
              <meshStandardMaterial color={index % 3 === 0 ? '#e6d5ac' : '#a95a40'} roughness={0.72} />
            </mesh>
            {marker.lamp && (
              <group position={[0, 0.018, 0.026]} scale={0.82}>
                <mesh position-y={0.025}>
                  <cylinderGeometry args={[0.004, 0.006, 0.05, 6]} />
                  <meshStandardMaterial color="#3a3029" roughness={0.82} />
                </mesh>
                <mesh position-y={0.055}>
                  <sphereGeometry args={[0.011, 9, 6]} />
                  <meshStandardMaterial
                    color="#ffe2a1"
                    emissive="#ff9b35"
                    emissiveIntensity={1.35}
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
    [-0.56, radius * 1.02, -0.16, '#b51f32'],
    [0.56, radius * 1.02, 0.15, '#e0c17d'],
    [-0.51, radius * 1.02, 0.24, '#496f50']
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
        <group key={index} position={[x, y, z]} scale={0.78}>
          <mesh position-y={0.14}>
            <cylinderGeometry args={[0.008, 0.011, 0.28, 7]} />
            <meshStandardMaterial color="#332b27" roughness={0.8} metalness={0.22} />
          </mesh>
          <mesh ref={(mesh) => { banners.current[index] = mesh; }} position={[0.05, 0.215, 0]}>
            <planeGeometry args={[0.1, 0.058, 4, 2]} />
            <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function BasketballLife({ radius, quality }) {
  const parkClusters = [
    { direction: [-0.9, 0.22, 0.38], scale: 0.82, tree: true },
    { direction: [-0.84, 0.03, 0.54], scale: 0.7 },
    { direction: [-0.72, -0.18, 0.67], scale: 0.76, tree: true },
    { direction: [-0.96, -0.08, 0.22], scale: 0.66 },
    { direction: [-0.65, 0.42, 0.63], scale: 0.68 },
    { direction: [-0.88, 0.38, 0.28], scale: 0.62, tree: quality === 'quality' }
  ];

  const goldenClusters = [
    { direction: [0.16, 0.58, 0.8], scale: 0.72, tree: true },
    { direction: [0.34, 0.46, 0.82], scale: 0.58 },
    { direction: [0.02, 0.42, 0.91], scale: 0.62 }
  ];

  return (
    <group>
      {parkClusters.map((cluster, index) => (
        <ParkCluster key={`park-${index}`} radius={radius} {...cluster} />
      ))}
      {goldenClusters.map((cluster, index) => (
        <ParkCluster key={`gold-${index}`} radius={radius} golden {...cluster} />
      ))}
      <LakePatch direction={[-0.1, -0.14, -0.98]} radius={radius} scale={1.05} />
      <LakePatch direction={[-0.32, -0.05, -0.94]} radius={radius} scale={0.62} />
      <TrainingTrail radius={radius} quality={quality} />
      <CourtBanners radius={radius} />
    </group>
  );
}
