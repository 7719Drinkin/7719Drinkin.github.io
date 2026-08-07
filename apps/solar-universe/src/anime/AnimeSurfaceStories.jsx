import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

const STORY_SCENES = [
  { id: 'frame', direction: [0.58, 0.63, -0.52], rotationY: -0.42 },
  { id: 'terrace', direction: [-0.66, 0.28, -0.7], rotationY: 0.58 },
  { id: 'garden', direction: [0.42, -0.56, 0.71], rotationY: 0.18 }
];

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

function createSurfaceCurve(startValue, endValue, radius) {
  const start = new THREE.Vector3(...startValue).normalize();
  const end = new THREE.Vector3(...endValue).normalize();
  const points = Array.from({ length: 16 }, (_, index) => {
    const t = index / 15;
    const direction = start.clone().lerp(end, t).normalize();
    const lift = Math.sin(t * Math.PI) * radius * 0.018;
    return direction.multiplyScalar(radius * 1.018 + lift);
  });
  return new THREE.CatmullRomCurve3(points);
}

function StoryPath({ start, end, radius, quality }) {
  const curve = useMemo(
    () => createSurfaceCurve(start, end, radius),
    [end[0], end[1], end[2], radius, start[0], start[1], start[2]]
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, quality === 'quality' ? 64 : 32, radius * 0.0028, 5, false]} />
      <meshBasicMaterial color="#c7b47d" transparent opacity={0.18} toneMapped={false} />
    </mesh>
  );
}

function FramePortal({ radius }) {
  const s = radius;
  return (
    <group>
      <mesh position-y={s * 0.012}>
        <cylinderGeometry args={[s * 0.18, s * 0.195, s * 0.024, 12]} />
        <meshStandardMaterial color="#263847" roughness={0.86} metalness={0.02} />
      </mesh>
      <group position-y={s * 0.16}>
        <mesh position={[0, s * 0.11, 0]}>
          <boxGeometry args={[s * 0.3, s * 0.025, s * 0.025]} />
          <meshStandardMaterial color="#d9cfb8" roughness={0.74} metalness={0.03} />
        </mesh>
        <mesh position={[0, -s * 0.11, 0]}>
          <boxGeometry args={[s * 0.3, s * 0.025, s * 0.025]} />
          <meshStandardMaterial color="#d9cfb8" roughness={0.74} metalness={0.03} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * s * 0.137, 0, 0]}>
            <boxGeometry args={[s * 0.025, s * 0.245, s * 0.025]} />
            <meshStandardMaterial color="#d9cfb8" roughness={0.74} metalness={0.03} />
          </mesh>
        ))}
        <mesh position-z={-s * 0.01}>
          <planeGeometry args={[s * 0.245, s * 0.185]} />
          <meshBasicMaterial
            color="#92afbf"
            transparent
            opacity={0.075}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        {[0.045, 0, -0.045].map((y, index) => (
          <mesh key={y} position={[0, s * y, s * 0.006]}>
            <boxGeometry args={[s * (0.15 - index * 0.02), s * 0.004, s * 0.003]} />
            <meshBasicMaterial color="#bca76e" transparent opacity={0.4} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Lantern({ radius, phase }) {
  const material = useRef();
  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.emissiveIntensity = 0.18 + (Math.sin(clock.elapsedTime * 0.72 + phase) * 0.5 + 0.5) * 0.12;
  });

  return (
    <group>
      <mesh position-y={radius * 0.035}>
        <cylinderGeometry args={[radius * 0.004, radius * 0.005, radius * 0.07, 6]} />
        <meshStandardMaterial color="#655d50" roughness={0.82} />
      </mesh>
      <mesh position-y={radius * 0.083} scale={[0.75, 1, 0.75]}>
        <octahedronGeometry args={[radius * 0.022, 0]} />
        <meshStandardMaterial
          ref={material}
          color="#ead9ae"
          emissive="#8c6d36"
          emissiveIntensity={0.22}
          roughness={0.42}
        />
      </mesh>
    </group>
  );
}

function LanternTerrace({ radius, quality }) {
  const steps = quality === 'quality' ? 5 : 3;
  return (
    <group>
      {Array.from({ length: steps }, (_, index) => {
        const width = radius * (0.34 - index * 0.035);
        return (
          <mesh key={index} position={[0, radius * (0.012 + index * 0.018), -radius * index * 0.036]}>
            <boxGeometry args={[width, radius * 0.025, radius * 0.085]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? '#334958' : '#405565'}
              roughness={0.88}
              metalness={0.01}
            />
          </mesh>
        );
      })}
      {[-0.12, 0.12].map((x, sideIndex) => (
        <group key={x} position={[radius * x, radius * 0.09, -radius * 0.12]}>
          <Lantern radius={radius} phase={sideIndex * 1.7} />
        </group>
      ))}
      <mesh position={[0, radius * 0.105, -radius * 0.155]}>
        <boxGeometry args={[radius * 0.18, radius * 0.018, radius * 0.03]} />
        <meshStandardMaterial color="#b49f6b" roughness={0.58} metalness={0.14} />
      </mesh>
    </group>
  );
}

function PaperPetal({ radius, angle, height, pale }) {
  return (
    <group
      position={[
        Math.cos(angle) * radius * 0.105,
        height,
        Math.sin(angle) * radius * 0.105
      ]}
      rotation={[0.2 + angle * 0.07, -angle, 0.35]}
    >
      <mesh>
        <planeGeometry args={[radius * 0.065, radius * 0.042]} />
        <meshStandardMaterial
          color={pale ? '#eee7d8' : '#b9c9d1'}
          roughness={0.86}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function PaperGarden({ radius, quality }) {
  const count = quality === 'quality' ? 8 : 5;
  const spinner = useRef();

  useFrame((_, delta) => {
    if (spinner.current) spinner.current.rotation.y += delta * 0.055;
  });

  return (
    <group>
      <mesh position-y={radius * 0.012}>
        <cylinderGeometry args={[radius * 0.19, radius * 0.205, radius * 0.025, 16]} />
        <meshStandardMaterial color="#2d4651" roughness={0.9} />
      </mesh>
      <mesh position-y={radius * 0.028} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radius * 0.085, radius * 0.16, 32]} />
        <meshBasicMaterial color="#c5b276" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <group ref={spinner} position-y={radius * 0.08}>
        {Array.from({ length: count }, (_, index) => (
          <PaperPetal
            key={index}
            radius={radius}
            angle={index / count * Math.PI * 2}
            height={Math.sin(index * 1.4) * radius * 0.025}
            pale={index % 3 !== 1}
          />
        ))}
      </group>
      <mesh position-y={radius * 0.12}>
        <sphereGeometry args={[radius * 0.023, 12, 8]} />
        <meshStandardMaterial
          color="#ead8a8"
          emissive="#7a6133"
          emissiveIntensity={0.18}
          roughness={0.44}
        />
      </mesh>
    </group>
  );
}

export default function AnimeSurfaceStories({ radius, quality }) {
  return (
    <group>
      <SurfaceAnchor
        direction={STORY_SCENES[0].direction}
        radius={radius}
        offset={radius * 0.022}
        rotationY={STORY_SCENES[0].rotationY}
      >
        <FramePortal radius={radius} />
      </SurfaceAnchor>

      <SurfaceAnchor
        direction={STORY_SCENES[1].direction}
        radius={radius}
        offset={radius * 0.024}
        rotationY={STORY_SCENES[1].rotationY}
      >
        <LanternTerrace radius={radius} quality={quality} />
      </SurfaceAnchor>

      <SurfaceAnchor
        direction={STORY_SCENES[2].direction}
        radius={radius}
        offset={radius * 0.02}
        rotationY={STORY_SCENES[2].rotationY}
      >
        <PaperGarden radius={radius} quality={quality} />
      </SurfaceAnchor>

      <StoryPath
        start={STORY_SCENES[0].direction}
        end={STORY_SCENES[1].direction}
        radius={radius}
        quality={quality}
      />
      <StoryPath
        start={STORY_SCENES[1].direction}
        end={STORY_SCENES[2].direction}
        radius={radius}
        quality={quality}
      />
    </group>
  );
}
