import { useMemo } from 'react';
import { courtSurfaceY } from './courtLayout.js';

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

const CROWD_COLORS = ['#f2c477', '#d96a4b', '#ece4cf', '#73906a', '#b7473e'];
const STAND_ROWS = [
  { z: 0.235, y: 0.012 },
  { z: 0.274, y: 0.034 },
  { z: 0.313, y: 0.056 }
];

function Spectator({ position, color, scale }) {
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.012}>
        <cylinderGeometry args={[0.006, 0.008, 0.024, 6]} />
        <meshStandardMaterial color={color} roughness={0.86} />
      </mesh>
      <mesh position-y={0.031}>
        <sphereGeometry args={[0.008, 7, 5]} />
        <meshStandardMaterial color="#d7a06f" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SidelineStand({ side, radius, spectators }) {
  const courtY = courtSurfaceY(radius);

  return (
    <group>
      {STAND_ROWS.map((row, index) => (
        <group key={index} position={[0, courtY + row.y, side * row.z]}>
          <mesh>
            <boxGeometry args={[0.66, 0.024, 0.052]} />
            <meshStandardMaterial
              color={index === STAND_ROWS.length - 1 ? '#392a25' : '#493129'}
              roughness={0.9}
            />
          </mesh>
          <mesh position-y={0.015}>
            <boxGeometry args={[0.63, 0.007, 0.041]} />
            <meshStandardMaterial color="#8b4937" roughness={0.82} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, courtY + 0.072, side * 0.344]}>
        <boxGeometry args={[0.68, 0.1, 0.018]} />
        <meshStandardMaterial color="#241d1a" roughness={0.92} />
      </mesh>

      {spectators.map((spectator, index) => (
        <Spectator key={index} {...spectator} />
      ))}
    </group>
  );
}

export default function CourtStands({ radius, quality }) {
  const crowd = useMemo(() => {
    const random = seededRandom(771923);
    const countPerSide = quality === 'quality' ? 18 : 7;
    const courtY = courtSurfaceY(radius);

    return [-1, 1].map((side) => Array.from({ length: countPerSide }, (_, index) => {
      const row = index % STAND_ROWS.length;
      const rowLayout = STAND_ROWS[row];

      return {
        position: [
          -0.29 + random() * 0.58,
          courtY + rowLayout.y + 0.021,
          side * (rowLayout.z + (random() - 0.5) * 0.012)
        ],
        color: CROWD_COLORS[Math.floor(random() * CROWD_COLORS.length)],
        scale: 0.72 + random() * 0.32
      };
    }));
  }, [quality, radius]);

  return (
    <group>
      <SidelineStand side={-1} radius={radius} spectators={crowd[0]} />
      <SidelineStand side={1} radius={radius} spectators={crowd[1]} />
    </group>
  );
}
