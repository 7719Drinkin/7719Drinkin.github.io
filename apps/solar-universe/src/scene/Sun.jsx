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
  gradient.addColorStop(0.12, 'rgba(255,245,190,.94)');
  gradient.addColorStop(0.24, 'rgba(255,187,75,.52)');
  gradient.addColorStop(0.48, 'rgba(255,115,30,.16)');
  gradient.addColorStop(0.78, 'rgba(255,83,18,.035)');
  gradient.addColorStop(1, 'rgba(255,70,12,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const random = seededRandom(7719);
  context.save();
  context.translate(center, center);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < 180; index += 1) {
    const angle = random() * Math.PI * 2;
    const width = 0.0015 + random() * 0.008;
    const length = center * (0.34 + random() * 0.6);
    const inner = center * (0.18 + random() * 0.07);
    const alpha = 0.012 + random() * 0.055;
    context.rotate(angle);
    const ray = context.createLinearGradient(inner, 0, length, 0);
    ray.addColorStop(0, `rgba(255,240,176,${alpha})`);
    ray.addColorStop(0.35, `rgba(255,169,66,${alpha * 0.72})`);
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

function createWindAttributes(count) {
  const random = seededRandom(26071998);
  const directions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const twists = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    directions[index * 3] = Math.cos(angle) * radial;
    directions[index * 3 + 1] = y;
    directions[index * 3 + 2] = Math.sin(angle) * radial;
    phases[index] = random() * 9.5;
    speeds[index] = 0.18 + random() * 0.42;
    sizes[index] = 1.2 + random() * 2.6;
    twists[index] = (random() - 0.5) * 1.4;
  }

  return { directions, phases, speeds, sizes, twists };
}

function SolarWind({ quality }) {
  const material = useRef();
  const count = quality === 'quality' ? 1700 : 430;
  const attributes = useMemo(() => createWindAttributes(count), [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points frustumCulled={false} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.directions, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[attributes.phases, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[attributes.speeds, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[attributes.sizes, 1]} />
        <bufferAttribute attach="attributes-aTwist" args={[attributes.twists, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        vertexShader={`
          uniform float uTime;
          attribute float aPhase;
          attribute float aSpeed;
          attribute float aSize;
          attribute float aTwist;
          varying float vFade;
          varying float vHeat;

          void main() {
            float life = mod(aPhase + uTime * aSpeed, 9.5) / 9.5;
            float radius = 1.08 + life * 8.6;
            vec3 direction = normalize(position);
            float spiral = radius * .045 * aTwist;
            float cosine = cos(spiral);
            float sine = sin(spiral);
            direction.xz = mat2(cosine, -sine, sine, cosine) * direction.xz;
            vec3 displaced = direction * radius;
            vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = aSize * (90.0 / max(4.0, -mvPosition.z));
            vFade = smoothstep(0.0, .08, life) * (1.0 - smoothstep(.58, 1.0, life));
            vHeat = 1.0 - life;
          }
        `}
        fragmentShader={`
          varying float vFade;
          varying float vHeat;

          void main() {
            vec2 centered = gl_PointCoord - .5;
            float radial = length(centered);
            float particle = 1.0 - smoothstep(.12, .5, radial);
            vec3 warm = vec3(1.0, .48, .11);
            vec3 pale = vec3(1.0, .92, .63);
            vec3 color = mix(warm, pale, vHeat);
            gl_FragColor = vec4(color, particle * vFade * .36);
          }
        `}
      />
    </points>
  );
}

export default function Sun({ quality, selected, onSelect, registerPlanet }) {
  const root = useRef();
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
    if (root.current) root.current.rotation.y += delta * 0.012;
    if (corona.current) {
      const pulse = 1 + Math.sin(time * 0.17) * 0.025;
      corona.current.scale.setScalar(pulse);
      corona.current.material.opacity = selected ? 0.82 : 0.68;
    }
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect('sun');
  };

  return (
    <group ref={root} onClick={select}>
      <sprite ref={corona} scale={[6.8, 6.8, 1]} renderOrder={-2}>
        <spriteMaterial
          map={coronaTexture}
          color="#fff0b0"
          transparent
          opacity={0.68}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

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
                    mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
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
              float limbDarkening = .46 + .54 * pow(mu, .58);

              vec3 amber = vec3(1.16, .46, .055);
              vec3 gold = vec3(1.48, .88, .29);
              vec3 whiteHot = vec3(1.72, 1.5, .88);
              vec3 color = mix(amber, gold, granulation);
              color = mix(color, whiteHot, smoothstep(.64, .96, cells + convection * .35));
              color *= limbDarkening;
              color *= 1.0 - sunspot * .72;
              color += vec3(.32, .055, .008) * filaments * .24;

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
              gl_FragColor = vec4(color, rim * .42);
            }
          `}
        />
      </mesh>

      <SolarWind quality={quality} />
      <pointLight color="#fff0c1" intensity={215} distance={125} decay={1.85} />
    </group>
  );
}
