import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createCoronaTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 58, center, center, center);
  gradient.addColorStop(0, 'rgba(255,255,242,1)');
  gradient.addColorStop(0.12, 'rgba(255,245,190,.9)');
  gradient.addColorStop(0.24, 'rgba(255,187,75,.38)');
  gradient.addColorStop(0.44, 'rgba(255,115,30,.085)');
  gradient.addColorStop(0.68, 'rgba(255,83,18,.014)');
  gradient.addColorStop(1, 'rgba(255,70,12,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const random = seededRandom(7719);
  context.save();
  context.translate(center, center);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < 150; index += 1) {
    const angle = random() * Math.PI * 2;
    const width = 0.0015 + random() * 0.007;
    const length = center * (0.32 + random() * 0.54);
    const inner = center * (0.18 + random() * 0.07);
    const alpha = 0.006 + random() * 0.022;
    context.rotate(angle);
    const ray = context.createLinearGradient(inner, 0, length, 0);
    ray.addColorStop(0, `rgba(255,240,176,${alpha})`);
    ray.addColorStop(0.35, `rgba(255,169,66,${alpha * 0.58})`);
    ray.addColorStop(1, 'rgba(255,90,20,0)');
    context.fillStyle = ray;
    context.beginPath();
    context.moveTo(inner, -length * width);
    context.lineTo(length, 0);
    context.lineTo(inner, length * width);
    context.closePath();
    context.fill();
    context.rotate(-angle);
  }
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createFlareGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,238,1)');
  gradient.addColorStop(0.17, 'rgba(255,232,144,.92)');
  gradient.addColorStop(0.42, 'rgba(255,116,30,.42)');
  gradient.addColorStop(1, 'rgba(255,72,12,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function SolarFlare({ quality }) {
  const group = useRef();
  const coreMaterials = useRef([]);
  const outerMaterials = useRef([]);
  const glow = useRef();
  const light = useRef();
  const active = useRef(false);
  const startedAt = useRef(0);
  const nextAt = useRef(5.5);
  const random = useRef(seededRandom(23061998));
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const viewDirection = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const flareTexture = useMemo(createFlareGlowTexture, []);

  const curves = useMemo(() => {
    const segments = quality === 'quality' ? 56 : 32;
    const radialSegments = quality === 'quality' ? 8 : 5;
    const paths = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.38, 0.86, 0),
        new THREE.Vector3(-0.24, 1.26, 0.035),
        new THREE.Vector3(0.02, 1.62, 0.08),
        new THREE.Vector3(0.31, 1.24, 0.025),
        new THREE.Vector3(0.42, 0.86, 0)
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.28, 0.9, -0.11),
        new THREE.Vector3(-0.16, 1.2, -0.18),
        new THREE.Vector3(0.06, 1.43, -0.2),
        new THREE.Vector3(0.29, 0.91, -0.1)
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.18, 0.91, 0.14),
        new THREE.Vector3(-0.06, 1.12, 0.22),
        new THREE.Vector3(0.17, 1.31, 0.18),
        new THREE.Vector3(0.3, 0.9, 0.11)
      ])
    ];

    return paths.map((curve) => ({
      core: new THREE.TubeGeometry(curve, segments, 0.012, radialSegments, false),
      outer: new THREE.TubeGeometry(curve, segments, 0.032, radialSegments, false)
    }));
  }, [quality]);

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    const root = group.current;
    if (!root) return;

    if (!active.current && time >= nextAt.current) {
      active.current = true;
      startedAt.current = time;
      root.visible = true;

      viewDirection.copy(camera.position).normalize();
      tangent.set(
        random.current() * 2 - 1,
        random.current() * 2 - 1,
        random.current() * 2 - 1
      ).normalize();
      normal.copy(viewDirection).multiplyScalar(0.72).addScaledVector(tangent, 0.55).normalize();
      root.quaternion.setFromUnitVectors(up, normal);
      root.rotation.y += (random.current() - 0.5) * 1.5;
    }

    if (!active.current) return;

    const duration = 4.8;
    const progress = (time - startedAt.current) / duration;
    if (progress >= 1) {
      active.current = false;
      root.visible = false;
      nextAt.current = time + 17 + random.current() * 19;
      return;
    }

    const rise = smoothstep(0, 0.18, progress);
    const fade = 1 - smoothstep(0.58, 1, progress);
    const intensity = rise * fade;
    const expansion = 0.34 + rise * 0.72 + smoothstep(0.32, 1, progress) * 0.08;
    root.scale.setScalar(expansion);

    coreMaterials.current.forEach((material, index) => {
      if (material) material.opacity = intensity * (0.92 - index * 0.12);
    });
    outerMaterials.current.forEach((material, index) => {
      if (material) material.opacity = intensity * (0.38 - index * 0.045);
    });
    if (glow.current) {
      glow.current.material.opacity = intensity * 0.78;
      glow.current.scale.setScalar(0.48 + rise * 0.45);
    }
    if (light.current) light.current.intensity = intensity * 12;
  });

  return (
    <group ref={group} visible={false}>
      {curves.map((geometry, index) => (
        <group key={index} rotation-y={(index - 1) * 0.17}>
          <mesh geometry={geometry.outer}>
            <meshBasicMaterial
              ref={(material) => { outerMaterials.current[index] = material; }}
              color={index === 0 ? '#ff7d19' : '#ff3f0c'}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={geometry.core}>
            <meshBasicMaterial
              ref={(material) => { coreMaterials.current[index] = material; }}
              color={index === 0 ? '#fffbe0' : '#ffd777'}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      <sprite ref={glow} position={[0.02, 1.28, 0.04]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial
          map={flareTexture}
          color="#fff2bd"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <pointLight ref={light} position={[0.02, 1.25, 0.04]} color="#ffd07b" intensity={0} distance={5} decay={2} />
    </group>
  );
}

export default function Sun({ quality, selected, onSelect, registerPlanet }) {
  const root = useRef();
  const surface = useRef();
  const photosphere = useRef();
  const chromosphere = useRef();
  const corona = useRef();
  const coronaTexture = useMemo(createCoronaTexture, []);
  const photosphereUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const chromosphereUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useEffect(() => {
    registerPlanet('sun', root);
    return () => registerPlanet('sun', null);
  }, [registerPlanet]);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    if (photosphere.current) photosphere.current.uniforms.uTime.value = time;
    if (chromosphere.current) chromosphere.current.uniforms.uTime.value = time;
    if (surface.current) surface.current.rotation.y += delta * 0.012;
    if (corona.current) {
      const pulse = 1 + Math.sin(time * 0.17) * 0.012;
      corona.current.scale.setScalar(pulse);
      corona.current.material.opacity = selected ? 0.24 : 0.16;
    }
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect('sun');
  };

  return (
    <group ref={root} onClick={select}>
      <sprite ref={corona} scale={[4.4, 4.4, 1]} renderOrder={-2}>
        <spriteMaterial
          map={coronaTexture}
          color="#fff0b0"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <group ref={surface}>
        <mesh>
          <sphereGeometry args={[0.95, quality === 'quality' ? 128 : 64, quality === 'quality' ? 96 : 48]} />
          <shaderMaterial
            ref={photosphere}
            uniforms={photosphereUniforms}
            toneMapped={false}
            vertexShader={`
              varying vec3 vPosition;
              varying vec3 vNormal;
              varying vec3 vView;

              void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vPosition = normalize(position);
                vNormal = normalize(normalMatrix * normal);
                vView = normalize(-mvPosition.xyz);
                gl_Position = projectionMatrix * mvPosition;
              }
            `}
            fragmentShader={`
              uniform float uTime;
              varying vec3 vPosition;
              varying vec3 vNormal;
              varying vec3 vView;

              float hash(vec3 p) {
                p = fract(p * .3183099 + vec3(.1, .7, .113));
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
              }

              float noise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                  mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                      mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,1)), f.x), f.y),
                  mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                      mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
                  f.z
                );
              }

              float fbm(vec3 p) {
                float value = 0.0;
                float amplitude = .5;
                for (int octave = 0; octave < 5; octave++) {
                  value += noise(p) * amplitude;
                  p = p * 2.03 + vec3(1.7, 9.2, 2.4);
                  amplitude *= .5;
                }
                return value;
              }

              void main() {
                vec3 p = vPosition;
                float slow = uTime * .018;
                float convection = fbm(p * 7.8 + vec3(slow, -slow * .7, slow * .4));
                float cells = fbm(p * 23.0 - vec3(slow * .5, slow, -slow * .3));
                float filaments = fbm(p * 3.4 + vec3(-slow * .2, slow * .35, slow));
                float granulation = smoothstep(.23, .88, convection * .72 + cells * .36);

                float spotField = fbm(p * 2.15 + vec3(2.1, -1.7, .9));
                float spotDetail = fbm(p * 13.0 - vec3(slow, 0.0, slow * .5));
                float sunspot = smoothstep(.72, .89, spotField) * smoothstep(.43, .7, spotDetail);

                float mu = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
                float limbDarkening = .42 + .58 * pow(mu, .58);

                vec3 amber = vec3(1.12, .42, .045);
                vec3 gold = vec3(1.43, .82, .25);
                vec3 whiteHot = vec3(1.67, 1.43, .82);
                vec3 color = mix(amber, gold, granulation);
                color = mix(color, whiteHot, smoothstep(.64, .96, cells + convection * .35));
                color *= limbDarkening;
                color *= 1.0 - sunspot * .76;
                color += vec3(.3, .05, .006) * filaments * .21;

                gl_FragColor = vec4(color, 1.0);
              }
            `}
          />
        </mesh>

        <mesh scale={1.035}>
          <sphereGeometry args={[0.95, quality === 'quality' ? 96 : 48, quality === 'quality' ? 72 : 36]} />
          <shaderMaterial
            ref={chromosphere}
            uniforms={chromosphereUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            toneMapped={false}
            vertexShader={`
              varying vec3 vNormal;
              varying vec3 vView;
              varying vec3 vPosition;
              void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vView = normalize(-mvPosition.xyz);
                vPosition = normalize(position);
                gl_Position = projectionMatrix * mvPosition;
              }
            `}
            fragmentShader={`
              uniform float uTime;
              varying vec3 vNormal;
              varying vec3 vView;
              varying vec3 vPosition;
              void main() {
                float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.1);
                float turbulence = .72 + .28 * sin(vPosition.y * 37.0 + vPosition.x * 23.0 + uTime * .22);
                vec3 color = mix(vec3(1.0, .18, .01), vec3(1.0, .73, .19), turbulence);
                gl_FragColor = vec4(color, rim * .36);
              }
            `}
          />
        </mesh>
      </group>

      <SolarFlare quality={quality} />
      <pointLight color="#fff1cf" intensity={22} distance={125} decay={0.8} />
    </group>
  );
}