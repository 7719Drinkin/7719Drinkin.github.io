import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createStylizedTerrain } from './stylizedTerrain.js';

const UP = new THREE.Vector3(0, 1, 0);
const PAVILION_DIRECTION = [-0.26, 0.91, 0.31];

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

function MemoryPavilion({ radius }) {
  const s = radius;
  return (
    <group>
      <mesh position-y={s * 0.015}>
        <cylinderGeometry args={[s * 0.22, s * 0.24, s * 0.03, 12]} />
        <meshStandardMaterial color="#203140" roughness={0.86} metalness={0.02} />
      </mesh>
      <mesh position-y={s * 0.034}>
        <cylinderGeometry args={[s * 0.18, s * 0.19, s * 0.018, 12]} />
        <meshStandardMaterial color="#c6af78" roughness={0.52} metalness={0.28} />
      </mesh>

      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`${x}-${z}`} position={[x * s * 0.12, s * 0.14, z * s * 0.07]}>
          <cylinderGeometry args={[s * 0.012, s * 0.016, s * 0.24, 8]} />
          <meshStandardMaterial color="#e6dfcf" roughness={0.76} metalness={0.02} />
        </mesh>
      )))}

      <mesh position-y={s * 0.267}>
        <boxGeometry args={[s * 0.34, s * 0.025, s * 0.21]} />
        <meshStandardMaterial color="#d6c8aa" roughness={0.8} metalness={0.02} />
      </mesh>
      <mesh position-y={s * 0.284} rotation-y={Math.PI / 4}>
        <boxGeometry args={[s * 0.245, s * 0.018, s * 0.245]} />
        <meshStandardMaterial color="#9a8251" roughness={0.56} metalness={0.22} />
      </mesh>

      <mesh position={[0, s * 0.145, s * 0.085]}>
        <planeGeometry args={[s * 0.14, s * 0.18]} />
        <meshStandardMaterial
          color="#f0eadc"
          emissive="#7b6740"
          emissiveIntensity={0.11}
          roughness={0.86}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[0.035, 0.067, 0.099].map((y) => (
        <mesh key={y} position={[0, s * (0.145 + y - 0.067), s * 0.087]}>
          <boxGeometry args={[s * 0.085, s * 0.003, s * 0.002]} />
          <meshBasicMaterial color="#927e59" transparent opacity={0.55} />
        </mesh>
      ))}

      <pointLight
        position={[0, s * 0.22, s * 0.08]}
        color="#f2dfab"
        intensity={0.2}
        distance={s * 0.9}
        decay={2.2}
      />
    </group>
  );
}

const MEMORY_LIGHTS = [
  [24, -24],
  [-12, 38],
  [44, 116],
  [-38, 92],
  [7, 164],
  [31, -138],
  [-48, -72]
];

function MemoryLights({ radius, quality }) {
  const lights = quality === 'quality' ? MEMORY_LIGHTS : MEMORY_LIGHTS.filter((_, index) => index % 2 === 0);
  return lights.map(([latitude, longitude], index) => (
    <SurfaceAnchor
      key={`${latitude}-${longitude}`}
      direction={directionFromLatLon(latitude, longitude)}
      radius={radius}
      offset={radius * 0.018}
      rotationY={index * 0.51}
    >
      <group>
        <mesh position-y={radius * 0.02}>
          <cylinderGeometry args={[radius * 0.012, radius * 0.016, radius * 0.04, 8]} />
          <meshStandardMaterial color="#7f735d" roughness={0.78} metalness={0.1} />
        </mesh>
        <mesh position-y={radius * 0.052} scale={[1, 0.62, 1]}>
          <octahedronGeometry args={[radius * 0.022, 0]} />
          <meshStandardMaterial
            color={index % 3 === 1 ? '#afc5d4' : '#f0dfb5'}
            emissive={index % 3 === 1 ? '#354e5d' : '#756038'}
            emissiveIntensity={0.24}
            roughness={0.4}
          />
        </mesh>
      </group>
    </SurfaceAnchor>
  ));
}

function GoldSeams({ radius, quality }) {
  const segments = quality === 'quality' ? 192 : 92;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0.12]}>
        <torusGeometry args={[radius * 1.022, radius * 0.0032, 5, segments]} />
        <meshBasicMaterial color="#d0b97f" transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.76, 0.28, -0.42]}>
        <torusGeometry args={[radius * 1.026, radius * 0.0027, 5, segments]} />
        <meshBasicMaterial color="#c6d2d8" transparent opacity={0.2} toneMapped={false} />
      </mesh>
      <mesh rotation={[1.18, -0.42, 0.36]}>
        <torusGeometry args={[radius * 1.03, radius * 0.0025, 5, segments]} />
        <meshBasicMaterial color="#d0b97f" transparent opacity={0.16} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FloatingFolios({ radius, quality }) {
  const group = useRef();
  const count = quality === 'quality' ? 11 : 6;
  const fragments = useMemo(() => Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2 + (index % 3) * 0.13;
    const orbitRadius = radius * (1.36 + (index % 4) * 0.045);
    return {
      position: [
        Math.cos(angle) * orbitRadius,
        Math.sin(angle * 1.7) * radius * 0.25,
        Math.sin(angle) * orbitRadius
      ],
      rotation: [
        -0.4 + index * 0.17,
        angle + 0.5,
        -0.28 + (index % 4) * 0.19
      ],
      scale: radius * (0.07 + (index % 3) * 0.014),
      pale: index % 4 !== 1
    };
  }), [count, radius]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.026;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.16) * 0.035;
  });

  return (
    <group ref={group}>
      {fragments.map((fragment, index) => (
        <group key={index} position={fragment.position} rotation={fragment.rotation}>
          <mesh scale={[fragment.scale * 1.25, fragment.scale * 0.72, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial
              color={fragment.pale ? '#e8e2d6' : '#9cafbd'}
              roughness={0.9}
              side={THREE.DoubleSide}
              transparent
              opacity={0.78}
            />
          </mesh>
          {fragment.pale && (
            <mesh position={[0, 0, 0.002]} scale={[fragment.scale * 0.72, fragment.scale * 0.015, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#a68d5d" transparent opacity={0.45} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
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
    float rim = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 3.15);
    vec3 color = mix(vec3(0.45, 0.58, 0.67), vec3(0.82, 0.72, 0.49), rim * 0.8);
    gl_FragColor = vec4(color, rim * 0.14);
  }
`;

function AnimeAtmosphere({ radius, quality }) {
  return (
    <mesh scale={1.06} renderOrder={8}>
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

const ANIME_FEATURES = [
  {
    direction: PAVILION_DIRECTION,
    radius: 0.34,
    softness: 0.18,
    elevation: 0.008,
    color: '#53697a',
    colorStrength: 0.56,
    rimColor: '#c9b378',
    rimColorStrength: 0.24
  },
  {
    direction: [0.66, 0.16, -0.73],
    radius: 0.54,
    softness: 0.22,
    elevation: -0.006,
    color: '#26394a',
    colorStrength: 0.58
  },
  {
    direction: [-0.68, -0.36, -0.64],
    radius: 0.5,
    softness: 0.2,
    elevation: 0.003,
    color: '#7b7780',
    colorStrength: 0.28
  }
];

const ANIME_BANDS = [
  {
    normal: [0.12, 0.98, -0.14],
    width: 0.055,
    softness: 0.052,
    elevation: 0.002,
    frequency: 9,
    color: '#c4b17e',
    colorStrength: 0.24
  },
  {
    normal: [-0.7, 0.18, 0.69],
    width: 0.042,
    softness: 0.048,
    elevation: 0.002,
    frequency: 12,
    color: '#8099aa',
    colorStrength: 0.22
  }
];

const ANIME_FLATTEN = [
  {
    direction: PAVILION_DIRECTION,
    mode: 'plane',
    radius: 0.24,
    softness: 0.15,
    target: 0.004,
    strength: 1,
    color: '#445867',
    colorStrength: 0.32
  }
];

export default function AnimeWorld({ radius, quality }) {
  const geometry = useMemo(() => createStylizedTerrain({
    radius,
    detail: quality === 'quality' ? 5 : 4,
    seed: 118,
    relief: 0.38,
    features: ANIME_FEATURES,
    bands: ANIME_BANDS,
    flattenZones: ANIME_FLATTEN,
    palette: {
      low: '#121c29',
      mid: '#2d4050',
      high: '#71818b',
      accent: '#8d8790',
      accent2: '#b9a776',
      shadowTint: '#0d1520',
      highlightTint: '#d7d2c8'
    }
  }), [quality, radius]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.015} dithering />
      </mesh>

      <GoldSeams radius={radius} quality={quality} />
      <MemoryLights radius={radius} quality={quality} />
      <FloatingFolios radius={radius} quality={quality} />

      <SurfaceAnchor
        direction={PAVILION_DIRECTION}
        radius={radius}
        offset={radius * 0.016}
        rotationY={0.38}
      >
        <MemoryPavilion radius={radius} />
      </SurfaceAnchor>

      <AnimeAtmosphere radius={radius} quality={quality} />
    </group>
  );
}
