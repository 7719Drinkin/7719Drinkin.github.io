import { useMemo } from 'react';
import { createStylizedTerrain } from './stylizedTerrain.js';

const WORLD_STYLES = {
  games: {
    seed: 77,
    relief: 0.68,
    palette: {
      low: '#102936',
      mid: '#1d4b5e',
      high: '#397a88',
      accent: '#73aeb0'
    }
  },
  music: {
    seed: 91,
    relief: 0.58,
    palette: {
      low: '#24172f',
      mid: '#43285a',
      high: '#76518a',
      accent: '#b183b4'
    }
  }
};

export default function PlaceholderWorld({ interest, quality }) {
  const style = WORLD_STYLES[interest.id] ?? WORLD_STYLES.games;
  const geometry = useMemo(
    () => createStylizedTerrain({
      radius: interest.size,
      detail: quality === 'quality' ? 5 : 3,
      seed: style.seed,
      relief: style.relief,
      palette: style.palette
    }),
    [interest.size, quality, style]
  );

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={interest.id === 'games' ? 0.72 : 0.76}
          metalness={0.02}
          dithering
        />
      </mesh>
      <mesh rotation-x={interest.id === 'games' ? 1.05 : 0.82} rotation-y={interest.id === 'music' ? 0.35 : 0}>
        <torusGeometry args={[interest.size * 1.18, 0.014, 8, quality === 'quality' ? 160 : 72]} />
        <meshBasicMaterial color={interest.accent} transparent opacity={0.36} />
      </mesh>
      {interest.id === 'music' && [1.35, 1.52].map((scale, index) => (
        <mesh key={scale} rotation-x={0.9 + index * 0.16} rotation-y={-0.25 + index * 0.35}>
          <torusGeometry args={[interest.size * scale, 0.01, 8, quality === 'quality' ? 160 : 72]} />
          <meshBasicMaterial color={interest.accent} transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}
