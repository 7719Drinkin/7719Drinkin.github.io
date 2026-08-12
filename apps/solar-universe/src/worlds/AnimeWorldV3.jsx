import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import AnimeAxisGate from '../anime/AnimeAxisGate.jsx';
import AnimeCentralAxis from '../anime/AnimeCentralAxis.jsx';
import AnimeCentralSpire from '../anime/AnimeCentralSpire.jsx';
import AnimeCityTerrain from '../anime/AnimeCityTerrain.jsx';
import AnimeCrownPlatform from '../anime/AnimeCrownPlatform.jsx';
import AnimeLowerCity from '../anime/AnimeLowerCity.jsx';
import AnimeMonumentalBridges from '../anime/AnimeMonumentalBridges.jsx';
import AnimeScarletBanners from '../anime/AnimeScarletBanners.jsx';
import AnimeTerraceWalls from '../anime/AnimeTerraceWalls.jsx';
import AnimeUpperDistrict from '../anime/AnimeUpperDistrict.jsx';
import { installAnimeNightMask } from '../anime/animeNightMask.js';

export default function AnimeWorldV3({ radius, quality }) {
  const root = useRef();
  const shaderBindings = useRef(new Set());
  const planetCenter = useRef(new THREE.Vector3());
  const sunDirection = useRef(new THREE.Vector3(-1, 0, 0));

  useEffect(() => {
    if (!root.current) return undefined;

    const restores = [];
    const patchedMaterials = new Set();
    const bindings = new Set();
    shaderBindings.current = bindings;

    root.current.traverse((object) => {
      if (!object.isMesh && !object.isInstancedMesh) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const physicalMaterials = materials.filter((material) => (
        material
        && (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)
        && !material.transparent
      ));

      if (physicalMaterials.length === 0) return;

      object.castShadow = true;
      object.receiveShadow = true;

      physicalMaterials.forEach((material) => {
        if (patchedMaterials.has(material)) return;
        patchedMaterials.add(material);
        restores.push(installAnimeNightMask(material, bindings));
      });
    });

    return () => {
      shaderBindings.current = new Set();
      restores.forEach((restore) => restore());
    };
  }, [quality, radius]);

  useFrame(() => {
    if (!root.current || shaderBindings.current.size === 0) return;

    root.current.getWorldPosition(planetCenter.current);
    sunDirection.current.copy(planetCenter.current).multiplyScalar(-1);
    if (sunDirection.current.lengthSq() > 1e-8) sunDirection.current.normalize();

    shaderBindings.current.forEach((shader) => {
      shader.uniforms.uAnimePlanetCenter.value.copy(planetCenter.current);
      shader.uniforms.uAnimeSunDirection.value.copy(sunDirection.current);
    });
  });

  return (
    <group ref={root}>
      <AnimeCityTerrain radius={radius} quality={quality} />
      <AnimeTerraceWalls radius={radius} quality={quality} />
      <AnimeLowerCity radius={radius} quality={quality} />
      <AnimeCentralAxis radius={radius} quality={quality} />
      <AnimeAxisGate radius={radius} />
      <AnimeMonumentalBridges radius={radius} quality={quality} />
      <AnimeUpperDistrict radius={radius} quality={quality} />
      <AnimeScarletBanners radius={radius} quality={quality} />
      <AnimeCrownPlatform radius={radius} />
      <AnimeCentralSpire radius={radius} />
    </group>
  );
}
