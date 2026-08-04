import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Select } from '@react-three/postprocessing';
import BasketballOrbitals from '../basketball/BasketballOrbitals.jsx';
import BasketballWorld from '../worlds/BasketballWorld.jsx';
import PlaceholderWorld from '../worlds/PlaceholderWorld.jsx';

export default function PlanetSystem({
  interest,
  selected,
  onSelect,
  registerPlanet,
  quality,
  showOrbits
}) {
  const orbitalPivot = useRef();
  const carrier = useRef();
  const axialBody = useRef();

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

          <group
            ref={axialBody}
            rotation-y={interest.initialAxial}
            onClick={select}
            onDoubleClick={enter}
          >
            {interest.id === 'basketball' ? (
              <Select enabled>
                <BasketballWorld radius={interest.size} quality={quality} />
              </Select>
            ) : (
              <PlaceholderWorld interest={interest} quality={quality} />
            )}
          </group>

          {!selected && (
            <Html
              center
              distanceFactor={12}
              position={[0, interest.size + 0.45, 0]}
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
