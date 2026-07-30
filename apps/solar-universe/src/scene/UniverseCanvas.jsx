import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import PlanetSystem from './PlanetSystem.jsx';

const SYSTEM_CAMERA = new THREE.Vector3(0, 13, 29);

function Sun() {
  const material = useRef();
  useFrame(({ clock }) => {
    if (material.current) {
      material.current.emissiveIntensity = 2.8 + Math.sin(clock.elapsedTime * 0.45) * 0.18;
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.02, 72, 48]} />
        <meshStandardMaterial
          ref={material}
          color="#ff7a19"
          emissive="#ff3d00"
          emissiveIntensity={2.8}
          roughness={0.62}
        />
      </mesh>
      <pointLight color="#ffb16e" intensity={125} distance={115} decay={1.7} />
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
      <lineBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
    </lineLoop>
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
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.055}
      enablePan={false}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI - 0.12}
      onStart={() => { transition.current = null; }}
    />
  );
}

function Scene({ interests, selectedId, onSelect, planetRefs, registerPlanet, quality }) {
  return (
    <>
      <color attach="background" args={['#000106']} />
      <fogExp2 attach="fog" args={['#000106', 0.0034]} />

      <ambientLight color="#7889a4" intensity={0.34} />
      <hemisphereLight args={['#b7d0f0', '#5a3828', 1.15]} />
      <directionalLight position={[8, 12, 14]} color="#e2ecff" intensity={0.72} />
      <Sun />
      <Stars radius={170} depth={95} count={quality === 'quality' ? 7200 : 1900} factor={4} saturation={0.12} fade speed={0.12} />

      {interests.map((interest) => (
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
          <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.6} intensity={0.7} mipmapBlur />
          <Vignette offset={0.28} darkness={0.72} />
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
        gl.toneMappingExposure = props.quality === 'quality' ? 1.34 : 1.16;
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
