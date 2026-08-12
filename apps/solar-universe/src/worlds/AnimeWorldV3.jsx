import AnimeAtmosphereV3 from '../anime/AnimeAtmosphereV3.jsx';
import AnimeCentralAxis from '../anime/AnimeCentralAxis.jsx';
import AnimeCentralSpire from '../anime/AnimeCentralSpire.jsx';
import AnimeCityTerrain from '../anime/AnimeCityTerrain.jsx';
import AnimeUpperDistrict from '../anime/AnimeUpperDistrict.jsx';

export default function AnimeWorldV3({ radius, quality }) {
  return (
    <group>
      <AnimeCityTerrain radius={radius} quality={quality} />
      <AnimeCentralAxis radius={radius} quality={quality} />
      <AnimeUpperDistrict radius={radius} quality={quality} />
      <AnimeCentralSpire radius={radius} />
      <AnimeAtmosphereV3 radius={radius} quality={quality} />
    </group>
  );
}
