import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform float uOpacity;
  uniform float uRimPower;
  uniform float uRimStart;
  uniform float uRimEnd;
  uniform float uEdgeFadeStart;
  uniform float uEdgeFadeStrength;
  uniform vec3 uShadowColor;
  uniform vec3 uLightColor;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normalDirection = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(-vWorldPosition);

    float viewAlignment = clamp(abs(dot(normalDirection, viewDirection)), 0.0, 1.0);
    float rimBase = pow(max(1.0 - viewAlignment, 0.0), uRimPower);
    float rim = smoothstep(uRimStart, uRimEnd, rimBase);

    float edgeFade = 1.0 - smoothstep(uEdgeFadeStart, 1.0, rimBase);
    rim *= mix(1.0, edgeFade, uEdgeFadeStrength);

    float sunDot = dot(normalDirection, sunDirection);
    float daylight = smoothstep(-0.24, 0.72, sunDot);
    float terminator = pow(max(1.0 - abs(sunDot), 0.0), 3.0) * 0.12;

    vec3 color = mix(uShadowColor, uLightColor, daylight);
    float alpha = rim * (mix(0.24, 1.0, daylight) + terminator) * uOpacity;

    if (alpha < 0.001) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function createRegion(centerValue, count, spread, seed, palette) {
  const random = seededRandom(seed);
  const center = new THREE.Vector3(...centerValue).normalize();
  const helper = Math.abs(center.y) < 0.9 ? UP : X_AXIS;
  const tangent = new THREE.Vector3().crossVectors(center, helper).normalize();
  const bitangent = new THREE.Vector3().crossVectors(center, tangent).normalize();

  return Array.from({ length: count }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * spread;
    const direction = center.clone()
      .addScaledVector(tangent, Math.cos(angle) * distance)
      .addScaledVector(bitangent, Math.sin(angle) * distance)
      .normalize();

    return {
      direction,
      scale: 0.72 + random() * 0.58,
      yaw: random() * Math.PI * 2,
      color: palette[index % palette.length]
    };
  });
}

function setInstanceTransform(mesh, item, radius, surfaceOffset, localHeight, localScale = 1) {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, item.direction);
  const yaw = new THREE.Quaternion().setFromAxisAngle(UP, item.yaw);
  quaternion.multiply(yaw);

  const matrix = new THREE.Matrix4();
  const position = item.direction.clone().multiplyScalar(
    radius + surfaceOffset + localHeight * item.scale * 0.5
  );
  const scale = new THREE.Vector3(
    item.scale * localScale,
    item.scale * localScale,
    item.scale * localScale
  );
  matrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(item.index, matrix);
  if (item.color) mesh.setColorAt(item.index, new THREE.Color(item.color));
}

function VegetationField({ radius, quality }) {
  const grass = useRef();
  const bushes = useRef();
  const trunks = useRef();
  const canopies = useRef();

  const vegetation = useMemo(() => {
    const density = quality === 'quality' ? 1 : 0.55;
    const grassItems = [
      ...createRegion([-0.78, 0.2, 0.59], Math.round(23 * density), 0.37, 231, ['#315f3d', '#47794a', '#618452']),
      ...createRegion([0.18, 0.54, 0.82], Math.round(15 * density), 0.3, 419, ['#8c8144', '#aa9650', '#c0a55d']),
      ...createRegion([-0.22, -0.04, -0.97], Math.round(13 * density), 0.24, 617, ['#2f6946', '#427b50', '#548a5b'])
    ];
    const bushItems = [
      ...createRegion([-0.8, 0.18, 0.56], Math.round(9 * density), 0.32, 811, ['#315f40', '#477a4d']),
      ...createRegion([-0.22, -0.04, -0.97], Math.round(6 * density), 0.2, 913, ['#2c6243', '#4f8053'])
    ];
    const treeItems = [
      ...createRegion([-0.78, 0.24, 0.57], Math.max(4, Math.round(8 * density)), 0.28, 1121, ['#3d7248', '#548653']),
      ...createRegion([-0.25, -0.02, -0.96], Math.max(2, Math.round(4 * density)), 0.16, 1297, ['#376d48', '#4c8054'])
    ];

    return {
      grass: grassItems.map((item, index) => ({ ...item, index })),
      bushes: bushItems.map((item, index) => ({ ...item, index })),
      trees: treeItems.map((item, index) => ({ ...item, index }))
    };
  }, [quality]);

  useLayoutEffect(() => {
    vegetation.grass.forEach((item) => setInstanceTransform(grass.current, item, radius, 0.02, 0.056));
    vegetation.bushes.forEach((item) => setInstanceTransform(bushes.current, item, radius, 0.021, 0.052));
    vegetation.trees.forEach((item) => {
      setInstanceTransform(trunks.current, item, radius, 0.018, 0.13, 0.9);
      const canopyItem = { ...item, direction: item.direction.clone(), index: item.index };
      const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, canopyItem.direction);
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, canopyItem.yaw));
      const matrix = new THREE.Matrix4();
      const position = canopyItem.direction.clone().multiplyScalar(radius + 0.018 + 0.16 * canopyItem.scale);
      matrix.compose(
        position,
        quaternion,
        new THREE.Vector3(canopyItem.scale, canopyItem.scale * 1.08, canopyItem.scale)
      );
      canopies.current.setMatrixAt(canopyItem.index, matrix);
      canopies.current.setColorAt(canopyItem.index, new THREE.Color(canopyItem.color));
    });

    [grass.current, bushes.current, trunks.current, canopies.current].forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [radius, vegetation]);

  return (
    <group>
      <instancedMesh ref={grass} args={[null, null, vegetation.grass.length]}>
        <coneGeometry args={[0.012, 0.056, 5]} />
        <meshStandardMaterial vertexColors roughness={0.94} />
      </instancedMesh>
      <instancedMesh ref={bushes} args={[null, null, vegetation.bushes.length]}>
        <icosahedronGeometry args={[0.043, 1]} />
        <meshStandardMaterial vertexColors roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[null, null, vegetation.trees.length]}>
        <cylinderGeometry args={[0.009, 0.014, 0.13, 7]} />
        <meshStandardMaterial color="#493326" roughness={0.96} />
      </instancedMesh>
      <instancedMesh ref={canopies} args={[null, null, vegetation.trees.length]}>
        <icosahedronGeometry args={[0.068, 1]} />
        <meshStandardMaterial vertexColors roughness={0.91} />
      </instancedMesh>
    </group>
  );
}

function surfaceAnchor(direction, radius, offset) {
  const normal = new THREE.Vector3(...direction).normalize();
  return {
    position: normal.clone().multiplyScalar(radius + offset),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal)
  };
}

function TrailLight({ radius, angle, latitude }) {
  const horizontal = Math.cos(latitude);
  const direction = [
    Math.cos(angle) * horizontal,
    Math.sin(latitude),
    Math.sin(angle) * horizontal
  ];
  const anchor = surfaceAnchor(direction, radius, 0.028);

  return (
    <group
      position={anchor.position.toArray()}
      quaternion={anchor.quaternion}
      rotation-y={angle + Math.PI / 2}
    >
      <mesh position={[0, 0.045, 0.034]}>
        <cylinderGeometry args={[0.004, 0.006, 0.09, 7]} />
        <meshStandardMaterial color="#342d28" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.094, 0.034]}>
        <sphereGeometry args={[0.009, 10, 7]} />
        <meshStandardMaterial
          color="#ffe4aa"
          emissive="#c97127"
          emissiveIntensity={0.38}
          roughness={0.42}
        />
      </mesh>
      <pointLight
        position={[0, 0.07, 0]}
        color="#ffd09a"
        intensity={0.085}
        distance={0.34}
        decay={2.2}
      />
    </group>
  );
}

function DenseTrainingTrail({ radius, quality }) {
  const count = quality === 'quality' ? 96 : 58;
  const segmentLength = radius * Math.PI * 2 / count * 0.86;
  const segments = useMemo(() => Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2;
    const monumentGap = angle > 1.02 && angle < 2.08;
    if (monumentGap) return null;
    const latitude = -0.15 + Math.sin(angle * 3 + 0.4) * 0.037;
    const horizontal = Math.cos(latitude);
    return {
      angle,
      latitude,
      direction: [
        Math.cos(angle) * horizontal,
        Math.sin(latitude),
        Math.sin(angle) * horizontal
      ]
    };
  }).filter(Boolean), [count]);

  const lampCount = quality === 'quality' ? 6 : 4;
  const lamps = useMemo(() => Array.from({ length: lampCount }, (_, index) => {
    let angle = 0.25 + index / lampCount * Math.PI * 2;
    if (angle > 1.02 && angle < 2.08) angle = 2.22;
    return {
      angle,
      latitude: -0.15 + Math.sin(angle * 3 + 0.4) * 0.037
    };
  }), [lampCount]);

  return (
    <group>
      {segments.map((segment, index) => {
        const anchor = surfaceAnchor(segment.direction, radius, 0.027);
        return (
          <group
            key={index}
            position={anchor.position.toArray()}
            quaternion={anchor.quaternion}
            rotation-y={segment.angle + Math.PI / 2}
          >
            <mesh position-y={0.002}>
              <boxGeometry args={[segmentLength * 1.05, 0.006, 0.041]} />
              <meshStandardMaterial color="#44352e" roughness={0.94} />
            </mesh>
            <mesh position-y={0.006}>
              <boxGeometry args={[segmentLength, 0.005, 0.025]} />
              <meshStandardMaterial
                color={index % 5 === 0 ? '#d5bea0' : index % 2 ? '#9d5b43' : '#b46c4d'}
                roughness={0.82}
              />
            </mesh>
          </group>
        );
      })}
      {lamps.map((lamp, index) => (
        <TrailLight key={index} radius={radius} {...lamp} />
      ))}
    </group>
  );
}

function AtmosphereLayer({ radius, quality, outer = false }) {
  const uniforms = useMemo(() => ({
    uOpacity: {
      value: outer
        ? (quality === 'quality' ? 0.052 : 0.032)
        : (quality === 'quality' ? 0.058 : 0.036)
    },
    uRimPower: { value: outer ? 3.35 : 5.2 },
    uRimStart: { value: outer ? 0.08 : 0.22 },
    uRimEnd: { value: outer ? 0.78 : 0.9 },
    uEdgeFadeStart: { value: outer ? 0.7 : 0.9 },
    uEdgeFadeStrength: { value: outer ? 1 : 0.28 },
    uShadowColor: { value: new THREE.Color(outer ? '#38556b' : '#45667a') },
    uLightColor: { value: new THREE.Color(outer ? '#9fc6d3' : '#b8dbe4') }
  }), [outer, quality]);

  const widthSegments = quality === 'quality' ? 64 : 36;
  const heightSegments = quality === 'quality' ? 48 : 24;
  const shellRadius = radius * (outer ? 1.085 : 1.02);

  return (
    <mesh renderOrder={outer ? 2 : 5}>
      <sphereGeometry args={[shellRadius, widthSegments, heightSegments]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={ATMOSPHERE_VERTEX_SHADER}
        fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
        transparent
        depthTest
        depthWrite={false}
        side={outer ? THREE.BackSide : THREE.FrontSide}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function BasketballAtmosphere({ radius, quality }) {
  return (
    <group>
      <AtmosphereLayer radius={radius} quality={quality} outer />
      <AtmosphereLayer radius={radius} quality={quality} />
    </group>
  );
}

export default function BasketballRefinements({ radius, quality }) {
  return (
    <group>
      <VegetationField radius={radius} quality={quality} />
      <DenseTrainingTrail radius={radius} quality={quality} />
      <BasketballAtmosphere radius={radius} quality={quality} />
    </group>
  );
}
