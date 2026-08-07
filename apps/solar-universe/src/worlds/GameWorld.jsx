import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createStylizedTerrain } from './stylizedTerrain.js';

const UP = new THREE.Vector3(0, 1, 0);
const CITADEL_DIRECTION = [0.28, 0.86, 0.42];

function directionFromLatLon(latitudeDegrees, longitudeDegrees) {
  const latitude = THREE.MathUtils.degToRad(latitudeDegrees);
  const longitude = THREE.MathUtils.degToRad(longitudeDegrees);
  const cosLatitude = Math.cos(latitude);
  return [
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    cosLatitude * Math.sin(longitude)
  ];
}

function surfaceTransform(direction, radius, offset = 0) {
  const normal = new THREE.Vector3(...direction).normalize();
  return {
    position: normal.clone().multiplyScalar(radius + offset),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal)
  };
}

function SurfaceAnchor({ direction, radius, offset = 0, rotationY = 0, children }) {
  const transform = useMemo(
    () => surfaceTransform(direction, radius, offset),
    [direction[0], direction[1], direction[2], offset, radius]
  );

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <group rotation-y={rotationY}>{children}</group>
    </group>
  );
}

function StrategyCitadel({ radius, quality }) {
  const s = radius;
  const segments = quality === 'quality' ? 10 : 8;
  const towerPositions = [
    [-0.12, 0.075, -0.12],
    [0.12, 0.075, -0.12],
    [-0.12, 0.075, 0.12],
    [0.12, 0.075, 0.12]
  ];

  return (
    <group>
      <mesh position-y={s * 0.018}>
        <cylinderGeometry args={[s * 0.24, s * 0.27, s * 0.036, 8]} />
        <meshStandardMaterial color="#142b3a" roughness={0.76} metalness={0.14} />
      </mesh>
      <mesh position-y={s * 0.038} rotation-y={Math.PI / 8}>
        <cylinderGeometry args={[s * 0.205, s * 0.215, s * 0.022, 8]} />
        <meshStandardMaterial color="#b79856" roughness={0.48} metalness={0.56} />
      </mesh>

      <mesh position-y={s * 0.155}>
        <cylinderGeometry args={[s * 0.075, s * 0.105, s * 0.25, segments]} />
        <meshStandardMaterial color="#1b4358" roughness={0.62} metalness={0.18} />
      </mesh>
      <mesh position-y={s * 0.295}>
        <octahedronGeometry args={[s * 0.07, 0]} />
        <meshStandardMaterial
          color="#d9c17f"
          emissive="#6d5729"
          emissiveIntensity={0.28}
          roughness={0.34}
          metalness={0.48}
        />
      </mesh>

      {towerPositions.map(([x, y, z], index) => (
        <group key={`${x}-${z}`} position={[s * x, s * y, s * z]}>
          <mesh>
            <cylinderGeometry args={[s * 0.035, s * 0.05, s * 0.15, 6]} />
            <meshStandardMaterial color={index % 2 ? '#173648' : '#214c60'} roughness={0.72} metalness={0.1} />
          </mesh>
          <mesh position-y={s * 0.09}>
            <coneGeometry args={[s * 0.05, s * 0.07, 6]} />
            <meshStandardMaterial color="#a98a4b" roughness={0.5} metalness={0.42} />
          </mesh>
        </group>
      ))}

      <pointLight
        position={[0, s * 0.34, 0]}
        color="#e9cf86"
        intensity={0.24}
        distance={s * 1.1}
        decay={2.2}
      />
    </group>
  );
}

const NODE_DATA = [
  [18, -32, 0.74],
  [-8, 18, 0.22],
  [42, 108, 0.58],
  [-34, 72, 0.88],
  [5, 156, 0.38],
  [28, -142, 0.66],
  [-48, -88, 0.12],
  [56, 34, 0.48]
];

function CommandNodes({ radius, quality }) {
  const nodes = quality === 'quality' ? NODE_DATA : NODE_DATA.filter((_, index) => index % 2 === 0);

  return nodes.map(([latitude, longitude, phase], index) => (
    <SurfaceAnchor
      key={`${latitude}-${longitude}`}
      direction={directionFromLatLon(latitude, longitude)}
      radius={radius}
      offset={radius * 0.016}
      rotationY={phase * Math.PI}
    >
      <group>
        <mesh position-y={radius * 0.018}>
          <cylinderGeometry args={[radius * 0.038, radius * 0.046, radius * 0.036, 6]} />
          <meshStandardMaterial color="#18384b" roughness={0.72} metalness={0.16} />
        </mesh>
        <mesh position-y={radius * 0.052} rotation-y={Math.PI / 6}>
          <cylinderGeometry args={[radius * 0.019, radius * 0.027, radius * 0.035, 6]} />
          <meshStandardMaterial
            color={index % 3 === 0 ? '#d7bf79' : '#6eafc4'}
            emissive={index % 3 === 0 ? '#59461f' : '#244d61'}
            emissiveIntensity={0.22}
            roughness={0.4}
            metalness={0.38}
          />
        </mesh>
      </group>
    </SurfaceAnchor>
  ));
}

function TacticalLattice({ radius, quality }) {
  const spin = useRef();

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.018;
  });

  const segments = quality === 'quality' ? 160 : 80;
  return (
    <group ref={spin}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius * 1.035, radius * 0.0048, 5, segments]} />
        <meshBasicMaterial color="#d0b46d" transparent opacity={0.42} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.72, 0.18, 0.36]}>
        <torusGeometry args={[radius * 1.04, radius * 0.0036, 5, segments]} />
        <meshBasicMaterial color="#73b6ca" transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <mesh rotation={[1.18, -0.48, -0.2]}>
        <torusGeometry args={[radius * 1.045, radius * 0.0032, 5, segments]} />
        <meshBasicMaterial color="#d0b46d" transparent opacity={0.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 3.5);
    vec3 color = mix(vec3(0.18, 0.43, 0.58), vec3(0.78, 0.65, 0.35), rim);
    gl_FragColor = vec4(color, rim * 0.18);
  }
`;

function GameAtmosphere({ radius, quality }) {
  return (
    <mesh scale={1.055} renderOrder={8}>
      <sphereGeometry args={[radius, quality === 'quality' ? 72 : 40, quality === 'quality' ? 48 : 28]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX}
        fragmentShader={ATMOSPHERE_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

const GAME_FEATURES = [
  {
    direction: CITADEL_DIRECTION,
    radius: 0.34,
    softness: 0.17,
    elevation: 0.012,
    color: '#1e4f66',
    colorStrength: 0.74,
    rimColor: '#aa8b4c',
    rimColorStrength: 0.3
  },
  {
    direction: [-0.58, 0.18, 0.8],
    radius: 0.55,
    softness: 0.2,
    elevation: 0.004,
    color: '#17394b',
    colorStrength: 0.64
  },
  {
    direction: [0.38, -0.58, -0.72],
    radius: 0.48,
    softness: 0.19,
    elevation: -0.008,
    color: '#0b2433',
    colorStrength: 0.7
  }
];

const GAME_BANDS = [
  {
    normal: [0.2, 0.96, 0.18],
    width: 0.052,
    softness: 0.035,
    elevation: 0.004,
    frequency: 14,
    color: '#b99b57',
    colorStrength: 0.5
  },
  {
    normal: [-0.74, 0.22, 0.64],
    width: 0.035,
    softness: 0.03,
    elevation: 0.003,
    frequency: 18,
    color: '#4f8ca2',
    colorStrength: 0.32
  }
];

const GAME_FLATTEN = [
  {
    direction: CITADEL_DIRECTION,
    mode: 'plane',
    radius: 0.25,
    softness: 0.15,
    target: 0.006,
    strength: 1,
    color: '#17384a',
    colorStrength: 0.42
  }
];

export default function GameWorld({ radius, quality }) {
  const geometry = useMemo(() => createStylizedTerrain({
    radius,
    detail: quality === 'quality' ? 5 : 4,
    seed: 77,
    relief: 0.56,
    features: GAME_FEATURES,
    bands: GAME_BANDS,
    flattenZones: GAME_FLATTEN,
    palette: {
      low: '#071a27',
      mid: '#102f42',
      high: '#285a6d',
      accent: '#315f72',
      accent2: '#8c7848',
      shadowTint: '#050f18',
      highlightTint: '#8fbdc5'
    }
  }), [quality, radius]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.78} metalness={0.06} dithering />
      </mesh>

      <TacticalLattice radius={radius} quality={quality} />
      <CommandNodes radius={radius} quality={quality} />

      <SurfaceAnchor
        direction={CITADEL_DIRECTION}
        radius={radius}
        offset={radius * 0.018}
        rotationY={-0.32}
      >
        <StrategyCitadel radius={radius} quality={quality} />
      </SurfaceAnchor>

      <GameAtmosphere radius={radius} quality={quality} />
    </group>
  );
}
