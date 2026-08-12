import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Select } from '@react-three/postprocessing';
import BasketballOrbitals from '../basketball/BasketballOrbitals.jsx';
import { useLabelVisibility } from '../context/LabelVisibilityContext.jsx';
import MusicPuppetCelestial from '../music/MusicPuppetCelestial.jsx';
import AnimeWorldV3 from '../worlds/AnimeWorldV3.jsx';
import BasketballWorld from '../worlds/BasketballWorld.jsx';
import GameWorldV2 from '../worlds/GameWorldV2.jsx';
import MusicWorld from '../worlds/MusicWorld.jsx';
import PlaceholderWorld from '../worlds/PlaceholderWorld.jsx';

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
  const orbitalPivot = useRef();
  const carrier = useRef();
  const axialBody = useRef();
  const musicPuppet = interest.id === 'music'
    ? celestials.find((body) => body.parentId === interest.id)
    : null;

  useEffect(() => {
    registerPlanet(interest.id, carrier);
    return () => registerPlanet(interest.id, null);
  }, [interest.id, registerPlanet]);

  useFrame((_, delta) => {
    if (orbitalPivot.current) orbitalPivot.current.rotation.y += interest.orbitSpeed * delta;
    if (axialBody.current) axialBody.current.rotation.y += interest.axialSpeed * delta;
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
