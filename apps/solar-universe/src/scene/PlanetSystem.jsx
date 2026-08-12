import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Select } from '@react-three/postprocessing';
import * as THREE from 'three';
import BasketballOrbitals from '../basketball/BasketballOrbitals.jsx';
import { useLabelVisibility } from '../context/LabelVisibilityContext.jsx';
import MusicPuppetCelestial from '../music/MusicPuppetCelestial.jsx';
import AnimeWorldV3 from '../worlds/AnimeWorldV3.jsx';
import BasketballWorld from '../worlds/BasketballWorld.jsx';
import GameWorldV2 from '../worlds/GameWorldV2.jsx';
import MusicWorld from '../worlds/MusicWorld.jsx';
import PlaceholderWorld from '../worlds/PlaceholderWorld.jsx';

const SOLAR_LIGHT_LAYERS = {
  basketball: 1,
  games: 2,
  music: 3,
  anime: 4
};

function solarShadowExtent(interest) {
  if (interest.id === 'basketball') return interest.size * 2.45;
  if (interest.id === 'music') return Math.max(interest.size * 1.9, 3.15);
  if (interest.id === 'anime') return interest.size * 2.55;
  return interest.size * 1.85;
}

function solarConeAngle(interest) {
  const extent = solarShadowExtent(interest);
  const angularRadius = Math.atan2(extent, interest.orbitRadius);
  return THREE.MathUtils.clamp(
    angularRadius * 1.22 + THREE.MathUtils.degToRad(0.8),
    THREE.MathUtils.degToRad(4),
    THREE.MathUtils.degToRad(16)
  );
}

function isOpaqueMaterial(material) {
  return Boolean(material && !material.transparent && material.opacity !== 0);
}

function isPhysicallyLitMaterial(material) {
  return Boolean(
    material
    && !material.isMeshBasicMaterial
    && !material.isShaderMaterial
    && !material.transparent
  );
}

export default function PlanetSystem({
  interest,
  celestials = [],
  selected,
  selectedId,
  onSelect,
  registerPlanet,
  quality,
  showOrbits
}) {
  const showLabels = useLabelVisibility();
  const { camera, scene } = useThree();
  const orbitalPivot = useRef();
  const carrier = useRef();
  const axialBody = useRef();
  const solarLight = useRef();
  const solarTarget = useRef();
  const sourceSunlight = useRef();
  const layerSyncFrames = useRef(12);
  const solarLayer = SOLAR_LIGHT_LAYERS[interest.id] ?? 5;
  const shadowExtent = useMemo(() => solarShadowExtent(interest), [interest]);
  const coneAngle = useMemo(() => solarConeAngle(interest), [interest]);
  const shadowFar = interest.orbitRadius + shadowExtent * 2 + 2;
  const musicPuppet = interest.id === 'music'
    ? celestials.find((body) => body.parentId === interest.id)
    : null;

  useEffect(() => {
    registerPlanet(interest.id, carrier);
    return () => registerPlanet(interest.id, null);
  }, [interest.id, registerPlanet]);

  useEffect(() => {
    camera.layers.enable(solarLayer);
    layerSyncFrames.current = 12;

    return () => {
      camera.layers.disable(solarLayer);
    };
  }, [camera, quality, solarLayer]);

  useEffect(() => {
    const light = solarLight.current;
    const target = solarTarget.current;
    if (!light || !target) return;

    light.target = target;
    light.layers.set(solarLayer);
    light.castShadow = true;
    light.shadow.mapSize.set(
      quality === 'quality' ? 1024 : 512,
      quality === 'quality' ? 1024 : 512
    );
    light.shadow.camera.near = 0.35;
    light.shadow.camera.far = shadowFar;
    light.shadow.camera.layers.set(solarLayer);
    light.shadow.bias = -0.00008;
    light.shadow.normalBias = 0.0015;
    light.shadow.radius = quality === 'quality' ? 1.35 : 1;
    light.shadow.camera.updateProjectionMatrix();
  }, [quality, shadowFar, solarLayer]);

  useFrame((_, delta) => {
    if (orbitalPivot.current) orbitalPivot.current.rotation.y += interest.orbitSpeed * delta;
    if (axialBody.current) axialBody.current.rotation.y += interest.axialSpeed * delta;

    if (!sourceSunlight.current) {
      scene.traverse((object) => {
        if (!sourceSunlight.current && object.isPointLight && object.distance >= 100) {
          sourceSunlight.current = object;
        }
      });
    }

    // The legacy long-range PointLight remains as the master brightness value,
    // but planet meshes no longer share its layer. Disable its coarse six-face
    // shadow map; the focused per-planet SpotLights below provide the actual
    // solar direct light and occlusion.
    if (sourceSunlight.current) {
      sourceSunlight.current.castShadow = false;
      if (solarLight.current) solarLight.current.intensity = sourceSunlight.current.intensity;
    }

    if (solarTarget.current) solarTarget.current.updateMatrixWorld();

    if (layerSyncFrames.current > 0 && carrier.current) {
      carrier.current.traverse((object) => {
        // Keep planets visible to the camera while removing them from layer 0,
        // so global ambient/hemisphere light and the old PointLight cannot leak
        // into the night side. Each planet receives only its own solar layer.
        object.layers.disable(0);
        object.layers.enable(solarLayer);

        if (!object.isMesh && !object.isInstancedMesh) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const opaque = materials.some(isOpaqueMaterial);
        const physicallyLit = materials.some(isPhysicallyLitMaterial);

        if (opaque) object.castShadow = true;
        if (physicallyLit) object.receiveShadow = true;
      });
      layerSyncFrames.current -= 1;
    }
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect(interest.id);
  };

  const enter = (event) => {
    event.stopPropagation();
    window.location.href = interest.route;
  };

  const world = interest.id === 'basketball' ? (
    <Select enabled={selected}>
      <BasketballWorld radius={interest.size} quality={quality} />
    </Select>
  ) : interest.id === 'games' ? (
    <GameWorldV2 radius={interest.size} quality={quality} />
  ) : interest.id === 'music' ? (
    <MusicWorld radius={interest.size} quality={quality} />
  ) : interest.id === 'anime' ? (
    <AnimeWorldV3 radius={interest.size} quality={quality} />
  ) : (
    <PlaceholderWorld interest={interest} quality={quality} />
  );

  const labelHeight = interest.id === 'anime'
    ? interest.size * 2.9
    : interest.size + 0.45;

  return (
    <group rotation-z={interest.axialTilt * 0.25}>
      <group ref={orbitalPivot} rotation-y={interest.initialOrbit}>
        <group ref={carrier} position={[interest.orbitRadius, 0, 0]}>
          <object3D ref={solarTarget} position={[0, 0, 0]} />
          <spotLight
            ref={solarLight}
            position={[-interest.orbitRadius, 0, 0]}
            color="#fff1cf"
            intensity={0}
            distance={0}
            decay={0.8}
            angle={coneAngle}
            penumbra={0}
            castShadow
          />

          {interest.id === 'basketball' && (
            <BasketballOrbitals
              radius={interest.size}
              quality={quality}
              showOrbit={showOrbits}
              onSelect={() => onSelect(interest.id)}
            />
          )}

          {musicPuppet && (
            <MusicPuppetCelestial
              body={musicPuppet}
              quality={quality}
              selectedId={selectedId}
              parentSelected={showLabels}
              showOrbit={showOrbits}
              onSelect={onSelect}
              registerPlanet={registerPlanet}
            />
          )}

          <group
            ref={axialBody}
            rotation-y={interest.initialAxial}
            onClick={select}
            onDoubleClick={enter}
          >
            {world}
          </group>

          {showLabels && (
            <Html
              center
              distanceFactor={12}
              position={[0, labelHeight, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div className="planet-label" style={{ '--planet-accent': interest.accent }}>
                <strong>{interest.title.toUpperCase()}</strong>
                <span>{interest.worldName}</span>
              </div>
            </Html>
          )}
        </group>
      </group>
    </group>
  );
}
