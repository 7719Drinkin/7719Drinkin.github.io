import AnimeAtmosphereV3 from '../anime/AnimeAtmosphereV3.jsx';
import AnimeAxisGate from '../anime/AnimeAxisGate.jsx';
import AnimeCentralAxis from '../anime/AnimeCentralAxis.jsx';
import AnimeCentralSpire from '../anime/AnimeCentralSpire.jsx';
import AnimeCityTerrain from '../anime/AnimeCityTerrain.jsx';
import AnimeCrownPlatform from '../anime/AnimeCrownPlatform.jsx';
import AnimeLowerCity from '../anime/AnimeLowerCity.jsx';
import AnimeTerraceRims from '../anime/AnimeTerraceRims.jsx';
import AnimeTerraceWalls from '../anime/AnimeTerraceWalls.jsx';
import AnimeUpperDistrict from '../anime/AnimeUpperDistrict.jsx';

export default function AnimeWorldV3({ radius, quality }) {
  return (
    <group>
      <AnimeCityTerrain radius={radius} quality={quality} />
      <AnimeTerraceWalls radius={radius} quality={quality} />
      <AnimeTerraceRims radius={radius} quality={quality} />
      <AnimeLowerCity radius={radius} quality={quality} />
      <AnimeCentralAxis radius={radius} quality={quality} />
      <AnimeAxisGate radius={radius} />
      <AnimeUpperDistrict radius={radius} quality={quality} />
      <AnimeCrownPlatform radius={radius} />
      <AnimeCentralSpire radius={radius} />
      <AnimeAtmosphereV3 radius={radius} quality={quality} />
    </group>
  );
}
