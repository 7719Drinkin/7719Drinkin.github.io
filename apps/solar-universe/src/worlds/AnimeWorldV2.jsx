import AnimeSurfaceStories from '../anime/AnimeSurfaceStories.jsx';
import AnimeWorld from './AnimeWorld.jsx';

export default function AnimeWorldV2({ radius, quality }) {
  return (
    <group>
      <AnimeWorld radius={radius} quality={quality} />
      <AnimeSurfaceStories radius={radius} quality={quality} />
    </group>
  );
}
