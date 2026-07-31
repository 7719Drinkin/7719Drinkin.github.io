import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INTERESTS, SUN } from './data/interests.js';
import {
  detectLanguage,
  localizeInterest,
  persistLanguage,
  translate
} from './i18n.js';
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
  const [sunBrightness, setSunBrightness] = useState(1);
  const [language, setLanguage] = useState(detectLanguage);
  const planetRefs = useRef(new Map());

  useEffect(() => {
    persistLanguage(language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dataset.language = language;
    document.title = translate(language, 'pageTitle');
  }, [language]);

  const localizedSun = useMemo(() => localizeInterest(SUN, language), [language]);
  const localizedInterests = useMemo(
    () => INTERESTS.map((interest) => localizeInterest(interest, language)),
    [language]
  );

  const registerPlanet = useCallback((id, ref) => {
    if (ref) planetRefs.current.set(id, ref);
    else planetRefs.current.delete(id);
  }, []);

  const selected = useMemo(() => {
    if (selectedId === localizedSun.id) return localizedSun;
    return localizedInterests.find((interest) => interest.id === selectedId) ?? null;
  }, [localizedInterests, localizedSun, selectedId]);

  return (
    <main className="solar-app">
      <UniverseCanvas
        interests={localizedInterests}
        selectedId={selectedId}
        onSelect={setSelectedId}
        quality={quality}
        showOrbits={showOrbits}
        showEcliptic={showEcliptic}
        sunBrightness={sunBrightness}
        planetRefs={planetRefs}
        registerPlanet={registerPlanet}
      />

      <Hud
        language={language}
        quality={quality}
        selectedId={selectedId}
        showOrbits={showOrbits}
        showEcliptic={showEcliptic}
        sunBrightness={sunBrightness}
        onSunBrightnessChange={setSunBrightness}
        onToggleLanguage={() => setLanguage((value) => value === 'zh' ? 'en' : 'zh')}
        onToggleQuality={() => setQuality((value) => value === 'quality' ? 'eco' : 'quality')}
        onToggleOrbits={() => setShowOrbits((value) => !value)}
        onToggleEcliptic={() => setShowEcliptic((value) => !value)}
        onReset={() => setSelectedId(null)}
      />

      <PlanetPanel
        interest={selected}
        language={language}
        onClose={() => setSelectedId(null)}
      />

      <div className="interaction-help" aria-hidden="true">
        <span>
          <strong>{translate(language, 'help.drag')}</strong>{' '}
          {selectedId
            ? translate(language, 'help.freeRotate')
            : translate(language, 'help.aboveEcliptic')}
        </span>
        <span><strong>{translate(language, 'help.scroll')}</strong> {translate(language, 'help.zoom')}</span>
        <span><strong>{translate(language, 'help.click')}</strong> {translate(language, 'help.selectBody')}</span>
        <span><strong>{translate(language, 'help.doubleClick')}</strong> {translate(language, 'help.enter')}</span>
      </div>

      <p className="affiliation-note">{translate(language, 'affiliation')}</p>
    </main>
  );
}
