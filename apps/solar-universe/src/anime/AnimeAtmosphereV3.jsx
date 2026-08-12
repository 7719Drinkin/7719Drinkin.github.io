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
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = max(dot(normalize(vNormal), viewDirection), 0.0);
    float rim = pow(1.0 - facing, 3.05);
    vec3 innerColor = vec3(0.37, 0.62, 0.73);
    vec3 outerColor = vec3(0.66, 0.85, 0.91);
    vec3 color = mix(innerColor, outerColor, clamp(rim * 1.15, 0.0, 1.0));
    gl_FragColor = vec4(color, rim * 0.18);
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
