import { translate } from '../i18n.js';

export default function Hud({
  language,
  quality,
  selectedId,
  showOrbits,
  showEcliptic,
  sunBrightness,
  onSunBrightnessChange,
  onToggleLanguage,
  onToggleQuality,
  onToggleOrbits,
  onToggleEcliptic,
  onReset
}) {
  const sunlightPercent = Math.round(sunBrightness * 100);
  const qualityLabel = quality === 'quality'
    ? translate(language, 'controls.quality')
    : translate(language, 'controls.eco');

  return (
    <>
      <header className="solar-header">
        <a
          className="solar-brand"
          href="/"
          aria-label={translate(language, 'header.homeAria')}
        >
          <span>7719</span>
          <small>{translate(language, 'header.subtitle')}</small>
        </a>
        <nav className="solar-nav" aria-label={translate(language, 'header.controlsAria')}>
          <a href="/">{translate(language, 'header.mainSite')}</a>
          <a href="https://github.com/7719Drinkin/7719Drinkin.github.io/tree/main/apps/solar-universe">
            {translate(language, 'header.source')}
          </a>
          <button type="button" onClick={onReset}>
            {translate(language, 'header.reset')}
          </button>
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={translate(language, 'header.switchLanguage')}
          >
            {translate(language, 'header.languageButton')}
          </button>
        </nav>
      </header>

      <section className="system-intro" aria-label={translate(language, 'intro.aria')}>
        <p>{translate(language, 'intro.kicker')}</p>
        <strong>{translate(language, 'intro.body')}</strong>
      </section>

      <aside className="system-readout" aria-label={translate(language, 'readout.aria')}>
        <div>
          <span>{translate(language, 'readout.worlds')}</span>
          <strong>{translate(language, 'readout.worldCount')}</strong>
        </div>
        <div>
          <span>{translate(language, 'readout.render')}</span>
          <strong>{qualityLabel}</strong>
        </div>
        <div>
          <span>{translate(language, 'readout.camera')}</span>
          <strong>
            {selectedId
              ? translate(language, 'readout.cameraFree')
              : translate(language, 'readout.cameraLocked')}
          </strong>
        </div>
      </aside>

      <div className="view-controls" aria-label={translate(language, 'controls.aria')}>
        <button type="button" onClick={onToggleQuality}>
          {translate(language, 'controls.mode')} <strong>{qualityLabel}</strong>
        </button>
        <button type="button" aria-pressed={showOrbits} onClick={onToggleOrbits}>
          {translate(language, 'controls.orbits')}{' '}
          <strong>
            {showOrbits
              ? translate(language, 'controls.on')
              : translate(language, 'controls.off')}
          </strong>
        </button>
        <button type="button" aria-pressed={showEcliptic} onClick={onToggleEcliptic}>
          {translate(language, 'controls.gravityGrid')}{' '}
          <strong>
            {showEcliptic
              ? translate(language, 'controls.on')
              : translate(language, 'controls.off')}
          </strong>
        </button>

        <label className="sunlight-control">
          <span>
            {translate(language, 'controls.solarOutput')} <strong>{sunlightPercent}%</strong>
          </span>
          <input
            type="range"
            min="0.25"
            max="2.5"
            step="0.05"
            value={sunBrightness}
            onChange={(event) => onSunBrightnessChange(Number(event.target.value))}
            aria-label={translate(language, 'controls.solarAria', { percent: sunlightPercent })}
          />
        </label>
      </div>
    </>
  );
}
