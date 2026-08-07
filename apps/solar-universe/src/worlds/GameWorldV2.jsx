import GameCivilizationLayer from '../game/GameCivilizationLayer.jsx';
import GameWorld from './GameWorld.jsx';

export default function GameWorldV2({ radius, quality }) {
  return (
    <group>
      <GameWorld radius={radius} quality={quality} />
      <GameCivilizationLayer radius={radius} quality={quality} />
    </group>
  );
}
