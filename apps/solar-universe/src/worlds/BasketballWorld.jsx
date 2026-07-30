import { useMemo } from 'react';
import * as THREE from 'three';
import Number23Monument from '../basketball/Number23Monument.jsx';
import ChampionshipGallery from '../basketball/ChampionshipGallery.jsx';

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

function createTerrain(radius, detail) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const colors = [];
  const color = new THREE.Color();
  const palette = ['#211c19', '#45352c', '#725744', '#9b7658'];

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const normal = vertex.clone().normalize();
    const n1 = Math.sin(normal.x * 81.7 + normal.y * 141.3 + normal.z * 57.9 + 23) * 0.5 + 0.5;
    const n2 = Math.sin(normal.x * 233.4 + normal.y * 87.2 + normal.z * 119.8 + 9) * 0.5 + 0.5;
    const bands = Math.sin(normal.y * 8.2 + n1 * 2.8) * 0.5 + 0.5;
    const displacement = (n1 - 0.5) * radius * 0.075 + (n2 - 0.5) * radius * 0.026 + (bands - 0.5) * radius * 0.018;
    vertex.addScaledVector(normal, displacement);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);

    const slope = Math.abs(normal.y);
    const paletteIndex = n2 > 0.72 ? 3 : slope > 0.7 ? 2 : n1 > 0.48 ? 1 : 0;
    color.set(palette[paletteIndex]);
    const shade = 0.74 + n1 * 0.22 + slope * 0.08;
    colors.push(color.r * shade, color.g * shade, color.b * shade);
  }

  position.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function Hoop({ x, direction, y }) {
  return (
    <group position={[x, y, 0]} rotation-y={direction > 0 ? Math.PI / 2 : -Math.PI / 2}>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.017, 0.025, 0.4, 8]} />
        <meshStandardMaterial color="#322a26" roughness={0.72} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.42, -0.13]}>
        <boxGeometry args={[0.27, 0.17, 0.018]} />
        <meshStandardMaterial color="#dfdbd2" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.36, -0.23]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.065, 0.009, 8, 28]} />
        <meshStandardMaterial color="#b31b2c" emissive="#3c000a" emissiveIntensity={0.3} roughness={0.42} metalness={0.25} />
      </mesh>
    </group>
  );
}

function Floodlight({ position }) {
  return (
    <group position={position}>
      <mesh position-y={0.24}>
        <cylinderGeometry args={[0.012, 0.018, 0.48, 6]} />
        <meshStandardMaterial color="#2c2825" roughness={0.84} metalness={0.18} />
      </mesh>
      <mesh position-y={0.5} rotation-x={-0.22}>
        <boxGeometry args={[0.1, 0.05, 0.04]} />
        <meshStandardMaterial color="#ffe0a9" emissive="#ff9430" emissiveIntensity={2.2} roughness={0.24} />
      </mesh>
      <pointLight position={[0, 0.48, 0]} color="#ffb25f" intensity={0.8} distance={2.1} decay={2} />
    </group>
  );
}

function LastCourt({ radius, quality }) {
  const audience = useMemo(() => {
    const random = seededRandom(1998);
    return Array.from({ length: quality === 'quality' ? 58 : 24 }, (_, index) => {
      const side = index % 2 ? 1 : -1;
      return {
        position: [(random() - 0.5) * 0.58, radius * 1.11 + random() * 0.055, side * (0.37 + random() * 0.09)],
        scale: 0.006 + random() * 0.008
      };
    });
  }, [quality, radius]);

  const y = radius * 1.055;
  return (
    <group>
      <mesh position-y={radius * 0.89}>
        <cylinderGeometry args={[0.72, 0.86, 0.14, 14]} />
        <meshStandardMaterial color="#60483a" roughness={0.94} flatShading />
      </mesh>
      <mesh position-y={radius * 0.975}>
        <cylinderGeometry args={[0.64, 0.73, 0.11, 14]} />
        <meshStandardMaterial color="#805d49" roughness={0.9} flatShading />
      </mesh>
      <mesh position-y={radius}>
        <boxGeometry args={[1.13, 0.12, 0.7]} />
        <meshStandardMaterial color="#3d3029" roughness={0.94} flatShading />
      </mesh>
      <mesh position-y={y}>
        <boxGeometry args={[1.02, 0.03, 0.59]} />
        <meshStandardMaterial color="#6e3e33" roughness={0.8} />
      </mesh>

      {[-0.278, 0.278].map((z) => (
        <mesh key={`hz-${z}`} position={[0, y + 0.02, z]}>
          <boxGeometry args={[0.96, 0.006, 0.011]} />
          <meshBasicMaterial color="#f1e9dc" />
        </mesh>
      ))}
      {[-0.474, 0, 0.474].map((x) => (
        <mesh key={`vt-${x}`} position={[x, y + 0.02, 0]}>
          <boxGeometry args={[0.011, 0.006, 0.55]} />
          <meshBasicMaterial color="#f1e9dc" />
        </mesh>
      ))}
      <mesh position-y={y + 0.023} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.1, 0.0055, 6, 32]} />
        <meshBasicMaterial color="#f1e9dc" />
      </mesh>

      <Hoop x={0.41} direction={1} y={radius * 1.06} />
      <Hoop x={-0.41} direction={-1} y={radius * 1.06} />

      {[[-0.53, radius * 1.01, -0.38], [0.53, radius * 1.01, -0.38], [-0.53, radius * 1.01, 0.38], [0.53, radius * 1.01, 0.38]].map((position, index) => (
        <Floodlight key={index} position={position} />
      ))}

      {audience.map((person, index) => (
        <mesh key={index} position={person.position} scale={person.scale}>
          <sphereGeometry args={[1, 5, 4]} />
          <meshBasicMaterial color="#ffc578" />
        </mesh>
      ))}
    </group>
  );
}

export default function BasketballWorld({ radius, quality }) {
  const geometry = useMemo(
    () => createTerrain(radius, quality === 'quality' ? 5 : 3),
    [quality, radius]
  );

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
      </mesh>
      <LastCourt radius={radius} quality={quality} />
      <Number23Monument radius={radius} />
      <ChampionshipGallery radius={radius} />
    </group>
  );
}
