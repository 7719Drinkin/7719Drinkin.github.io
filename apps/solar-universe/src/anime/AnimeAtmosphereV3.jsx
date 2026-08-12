import * as THREE from 'three';

const VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(-vWorldPosition);

    float facing = max(dot(normal, viewDirection), 0.0);
    float rim = pow(1.0 - facing, 3.05);
    float daylight = smoothstep(-0.08, 0.58, dot(normal, sunDirection));

    vec3 nightColor = vec3(0.16, 0.24, 0.29);
    vec3 dayInner = vec3(0.37, 0.62, 0.73);
    vec3 dayOuter = vec3(0.66, 0.85, 0.91);
    vec3 dayColor = mix(dayInner, dayOuter, clamp(rim * 1.15, 0.0, 1.0));
    vec3 color = mix(nightColor, dayColor, daylight);

    float opacity = rim * mix(0.035, 0.15, daylight);
    gl_FragColor = vec4(color, opacity);
  }
`;

export default function AnimeAtmosphereV3({ radius, quality }) {
  return (
    <mesh scale={1.062} renderOrder={8}>
      <sphereGeometry args={[
        radius,
        quality === 'quality' ? 72 : 40,
        quality === 'quality' ? 48 : 28
      ]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
