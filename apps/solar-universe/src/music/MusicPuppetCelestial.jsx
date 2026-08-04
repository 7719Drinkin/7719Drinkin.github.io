import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function PuppetHead({ quality, selected }) {
  const segments = quality === 'quality' ? 16 : 10;

  return (
    <group>
      <mesh scale={[0.78, 1, 0.72]}>
        <icosahedronGeometry args={[0.72, quality === 'quality' ? 2 : 1]} />
        <meshStandardMaterial color="#301b22" roughness={0.78} metalness={0.08} flatShading />
      </mesh>

      <mesh position={[0, 0.02, 0.34]} scale={[0.7, 0.82, 0.38]}>
        <icosahedronGeometry args={[0.64, quality === 'quality' ? 2 : 1]} />
        <meshStandardMaterial color="#7f332f" roughness={0.7} metalness={0.12} flatShading />
      </mesh>

      <mesh position={[0, -0.49, 0.22]} scale={[0.86, 0.7, 0.72]}>
        <dodecahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#5a2728" roughness={0.74} metalness={0.09} flatShading />
      </mesh>

      {[-0.23, 0.23].map((x) => (
        <group key={x} position={[x, 0.14, 0.61]}>
          <mesh scale={[1.15, 0.72, 0.42]}>
            <sphereGeometry args={[0.105, segments, Math.max(8, segments / 2)]} />
            <meshStandardMaterial color="#130f12" roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.006, 0.048]} scale={[0.62, 0.62, 0.26]}>
            <sphereGeometry args={[0.075, segments, Math.max(8, segments / 2)]} />
            <meshStandardMaterial
              color="#c08a47"
              emissive="#5d2418"
              emissiveIntensity={0.34}
              roughness={0.55}
              metalness={0.15}
            />
          </mesh>
          <mesh position={[0, 0.105, 0.015]} rotation-z={x < 0 ? -0.12 : 0.12}>
            <boxGeometry args={[0.24, 0.035, 0.045]} />
            <meshStandardMaterial color="#241419" roughness={0.8} />
          </mesh>
        </group>
      ))}

      <group position={[0, -0.055, 0.48]} rotation-x={0.08}>
        <mesh position={[0, 0, 0.48]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.052, 0.145, 0.96, quality === 'quality' ? 10 : 7]} />
          <meshStandardMaterial color="#9e4a36" roughness={0.64} metalness={0.13} flatShading />
        </mesh>
        <mesh position={[0, -0.008, 0.995]} scale={[0.85, 0.72, 1.05]}>
          <dodecahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial color="#b56743" roughness={0.6} metalness={0.15} flatShading />
        </mesh>
      </group>

      <mesh position={[0, -0.34, 0.585]} rotation-z={-0.055}>
        <boxGeometry args={[0.3, 0.035, 0.035]} />
        <meshStandardMaterial color="#26151a" roughness={0.84} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.57, -0.01, 0.02]} rotation-z={side * 0.12} scale={[0.55, 1, 0.45]}>
          <dodecahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#7b4d34" roughness={0.75} metalness={0.08} flatShading />
        </mesh>
      ))}

      {[-0.38, -0.19, 0, 0.19, 0.38].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.68 + (index % 2) * 0.05, -0.02]}
          rotation-z={(x / 0.38) * -0.24}
          scale={[0.7, 1 + (index === 2 ? 0.18 : 0), 0.7]}
        >
          <coneGeometry args={[0.13, 0.46, quality === 'quality' ? 7 : 5]} />
          <meshStandardMaterial
            color={index % 2 ? '#1d342d' : '#263f33'}
            roughness={0.86}
            metalness={0.04}
            flatShading
          />
        </mesh>
      ))}

      <mesh position={[0, -0.77, -0.02]}>
        <cylinderGeometry args={[0.25, 0.31, 0.18, quality === 'quality' ? 12 : 8]} />
        <meshStandardMaterial color="#80623d" roughness={0.68} metalness={0.3} flatShading />
      </mesh>
      <mesh position={[0, -0.9, -0.02]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.28, 0.035, 8, quality === 'quality' ? 32 : 18]} />
        <meshStandardMaterial color="#3d271f" roughness={0.76} metalness={0.22} />
      </mesh>

      {selected && (
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.12, 0.018, 8, quality === 'quality' ? 72 : 36]} />
          <meshBasicMaterial
            color="#d5966e"
            transparent
            opacity={0.46}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      <pointLight
        position={[0.75, 0.45, 1.4]}
        color="#d98154"
        intensity={selected ? 0.34 : 0.18}
        distance={3}
        decay={2}
      />
    </group>
  );
}

export default function MusicPuppetCelestial({
  body,
  quality,
  selectedId,
  parentSelected,
  showOrbit,
  onSelect,
  registerPlanet
}) {
  const orbitPivot = useRef();
  const bodyCarrier = useRef();
  const selfSpin = useRef();
  const selected = selectedId === body.id;

  useEffect(() => {
    registerPlanet(body.id, bodyCarrier);
    return () => registerPlanet(body.id, null);
  }, [body.id, registerPlanet]);

  useFrame((_, delta) => {
    if (orbitPivot.current) orbitPivot.current.rotation.y += body.orbitSpeed * delta;
    if (selfSpin.current) selfSpin.current.rotation.y += body.axialSpeed * delta;
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect(body.id);
  };

  const enter = (event) => {
    event.stopPropagation();
    if (body.route) window.location.href = body.route;
  };

  return (
    <group rotation-z={body.orbitInclination}>
      {showOrbit && (
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[body.orbitRadius, 0.011, 6, quality === 'quality' ? 160 : 72]} />
          <meshBasicMaterial color={body.accent} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}

      <group ref={orbitPivot} rotation-y={body.initialOrbit}>
        <group ref={bodyCarrier} position={[body.orbitRadius, 0, 0]}>
          <group
            ref={selfSpin}
            rotation-y={body.initialAxial}
            rotation-z={body.axialTilt}
            scale={body.size}
            onClick={select}
            onDoubleClick={enter}
          >
            <PuppetHead quality={quality} selected={selected} />
          </group>

          {(parentSelected || selected) && !selected && (
            <Html
              center
              distanceFactor={8}
              position={[0, body.size * 1.55, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div className="planet-label" style={{ '--planet-accent': body.accent }}>
                <strong>{body.title.toUpperCase()}</strong>
                <span>{body.worldName}</span>
              </div>
            </Html>
          )}
        </group>
      </group>
    </group>
  );
}
