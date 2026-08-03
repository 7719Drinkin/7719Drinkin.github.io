import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

const ATMOSPHERE_LAYERS = [
  {
    scale: 1.035,
    opacity: 0.052,
    ecoOpacity: 0.032,
    innerStart: 0.58,
    innerEnd: 0.86,
    outerStart: 0.988,
    shadowColor: '#35576d',
    lightColor: '#b9dde7'
  },
  {
    scale: 1.085,
    opacity: 0.026,
    ecoOpacity: 0.015,
    innerStart: 0.44,
    innerEnd: 0.77,
    outerStart: 0.982,
    shadowColor: '#31536b',
    lightColor: '#acd4df'
  },
  {
    scale: 1.16,
    opacity: 0.013,
    ecoOpacity: 0.0075,
    innerStart: 0.31,
    innerEnd: 0.67,
    outerStart: 0.974,
    shadowColor: '#2d4e67',
    lightColor: '#9fcad8'
  },
  {
    scale: 1.27,
    opacity: 0.0068,
    ecoOpacity: 0.0038,
    innerStart: 0.2,
    innerEnd: 0.58,
    outerStart: 0.964,
    shadowColor: '#294961',
    lightColor: '#91bdce'
  },
  {
    scale: 1.4,
    opacity: 0.0038,
    ecoOpacity: 0.0021,
    innerStart: 0.11,
    innerEnd: 0.5,
    outerStart: 0.95,
    shadowColor: '#26445c',
    lightColor: '#83afc2'
  },
  {
    scale: 1.62,
    opacity: 0.0022,
    ecoOpacity: 0.0012,
    innerStart: 0.04,
    innerEnd: 0.42,
    outerStart: 0.93,
    shadowColor: '#233f56',
    lightColor: '#759fb5'
  }
];

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
  uniform float uInnerStart;
  uniform float uInnerEnd;
  uniform float uOuterStart;
  uniform vec3 uShadowColor;
  uniform vec3 uLightColor;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normalDirection = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(-vWorldPosition);

    // Each layer is rendered on BackSide geometry. Opaque terrain and all
    // elevated structures write depth first, so they carve their silhouettes
    // out of the atmospheric volume instead of being covered by a front shell.
    float backAlignment = clamp(-dot(normalDirection, viewDirection), 0.0, 1.0);
    float limbPosition = 1.0 - backAlignment;

    // The layers overlap like discrete samples of an exponential atmosphere.
    // Every sample fades at both ends, preventing a readable spherical ceiling.
    float innerFade = smoothstep(uInnerStart, uInnerEnd, limbPosition);
    float outerFade = 1.0 - smoothstep(uOuterStart, 1.0, limbPosition);
    float densityBand = innerFade * outerFade;

    float sunDot = dot(normalDirection, sunDirection);
    float daylight = smoothstep(-0.24, 0.72, sunDot);
    float terminator = pow(max(1.0 - abs(sunDot), 0.0), 3.0) * 0.07;

    vec3 color = mix(uShadowColor, uLightColor, daylight);
    float alpha = densityBand * (mix(0.12, 1.0, daylight) + terminator) * uOpacity;

    if (alpha < 0.00035) discard;
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

function AtmosphereShell({ radius, quality, layer, index }) {
  const uniforms = useMemo(() => ({
    uOpacity: { value: quality === 'quality' ? layer.opacity : layer.ecoOpacity },
    uInnerStart: { value: layer.innerStart },
    uInnerEnd: { value: layer.innerEnd },
    uOuterStart: { value: layer.outerStart },
    uShadowColor: { value: new THREE.Color(layer.shadowColor) },
    uLightColor: { value: new THREE.Color(layer.lightColor) }
  }), [layer, quality]);

  return (
    <mesh renderOrder={1 + index * 0.01}>
      <sphereGeometry
        args={[
          radius * layer.scale,
          quality === 'quality' ? 64 : 36,
          quality === 'quality' ? 48 : 24
        ]}
      />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={ATMOSPHERE_VERTEX_SHADER}
        fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
        transparent
        depthTest
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function BasketballAtmosphere({ radius, quality }) {
  const layers = quality === 'quality'
    ? ATMOSPHERE_LAYERS
    : ATMOSPHERE_LAYERS.filter((_, index) => index === 0 || index === 2 || index === 4 || index === 5);

  return (
    <group>
      {layers.map((layer, index) => (
        <AtmosphereShell
          key={layer.scale}
          radius={radius}
          quality={quality}
          layer={layer}
          index={index}
        />
      ))}
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
