import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Number23Monument from '../basketball/Number23Monument.jsx';
import ChampionshipGallery from '../basketball/ChampionshipGallery.jsx';
import BasketballLife from '../basketball/BasketballLife.jsx';
import { createStylizedTerrain } from './stylizedTerrain.js';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Hoop({ x, direction, y }) {
  return (
    <group position={[x, y, 0]} rotation-y={direction > 0 ? Math.PI / 2 : -Math.PI / 2}>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.017, 0.025, 0.4, 10]} />
        <meshStandardMaterial color="#322a26" roughness={0.72} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.42, -0.13]}>
        <boxGeometry args={[0.27, 0.17, 0.018]} />
        <meshStandardMaterial color="#dfdbd2" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.36, -0.23]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.065, 0.009, 8, 28]} />
        <meshStandardMaterial
          color="#b31b2c"
          emissive="#3c000a"
          emissiveIntensity={0.3}
          roughness={0.42}
          metalness={0.25}
        />
      </mesh>
    </group>
  );
}

function Floodlight({ position }) {
  return (
    <group position={position}>
      <mesh position-y={0.24}>
        <cylinderGeometry args={[0.012, 0.018, 0.48, 8]} />
        <meshStandardMaterial color="#2c2825" roughness={0.84} metalness={0.18} />
      </mesh>
      <mesh position-y={0.5} rotation-x={-0.22}>
        <boxGeometry args={[0.1, 0.05, 0.04]} />
        <meshStandardMaterial
          color="#ffe0a9"
          emissive="#ff9430"
          emissiveIntensity={2.0}
          roughness={0.24}
        />
      </mesh>
      <pointLight
        position={[0, 0.48, 0]}
        color="#ffb25f"
        intensity={0.62}
        distance={1.8}
        decay={2}
      />
    </group>
  );
}

function CourtPulse({ y }) {
  const ring = useRef();
  const material = useRef();

  useFrame(({ clock }) => {
    const cycle = (clock.elapsedTime % 6.4) / 6.4;
    const visibility = cycle < 0.58
      ? 1 - THREE.MathUtils.smoothstep(cycle, 0.12, 0.58)
      : 0;

    if (ring.current) {
      const scale = 0.65 + cycle * 1.75;
      ring.current.scale.setScalar(scale);
    }
    if (material.current) material.current.opacity = visibility * 0.16;
  });

  return (
    <mesh ref={ring} position-y={y + 0.018} rotation-x={Math.PI / 2}>
      <ringGeometry args={[0.095, 0.105, 48]} />
      <meshBasicMaterial
        ref={material}
        color="#f4c77b"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function LastCourt({ radius, quality }) {
  const courtY = radius + 0.045;
  const audience = useMemo(() => {
    const random = seededRandom(1998);
    return Array.from({ length: quality === 'quality' ? 36 : 14 }, (_, index) => {
      const side = index % 2 ? 1 : -1;
      return {
        position: [
          (random() - 0.5) * 0.58,
          courtY + 0.026 + random() * 0.026,
          side * (0.37 + random() * 0.09)
        ],
        scale: 0.006 + random() * 0.008
      };
    });
  }, [courtY, quality]);

  const plateauSegments = quality === 'quality' ? 36 : 24;
  const floodlights = [
    [-0.53, courtY - 0.018, -0.38],
    [0.53, courtY - 0.018, -0.38],
    [-0.53, courtY - 0.018, 0.38],
    [0.53, courtY - 0.018, 0.38]
  ];

  return (
    <group scale={[0.68, 1, 0.68]}>
      {/* A single shallow pad overlaps the planar terrain by a few millimetres.
          It hides the seam without turning the court into a tall tower. */}
      <mesh position-y={radius + 0.014}>
        <cylinderGeometry args={[0.7, 0.73, 0.052, plateauSegments]} />
        <meshStandardMaterial color="#7f5038" roughness={0.84} />
      </mesh>

      <mesh position-y={courtY}>
        <boxGeometry args={[1.02, 0.024, 0.59]} />
        <meshStandardMaterial color="#71362f" roughness={0.74} />
      </mesh>

      {[-0.278, 0.278].map((z) => (
        <mesh key={`hz-${z}`} position={[0, courtY + 0.016, z]}>
          <boxGeometry args={[0.96, 0.005, 0.011]} />
          <meshBasicMaterial color="#f1e9dc" />
        </mesh>
      ))}
      {[-0.474, 0, 0.474].map((x) => (
        <mesh key={`vt-${x}`} position={[x, courtY + 0.016, 0]}>
          <boxGeometry args={[0.011, 0.005, 0.55]} />
          <meshBasicMaterial color="#f1e9dc" />
        </mesh>
      ))}
      <mesh position-y={courtY + 0.018} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.1, 0.005, 6, 32]} />
        <meshBasicMaterial color="#f1e9dc" />
      </mesh>
      <CourtPulse y={courtY} />

      <Hoop x={0.41} direction={1} y={courtY} />
      <Hoop x={-0.41} direction={-1} y={courtY} />

      {floodlights.map((position, index) => (
        <Floodlight key={index} position={position} />
      ))}

      {audience.map((person, index) => (
        <mesh key={index} position={person.position} scale={person.scale}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color="#ffc578" />
        </mesh>
      ))}
    </group>
  );
}

const BASKETBALL_FEATURES = [
  {
    direction: [-0.78, 0.12, 0.61],
    radius: 0.72,
    softness: 0.24,
    elevation: 0.008,
    color: '#416c48',
    colorStrength: 0.78
  },
  {
    direction: [-0.38, 0.45, 0.81],
    radius: 0.45,
    softness: 0.18,
    elevation: 0.016,
    color: '#9a914d',
    colorStrength: 0.58
  },
  {
    direction: [0.72, -0.02, -0.69],
    radius: 0.48,
    softness: 0.2,
    elevation: 0.008,
    color: '#a44a32',
    colorStrength: 0.72
  },
  {
    direction: [-0.1, -0.14, -0.98],
    radius: 0.22,
    softness: 0.12,
    elevation: -0.004,
    color: '#315d59',
    colorStrength: 0.34
  },
  {
    direction: [0.2, 0.58, 0.79],
    radius: 0.34,
    softness: 0.15,
    elevation: 0.022,
    color: '#d0a05d',
    colorStrength: 0.62
  },
  {
    direction: [0.54, -0.3, 0.79],
    radius: 0.31,
    softness: 0.16,
    elevation: 0.012,
    color: '#365d43',
    colorStrength: 0.7
  }
];

const BASKETBALL_BANDS = [
  {
    normal: [0.18, 0.97, 0.12],
    width: 0.095,
    softness: 0.07,
    elevation: -0.008,
    frequency: 7,
    color: '#7e3b2d',
    colorStrength: 0.48
  },
  {
    normal: [0.84, 0.1, -0.52],
    width: 0.062,
    softness: 0.052,
    elevation: 0.014,
    frequency: 11,
    color: '#c18a50',
    colorStrength: 0.42
  },
  {
    normal: [-0.42, 0.58, 0.7],
    width: 0.034,
    softness: 0.038,
    elevation: -0.005,
    frequency: 5,
    color: '#41828a',
    colorStrength: 0.5
  },
  {
    normal: [-0.62, 0.18, 0.76],
    width: 0.07,
    softness: 0.055,
    elevation: 0.004,
    frequency: 9,
    color: '#527b50',
    colorStrength: 0.48
  }
];

const BASKETBALL_FLATTEN_ZONES = [
  {
    direction: [0, 1, 0],
    mode: 'plane',
    radius: 0.36,
    softness: 0.16,
    target: 0.004,
    strength: 1,
    color: '#805139',
    colorStrength: 0.24
  }
];

export default function BasketballWorld({ radius, quality }) {
  const geometry = useMemo(
    () => createStylizedTerrain({
      radius,
      detail: quality === 'quality' ? 5 : 4,
      seed: 23,
      relief: 0.76,
      features: BASKETBALL_FEATURES,
      bands: BASKETBALL_BANDS,
      flattenZones: BASKETBALL_FLATTEN_ZONES,
      palette: {
        low: '#171b21',
        mid: '#573a2d',
        high: '#a36d43',
        accent: '#b84a35',
        accent2: '#d5aa6c',
        shadowTint: '#0e1418',
        highlightTint: '#efca8a'
      }
    }),
    [quality, radius]
  );

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.72} metalness={0} dithering />
      </mesh>
      <BasketballLife radius={radius} quality={quality} />
      <LastCourt radius={radius} quality={quality} />
      <Number23Monument radius={radius} />
      <ChampionshipGallery radius={radius} />
    </group>
  );
}
