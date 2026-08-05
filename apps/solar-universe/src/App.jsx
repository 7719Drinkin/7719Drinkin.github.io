import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { LabelVisibilityProvider } from './context/LabelVisibilityContext.jsx';
import { INTERESTS, SUN } from './data/interests.js';
import { MUSIC_PUPPET_CELESTIAL } from './data/musicPuppetCelestial.js';
import {
  detectLanguage,
  localizeInterest,
  persistLanguage,
  translate
} from './i18n.js';
import Hud from './ui/Hud.jsx';
import PlanetPanel from './ui/PlanetPanel.jsx';
import UniverseLoader from './ui/UniverseLoader.jsx';

const AUXILIARY_CELESTIALS = [MUSIC_PUPPET_CELESTIAL];
const LOAD_STAGE_ORDER = { boot: 0, module: 1, canvas: 2, ready: 3 };

let universeCanvasPromise;

function loadUniverseCanvas() {
  if (!universeCanvasPromise) {
    universeCanvasPromise = import('./scene/UniverseCanvas.jsx');
  }
  return universeCanvasPromise;
}

const UniverseCanvas = lazy(loadUniverseCanvas);

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [quality, setQuality] = useState(() => {
    const coarse = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    return coarse ? 'eco' : 'quality';
  });
  const [showOrbits, setShowOrbits] = useState(true);
  const [showEcliptic, setShowEcliptic] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [sunBrightness, setSunBrightness] = useState(1);
  const [language, setLanguage] = useState(detectLanguage);
  const [sceneRequested, setSceneRequested] = useState(false);
  const [loadStage, setLoadStage] = useState('boot');
  const [loaderVisible, setLoaderVisible] = useState(true);
  const loaderTimeout = useRef();
  const planetRefs = useRef(new Map());

  useEffect(() => {
    persistLanguage(language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dataset.language = language;
    document.title = translate(language, 'pageTitle');
  }, [language]);

  const advanceLoadStage = useCallback((nextStage) => {
    setLoadStage((currentStage) => (
      LOAD_STAGE_ORDER[nextStage] > LOAD_STAGE_ORDER[currentStage]
        ? nextStage
        : currentStage
    ));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      setSceneRequested(true);
      loadUniverseCanvas().then(() => {
        if (!cancelled) advanceLoadStage('module');
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [advanceLoadStage]);

  useEffect(() => () => {
    if (loaderTimeout.current) window.clearTimeout(loaderTimeout.current);
  }, []);

  const handleCanvasCreated = useCallback(() => {
    advanceLoadStage('canvas');
  }, [advanceLoadStage]);

  const handleSceneReady = useCallback(() => {
    advanceLoadStage('ready');
    if (loaderTimeout.current) window.clearTimeout(loaderTimeout.current);
    loaderTimeout.current = window.setTimeout(() => {
      setLoaderVisible(false);
    }, 620);
  }, [advanceLoadStage]);

  const localizedSun = useMemo(() => localizeInterest(SUN, language), [language]);
  const localizedInterests = useMemo(
    () => INTERESTS.map((interest) => localizeInterest(interest, language)),
    [language]
  );
  const localizedCelestials = useMemo(
    () => AUXILIARY_CELESTIALS.map((body) => localizeInterest(body, language)),
    [language]
  );

  const registerPlanet = useCallback((id, ref) => {
    if (ref) planetRefs.current.set(id, ref);
    else planetRefs.current.delete(id);
  }, []);

  const selected = useMemo(() => {
    if (selectedId === localizedSun.id) return localizedSun;
    return localizedInterests.find((interest) => interest.id === selectedId)
      ?? localizedCelestials.find((body) => body.id === selectedId)
      ?? null;
  }, [localizedCelestials, localizedInterests, localizedSun, selectedId]);

  return (
    <LabelVisibilityProvider visible={showLabels}>
      <main className="solar-app">
        {sceneRequested && (
          <Suspense fallback={null}>
            <UniverseCanvas
              interests={localizedInterests}
              celestials={localizedCelestials}
              selectedId={selectedId}
              onSelect={setSelectedId}
              quality={quality}
              showOrbits={showOrbits}
              showEcliptic={showEcliptic}
              sunBrightness={sunBrightness}
              planetRefs={planetRefs}
              registerPlanet={registerPlanet}
              onCanvasCreated={handleCanvasCreated}
              onSceneReady={handleSceneReady}
            />
          </Suspense>
        )}

        <Hud
          language={language}
          quality={quality}
          selectedId={selectedId}
          showOrbits={showOrbits}
          showEcliptic={showEcliptic}
          showLabels={showLabels}
          sunBrightness={sunBrightness}
          onSunBrightnessChange={setSunBrightness}
          onToggleLanguage={() => setLanguage((value) => value === 'zh' ? 'en' : 'zh')}
          onToggleQuality={() => setQuality((value) => value === 'quality' ? 'eco' : 'quality')}
          onToggleOrbits={() => setShowOrbits((value) => !value)}
          onToggleEcliptic={() => setShowEcliptic((value) => !value)}
          onToggleLabels={() => setShowLabels((value) => !value)}
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

        {loaderVisible && (
          <UniverseLoader language={language} stage={loadStage} />
        )}
      </main>
    </LabelVisibilityProvider>
  );
}
