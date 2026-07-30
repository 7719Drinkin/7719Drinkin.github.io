import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, TrackballControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import PlanetSystem from './PlanetSystem.jsx';

const SYSTEM_CAMERA = new THREE.Vector3(0, 13, 29);

function createSunGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(256, 256, 20, 256, 256, 256);
  gradient.addColorStop(0, 'rgba(255,248,205,1)');
  gradient.addColorStop(0.12, 'rgba(255,194,82,.88)');
  gradient.addColorStop(0.32, 'rgba(255,103,24,.34)');
  gradient.addColorStop(0.62, 'rgba(255,61,8,.09)');
  gradient.addColorStop(1, 'rgba(255,40,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Sun() {
  const material = useRef();
  const shell = useRef();
  const glowTexture = useMemo(createSunGlowTexture, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }, delta) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
    if (shell.current) {
      shell.current.rotation.y += delta * 0.035;
      shell.current.rotation.x -= delta * 0.012;
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.42) * 0.018;
      shell.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      <sprite scale={[4.5, 4.5, 1]} renderOrder={-1}>
        <spriteMaterial
          map={glowTexture}
          color="#ff8a27"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      <mesh>
        <icosahedronGeometry args={[0.9, 5]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={`
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vView;
            void main() {
              float waveA = sin(position.x * 8.0 + uTime * .42) * .012;
              float waveB = sin(position.y * 13.0 - uTime * .31) * .008;
              float waveC = sin(position.z * 17.0 + uTime * .23) * .006;
              vec3 displaced = position + normal * (waveA + waveB + waveC);
              vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vPosition = normalize(position);
              vView = -mvPosition.xyz;
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vView;
            void main() {
              float bandA = sin(vPosition.x * 12.0 + vPosition.y * 7.0 + uTime * .48);
              float bandB = sin(vPosition.y * 18.0 - vPosition.z * 9.0 - uTime * .31);
              float cells = sin((vPosition.x + vPosition.y + vPosition.z) * 25.0 + uTime * .22);
              float heat = clamp(.55 + bandA * .18 + bandB * .14 + cells * .1, 0.0, 1.0);
              vec3 deep = vec3(.72, .075, .006);
              vec3 amber = vec3(1.0, .39, .035);
              vec3 hot = vec3(1.0, .92, .55);
              vec3 color = mix(deep, amber, smoothstep(.05, .72, heat));
              color = mix(color, hot, smoothstep(.68, 1.0, heat));
              float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
              color += vec3(1.0, .22, .02) * rim * .34;
              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>

      <mesh ref={shell}>
        <icosahedronGeometry args={[1.02, 3]} />
        <meshBasicMaterial
          color="#ff6c16"
          transparent
          opacity={0.13}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <pointLight color="#ffb46d" intensity={168} distance={118} decay={1.8} />
    </group>
  );
}

function OrbitLine({ radius, inclination, color }) {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 256 }, (_, index) => {
      const angle = index / 256 * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <lineLoop geometry={geometry} rotation-z={inclination}>
      <lineBasicMaterial color={color} transparent opacity={0.09} depthWrite={false} />
    </lineLoop>
  );
}

function EclipticPlane() {
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh>
        <ringGeometry args={[1.35, 22.5, 160, 1]} />
        <meshBasicMaterial
          color="#6d7890"
          transparent
          opacity={0.022}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[22.44, 22.5, 160, 1]} />
        <meshBasicMaterial color="#8391ad" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraController({ selectedId, planetRefs }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const previousTarget = useRef(new THREE.Vector3());
  const hasPreviousTarget = useRef(false);
  const transition = useRef('system');
  const desiredCamera = useRef(SYSTEM_CAMERA.clone());
  const desiredTarget = useRef(new THREE.Vector3());
  const target = useMemo(() => new THREE.Vector3(), []);
  const delta = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!selectedId) {
      transition.current = 'system';
      desiredCamera.current.copy(SYSTEM_CAMERA);
      desiredTarget.current.set(0, 0, 0);
      hasPreviousTarget.current = false;
      controls.minDistance = 6;
      controls.maxDistance = 58;
      return;
    }

    const object = planetRefs.current.get(selectedId)?.current;
    if (!object) return;
    object.getWorldPosition(target);
    previousTarget.current.copy(target);
    hasPreviousTarget.current = true;

    const currentDirection = camera.position.clone().sub(controls.target).normalize();
    const sunFacing = target.clone().multiplyScalar(-1).normalize();
    const preferred = currentDirection.multiplyScalar(0.78).add(sunFacing.multiplyScalar(0.22)).normalize();
    desiredTarget.current.copy(target);
    desiredCamera.current.copy(target).add(preferred.multiplyScalar(5.8)).add(new THREE.Vector3(0, 0.55, 0));
    transition.current = 'planet';
    controls.minDistance = 1.75;
    controls.maxDistance = 12;
  }, [camera, planetRefs, selectedId, target]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (selectedId) {
      const object = planetRefs.current.get(selectedId)?.current;
      if (object) {
        object.getWorldPosition(target);
        if (hasPreviousTarget.current) {
          delta.copy(target).sub(previousTarget.current);
          camera.position.add(delta);
          controls.target.add(delta);
          desiredCamera.current.add(delta);
          desiredTarget.current.add(delta);
        }
        previousTarget.current.copy(target);
        hasPreviousTarget.current = true;
      }
    }

    if (transition.current) {
      camera.position.lerp(desiredCamera.current, 0.07);
      controls.target.lerp(desiredTarget.current, 0.085);
      if (
        camera.position.distanceTo(desiredCamera.current) < 0.03 &&
        controls.target.distanceTo(desiredTarget.current) < 0.03
      ) {
        transition.current = null;
      }
    }

    controls.update();
  });

  return (
    <TrackballControls
      ref={controlsRef}
      makeDefault
      noPan
      rotateSpeed={2.15}
      zoomSpeed={1.05}
      staticMoving={false}
      dynamicDampingFactor={0.12}
      onStart={() => { transition.current = null; }}
    />
  );
}

function Scene({
  interests,
  selectedId,
  onSelect,
  planetRefs,
  registerPlanet,
  quality,
  showOrbits,
  showEcliptic
}) {
  return (
    <>
      <color attach="background" args={['#000106']} />
      <fogExp2 attach="fog" args={['#000106', 0.0034]} />

      <ambientLight color="#718099" intensity={0.07} />
      <hemisphereLight args={['#8fa4c2', '#25170f', 0.38]} />
      <directionalLight position={[9, 11, 16]} color="#cbd8ed" intensity={0.18} />
      <Sun />
      <Stars radius={170} depth={95} count={quality === 'quality' ? 7200 : 1900} factor={4} saturation={0.12} fade speed={0.12} />

      {showEcliptic && <EclipticPlane />}

      {showOrbits && interests.map((interest) => (
        <OrbitLine
          key={`orbit-${interest.id}`}
          radius={interest.orbitRadius}
          inclination={interest.axialTilt * 0.25}
          color={interest.accent}
        />
      ))}

      {interests.map((interest) => (
        <PlanetSystem
          key={interest.id}
          interest={interest}
          selected={interest.id === selectedId}
          onSelect={onSelect}
          registerPlanet={registerPlanet}
          quality={quality}
        />
      ))}

      <CameraController selectedId={selectedId} planetRefs={planetRefs} />

      {quality === 'quality' && (
        <EffectComposer multisampling={4}>
          <Bloom luminanceThreshold={1.02} luminanceSmoothing={0.55} intensity={0.58} mipmapBlur />
          <Vignette offset={0.3} darkness={0.56} />
        </EffectComposer>
      )}
    </>
  );
}

export default function UniverseCanvas(props) {
  const dpr = props.quality === 'quality' ? [1, 2] : [1, 1.2];
  return (
    <Canvas
      className="universe-canvas"
      camera={{ position: SYSTEM_CAMERA.toArray(), fov: 42, near: 0.1, far: 380 }}
      dpr={dpr}
      gl={{ antialias: props.quality === 'quality', powerPreference: props.quality === 'quality' ? 'high-performance' : 'low-power' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = props.quality === 'quality' ? 1.2 : 1.06;
      }}
      onPointerMissed={(event) => {
        if (event.type === 'click') props.onSelect(null);
      }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
