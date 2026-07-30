import { useCallback, useMemo, useRef, useState } from 'react';
import { INTERESTS } from './data/interests.js';
import UniverseCanvas from './scene/UniverseCanvas.jsx';
import Hud from './ui/Hud.jsx';
import PlanetPanel from './ui/PlanetPanel.jsx';

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [quality, setQuality] = useState(() => {
    const coarse = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    return coarse ? 'eco' : 'quality';
  });
  const [showOrbits, setShowOrbits] = useState(true);
  const [showEcliptic, setShowEcliptic] = useState(true);
  const planetRefs = useRef(new Map());

  const registerPlanet = useCallback((id, ref) => {
    if (ref) planetRefs.current.set(id, ref);
    else planetRefs.current.delete(id);
  }, []);

  const selected = useMemo(
    () => INTERESTS.find((interest) => interest.id === selectedId) ?? null,
    [selectedId]
  );

  return (
    <main className="solar-app">
      <UniverseCanvas
        interests={INTERESTS}
        selectedId={selectedId}
        onSelect={setSelectedId}
        quality={quality}
        showOrbits={showOrbits}
        showEcliptic={showEcliptic}
        planetRefs={planetRefs}
        registerPlanet={registerPlanet}
      />

      <Hud
        quality={quality}
        showOrbits={showOrbits}
        showEcliptic={showEcliptic}
        onToggleQuality={() => setQuality((value) => value === 'quality' ? 'eco' : 'quality')}
        onToggleOrbits={() => setShowOrbits((value) => !value)}
        onToggleEcliptic={() => setShowEcliptic((value) => !value)}
        onReset={() => setSelectedId(null)}
      />

      <PlanetPanel interest={selected} onClose={() => setSelectedId(null)} />

      <div className="interaction-help" aria-hidden="true">
        <span><strong>DRAG</strong> FREE ROTATE</span>
        <span><strong>SCROLL</strong> ZOOM</span>
        <span><strong>CLICK</strong> EXPLORE</span>
        <span><strong>DOUBLE CLICK</strong> ENTER</span>
      </div>

      <p className="affiliation-note">PERSONAL NON-COMMERCIAL TRIBUTE · NOT AFFILIATED WITH THE NBA OR CHICAGO BULLS</p>
    </main>
  );
}
