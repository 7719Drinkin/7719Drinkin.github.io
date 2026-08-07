import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FRAME_ORBITS = [
  {
    id: 'folio-a',
    radiusScale: 1.66,
    inclination: THREE.MathUtils.degToRad(26),
    yaw: THREE.MathUtils.degToRad(-12),
    speed: 0.11,
    initial: 0.45,
    spin: 0.2,
    scale: 0.72,
    frame: '#d7c58f',
    paper: '#eee7d7'
  },
  {
    id: 'folio-b',
    radiusScale: 1.92,
    inclination: THREE.MathUtils.degToRad(-39),
    yaw: THREE.MathUtils.degToRad(31),
    speed: -0.075,
    initial: 2.52,
    spin: -0.14,
    scale: 0.63,
    frame: '#9fb8c5',
    paper: '#dce5e7'
  },
  {
    id: 'folio-c',
    radiusScale: 2.16,
    inclination: THREE.MathUtils.degToRad(57),
    yaw: THREE.MathUtils.degToRad(-37),
    speed: 0.056,
    initial: 4.7,
    spin: 0.1,
    scale: 0.56,
    frame: '#c6ae73',
    paper: '#e8dfcf'
  }
];

function MemoryFrameBody({ radius, frameColor, paperColor, quality }) {
  const width = radius * 0.38;
  const height = radius * 0.25;
  const beam = radius * 0.022;
  const depth = radius * 0.018;

  return (
    <group>
      <mesh position={[0, height * 0.5, 0]}>
        <boxGeometry args={[width + beam, beam, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.54} metalness={0.2} />
      </mesh>
      <mesh position={[0, -height * 0.5, 0]}>
        <boxGeometry args={[width + beam, beam, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.54} metalness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.5, 0, 0]}>
          <boxGeometry args={[beam, height, depth]} />
          <meshStandardMaterial color={frameColor} roughness={0.54} metalness={0.2} />
        </mesh>
      ))}

      <mesh position-z={-depth * 0.35}>
        <planeGeometry args={[width * 0.91, height * 0.86]} />
        <meshStandardMaterial
          color={paperColor}
          roughness={0.9}
          side={THREE.DoubleSide}
          transparent
          opacity={0.88}
        />
      </mesh>

      {(quality === 'quality' ? [0.055, 0.012, -0.031, -0.074] : [0.04, -0.035]).map((offset, index) => (
        <mesh key={offset} position={[index % 2 ? radius * 0.018 : -radius * 0.008, radius * offset, depth * 0.14]}>
          <boxGeometry args={[width * (0.55 - index * 0.06), radius * 0.006, radius * 0.004]} />
          <meshBasicMaterial color="#8c8069" transparent opacity={0.42} toneMapped={false} />
        </mesh>
      ))}

      <mesh position={[width * 0.29, height * 0.2, depth * 0.18]} rotation-z={0.18}>
        <planeGeometry args={[radius * 0.07, radius * 0.05]} />
        <meshBasicMaterial
          color="#9cb5c2"
          transparent
          opacity={0.34}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0, -depth * 1.8]}>
        <planeGeometry args={[width * 1.12, height * 1.18]} />
        <meshBasicMaterial
          color={frameColor}
          transparent
          opacity={0.055}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function MemoryFrameSatellite({ config, planetRadius, quality, showOrbit, onSelect }) {
  const pivot = useRef();
  const body = useRef();
  const bob = useRef();
  const orbitRadius = planetRadius * config.radiusScale;
  const orbitalSegments = quality === 'quality' ? 128 : 64;

  useFrame(({ clock }, delta) => {
    if (pivot.current) pivot.current.rotation.y += config.speed * delta;
    if (body.current) body.current.rotation.y += config.spin * delta;
    if (bob.current) {
      bob.current.position.y = Math.sin(clock.elapsedTime * 0.58 + config.initial) * planetRadius * 0.018;
      bob.current.rotation.z = Math.sin(clock.elapsedTime * 0.31 + config.initial) * 0.06;
    }
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect?.();
  };

  return (
    <group rotation={[config.inclination * 0.38, config.yaw, config.inclination]}>
      {showOrbit && (
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[orbitRadius, planetRadius * 0.004, 5, orbitalSegments]} />
          <meshBasicMaterial color={config.frame} transparent opacity={0.13} depthWrite={false} />
        </mesh>
      )}

      <group ref={pivot} rotation-y={config.initial}>
        <group position={[orbitRadius, 0, 0]} ref={bob}>
          <group
            ref={body}
            scale={config.scale}
            rotation={[0.1, config.initial * 0.4, -0.08]}
            onClick={select}
          >
            <MemoryFrameBody
              radius={planetRadius}
              frameColor={config.frame}
              paperColor={config.paper}
              quality={quality}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

export default function AnimeMemoryOrbitals({ radius, quality, showOrbit, onSelect }) {
  const frames = useMemo(
    () => quality === 'quality' ? FRAME_ORBITS : FRAME_ORBITS.slice(0, 2),
    [quality]
  );

  return (
    <group>
      {frames.map((config) => (
        <MemoryFrameSatellite
          key={config.id}
          config={config}
          planetRadius={radius}
          quality={quality}
          showOrbit={showOrbit}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
