import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HALO_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HALO_FRAGMENT_SHADER = `
  uniform float uOpacity;
  uniform vec2 uSunDirection;
  uniform vec3 uDayColor;
  uniform vec3 uNightColor;

  varying vec2 vUv;

  void main() {
    vec2 point = vUv * 2.0 - 1.0;
    float radialDistance = length(point);

    // The transparent centre corresponds to the solid planet. The halo is an
    // optical path-length approximation behind the entire miniature world,
    // not a visible spherical ceiling.
    float planetEdge = 0.585;
    float altitude = clamp((radialDistance - planetEdge) / (1.0 - planetEdge), 0.0, 1.0);
    float enterAtmosphere = smoothstep(planetEdge - 0.018, planetEdge + 0.025, radialDistance);
    float densityFalloff = exp(-altitude * 5.4);
    float outerFade = 1.0 - smoothstep(0.84, 1.0, radialDistance);
    float density = enterAtmosphere * densityFalloff * outerFade;

    vec2 radialDirection = radialDistance > 0.0001
      ? point / radialDistance
      : vec2(1.0, 0.0);
    vec2 sunDirection = length(uSunDirection) > 0.0001
      ? normalize(uSunDirection)
      : vec2(-1.0, 0.0);

    float sunAlignment = dot(radialDirection, sunDirection) * 0.5 + 0.5;
    float daylight = pow(clamp(sunAlignment, 0.0, 1.0), 1.75);
    float twilight = pow(1.0 - abs(sunAlignment * 2.0 - 1.0), 4.0) * 0.14;

    vec3 color = mix(uNightColor, uDayColor, daylight);
    float alpha = density * (0.18 + daylight * 0.82 + twilight) * uOpacity;

    if (alpha < 0.00035) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function BasketballAtmosphereHalo({ radius, quality }) {
  const halo = useRef();
  const material = useRef();
  const planetPosition = useMemo(() => new THREE.Vector3(), []);
  const sunDirection = useMemo(() => new THREE.Vector3(), []);
  const cameraRight = useMemo(() => new THREE.Vector3(), []);
  const cameraUp = useMemo(() => new THREE.Vector3(), []);
  const cameraForward = useMemo(() => new THREE.Vector3(), []);
  const parentQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const localCameraQuaternion = useMemo(() => new THREE.Quaternion(), []);

  const uniforms = useMemo(() => ({
    uOpacity: { value: quality === 'quality' ? 0.16 : 0.095 },
    uSunDirection: { value: new THREE.Vector2(-1, 0) },
    uDayColor: { value: new THREE.Color('#b9dce7') },
    uNightColor: { value: new THREE.Color('#31536d') }
  }), [quality]);

  useFrame(({ camera }) => {
    if (!halo.current || !material.current) return;

    // Keep the optical halo parallel to the image plane even though the
    // Basketball world inherits the planet's axial rotation.
    halo.current.parent?.getWorldQuaternion(parentQuaternion);
    localCameraQuaternion.copy(parentQuaternion).invert().multiply(camera.quaternion);
    halo.current.quaternion.copy(localCameraQuaternion);

    halo.current.getWorldPosition(planetPosition);
    sunDirection.copy(planetPosition).multiplyScalar(-1).normalize();
    camera.matrixWorld.extractBasis(cameraRight, cameraUp, cameraForward);

    const x = sunDirection.dot(cameraRight);
    const y = sunDirection.dot(cameraUp);
    material.current.uniforms.uSunDirection.value.set(x, y);
  });

  return (
    <mesh ref={halo} renderOrder={0}>
      <planeGeometry args={[radius * 3.45, radius * 3.45]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={HALO_VERTEX_SHADER}
        fragmentShader={HALO_FRAGMENT_SHADER}
        transparent
        depthTest
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
