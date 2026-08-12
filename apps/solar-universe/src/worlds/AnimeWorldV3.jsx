import { useEffect, useRef } from 'react';
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

export default function AnimeWorldV3({ radius, quality }) {
  const root = useRef();

  useEffect(() => {
    if (!root.current) return;

    root.current.traverse((object) => {
      if (!object.isMesh && !object.isInstancedMesh) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const receivesPhysicalLight = materials.some((material) => (
        material
        && !material.isMeshBasicMaterial
        && !material.isShaderMaterial
        && !material.transparent
      ));

      if (!receivesPhysicalLight) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }, [quality, radius]);

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
