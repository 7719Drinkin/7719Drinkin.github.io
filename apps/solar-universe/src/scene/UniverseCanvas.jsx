import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import PlanetSystem from './PlanetSystem.jsx';
import Sun from './Sun.jsx';
import GravityGrid from './GravityGrid.jsx';

const SYSTEM_CAMERA = new THREE.Vector3(0, 11.5, 30);
const SYSTEM_MIN_POLAR = 0.36;
const SYSTEM_MAX_POLAR = Math.PI / 2 - 0.035;
const FREE_MIN_POLAR = 0.001;
const FREE_MAX_POLAR = Math.PI - 0.001;
const SUNLIGHT_MIN = 0.35;
const SUNLIGHT_MAX = 1.65;

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
      <lineBasicMaterial color={color} transparent opacity={0.075} depthWrite={false} />
    </lineLoop>
  );
}

function LightingController({ sunBrightness, quality }) {
  const { gl, scene } = useThree();
  const sunlight = useRef();

  useEffect(() => {
    const baseExposure = quality === 'quality' ? 1.06 : 1.0;
    const normalized = THREE.MathUtils.clamp(
      (sunBrightness - SUNLIGHT_MIN) / (SUNLIGHT_MAX - SUNLIGHT_MIN),
      0,
      1
    );
    gl.toneMappingExposure = baseExposure * THREE.MathUtils.lerp(0.94, 1.06, normalized);
  }, [gl, quality, sunBrightness]);

  useFrame(() => {
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

    if (sunlight.current) sunlight.current.intensity = 255 * sunBrightness;
  });

  return null;
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
  const currentDirection = useMemo(() => new THREE.Vector3(), []);
  const sunFacing = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!selectedId) {
      transition.current = 'system';
      desiredCamera.current.copy(SYSTEM_CAMERA);
      desiredTarget.current.set(0, 0, 0);
      hasPreviousTarget.current = false;
      controls.minDistance = 8;
      controls.maxDistance = 58;
      controls.minPolarAngle = SYSTEM_MIN_POLAR;
      controls.maxPolarAngle = SYSTEM_MAX_POLAR;
      controls.target.y = 0;
      return;
    }

    const object = planetRefs.current.get(selectedId)?.current;
    if (!object) return;
    object.getWorldPosition(target);
    previousTarget.current.copy(target);
    hasPreviousTarget.current = true;

    currentDirection.copy(camera.position).sub(controls.target).normalize();
    if (selectedId === 'sun') {
      sunFacing.copy(currentDirection);
    } else {
      sunFacing.copy(target).multiplyScalar(-1).normalize();
      if (sunFacing.lengthSq() < 0.001) sunFacing.copy(currentDirection);
    }

    const preferred = currentDirection
      .multiplyScalar(selectedId === 'sun' ? 1 : 0.8)
      .add(sunFacing.multiplyScalar(selectedId === 'sun' ? 0 : 0.2))
      .normalize();
    const focusDistance = selectedId === 'sun' ? 4.35 : 5.8;
    const heightOffset = selectedId === 'sun' ? 0.18 : 0.52;

    desiredTarget.current.copy(target);
    desiredCamera.current.copy(target)
      .add(preferred.multiplyScalar(focusDistance))
      .add(new THREE.Vector3(0, heightOffset, 0));
    transition.current = 'celestial';
    controls.minDistance = selectedId === 'sun' ? 2.05 : 1.75;
    controls.maxDistance = selectedId === 'sun' ? 16 : 12;
    controls.minPolarAngle = FREE_MIN_POLAR;
    controls.maxPolarAngle = FREE_MAX_POLAR;
  }, [camera, currentDirection, planetRefs, selectedId, sunFacing, target]);

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
        camera.position.distanceTo(desiredCamera.current) < 0.03
        && controls.target.distanceTo(desiredTarget.current) < 0.03
      ) {
        transition.current = null;
      }
    }

    if (!selectedId) {
      controls.target.y = 0;
      camera.position.y = Math.max(camera.position.y, 0.35);
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.055}
      enablePan={false}
      minDistance={8}
      maxDistance={58}
      minPolarAngle={SYSTEM_MIN_POLAR}
      maxPolarAngle={SYSTEM_MAX_POLAR}
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
  showEcliptic,
  sunBrightness
}) {
  return (
    <>
      <color attach="background" args={['#000106']} />
      <fogExp2 attach="fog" args={['#000106', 0.0031]} />

      <ambientLight color="#647087" intensity={0.004} />
      <hemisphereLight args={['#526078', '#030202', 0.028]} />

      <Sun
        quality={quality}
        selected={selectedId === 'sun'}
        onSelect={onSelect}
        registerPlanet={registerPlanet}
      />
      <LightingController sunBrightness={sunBrightness} quality={quality} />

      <Stars
        radius={170}
        depth={95}
        count={quality === 'quality' ? 7200 : 1900}
        factor={4}
        saturation={0.12}
        fade
        speed={0.12}
      />

      {showEcliptic && (
        <GravityGrid interests={interests} planetRefs={planetRefs} quality={quality} />
      )}

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
          showOrbits={showOrbits}
        />
      ))}

      <CameraController selectedId={selectedId} planetRefs={planetRefs} />

      {quality === 'quality' && (
        <EffectComposer multisampling={4}>
          <Bloom
            luminanceThreshold={1.12}
            luminanceSmoothing={0.42}
            intensity={0.5}
            mipmapBlur
          />
          <Vignette offset={0.3} darkness={0.68} />
        </EffectComposer>
      )}
    </>
  );
}

export default function UniverseCanvas(props) {
  const dpr = props.quality === 'quality' ? [1, 2] : [1, 1.2];
  const normalizedBrightness = THREE.MathUtils.clamp(
    (props.sunBrightness - SUNLIGHT_MIN) / (SUNLIGHT_MAX - SUNLIGHT_MIN),
    0,
    1
  );
  const initialExposure = (props.quality === 'quality' ? 1.06 : 1.0)
    * THREE.MathUtils.lerp(0.94, 1.06, normalizedBrightness);

  return (
    <Canvas
      className="universe-canvas"
      camera={{ position: SYSTEM_CAMERA.toArray(), fov: 42, near: 0.1, far: 380 }}
      dpr={dpr}
      gl={{
        antialias: props.quality === 'quality',
        powerPreference: props.quality === 'quality' ? 'high-performance' : 'low-power'
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = initialExposure;
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
