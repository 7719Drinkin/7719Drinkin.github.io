export default function Hud({
  quality,
  selectedId,
  showOrbits,
  showEcliptic,
  onToggleQuality,
  onToggleOrbits,
  onToggleEcliptic,
  onReset
}) {
  return (
    <>
      <header className="solar-header">
        <a className="solar-brand" href="/" aria-label="返回 7719 Universe 首页">
          <span>7719</span>
          <small>SOLAR UNIVERSE / R3F</small>
        </a>
        <nav className="solar-nav" aria-label="3D Universe controls">
          <a href="/">MAIN SITE</a>
          <a href="https://github.com/7719Drinkin/7719Drinkin.github.io/tree/feature/r3f-solar-universe/apps/solar-universe">SOURCE</a>
          <button type="button" onClick={onReset}>RESET VIEW</button>
        </nav>
      </header>

      <section className="system-intro" aria-label="3D Universe introduction">
        <p>7719 / MINIATURE INTEREST WORLDS</p>
        <strong>Each interest is a small world shaped by its places, objects and stories.</strong>
      </section>

      <aside className="system-readout" aria-label="Rendering status">
        <div><span>WORLDS</span><strong>03 + STAR</strong></div>
        <div><span>RENDER</span><strong>{quality.toUpperCase()}</strong></div>
        <div><span>CAMERA</span><strong>{selectedId ? 'CELESTIAL FREE' : 'ECLIPTIC LOCK'}</strong></div>
      </aside>

      <div className="view-controls" aria-label="3D display controls">
        <button type="button" onClick={onToggleQuality}>
          MODE <strong>{quality === 'quality' ? 'QUALITY+' : 'ECO'}</strong>
        </button>
        <button type="button" aria-pressed={showOrbits} onClick={onToggleOrbits}>
          ORBITS <strong>{showOrbits ? 'ON' : 'OFF'}</strong>
        </button>
        <button type="button" aria-pressed={showEcliptic} onClick={onToggleEcliptic}>
          GRAVITY GRID <strong>{showEcliptic ? 'ON' : 'OFF'}</strong>
        </button>
      </div>
    </>
  );
}
