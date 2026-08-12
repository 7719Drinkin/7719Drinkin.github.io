import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Select } from '@react-three/postprocessing';
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
const SOLAR_DECAY = 0.8;

function solarShadowExtent(interest) {
  if (interest.id === 'basketball') return interest.size * 2.5;
  if (interest.id === 'music') return Math.max(interest.size * 2, 3.2);
  if (interest.id === 'anime') return interest.size * 3;
  return interest.size * 2;
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
  const { camera, raycaster, scene } = useThree();
  const orbitalPivot = useRef();
  const carrier = useRef();
  const axialBody = useRef();
  const solarLight = useRef();
  const solarTarget = useRef();
  const sourceSunlight = useRef();
  const layerSyncFrames = useRef(12);
  const solarLayer = SOLAR_LIGHT_LAYERS[interest.id] ?? 5;
  const shadowExtent = useMemo(() => solarShadowExtent(interest), [interest]);
  const shadowDistance = useMemo(() => Math.max(6, shadowExtent * 3.2), [shadowExtent]);
  const shadowFar = shadowDistance + shadowExtent * 2.6;
  const musicPuppet = interest.id === 'music'
    ? celestials.find((body) => body.parentId === interest.id)
    : null;

  useEffect(() => {
    registerPlanet(interest.id, carrier);
    return () => registerPlanet(interest.id, null);
  }, [interest.id, registerPlanet]);

  useEffect(() => {
    // Physical planet meshes live on dedicated solar-light layers so global
    // ambient/hemisphere light and local decorative lamps cannot bypass solar
    // occlusion. Camera and raycaster must both see those layers.
    camera.layers.enable(solarLayer);
    raycaster.layers.enable(solarLayer);
    layerSyncFrames.current = 12;

    return () => {
      camera.layers.disable(solarLayer);
      raycaster.layers.disable(solarLayer);
    };
  }, [camera, quality, raycaster, solarLayer]);

  useEffect(() => {
    const light = solarLight.current;
    const target = solarTarget.current;
    if (!light || !target) return;

    light.target = target;
    light.layers.set(solarLayer);
    light.castShadow = true;

    const shadowSize = quality === 'quality' ? 1024 : 512;
    light.shadow.mapSize.set(shadowSize, shadowSize);

    // A DirectionalLight is the stable approximation for solar rays at planet
    // scale. Its orthographic shadow camera is tightly fitted around one world.
    const shadowCamera = light.shadow.camera;
    shadowCamera.left = -shadowExtent;
    shadowCamera.right = shadowExtent;
    shadowCamera.top = shadowExtent;
    shadowCamera.bottom = -shadowExtent;
    shadowCamera.near = 0.1;
    shadowCamera.far = shadowFar;
    shadowCamera.layers.set(solarLayer);
    shadowCamera.updateProjectionMatrix();

    light.shadow.bias = -0.00002;
    light.shadow.normalBias = 0.0005;
    light.shadow.radius = quality === 'quality' ? 1.2 : 1;
  }, [quality, shadowExtent, shadowFar, solarLayer]);

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

    // The central PointLight remains the single runtime brightness control, but
    // it no longer illuminates planet receiver layers directly. Reproduce its
    // configured r^-0.8 response at each orbit for the dedicated solar light.
    if (sourceSunlight.current) {
      sourceSunlight.current.castShadow = false;
      if (solarLight.current) {
        solarLight.current.intensity = sourceSunlight.current.intensity
          / Math.pow(Math.max(interest.orbitRadius, 0.01), SOLAR_DECAY);
      }
    }

    if (solarTarget.current) solarTarget.current.updateMatrixWorld();

    if (layerSyncFrames.current > 0 && axialBody.current) {
      axialBody.current.traverse((object) => {
        // Only move actual planet geometry to the solar receiver layer. The old
        // carrier-wide traversal also moved Floodlights, trail PointLights,
        // satellites and other local lights onto this layer. Those lights then
        // illuminated the nominal night side and defeated solar occlusion.
        // Lights intentionally remain on layer 0 and therefore cannot illuminate
        // the physical planet meshes below.
        if (object.isLight || (!object.isMesh && !object.isInstancedMesh)) return;

        object.layers.disable(0);
        object.layers.enable(solarLayer);

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
          <directionalLight
            ref={solarLight}
            position={[-shadowDistance, 0, 0]}
            color="#fff1cf"
            intensity={0}
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
