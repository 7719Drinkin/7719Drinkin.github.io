import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ChampionshipTrophy from './ChampionshipTrophy.jsx';

const GOLD_LIGHT = '#f0cf82';

function arcGeometry(radius, start, span, tube, quality) {
  const pointCount = quality === 'quality' ? 30 : 18;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const angle = start + span * progress;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 3.0) * tube * 1.8,
      Math.sin(angle) * radius
    );
  });
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(
    curve,
    pointCount * 2,
    tube,
    quality === 'quality' ? 6 : 4,
    false
  );
}

function MotionRing({ radius, quality }) {
  const ring = useRef();
  const arcSpecs = useMemo(() => [
    [0.08, 0.58, '#f1d29b', 0.24],
    [0.88, 0.34, '#b9483d', 0.3],
    [1.42, 0.7, '#d9aa65', 0.22],
    [2.36, 0.42, '#f3dfb8', 0.23],
    [3.02, 0.62, '#9f3c37', 0.26],
    [3.88, 0.32, '#d7b06f', 0.21],
    [4.42, 0.74, '#f0d7a9', 0.22],
    [5.42, 0.38, '#b9483d', 0.28]
  ].map(([start, span, color, opacity], index) => ({
    geometry: arcGeometry(
      radius * (index % 2 === 0 ? 1.34 : 1.39),
      start,
      span,
      radius * (index % 2 === 0 ? 0.0055 : 0.004),
      quality
    ),
    color,
    opacity
  })), [quality, radius]);

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.y += delta * 0.018;
  });

  return (
    <group ref={ring} rotation={[0.17, 0.08, -0.34]}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry
          args={[radius * 1.31, radius * 0.003, 5, quality === 'quality' ? 220 : 120]}
        />
        <meshBasicMaterial color="#d8b77e" transparent opacity={0.085} depthWrite={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry
          args={[radius * 1.42, radius * 0.0022, 5, quality === 'quality' ? 220 : 120]}
        />
        <meshBasicMaterial color="#c95a4c" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      {arcSpecs.map((arc, index) => (
        <mesh key={index} geometry={arc.geometry}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={arc.opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function TrophySatellite({
  radius,
  quality,
  orbitRadius,
  initialOrbit,
  initialSpin,
  orbitSpeed,
  spinSpeed
}) {
  const orbitalPivot = useRef();
  const trophyPose = useRef();
  const orbitAngle = useRef(initialOrbit);
  const spinAngle = useRef(initialSpin);

  useFrame((_, delta) => {
    orbitAngle.current += orbitSpeed * delta;
    spinAngle.current += spinSpeed * delta;

    if (orbitalPivot.current) orbitalPivot.current.rotation.y = orbitAngle.current;
    if (trophyPose.current) trophyPose.current.rotation.y = spinAngle.current - orbitAngle.current;
  });

  return (
    <group ref={orbitalPivot} rotation-y={initialOrbit}>
      <group position={[orbitRadius, 0, 0]}>
        <group ref={trophyPose} rotation-y={initialSpin - initialOrbit}>
          <ChampionshipTrophy radius={radius} quality={quality} />
        </group>
      </group>
    </group>
  );
}

function ThreePeatOrbit({
  radius,
  quality,
  showOrbit,
  orbitRadius,
  inclination,
  orbitSpeed,
  phaseOffset
}) {
  const phases = useMemo(
    () => [0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((phase) => phase + phaseOffset),
    [phaseOffset]
  );

  return (
    <group rotation={inclination}>
      {showOrbit && (
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry
            args={[orbitRadius, radius * 0.0018, 4, quality === 'quality' ? 220 : 120]}
          />
          <meshBasicMaterial
            color={GOLD_LIGHT}
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      )}

      {phases.map((phase, index) => (
        <TrophySatellite
          key={index}
          radius={radius}
          quality={quality}
          orbitRadius={orbitRadius}
          initialOrbit={phase}
          initialSpin={phase * 0.37}
          orbitSpeed={orbitSpeed}
          spinSpeed={0.22}
        />
      ))}
    </group>
  );
}

function ChampionshipSatellites({ radius, quality, showOrbit }) {
  return (
    <group>
      <ThreePeatOrbit
        radius={radius}
        quality={quality}
        showOrbit={showOrbit}
        orbitRadius={radius * 1.72}
        inclination={[0.22, -0.1, -0.2]}
        orbitSpeed={0.105}
        phaseOffset={0.12}
      />
      <ThreePeatOrbit
        radius={radius}
        quality={quality}
        showOrbit={showOrbit}
        orbitRadius={radius * 2.08}
        inclination={[-0.39, 0.18, 0.31]}
        orbitSpeed={0.074}
        phaseOffset={0.58}
      />
    </group>
  );
}

export default function BasketballOrbitals({ radius, quality, showOrbit, onSelect }) {
  const select = (event) => {
    event.stopPropagation();
    onSelect();
  };

  return (
    <group onClick={select}>
      <MotionRing radius={radius} quality={quality} />
      <ChampionshipSatellites radius={radius} quality={quality} showOrbit={showOrbit} />
    </group>
  );
}
