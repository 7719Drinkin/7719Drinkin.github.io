import { useMemo } from 'react';
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
        <meshStandardMaterial color="#b31b2c" emissive="#3c000a" emissiveIntensity={0.3} roughness={0.42} metalness={0.25} />
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
        <meshStandardMaterial color="#ffe0a9" emissive="#ff9430" emissiveIntensity={2.2} roughness={0.24} />
      </mesh>
      <pointLight position={[0, 0.48, 0]} color="#ffb25f" intensity={0.8} distance={2.1} decay={2} />
    </group>
  );
}

function LastCourt({ radius, quality }) {
  const audience = useMemo(() => {
    const random = seededRandom(1998);
    return Array.from({ length: quality === 'quality' ? 58 : 24 }, (_, index) => {
      const side = index % 2 ? 1 : -1;
      return {
        position: [(random() - 0.5) * 0.58, radius * 1.11 + random() * 0.055, side * (0.37 + random() * 0.09)],
        scale: 0.006 + random() * 0.008
      };
    });
  }, [quality, radius]);

  const y = radius * 1.055;
  const plateauSegments = quality === 'quality' ? 36 : 24;

  return (
    <group>
      <mesh position-y={radius * 0.89}>
        <cylinderGeometry args={[0.72, 0.86, 0.14, plateauSegments]} />
        <meshStandardMaterial color="#4b3a2e" roughness={0.86} />
      </mesh>
      <mesh position-y={radius * 0.975}>
        <cylinderGeometry args={[0.64, 0.73, 0.11, plateauSegments]} />
        <meshStandardMaterial color="#97613d" roughness={0.8} />
      </mesh>
      <mesh position-y={radius}>
        <boxGeometry args={[1.13, 0.12, 0.7, 4, 1, 3]} />
        <meshStandardMaterial color="#302825" roughness={0.86} />
      </mesh>
      <mesh position-y={y}>
        <boxGeometry args={[1.02, 0.03, 0.59]} />
        <meshStandardMaterial color="#71362f" roughness={0.74} />
      </mesh>

      {[-0.278, 0.278].map((z) => (
        <mesh key={`hz-${z}`} position={[0, y + 0.02, z]}>
          <boxGeometry args={[0.96, 0.006, 0.011]} />
          <meshBasicMaterial color="#f1e9dc" />
        </mesh>
      ))}
      {[-0.474, 0, 0.474].map((x) => (
        <mesh key={`vt-${x}`} position={[x, y + 0.02, 0]}>
          <boxGeometry args={[0.011, 0.006, 0.55]} />
          <meshBasicMaterial color="#f1e9dc" />
        </mesh>
      ))}
      <mesh position-y={y + 0.023} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.1, 0.0055, 6, 32]} />
        <meshBasicMaterial color="#f1e9dc" />
      </mesh>

      <Hoop x={0.41} direction={1} y={radius * 1.06} />
      <Hoop x={-0.41} direction={-1} y={radius * 1.06} />

      {[[-0.53, radius * 1.01, -0.38], [0.53, radius * 1.01, -0.38], [-0.53, radius * 1.01, 0.38], [0.53, radius * 1.01, 0.38]].map((position, index) => (
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
    elevation: 0.006,
    color: '#416c48',
    colorStrength: 0.78
  },
  {
    direction: [-0.38, 0.45, 0.81],
    radius: 0.45,
    softness: 0.18,
    elevation: 0.014,
    color: '#8d8b4d',
    colorStrength: 0.56
  },
  {
    direction: [0.7, -0.06, -0.71],
    radius: 0.5,
    softness: 0.18,
    elevation: -0.026,
    color: '#993b2d',
    colorStrength: 0.74,
    rimAt: 0.48,
    rimWidth: 0.09,
    rimElevation: 0.018,
    rimColor: '#c77849',
    rimColorStrength: 0.58
  },
  {
    direction: [-0.08, -0.18, -0.98],
    radius: 0.3,
    softness: 0.12,
    elevation: -0.05,
    color: '#20252c',
    colorStrength: 0.9,
    rimAt: 0.3,
    rimWidth: 0.075,
    rimElevation: 0.032,
    rimColor: '#865d42',
    rimColorStrength: 0.64
  },
  {
    direction: [0.2, 0.58, 0.79],
    radius: 0.34,
    softness: 0.15,
    elevation: 0.022,
    color: '#d0a05d',
    colorStrength: 0.62
  }
];

const BASKETBALL_BANDS = [
  {
    normal: [0.18, 0.97, 0.12],
    width: 0.105,
    softness: 0.075,
    elevation: -0.012,
    frequency: 7,
    color: '#732f2a',
    colorStrength: 0.56
  },
  {
    normal: [0.84, 0.1, -0.52],
    width: 0.065,
    softness: 0.055,
    elevation: 0.014,
    frequency: 11,
    color: '#c18a50',
    colorStrength: 0.42
  }
];

export default function BasketballWorld({ radius, quality }) {
  const geometry = useMemo(
    () => createStylizedTerrain({
      radius,
      detail: quality === 'quality' ? 5 : 4,
      seed: 23,
      relief: 0.78,
      features: BASKETBALL_FEATURES,
      bands: BASKETBALL_BANDS,
      palette: {
        low: '#171b21',
        mid: '#56382c',
        high: '#a06a42',
        accent: '#b64432',
        accent2: '#d2a268',
        shadowTint: '#0d1218',
        highlightTint: '#efc783'
      }
    }),
    [quality, radius]
  );

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.72}
          metalness={0}
          dithering
        />
      </mesh>
      <BasketballLife radius={radius} quality={quality} />
      <LastCourt radius={radius} quality={quality} />
      <Number23Monument radius={radius} />
      <ChampionshipGallery radius={radius} />
    </group>
  );
}
