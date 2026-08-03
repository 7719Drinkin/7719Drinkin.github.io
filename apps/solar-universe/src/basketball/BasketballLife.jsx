import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const LAKE_POINTS = [
  [-1.0, -0.08], [-0.84, 0.34], [-0.53, 0.61], [-0.17, 0.54],
  [0.13, 0.69], [0.5, 0.55], [0.86, 0.28], [0.96, -0.08],
  [0.7, -0.39], [0.31, -0.55], [-0.08, -0.47], [-0.47, -0.64],
  [-0.82, -0.42]
];

function surfaceAnchor(direction, radius, offset = 0.016) {
  const normal = new THREE.Vector3(...direction).normalize();
  return {
    position: normal.clone().multiplyScalar(radius + offset),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal)
  };
}

function createShapeGeometry(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 4);
  geometry.computeVertexNormals();
  return geometry;
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

function LakePatch({ direction, radius, scale = 1, phase = 0 }) {
  const anchor = useMemo(() => surfaceAnchor(direction, radius, 0.015), [direction, radius]);
  const geometry = useMemo(() => createShapeGeometry(LAKE_POINTS), []);
  const shallow = useRef();
  const deep = useRef();
  const glint = useRef();
  const shallowMaterial = useRef();

  useFrame(({ clock }) => {
    const time = clock.elapsedTime + phase;
    const wave = Math.sin(time * 0.72) * 0.5 + 0.5;
    if (shallow.current) {
      shallow.current.scale.set(
        0.102 * (1 + wave * 0.012),
        0.078 * (1 - wave * 0.008),
        1
      );
    }
    if (deep.current) {
      const drift = Math.sin(time * 0.47) * 0.006;
      deep.current.position.x = drift;
      deep.current.position.z = -drift * 0.5;
    }
    if (glint.current) {
      glint.current.position.x = -0.025 + wave * 0.05;
      glint.current.material.opacity = 0.035 + wave * 0.045;
    }
    if (shallowMaterial.current) shallowMaterial.current.roughness = 0.25 + wave * 0.08;
  });

  return (
    <group position={anchor.position.toArray()} quaternion={anchor.quaternion} scale={scale}>
      <mesh geometry={geometry} rotation-x={-Math.PI / 2} scale={[0.128, 0.097, 1]}>
        <meshStandardMaterial color="#718263" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        ref={shallow}
        geometry={geometry}
        position-y={0.004}
        rotation-x={-Math.PI / 2}
        scale={[0.102, 0.078, 1]}
      >
        <meshPhysicalMaterial
          ref={shallowMaterial}
          color="#3f8890"
          roughness={0.3}
          metalness={0}
          clearcoat={0.72}
          clearcoatRoughness={0.2}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={deep}
        geometry={geometry}
        position-y={0.006}
        rotation-x={-Math.PI / 2}
        scale={[0.061, 0.043, 1]}
      >
        <meshPhysicalMaterial
          color="#164757"
          roughness={0.2}
          metalness={0.01}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={glint} position={[-0.025, 0.009, 0]} rotation-x={-Math.PI / 2} scale={[1.4, 0.42, 1]}>
        <circleGeometry args={[0.022, 20]} />
        <meshBasicMaterial
          color="#d8f2df"
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function CourtBanners({ radius }) {
  const banners = useRef([]);
  const positions = [
    [-0.48, radius * 1.01, -0.14, '#b51f32'],
    [0.48, radius * 1.01, 0.13, '#e0c17d']
  ];

  useFrame(({ clock }) => {
    banners.current.forEach((banner, index) => {
      if (!banner) return;
      banner.rotation.y = Math.sin(clock.elapsedTime * 1.25 + index * 1.7) * 0.16;
      banner.rotation.z = Math.sin(clock.elapsedTime * 0.8 + index) * 0.03;
    });
  });

  return (
    <group>
      {positions.map(([x, y, z, color], index) => (
        <group key={index} position={[x, y, z]} scale={0.7}>
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
    { direction: [-0.9, 0.22, 0.38], scale: 0.72, tree: true },
    { direction: [-0.84, 0.03, 0.54], scale: 0.61 },
    { direction: [-0.72, -0.18, 0.67], scale: 0.66, tree: true },
    { direction: [-0.96, -0.08, 0.22], scale: 0.57 },
    { direction: [-0.65, 0.42, 0.63], scale: 0.58 },
    { direction: [-0.88, 0.38, 0.28], scale: 0.53, tree: quality === 'quality' }
  ];

  const goldenClusters = [
    { direction: [0.16, 0.58, 0.8], scale: 0.61, tree: true },
    { direction: [0.34, 0.46, 0.82], scale: 0.5 },
    { direction: [0.02, 0.42, 0.91], scale: 0.53 }
  ];

  return (
    <group>
      {parkClusters.map((cluster, index) => (
        <ParkCluster key={`park-${index}`} radius={radius} {...cluster} />
      ))}
      {goldenClusters.map((cluster, index) => (
        <ParkCluster key={`gold-${index}`} radius={radius} golden {...cluster} />
      ))}
      <LakePatch direction={[-0.1, -0.14, -0.98]} radius={radius} scale={0.86} phase={0} />
      <LakePatch direction={[-0.32, -0.05, -0.94]} radius={radius} scale={0.52} phase={2.4} />
      <CourtBanners radius={radius} />
    </group>
  );
}
