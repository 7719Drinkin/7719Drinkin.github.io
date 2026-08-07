import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

const CIVILIZATIONS = [
  {
    id: 'bastion',
    direction: [0.64, 0.42, 0.64],
    rotationY: -0.45,
    palette: {
      base: '#6e5a35',
      structure: '#b89a5c',
      accent: '#f0d58d',
      signal: '#d8b760'
    },
    variant: 'bastion'
  },
  {
    id: 'republic',
    direction: [-0.72, 0.35, 0.59],
    rotationY: 0.62,
    palette: {
      base: '#243f50',
      structure: '#55758a',
      accent: '#9fc9d5',
      signal: '#78d6e8'
    },
    variant: 'republic'
  },
  {
    id: 'arcology',
    direction: [0.16, -0.48, -0.86],
    rotationY: 0.18,
    palette: {
      base: '#183445',
      structure: '#2f7187',
      accent: '#85dbe1',
      signal: '#67d6db'
    },
    variant: 'arcology'
  }
];

const ROUTES = [
  [CIVILIZATIONS[0], CIVILIZATIONS[1]],
  [CIVILIZATIONS[1], CIVILIZATIONS[2]],
  [CIVILIZATIONS[2], CIVILIZATIONS[0]]
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
  const points = Array.from({ length: 18 }, (_, index) => {
    const t = index / 17;
    const direction = start.clone().lerp(end, t).normalize();
    const lift = Math.sin(t * Math.PI) * radius * 0.035;
    return direction.multiplyScalar(radius * 1.025 + lift);
  });
  return new THREE.CatmullRomCurve3(points);
}

function StrategicRoute({ start, end, radius, color, quality, phase }) {
  const curve = useMemo(
    () => createSurfaceCurve(start, end, radius),
    [end[0], end[1], end[2], radius, start[0], start[1], start[2]]
  );
  const pulse = useRef();
  const progress = useRef(phase);

  useFrame((_, delta) => {
    progress.current = (progress.current + delta * 0.045) % 1;
    if (pulse.current) pulse.current.position.copy(curve.getPointAt(progress.current));
  });

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, quality === 'quality' ? 72 : 36, radius * 0.004, 5, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} toneMapped={false} />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[radius * 0.018, quality === 'quality' ? 12 : 8, quality === 'quality' ? 8 : 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function TerritoryRing({ radius, color, quality }) {
  return (
    <mesh rotation-x={Math.PI / 2} position-y={radius * 0.012}>
      <torusGeometry args={[radius * 0.2, radius * 0.006, 5, quality === 'quality' ? 54 : 30]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} toneMapped={false} />
    </mesh>
  );
}

function BastionCity({ radius, palette, quality }) {
  const segments = quality === 'quality' ? 8 : 6;
  return (
    <group>
      <mesh position-y={radius * 0.025}>
        <cylinderGeometry args={[radius * 0.205, radius * 0.225, radius * 0.05, 8]} />
        <meshStandardMaterial color={palette.base} roughness={0.86} metalness={0.06} />
      </mesh>
      <mesh position-y={radius * 0.13}>
        <cylinderGeometry args={[radius * 0.07, radius * 0.105, radius * 0.21, segments]} />
        <meshStandardMaterial color={palette.structure} roughness={0.68} metalness={0.14} />
      </mesh>
      <mesh position-y={radius * 0.26}>
        <coneGeometry args={[radius * 0.09, radius * 0.1, segments]} />
        <meshStandardMaterial color={palette.accent} roughness={0.52} metalness={0.26} />
      </mesh>
      {[0, 1, 2, 3].map((index) => {
        const angle = index * Math.PI / 2 + Math.PI / 4;
        return (
          <mesh
            key={index}
            position={[
              Math.cos(angle) * radius * 0.135,
              radius * 0.078,
              Math.sin(angle) * radius * 0.135
            ]}
          >
            <cylinderGeometry args={[radius * 0.035, radius * 0.045, radius * 0.13, segments]} />
            <meshStandardMaterial color={palette.structure} roughness={0.7} metalness={0.12} />
          </mesh>
        );
      })}
      <TerritoryRing radius={radius} color={palette.signal} quality={quality} />
    </group>
  );
}

function RepublicCity({ radius, palette, quality }) {
  return (
    <group>
      <mesh position-y={radius * 0.02}>
        <cylinderGeometry args={[radius * 0.215, radius * 0.23, radius * 0.04, 12]} />
        <meshStandardMaterial color={palette.base} roughness={0.8} metalness={0.12} />
      </mesh>
      {[-0.1, 0, 0.1].map((x, index) => (
        <mesh key={x} position={[radius * x, radius * (0.12 + index * 0.028), 0]}>
          <boxGeometry args={[radius * 0.07, radius * (0.19 + index * 0.055), radius * 0.08]} />
          <meshStandardMaterial color={palette.structure} roughness={0.55} metalness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, radius * 0.235, radius * 0.005]}>
        <octahedronGeometry args={[radius * 0.045, 0]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.signal}
          emissiveIntensity={0.24}
          roughness={0.38}
          metalness={0.3}
        />
      </mesh>
      <TerritoryRing radius={radius} color={palette.signal} quality={quality} />
    </group>
  );
}

function ArcologyCity({ radius, palette, quality }) {
  const ringSegments = quality === 'quality' ? 56 : 30;
  return (
    <group>
      <mesh position-y={radius * 0.018}>
        <cylinderGeometry args={[radius * 0.22, radius * 0.235, radius * 0.036, 14]} />
        <meshStandardMaterial color={palette.base} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position-y={radius * 0.14}>
        <cylinderGeometry args={[radius * 0.05, radius * 0.085, radius * 0.24, 10]} />
        <meshStandardMaterial color={palette.structure} roughness={0.42} metalness={0.38} />
      </mesh>
      <mesh position-y={radius * 0.17} rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius * 0.115, radius * 0.016, 7, ringSegments]} />
        <meshStandardMaterial color={palette.accent} roughness={0.34} metalness={0.42} />
      </mesh>
      <mesh position-y={radius * 0.285}>
        <sphereGeometry args={[radius * 0.04, 12, 8]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.signal}
          emissiveIntensity={0.26}
          roughness={0.34}
          metalness={0.32}
        />
      </mesh>
      <TerritoryRing radius={radius} color={palette.signal} quality={quality} />
    </group>
  );
}

function CivilizationRegion({ civilization, radius, quality }) {
  const commonProps = {
    radius,
    palette: civilization.palette,
    quality
  };

  return (
    <SurfaceAnchor
      direction={civilization.direction}
      radius={radius}
      offset={radius * 0.025}
      rotationY={civilization.rotationY}
    >
      {civilization.variant === 'bastion' ? (
        <BastionCity {...commonProps} />
      ) : civilization.variant === 'republic' ? (
        <RepublicCity {...commonProps} />
      ) : (
        <ArcologyCity {...commonProps} />
      )}
    </SurfaceAnchor>
  );
}

function FrontierMarkers({ radius, quality }) {
  const markers = useMemo(() => {
    const count = quality === 'quality' ? 18 : 9;
    return Array.from({ length: count }, (_, index) => {
      const longitude = index / count * Math.PI * 2;
      const latitude = Math.sin(index * 1.73) * 0.5;
      const cosLatitude = Math.cos(latitude);
      return {
        direction: [
          Math.cos(longitude) * cosLatitude,
          Math.sin(latitude),
          Math.sin(longitude) * cosLatitude
        ],
        rotationY: longitude,
        color: index % 3 === 0 ? '#d7b763' : '#6fc8da'
      };
    });
  }, [quality]);

  return markers.map((marker, index) => (
    <SurfaceAnchor
      key={index}
      direction={marker.direction}
      radius={radius}
      offset={radius * 0.016}
      rotationY={marker.rotationY}
    >
      <group>
        <mesh position-y={radius * 0.033}>
          <cylinderGeometry args={[radius * 0.0035, radius * 0.0045, radius * 0.066, 5]} />
          <meshStandardMaterial color="#314451" roughness={0.78} metalness={0.18} />
        </mesh>
        <mesh position={[radius * 0.017, radius * 0.054, 0]} rotation-z={-0.16}>
          <coneGeometry args={[radius * 0.018, radius * 0.038, 3]} />
          <meshBasicMaterial color={marker.color} transparent opacity={0.76} toneMapped={false} />
        </mesh>
      </group>
    </SurfaceAnchor>
  ));
}

export default function GameCivilizationLayer({ radius, quality }) {
  return (
    <group>
      {CIVILIZATIONS.map((civilization) => (
        <CivilizationRegion
          key={civilization.id}
          civilization={civilization}
          radius={radius}
          quality={quality}
        />
      ))}

      {ROUTES.map(([start, end], index) => (
        <StrategicRoute
          key={`${start.id}-${end.id}`}
          start={start.direction}
          end={end.direction}
          radius={radius}
          color={index === 1 ? '#6fd2df' : '#d6b45f'}
          quality={quality}
          phase={index / ROUTES.length}
        />
      ))}

      <FrontierMarkers radius={radius} quality={quality} />
    </group>
  );
}
