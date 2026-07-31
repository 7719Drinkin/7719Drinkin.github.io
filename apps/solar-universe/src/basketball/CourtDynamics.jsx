import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function smoothstep(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function ReplayBall({ radius }) {
  const root = useRef();
  const ball = useRef();
  const glow = useRef();
  const courtY = radius + 0.045;
  const ballRadius = radius * 0.026;

  useFrame(({ clock }, delta) => {
    const cycle = (clock.elapsedTime % 8.2) / 8.2;
    let x;
    let y;
    let z;
    let visibility = 1;

    if (cycle < 0.58) {
      const progress = smoothstep(cycle / 0.58);
      const bounce = Math.pow(Math.abs(Math.sin(progress * Math.PI * 4)), 0.72);
      x = THREE.MathUtils.lerp(-0.22, 0.055, progress);
      z = THREE.MathUtils.lerp(0.045, 0.005, progress);
      y = courtY + ballRadius + 0.012 + bounce * radius * 0.085;
    } else if (cycle < 0.9) {
      const progress = (cycle - 0.58) / 0.32;
      x = THREE.MathUtils.lerp(0.055, 0.205, progress);
      z = THREE.MathUtils.lerp(0.005, -0.085, progress);
      y = courtY + radius * 0.105 + Math.sin(progress * Math.PI) * radius * 0.235;
    } else {
      const progress = (cycle - 0.9) / 0.1;
      x = 0.205;
      z = -0.085;
      y = courtY + radius * 0.07 - progress * radius * 0.035;
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

    if (glow.current) {
      glow.current.material.opacity = visibility * 0.13;
      glow.current.scale.setScalar(1.25 + Math.sin(clock.elapsedTime * 5) * 0.08);
    }
  });

  return (
    <group ref={root}>
      <group ref={ball}>
        <mesh>
          <sphereGeometry args={[ballRadius, 20, 14]} />
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

      <mesh ref={glow} rotation-x={Math.PI / 2} position-y={-ballRadius * 1.15}>
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
    [-1, 1].forEach((side) => {
      for (let index = 0; index < count; index += 1) {
        const progress = count === 1 ? 0.5 : index / (count - 1);
        result.push({
          side,
          index,
          position: [THREE.MathUtils.lerp(-0.31, 0.31, progress), radius + 0.064, side * 0.206],
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
      <ReplayBall radius={radius} />
    </group>
  );
}
