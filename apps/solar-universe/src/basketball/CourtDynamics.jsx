import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { courtSurfaceY, hoopRimPosition } from './courtLayout.js';

const DRIBBLE_END = 0.54;
const SHOT_END = 0.82;
const SWISH_END = 0.92;

function smoothstep(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function quadraticBezier(start, control, end, progress) {
  const inverse = 1 - progress;
  return inverse * inverse * start
    + 2 * inverse * progress * control
    + progress * progress * end;
}

function ReplayBall({ radius, quality }) {
  const root = useRef();
  const ball = useRef();
  const groundHalo = useRef();
  const courtY = courtSurfaceY(radius);
  const rim = useMemo(() => hoopRimPosition(radius, 1), [radius]);
  const ballRadius = radius * 0.026;
  const sphereSegments = quality === 'quality' ? [20, 14] : [14, 10];

  useFrame(({ clock }, delta) => {
    const cycle = (clock.elapsedTime % 8.2) / 8.2;
    let x;
    let y;
    let z;
    let visibility = 1;

    if (cycle < DRIBBLE_END) {
      const progress = smoothstep(cycle / DRIBBLE_END);
      const bounce = Math.pow(Math.abs(Math.sin(progress * Math.PI * 6)), 0.72);
      x = THREE.MathUtils.lerp(-0.22, -0.045, progress);
      z = THREE.MathUtils.lerp(0.055, 0.025, progress);
      y = courtY + ballRadius + 0.012 + bounce * radius * 0.075;
    } else if (cycle < SHOT_END) {
      const progress = smoothstep((cycle - DRIBBLE_END) / (SHOT_END - DRIBBLE_END));
      const startX = -0.045;
      const startY = courtY + ballRadius + 0.055;
      const startZ = 0.025;
      const endY = rim.y + ballRadius * 0.08;

      x = quadraticBezier(startX, THREE.MathUtils.lerp(startX, rim.x, 0.52), rim.x, progress);
      y = quadraticBezier(
        startY,
        Math.max(startY, endY) + radius * 0.25,
        endY,
        progress
      );
      z = quadraticBezier(startZ, -0.015, rim.z, progress);
    } else if (cycle < SWISH_END) {
      const progress = smoothstep((cycle - SHOT_END) / (SWISH_END - SHOT_END));
      x = rim.x;
      z = rim.z;
      y = THREE.MathUtils.lerp(
        rim.y + ballRadius * 0.08,
        rim.y - radius * 0.13,
        progress
      );
    } else {
      const progress = smoothstep((cycle - SWISH_END) / (1 - SWISH_END));
      x = rim.x + progress * 0.015;
      z = rim.z;
      y = THREE.MathUtils.lerp(rim.y - radius * 0.13, courtY + ballRadius, progress);
      visibility = 1 - progress;
    }

    if (root.current) {
      root.current.position.set(x, y, z);
      root.current.visible = visibility > 0.02;
      root.current.scale.setScalar(0.92 + visibility * 0.08);
    }

    if (ball.current) {
      ball.current.rotation.x += delta * 4.2;
      ball.current.rotation.z += delta * 2.1;
    }

    if (groundHalo.current) {
      const height = Math.max(0, y - courtY);
      const proximity = 1 - THREE.MathUtils.clamp(height / (radius * 0.3), 0, 1);
      groundHalo.current.position.y = courtY - y + 0.014;
      groundHalo.current.material.opacity = visibility * (0.025 + proximity * 0.1);
      groundHalo.current.scale.setScalar(1.1 + (1 - proximity) * 0.55);
    }
  });

  return (
    <group ref={root}>
      <group ref={ball}>
        <mesh>
          <sphereGeometry args={[ballRadius, ...sphereSegments]} />
          <meshStandardMaterial
            color="#c85a2f"
            emissive="#351006"
            emissiveIntensity={0.28}
            roughness={0.62}
            metalness={0.04}
          />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[ballRadius * 1.01, ballRadius * 0.045, 5, 30]} />
          <meshStandardMaterial color="#2a130d" roughness={0.8} />
        </mesh>
        <mesh rotation-y={Math.PI / 2}>
          <torusGeometry args={[ballRadius * 1.01, ballRadius * 0.045, 5, 30]} />
          <meshStandardMaterial color="#2a130d" roughness={0.8} />
        </mesh>
      </group>

      <mesh ref={groundHalo} rotation-x={Math.PI / 2}>
        <ringGeometry args={[ballRadius * 0.9, ballRadius * 1.7, 24]} />
        <meshBasicMaterial
          color="#ffb15d"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function SidelineLightWave({ radius, quality }) {
  const materials = useRef([]);
  const count = quality === 'quality' ? 14 : 8;
  const lights = useMemo(() => {
    const result = [];
    const courtY = courtSurfaceY(radius);

    [-1, 1].forEach((side) => {
      for (let index = 0; index < count; index += 1) {
        const progress = count === 1 ? 0.5 : index / (count - 1);
        result.push({
          side,
          index,
          position: [THREE.MathUtils.lerp(-0.31, 0.31, progress), courtY + 0.019, side * 0.206],
          color: index % 3 === 0 ? '#f2c376' : '#b53432'
        });
      }
    });
    return result;
  }, [count, radius]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    materials.current.forEach((material, index) => {
      if (!material) return;
      const light = lights[index];
      const phase = light.index / count * Math.PI * 2 + light.side * 0.65;
      const wave = Math.pow(Math.max(0, Math.sin(time * 1.45 - phase)), 5);
      material.opacity = 0.1 + wave * 0.58;
    });
  });

  return (
    <group>
      {lights.map((light, index) => (
        <mesh key={`${light.side}-${light.index}`} position={light.position}>
          <boxGeometry args={[0.032, 0.004, 0.008]} />
          <meshBasicMaterial
            ref={(material) => { materials.current[index] = material; }}
            color={light.color}
            transparent
            opacity={0.12}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function CourtDynamics({ radius, quality }) {
  return (
    <group>
      <SidelineLightWave radius={radius} quality={quality} />
      <ReplayBall radius={radius} quality={quality} />
    </group>
  );
}
