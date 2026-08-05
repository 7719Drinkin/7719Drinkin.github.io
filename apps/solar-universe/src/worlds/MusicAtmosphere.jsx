import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const CLOUD_GLSL = `
  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float valueNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 local = fract(p);
    local = local * local * (3.0 - 2.0 * local);

    float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, local.x);
    float nx10 = mix(n010, n110, local.x);
    float nx01 = mix(n001, n101, local.x);
    float nx11 = mix(n011, n111, local.x);
    float nxy0 = mix(nx00, nx10, local.y);
    float nxy1 = mix(nx01, nx11, local.y);
    return mix(nxy0, nxy1, local.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat3 transform = mat3(
      0.00, 0.80, 0.60,
     -0.80, 0.36, -0.48,
     -0.60, -0.48, 0.64
    );

    for (int octave = 0; octave < 5; octave += 1) {
      value += valueNoise(p) * amplitude;
      p = transform * p * 2.03 + vec3(7.1, 3.7, 5.9);
      amplitude *= 0.5;
    }

    return value;
  }

  vec3 rotateY(vec3 point, float angle) {
    float cosine = cos(angle);
    float sine = sin(angle);
    return vec3(
      cosine * point.x + sine * point.z,
      point.y,
      -sine * point.x + cosine * point.z
    );
  }

  vec3 rotateAroundAxis(vec3 point, vec3 axis, float angle) {
    axis = normalize(axis);
    float cosine = cos(angle);
    float sine = sin(angle);
    return point * cosine
      + cross(axis, point) * sine
      + axis * dot(axis, point) * (1.0 - cosine);
  }

  vec3 advectPoint(vec3 point, float time) {
    point = normalize(point);
    float latitude = asin(clamp(point.y, -1.0, 1.0));
    float equatorialJet = 0.7 + 0.3 * cos(latitude * 2.0);
    float latitudeShear = sin(latitude * 8.0 + time * 0.13) * 0.055;
    float longitudeFlow = time * 0.09 * equatorialJet + latitudeShear;

    point = rotateY(point, longitudeFlow);
    point = rotateAroundAxis(
      point,
      normalize(vec3(0.18, 0.97, -0.12)),
      time * 0.012
    );
    return normalize(point);
  }

  vec3 applyVortex(vec3 point, vec3 center, float radius, float strength) {
    center = normalize(center);
    float angularDistance = acos(clamp(dot(point, center), -1.0, 1.0));
    float mask = 1.0 - smoothstep(radius * 0.38, radius, angularDistance);
    return normalize(rotateAroundAxis(point, center, strength * mask * mask));
  }

  vec3 domainWarp(vec3 point, float time) {
    vec3 q = vec3(
      fbm(point * 2.15 + vec3(time * 0.055, 1.7, 4.1)),
      fbm(point * 2.15 + vec3(8.3, time * 0.043, 2.6)),
      fbm(point * 2.15 + vec3(3.4, 6.8, time * 0.049))
    );
    return normalize(point + (q - 0.5) * 0.58);
  }

  float planetaryCloudField(vec3 point, float time) {
    point = advectPoint(point, time);
    point = applyVortex(point, vec3(0.58, 0.18, -0.79), 0.78, 1.45);
    point = applyVortex(point, vec3(-0.48, -0.58, 0.66), 0.68, -1.15);

    vec3 warped = domainWarp(point, time);
    vec3 secondaryWarp = vec3(
      fbm(warped * 3.2 + vec3(2.0, time * 0.038, 0.0)),
      fbm(warped * 3.2 + vec3(0.0, 5.0, time * 0.031)),
      fbm(warped * 3.2 + vec3(time * 0.034, 0.0, 9.0))
    );

    vec3 flowPoint = normalize(warped + (secondaryWarp - 0.5) * 0.25);
    float largeScale = fbm(flowPoint * 2.35 + vec3(time * 0.018, 0.0, 0.0));
    float middleScale = fbm(flowPoint * 6.2 + secondaryWarp * 1.9);
    float fineScale = fbm(flowPoint * 17.0 + secondaryWarp * 4.4);

    float latitude = asin(clamp(flowPoint.y, -1.0, 1.0));
    float zonalFlow = 0.5 + 0.5 * sin(
      latitude * 11.5
      + secondaryWarp.x * 3.4
      + largeScale * 2.2
      + time * 0.21
    );

    return clamp(
      largeScale * 0.43
      + middleScale * 0.38
      + fineScale * 0.12
      + zonalFlow * 0.07,
      0.0,
      1.0
    );
  }

  float irregularClearing(
    vec3 point,
    vec3 direction,
    float radius,
    float softness,
    float time
  ) {
    point = normalize(point);
    direction = normalize(direction);
    float edgeNoise = (fbm(point * 15.0 + time * 0.026) - 0.5) * 0.075;
    float angularDistance = acos(clamp(dot(point, direction), -1.0, 1.0));
    return 1.0 - smoothstep(
      radius + edgeNoise,
      radius + softness + edgeNoise,
      angularDistance
    );
  }

  vec3 solarTerms(
    vec3 normal,
    vec3 worldPosition,
    vec3 sunPosition,
    float sunPower
  ) {
    vec3 sunDirection = normalize(sunPosition - worldPosition);
    float normalDotLight = dot(normalize(normal), sunDirection);

    // Twilight is deliberately narrow. The far side must remain genuinely dark
    // rather than receiving a camera-independent wrapped-light fill.
    float twilight = smoothstep(-0.13, 0.045, normalDotLight);
    float daylight = smoothstep(-0.015, 0.29, normalDotLight);
    float directLight = smoothstep(0.28, 0.9, normalDotLight);

    float power = clamp(sunPower, 0.45, 1.55);
    daylight = clamp(daylight * mix(0.82, 1.08, power), 0.0, 1.0);
    directLight = clamp(directLight * power, 0.0, 1.0);

    return vec3(twilight, daylight, directLight);
  }
`;

const CLOUD_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uDisplacement;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  ${CLOUD_GLSL}

  void main() {
    vec3 direction = normalize(position);
    float cloud = planetaryCloudField(direction, uTime);
    float displacement = (cloud - 0.5) * uDisplacement * length(position);
    vec3 displacedPosition = position + direction * displacement;

    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * direction);
    vObjectPosition = displacedPosition;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const DENSE_BASE_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform float uSunPower;
  uniform vec3 uSunPosition;
  uniform vec3 uShadowColor;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  ${CLOUD_GLSL}

  void main() {
    vec3 point = normalize(vObjectPosition);
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float cloud = planetaryCloudField(point, uTime);
    float trailingCloud = planetaryCloudField(point, uTime - 0.32);
    float movingFront = clamp((cloud - trailingCloud) * 2.8 + 0.5, 0.0, 1.0);
    vec3 solar = solarTerms(normal, vWorldPosition, uSunPosition, uSunPower);
    float twilight = solar.x;
    float daylight = solar.y;
    float directLight = solar.z;
    float broadCloud = smoothstep(0.18, 0.7, cloud);
    float illuminatedCloud = smoothstep(0.6, 0.9, cloud) * directLight;

    vec3 nightColor = uShadowColor * (0.38 + broadCloud * 0.07);
    vec3 dayColor = mix(uBaseColor * 0.7, uBaseColor, broadCloud);
    dayColor = mix(dayColor, uHighlightColor, illuminatedCloud * 0.48);
    dayColor *= 0.72 + daylight * 0.28;

    vec3 color = mix(nightColor, dayColor, daylight);
    color += uBaseColor * twilight * (1.0 - daylight) * 0.025;
    color *= 1.0 + (movingFront - 0.5) * 0.026 * daylight;

    // The atmospheric limb is darker on the night side and never emits light.
    float limb = pow(1.0 - abs(dot(normal, viewDirection)), 2.5);
    color *= 1.0 - limb * mix(0.16, 0.035, daylight);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const MAIN_CLOUD_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform float uSunPower;
  uniform vec3 uSunPosition;
  uniform vec3 uVinylDirection;
  uniform vec3 uShadowColor;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  ${CLOUD_GLSL}

  void main() {
    vec3 point = normalize(vObjectPosition);
    vec3 normal = normalize(vWorldNormal);
    float cloud = planetaryCloudField(point, uTime + 19.0);
    vec3 movingPoint = advectPoint(point, uTime * 1.08);
    float middleDetail = fbm(
      domainWarp(movingPoint, uTime) * 10.0
      + vec3(uTime * 0.04, 0.0, -uTime * 0.025)
    );
    float coverage = smoothstep(0.4, 0.77, cloud * 0.76 + middleDetail * 0.24);
    vec3 solar = solarTerms(normal, vWorldPosition, uSunPosition, uSunPower);
    float daylight = solar.y;
    float directLight = solar.z;

    vec3 nightColor = uShadowColor * (0.3 + coverage * 0.06);
    vec3 dayColor = mix(uBaseColor * 0.72, uBaseColor, coverage);
    dayColor = mix(
      dayColor,
      uHighlightColor,
      smoothstep(0.56, 0.92, cloud) * directLight * 0.5
    );
    vec3 color = mix(nightColor, dayColor, daylight);

    float clearing = irregularClearing(
      point,
      uVinylDirection,
      0.19,
      0.075,
      uTime
    );

    float alpha = (0.07 + coverage * 0.55) * mix(0.06, 1.0, daylight);
    alpha *= 1.0 - clearing * 0.93;
    alpha = clamp(alpha, 0.0, 0.65);

    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const HIGH_CLOUD_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform float uSunPower;
  uniform vec3 uSunPosition;
  uniform vec3 uVinylDirection;
  uniform vec3 uShadowColor;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  ${CLOUD_GLSL}

  void main() {
    vec3 point = normalize(vObjectPosition);
    vec3 normal = normalize(vWorldNormal);
    vec3 movingPoint = advectPoint(point, uTime * 1.3);
    vec3 warped = domainWarp(movingPoint, uTime + 41.0);
    float longWisps = fbm(
      warped * 18.0
      + vec3(uTime * 0.065, 2.0, -uTime * 0.035)
    );
    float fineWisps = fbm(
      warped * 31.0
      + vec3(5.0, uTime * 0.052, 1.0 + uTime * 0.03)
    );
    float wisps = smoothstep(0.55, 0.8, longWisps * 0.76 + fineWisps * 0.24);
    vec3 solar = solarTerms(normal, vWorldPosition, uSunPosition, uSunPower);
    float daylight = solar.y;
    float directLight = solar.z;

    vec3 nightColor = uShadowColor * 0.25;
    vec3 dayColor = mix(uBaseColor, uHighlightColor, directLight * 0.58);
    vec3 color = mix(nightColor, dayColor, daylight);

    float clearing = irregularClearing(
      point,
      uVinylDirection,
      0.2,
      0.08,
      uTime + 13.0
    );

    float alpha = wisps * 0.28 * mix(0.015, 1.0, daylight);
    alpha *= 1.0 - clearing * 0.96;

    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createLayerUniforms({
  displacement,
  vinylDirection,
  shadowColor,
  baseColor,
  highlightColor
}) {
  return {
    uTime: { value: 0 },
    uDisplacement: { value: displacement },
    uSunPower: { value: 1 },
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
    uVinylDirection: { value: new THREE.Vector3(...vinylDirection).normalize() },
    uShadowColor: { value: new THREE.Color(shadowColor) },
    uBaseColor: { value: new THREE.Color(baseColor) },
    uHighlightColor: { value: new THREE.Color(highlightColor) }
  };
}

export default function MusicAtmosphere({ radius, quality, vinylDirection }) {
  const { scene } = useThree();
  const sunlight = useRef();
  const sunPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const denseMaterial = useRef();
  const mainMaterial = useRef();
  const highMaterial = useRef();

  const denseUniforms = useMemo(() => createLayerUniforms({
    displacement: 0.01,
    vinylDirection,
    shadowColor: '#070605',
    baseColor: '#765735',
    highlightColor: '#c6a36d'
  }), [vinylDirection]);

  const mainUniforms = useMemo(() => createLayerUniforms({
    displacement: 0.016,
    vinylDirection,
    shadowColor: '#090705',
    baseColor: '#946d43',
    highlightColor: '#d9b77c'
  }), [vinylDirection]);

  const highUniforms = useMemo(() => createLayerUniforms({
    displacement: 0.009,
    vinylDirection,
    shadowColor: '#0a0806',
    baseColor: '#a27a4f',
    highlightColor: '#e2c691'
  }), [vinylDirection]);

  useFrame((_, delta) => {
    if (!sunlight.current) {
      scene.traverse((object) => {
        if (
          object.isPointLight
          && Math.abs(object.distance - 125) < 0.01
          && Math.abs(object.decay - 1.9) < 0.01
        ) {
          sunlight.current = object;
        }
      });
    }

    let sunPower = 1;
    if (sunlight.current) {
      sunlight.current.getWorldPosition(sunPosition);
      const normalizedIntensity = THREE.MathUtils.clamp(
        sunlight.current.intensity / 680,
        0.04,
        8
      );
      sunPower = THREE.MathUtils.clamp(
        Math.pow(normalizedIntensity, 0.24),
        0.55,
        1.5
      );
    }

    const materials = [denseMaterial.current, mainMaterial.current, highMaterial.current];
    materials.forEach((material) => {
      if (!material) return;
      material.uniforms.uSunPosition.value.copy(sunPosition);
      material.uniforms.uSunPower.value = sunPower;
    });

    if (denseMaterial.current) denseMaterial.current.uniforms.uTime.value += delta * 0.35;
    if (mainMaterial.current) mainMaterial.current.uniforms.uTime.value += delta * 0.55;
    if (highMaterial.current) highMaterial.current.uniforms.uTime.value += delta * 0.82;
  });

  const widthSegments = quality === 'quality' ? 112 : 72;
  const heightSegments = quality === 'quality' ? 72 : 48;

  return (
    <group>
      <mesh scale={1.175} renderOrder={4}>
        <sphereGeometry args={[radius, widthSegments, heightSegments]} />
        <shaderMaterial
          ref={denseMaterial}
          uniforms={denseUniforms}
          vertexShader={CLOUD_VERTEX_SHADER}
          fragmentShader={DENSE_BASE_FRAGMENT_SHADER}
          depthWrite
          depthTest
          side={THREE.FrontSide}
        />
      </mesh>

      <mesh scale={1.2} renderOrder={5}>
        <sphereGeometry args={[radius, widthSegments, heightSegments]} />
        <shaderMaterial
          ref={mainMaterial}
          uniforms={mainUniforms}
          vertexShader={CLOUD_VERTEX_SHADER}
          fragmentShader={MAIN_CLOUD_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          depthTest
          side={THREE.FrontSide}
          blending={THREE.NormalBlending}
        />
      </mesh>

      <mesh scale={1.222} renderOrder={6}>
        <sphereGeometry args={[radius, widthSegments, heightSegments]} />
        <shaderMaterial
          ref={highMaterial}
          uniforms={highUniforms}
          vertexShader={CLOUD_VERTEX_SHADER}
          fragmentShader={HIGH_CLOUD_FRAGMENT_SHADER}
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
