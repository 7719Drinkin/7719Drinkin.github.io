const GOLD = '#e3b75e';
const GOLD_LIGHT = '#f0cf82';
const GOLD_DARK = '#6f4d18';
const GOLD_SHADOW = '#3d2709';

export default function ChampionshipTrophy({ radius, quality }) {
  const segments = quality === 'quality' ? 32 : 20;
  const ballSegments = quality === 'quality' ? [32, 24] : [20, 14];
  const ballRadius = 0.145;
  const bodyTopRadius = ballRadius;
  const bodyBottomRadius = bodyTopRadius * 0.75;
  const bodyHeight = 0.43;
  const bodyBottomY = 0.11;
  const bodyTopY = bodyBottomY + bodyHeight;
  const overlap = ballRadius * 0.025;
  const ballCenter = [bodyTopRadius, bodyTopY + ballRadius - overlap, 0];

  return (
    <group scale={radius * 0.38}>
      <mesh position-y={0.035}>
        <cylinderGeometry args={[0.17, 0.19, 0.07, segments]} />
        <meshStandardMaterial color={GOLD_DARK} roughness={0.3} metalness={0.86} />
      </mesh>
      <mesh position-y={0.088}>
        <cylinderGeometry args={[0.125, 0.15, 0.045, segments]} />
        <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.94} />
      </mesh>

      <mesh position-y={bodyBottomY + bodyHeight / 2}>
        <cylinderGeometry
          args={[bodyTopRadius, bodyBottomRadius, bodyHeight, segments, 1, false]}
        />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD_SHADOW}
          emissiveIntensity={0.035}
          roughness={0.19}
          metalness={0.95}
        />
      </mesh>

      <group position={ballCenter} rotation={[0.16, 0.34, -0.08]}>
        <mesh>
          <sphereGeometry args={[ballRadius, ...ballSegments]} />
          <meshStandardMaterial
            color={GOLD_LIGHT}
            emissive={GOLD_SHADOW}
            emissiveIntensity={0.07}
            roughness={0.24}
            metalness={0.9}
          />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[ballRadius * 1.004, 0.0048, 6, quality === 'quality' ? 48 : 28]} />
          <meshStandardMaterial color={GOLD_DARK} roughness={0.48} metalness={0.58} />
        </mesh>
        <mesh rotation-y={Math.PI / 2}>
          <torusGeometry args={[ballRadius * 1.004, 0.0048, 6, quality === 'quality' ? 48 : 28]} />
          <meshStandardMaterial color={GOLD_DARK} roughness={0.48} metalness={0.58} />
        </mesh>
        <mesh rotation={[0.42, 0.25, Math.PI / 2]}>
          <torusGeometry args={[ballRadius * 1.004, 0.004, 6, quality === 'quality' ? 48 : 28]} />
          <meshStandardMaterial color={GOLD_DARK} roughness={0.48} metalness={0.58} />
        </mesh>
      </group>
    </group>
  );
}
