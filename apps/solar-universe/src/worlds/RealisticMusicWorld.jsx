import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import MusicWorld from './MusicWorld.jsx';

const MICROPHONE_DIRECTION = [0.02, 0.96, -0.28];
const VINYL_DIRECTION = [0.56, 0.16, -0.81];
const LIGHT_DIRECTION = new THREE.Vector3(-0.42, 0.68, 0.6).normalize();

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

const REALISTIC_CLOUD_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec3 uLightDirection;
  uniform vec3 uMicrophoneDirection;
  uniform vec3 uVinylDirection;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float valueNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat3 rotation = mat3(
      0.00, 0.80, 0.60,
     -0.80, 0.36, -0.48,
     -0.60, -0.48, 0.64
    );

    for (int octave = 0; octave < 5; octave += 1) {
      value += amplitude * valueNoise(p);
      p = rotation * p * 2.03 + vec3(1.7, -2.1, 0.8);
      amplitude *= 0.5;
    }

    return value;
  }

  mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  float revealMask(vec3 normal, vec3 direction, float radius, float softness) {
    float angle = acos(clamp(dot(normal, normalize(direction)), -1.0, 1.0));
    return 1.0 - smoothstep(radius, radius + softness, angle);
  }

  void main() {
    vec3 objectNormal = normalize(vObjectPosition);
    vec3 worldNormal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 lightDirection = normalize(uLightDirection);

    // Venus-like super-rotation: broad cloud structures drift around the globe,
    // while latitude-dependent shear prevents the texture from looking painted on.
    float flow = uTime * 0.018;
    vec3 p = objectNormal * vec3(3.4, 1.45, 3.4);
    p.xz = rotate2d(flow + objectNormal.y * 0.48) * p.xz;
    p.x += objectNormal.y * 1.25;
    p.z -= objectNormal.y * objectNormal.y * 0.75;

    float broad = fbm(p * 0.72 + vec3(flow * 0.7, 0.0, -flow * 0.35));
    float billows = fbm(p * 1.55 + vec3(3.7, -1.9, 2.4));
    float fine = fbm(p * 3.8 - vec3(1.3, 2.8, 0.6));
    float latitudeBands = 0.5 + 0.5 * sin(
      objectNormal.y * 19.0 + broad * 5.6 + objectNormal.x * 1.7
    );

    float structure = broad * 0.54 + billows * 0.31 + fine * 0.15;
    float cloudTop = smoothstep(0.34, 0.74, structure + latitudeBands * 0.12);
    float valleys = smoothstep(0.24, 0.66, billows - fine * 0.18);
    float opticalDepth = clamp(0.58 + cloudTop * 0.34 + valleys * 0.08, 0.0, 1.0);

    float normalLight = dot(worldNormal, lightDirection);
    float wrappedLight = clamp(normalLight * 0.62 + 0.43, 0.055, 1.0);
    float daySide = smoothstep(-0.28, 0.72, normalLight);

    vec3 deepShadow = vec3(0.115, 0.075, 0.045);
    vec3 lowerCloud = vec3(0.40, 0.255, 0.13);
    vec3 upperCloud = vec3(0.72, 0.515, 0.285);
    vec3 sunlitCloud = vec3(0.91, 0.755, 0.53);

    vec3 cloudColor = mix(lowerCloud, upperCloud, opticalDepth);
    cloudColor = mix(cloudColor, sunlitCloud, cloudTop * daySide * 0.42);

    // The cloud deck receives light; it does not emit it. The wrapped diffuse
    // term leaves a faint night-side fill while preserving a clear terminator.
    cloudColor = mix(deepShadow, cloudColor, wrappedLight);

    float viewNormal = clamp(dot(worldNormal, viewDirection), 0.0, 1.0);
    float limbDepth = pow(1.0 - viewNormal, 2.15);
    float forwardScatter = pow(max(dot(viewDirection, lightDirection), 0.0), 12.0);
    vec3 scatteredLight = mix(upperCloud, sunlitCloud, daySide);
    cloudColor = mix(cloudColor, scatteredLight, limbDepth * (0.09 + daySide * 0.12));
    cloudColor += scatteredLight * forwardScatter * limbDepth * 0.035;

    // Keep the planet concealed. The two reveal zones use irregular cloud-noise
    // edges so they read as meteorological breaks rather than perfect cut-outs.
    float microphoneReveal = revealMask(
      objectNormal,
      uMicrophoneDirection,
      0.082,
      0.052
    );
    float vinylReveal = revealMask(
      objectNormal,
      uVinylDirection,
      0.175,
      0.07
    );

    float brokenEdge = smoothstep(0.26, 0.75, billows * 0.72 + fine * 0.28);
    microphoneReveal *= 0.72 + brokenEdge * 0.28;
    vinylReveal *= 0.68 + brokenEdge * 0.32;

    float alpha = mix(0.996, 1.0, opticalDepth);
    alpha -= microphoneReveal * 0.09;
    alpha -= vinylReveal * 0.57;
    alpha = clamp(alpha, 0.34, 1.0);

    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

const OUTER_HAZE_FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uLightDirection;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 lightDirection = normalize(uLightDirection);

    float viewNormal = clamp(dot(normal, viewDirection), 0.0, 1.0);
    float limb = pow(1.0 - viewNormal, 3.1);
    float sunlight = smoothstep(-0.25, 0.75, dot(normal, lightDirection));
    float forwardScatter = pow(max(dot(viewDirection, lightDirection), 0.0), 10.0);

    vec3 shadowHaze = vec3(0.17, 0.105, 0.058);
    vec3 daylightHaze = vec3(0.72, 0.49, 0.25);
    vec3 color = mix(shadowHaze, daylightHaze, sunlight);

    // Normal alpha blending keeps this as reflected/scattered light instead of
    // the additive neon rim used by the previous atmosphere implementation.
    float alpha = limb * (0.035 + sunlight * 0.075);
    alpha += limb * forwardScatter * 0.018;

    gl_FragColor = vec4(color, alpha);
  }
`;

function createCloudMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLightDirection: { value: LIGHT_DIRECTION.clone() },
      uMicrophoneDirection: {
        value: new THREE.Vector3(...MICROPHONE_DIRECTION).normalize()
      },
      uVinylDirection: {
        value: new THREE.Vector3(...VINYL_DIRECTION).normalize()
      }
    },
    vertexShader: ATMOSPHERE_VERTEX_SHADER,
    fragmentShader: REALISTIC_CLOUD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
    toneMapped: true
  });
}

export default function RealisticMusicWorld({ radius, quality }) {
  const world = useRef();
  const cloudMesh = useRef();
  const cloudMaterial = useMemo(createCloudMaterial, []);
  const hazeUniforms = useMemo(() => ({
    uLightDirection: { value: LIGHT_DIRECTION.clone() }
  }), []);

  useLayoutEffect(() => {
    let previousMaterial = null;
    let previousScale = null;

    world.current?.traverse((object) => {
      if (
        cloudMesh.current
        || !object.isMesh
        || !object.material?.isShaderMaterial
        || !object.material.uniforms?.uMicrophoneDirection
        || !object.material.uniforms?.uVinylDirection
      ) {
        return;
      }

      cloudMesh.current = object;
      previousMaterial = object.material;
      previousScale = object.scale.clone();
      object.material = cloudMaterial;
      object.scale.setScalar(1.18);
      object.renderOrder = 6;
    });

    return () => {
      if (cloudMesh.current && previousMaterial && previousScale) {
        cloudMesh.current.material = previousMaterial;
        cloudMesh.current.scale.copy(previousScale);
      }
      cloudMesh.current = null;
    };
  }, [cloudMaterial, quality, radius]);

  useEffect(() => () => cloudMaterial.dispose(), [cloudMaterial]);

  useFrame((_, delta) => {
    cloudMaterial.uniforms.uTime.value += delta;
  });

  const hazeSegments = quality === 'quality' ? 96 : 56;

  return (
    <group>
      <group ref={world}>
        <MusicWorld radius={radius} quality={quality} />
      </group>

      <mesh scale={1.225} renderOrder={7}>
        <sphereGeometry args={[radius, hazeSegments, Math.round(hazeSegments * 0.68)]} />
        <shaderMaterial
          uniforms={hazeUniforms}
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={OUTER_HAZE_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          depthTest
          side={THREE.FrontSide}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}
