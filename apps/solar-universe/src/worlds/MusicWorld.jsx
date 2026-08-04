import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createStylizedTerrain } from './stylizedTerrain.js';

const UP = new THREE.Vector3(0, 1, 0);
const MICROPHONE_DIRECTION = [0.02, 0.96, -0.28];
const HEADPHONE_DIRECTION = [0.68, 0.53, 0.5];
const VINYL_DIRECTION = [0.56, 0.16, -0.81];

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vObjectPosition = position;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const CLOUD_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec3 uCloudColor;
  uniform vec3 uHighlightColor;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = abs(dot(normalize(vWorldNormal), viewDirection));
    float fresnel = pow(1.0 - facing, 2.15);
    vec3 p = normalize(vObjectPosition);

    float broad = sin(p.x * 9.0 + p.z * 5.0 + uTime * 0.055);
    float folded = sin(p.y * 18.0 - p.x * 8.0 - uTime * 0.082);
    float detail = sin((p.x + p.y + p.z) * 31.0 + uTime * 0.12);
    float cloud = smoothstep(-0.38, 0.72, broad * 0.48 + folded * 0.36 + detail * 0.16);
    float banding = 0.68 + 0.32 * sin(p.y * 24.0 + p.x * 3.0);
    cloud *= banding;

    vec3 color = mix(uCloudColor, uHighlightColor, fresnel * 0.72 + cloud * 0.24);
    float alpha = 0.025 + cloud * 0.075 + fresnel * (0.13 + cloud * 0.16);
    gl_FragColor = vec4(color, alpha);
  }
`;

const HALO_FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uInnerColor;
  uniform vec3 uOuterColor;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = abs(dot(normalize(vWorldNormal), viewDirection));
    float rim = pow(1.0 - facing, 2.55);
    vec3 color = mix(uInnerColor, uOuterColor, rim);
    float alpha = rim * 0.34;
    gl_FragColor = vec4(color, alpha);
  }
`;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function directionFromLatLon(latitudeDegrees, longitudeDegrees) {
  const latitude = THREE.MathUtils.degToRad(latitudeDegrees);
  const longitude = THREE.MathUtils.degToRad(longitudeDegrees);
  const cosLatitude = Math.cos(latitude);
  return [
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    cosLatitude * Math.sin(longitude)
  ];
}

function createAnchorTransform(direction, radius, offset = 0) {
  const normal = new THREE.Vector3(...direction).normalize();
  return {
    normal,
    position: normal.clone().multiplyScalar(radius + offset),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal)
  };
}

function SurfaceAnchor({ direction, radius, offset = 0, rotationY = 0, children }) {
  const transform = useMemo(
    () => createAnchorTransform(direction, radius, offset),
    [direction[0], direction[1], direction[2], offset, radius]
  );

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <group rotation-y={rotationY}>{children}</group>
    </group>
  );
}

function createVegetationData(radius, quality) {
  const random = seededRandom(9103);
  const landmarkDirections = [
    new THREE.Vector3(...MICROPHONE_DIRECTION).normalize(),
    new THREE.Vector3(...HEADPHONE_DIRECTION).normalize(),
    new THREE.Vector3(...VINYL_DIRECTION).normalize()
  ];
  const treeCount = quality === 'quality' ? 42 : 24;
  const bushCount = quality === 'quality' ? 64 : 34;
  const trees = [];
  const bushes = [];
  let attempts = 0;

  while (trees.length < treeCount && attempts < 1000) {
    attempts += 1;
    const y = random() * 1.82 - 0.82;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const direction = new THREE.Vector3(radial * Math.cos(angle), y, radial * Math.sin(angle));
    if (landmarkDirections.some((landmark) => landmark.dot(direction) > 0.925)) continue;

    trees.push({
      direction: direction.toArray(),
      height: radius * (0.105 + random() * 0.075),
      trunkRadius: radius * (0.008 + random() * 0.004),
      crownRadius: radius * (0.052 + random() * 0.035),
      crownScaleY: 0.72 + random() * 0.38,
      color: ['#315f42', '#477b4b', '#5a8b52', '#6b7650'][Math.floor(random() * 4)]
    });
  }

  attempts = 0;
  while (bushes.length < bushCount && attempts < 1400) {
    attempts += 1;
    const y = random() * 1.9 - 0.9;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const direction = new THREE.Vector3(radial * Math.cos(angle), y, radial * Math.sin(angle));
    if (landmarkDirections.some((landmark) => landmark.dot(direction) > 0.94)) continue;

    bushes.push({
      direction: direction.toArray(),
      radius: radius * (0.018 + random() * 0.024),
      color: ['#264d37', '#3e7046', '#725168', '#8b5b78', '#607f49'][Math.floor(random() * 5)]
    });
  }

  return { trees, bushes };
}

function Rainforest({ radius, quality }) {
  const trunks = useRef();
  const crowns = useRef();
  const bushes = useRef();
  const vegetation = useMemo(() => createVegetationData(radius, quality), [quality, radius]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const normal = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const base = new THREE.Vector3();

    vegetation.trees.forEach((tree, index) => {
      normal.set(...tree.direction).normalize();
      quaternion.setFromUnitVectors(UP, normal);
      base.copy(normal).multiplyScalar(radius + radius * 0.008);

      dummy.position.copy(base).addScaledVector(normal, tree.height * 0.5);
      dummy.quaternion.copy(quaternion);
      dummy.scale.set(tree.trunkRadius, tree.height, tree.trunkRadius);
      dummy.updateMatrix();
      trunks.current.setMatrixAt(index, dummy.matrix);
      trunks.current.setColorAt(index, new THREE.Color('#594431'));

      dummy.position.copy(base).addScaledVector(normal, tree.height + tree.crownRadius * 0.34);
      dummy.quaternion.copy(quaternion);
      dummy.scale.set(tree.crownRadius, tree.crownRadius * tree.crownScaleY, tree.crownRadius);
      dummy.updateMatrix();
      crowns.current.setMatrixAt(index, dummy.matrix);
      crowns.current.setColorAt(index, new THREE.Color(tree.color));
    });

    vegetation.bushes.forEach((bush, index) => {
      normal.set(...bush.direction).normalize();
      quaternion.setFromUnitVectors(UP, normal);
      base.copy(normal).multiplyScalar(radius + bush.radius * 0.45);
      dummy.position.copy(base);
      dummy.quaternion.copy(quaternion);
      dummy.scale.set(bush.radius * 1.15, bush.radius * 0.72, bush.radius);
      dummy.updateMatrix();
      bushes.current.setMatrixAt(index, dummy.matrix);
      bushes.current.setColorAt(index, new THREE.Color(bush.color));
    });

    [trunks.current, crowns.current, bushes.current].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [radius, vegetation]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[null, null, vegetation.trees.length]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial vertexColors roughness={0.94} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[null, null, vegetation.trees.length]}>
        <dodecahedronGeometry args={[1, quality === 'quality' ? 1 : 0]} />
        <meshStandardMaterial vertexColors roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={bushes} args={[null, null, vegetation.bushes.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial vertexColors roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function MicrophoneMonument({ radius }) {
  const s = radius;
  return (
    <group>
      <mesh position-y={s * 0.02}>
        <cylinderGeometry args={[s * 0.115, s * 0.135, s * 0.04, 18]} />
        <meshStandardMaterial color="#5d4332" roughness={0.78} metalness={0.08} />
      </mesh>
      <mesh position-y={s * 0.125}>
        <cylinderGeometry args={[s * 0.014, s * 0.022, s * 0.22, 10]} />
        <meshStandardMaterial color="#8a6041" roughness={0.48} metalness={0.34} />
      </mesh>
      <group position-y={s * 0.27}>
        <mesh scale={[s * 0.085, s * 0.115, s * 0.065]}>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial color="#a9764e" roughness={0.42} metalness={0.35} />
        </mesh>
        {[-0.058, -0.03, 0, 0.03, 0.058].map((y) => (
          <mesh key={y} position={[0, s * y, s * 0.061]}>
            <boxGeometry args={[s * 0.125, s * 0.009, s * 0.008]} />
            <meshStandardMaterial color="#2c211e" roughness={0.7} metalness={0.22} />
          </mesh>
        ))}
      </group>
      <mesh position-y={s * 0.02} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[s * 0.145, s * 0.16, 32]} />
        <meshBasicMaterial color="#ffc56e" transparent opacity={0.52} toneMapped={false} />
      </mesh>
    </group>
  );
}

function HeadphoneGate({ radius }) {
  const s = radius;
  return (
    <group>
      <mesh position-y={s * 0.13}>
        <torusGeometry args={[s * 0.15, s * 0.022, 10, 48, Math.PI]} />
        <meshStandardMaterial color="#7e563f" roughness={0.6} metalness={0.18} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * s * 0.15, s * 0.12, 0]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[s * 0.055, s * 0.055, s * 0.045, 18]} />
            <meshStandardMaterial color="#986a4a" roughness={0.52} metalness={0.2} />
          </mesh>
          <mesh position-z={s * 0.026} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[s * 0.034, s * 0.038, s * 0.012, 18]} />
            <meshStandardMaterial color="#2d2228" roughness={0.78} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, s * 0.095, -s * 0.018]}>
        <circleGeometry args={[s * 0.09, 32]} />
        <meshBasicMaterial
          color="#ffb05e"
          transparent
          opacity={0.22}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position-y={s * 0.012}>
        <cylinderGeometry args={[s * 0.19, s * 0.21, s * 0.024, 28]} />
        <meshStandardMaterial color="#504033" roughness={0.88} />
      </mesh>
    </group>
  );
}

function VinylLagoon({ radius }) {
  const s = radius;
  return (
    <group>
      <mesh position-y={s * 0.005}>
        <cylinderGeometry args={[s * 0.205, s * 0.22, s * 0.026, 40]} />
        <meshStandardMaterial color="#27515b" roughness={0.28} metalness={0.12} />
      </mesh>
      <mesh position-y={s * 0.024}>
        <cylinderGeometry args={[s * 0.158, s * 0.158, s * 0.012, 48]} />
        <meshStandardMaterial color="#17161c" roughness={0.3} metalness={0.28} />
      </mesh>
      {[0.055, 0.09, 0.125].map((groove) => (
        <mesh key={groove} position-y={s * 0.032} rotation-x={Math.PI / 2}>
          <torusGeometry args={[s * groove, s * 0.002, 5, 48]} />
          <meshBasicMaterial color="#8f718d" transparent opacity={0.34} />
        </mesh>
      ))}
      <mesh position-y={s * 0.035}>
        <cylinderGeometry args={[s * 0.04, s * 0.04, s * 0.014, 28]} />
        <meshStandardMaterial color="#b7654c" roughness={0.55} />
      </mesh>
      <mesh position-y={s * 0.044}>
        <cylinderGeometry args={[s * 0.008, s * 0.008, s * 0.026, 12]} />
        <meshStandardMaterial color="#d9aa70" roughness={0.36} metalness={0.4} />
      </mesh>
    </group>
  );
}

function PianoPath({ radius, quality }) {
  const keys = useMemo(() => {
    const count = quality === 'quality' ? 21 : 15;
    return Array.from({ length: count }, (_, index) => {
      const t = index / Math.max(1, count - 1);
      const latitude = 8 + t * 58;
      const longitude = -116 + t * 87 + Math.sin(t * Math.PI) * 15;
      return {
        direction: directionFromLatLon(latitude, longitude),
        rotationY: -0.48 + t * 0.82,
        black: index % 4 === 2 || index % 7 === 4
      };
    });
  }, [quality]);

  return keys.map((key, index) => (
    <SurfaceAnchor
      key={index}
      direction={key.direction}
      radius={radius}
      offset={radius * 0.014}
      rotationY={key.rotationY}
    >
      <mesh position-y={key.black ? radius * 0.012 : 0}>
        <boxGeometry
          args={[
            radius * (key.black ? 0.052 : 0.068),
            radius * 0.022,
            radius * (key.black ? 0.078 : 0.11)
          ]}
        />
        <meshStandardMaterial
          color={key.black ? '#242129' : '#e7d9c4'}
          roughness={key.black ? 0.58 : 0.78}
          metalness={0.02}
        />
      </mesh>
    </SurfaceAnchor>
  ));
}

function NotePlant({ radius, direction, rotationY = 0, color = '#ffc26e' }) {
  return (
    <SurfaceAnchor direction={direction} radius={radius} offset={radius * 0.012} rotationY={rotationY}>
      <group>
        <mesh position={[radius * 0.018, radius * 0.052, 0]}>
          <cylinderGeometry args={[radius * 0.004, radius * 0.005, radius * 0.105, 6]} />
          <meshStandardMaterial color="#76574a" roughness={0.82} />
        </mesh>
        <mesh position={[0, radius * 0.018, 0]} scale={[1.25, 0.78, 1]}>
          <sphereGeometry args={[radius * 0.025, 12, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[radius * 0.018, radius * 0.105, 0]} rotation-z={-0.42}>
          <boxGeometry args={[radius * 0.055, radius * 0.009, radius * 0.008]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    </SurfaceAnchor>
  );
}

function GlowingDiscoveries({ radius }) {
  const notes = [
    { direction: directionFromLatLon(28, 18), color: '#ffbc68', rotationY: 0.2 },
    { direction: directionFromLatLon(-2, 75), color: '#d993ff', rotationY: -0.7 },
    { direction: directionFromLatLon(15, -25), color: '#72d8d1', rotationY: 0.8 },
    { direction: directionFromLatLon(-22, -132), color: '#ff879f', rotationY: -0.2 },
    { direction: directionFromLatLon(52, 122), color: '#ffd27d', rotationY: 1.1 }
  ];

  return notes.map((note, index) => (
    <NotePlant key={index} radius={radius} {...note} />
  ));
}

function MusicAtmosphere({ radius, quality }) {
  const cloudMaterial = useRef();
  const cloudUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCloudColor: { value: new THREE.Color('#d89a55') },
    uHighlightColor: { value: new THREE.Color('#ffe0a0') }
  }), []);
  const haloUniforms = useMemo(() => ({
    uInnerColor: { value: new THREE.Color('#d98b4e') },
    uOuterColor: { value: new THREE.Color('#ffd58a') }
  }), []);

  useFrame((_, delta) => {
    if (cloudMaterial.current) cloudMaterial.current.uniforms.uTime.value += delta;
  });

  const segments = quality === 'quality' ? 96 : 56;

  return (
    <group>
      <mesh scale={1.09}>
        <sphereGeometry args={[radius, segments, Math.round(segments * 0.68)]} />
        <shaderMaterial
          ref={cloudMaterial}
          uniforms={cloudUniforms}
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={CLOUD_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.2}>
        <sphereGeometry args={[radius, segments, Math.round(segments * 0.68)]} />
        <shaderMaterial
          uniforms={haloUniforms}
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={HALO_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function SoundWaveRings({ radius, quality }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.035;
  });

  const segments = quality === 'quality' ? 160 : 80;
  return (
    <group ref={group}>
      <mesh rotation={[0.92, 0.22, -0.16]}>
        <torusGeometry args={[radius * 1.3, radius * 0.006, 6, segments]} />
        <meshBasicMaterial color="#d69cff" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <mesh rotation={[1.15, -0.48, 0.28]}>
        <torusGeometry args={[radius * 1.38, radius * 0.004, 6, segments]} />
        <meshBasicMaterial color="#ffb36d" transparent opacity={0.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

const MUSIC_FEATURES = [
  {
    direction: MICROPHONE_DIRECTION,
    radius: 0.3,
    softness: 0.16,
    elevation: 0.018,
    color: '#786340',
    colorStrength: 0.55
  },
  {
    direction: HEADPHONE_DIRECTION,
    radius: 0.34,
    softness: 0.18,
    elevation: 0.012,
    color: '#4f7044',
    colorStrength: 0.62
  },
  {
    direction: VINYL_DIRECTION,
    radius: 0.31,
    softness: 0.17,
    elevation: -0.012,
    color: '#244c52',
    colorStrength: 0.62
  },
  {
    direction: [-0.62, 0.2, 0.76],
    radius: 0.55,
    softness: 0.22,
    elevation: 0.008,
    color: '#305a3c',
    colorStrength: 0.76
  },
  {
    direction: [0.02, -0.52, 0.85],
    radius: 0.48,
    softness: 0.2,
    elevation: 0.006,
    color: '#704d6c',
    colorStrength: 0.38
  }
];

const MUSIC_BANDS = [
  {
    normal: [0.2, 0.96, -0.18],
    width: 0.068,
    softness: 0.06,
    elevation: -0.004,
    frequency: 9,
    color: '#876a47',
    colorStrength: 0.32
  },
  {
    normal: [-0.76, 0.15, 0.63],
    width: 0.045,
    softness: 0.05,
    elevation: 0.008,
    frequency: 13,
    color: '#795779',
    colorStrength: 0.26
  }
];

const MUSIC_FLATTEN_ZONES = [
  {
    direction: MICROPHONE_DIRECTION,
    mode: 'plane',
    radius: 0.22,
    softness: 0.14,
    target: 0.015,
    strength: 1,
    color: '#72573d',
    colorStrength: 0.34
  },
  {
    direction: HEADPHONE_DIRECTION,
    mode: 'plane',
    radius: 0.24,
    softness: 0.14,
    target: 0.008,
    strength: 1,
    color: '#40543c',
    colorStrength: 0.28
  },
  {
    direction: VINYL_DIRECTION,
    mode: 'plane',
    radius: 0.25,
    softness: 0.15,
    target: -0.006,
    strength: 1,
    color: '#28494c',
    colorStrength: 0.42
  }
];

export default function MusicWorld({ radius, quality }) {
  const geometry = useMemo(() => createStylizedTerrain({
    radius,
    detail: quality === 'quality' ? 5 : 4,
    seed: 91,
    relief: 0.72,
    features: MUSIC_FEATURES,
    bands: MUSIC_BANDS,
    flattenZones: MUSIC_FLATTEN_ZONES,
    palette: {
      low: '#132a29',
      mid: '#284f39',
      high: '#667348',
      accent: '#8d5d73',
      accent2: '#b18366',
      shadowTint: '#101b25',
      highlightTint: '#c6a66e'
    }
  }), [quality, radius]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.86} metalness={0.01} dithering />
      </mesh>

      <Rainforest radius={radius} quality={quality} />
      <PianoPath radius={radius} quality={quality} />

      <SurfaceAnchor
        direction={MICROPHONE_DIRECTION}
        radius={radius}
        offset={radius * 0.018}
        rotationY={-0.18}
      >
        <MicrophoneMonument radius={radius} />
      </SurfaceAnchor>

      <SurfaceAnchor
        direction={HEADPHONE_DIRECTION}
        radius={radius}
        offset={radius * 0.014}
        rotationY={-0.72}
      >
        <HeadphoneGate radius={radius} />
      </SurfaceAnchor>

      <SurfaceAnchor
        direction={VINYL_DIRECTION}
        radius={radius}
        offset={radius * 0.008}
        rotationY={0.42}
      >
        <VinylLagoon radius={radius} />
      </SurfaceAnchor>

      <GlowingDiscoveries radius={radius} />
      <MusicAtmosphere radius={radius} quality={quality} />
      <SoundWaveRings radius={radius} quality={quality} />
    </group>
  );
}
