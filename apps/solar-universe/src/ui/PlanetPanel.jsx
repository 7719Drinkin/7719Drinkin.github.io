export default function PlanetPanel({ interest, onClose }) {
  const bodyLabel = interest?.kind === 'star' ? 'STAR' : 'PLANET';

  return (
    <aside className={`planet-panel${interest ? ' is-open' : ''}`} aria-hidden={!interest}>
      <button className="planet-panel-close" type="button" onClick={onClose} aria-label="关闭天体信息">×</button>
      {interest && (
        <>
          <div className="planet-panel-meta" style={{ '--panel-accent': interest.accent }}>
            <span>{bodyLabel} {interest.number}</span>
            <span>{interest.worldName}</span>
          </div>
          <h2>{interest.title}</h2>
          <p>{interest.description}</p>
          {interest.route ? (
            <a className="planet-panel-link" href={interest.route}>
              <span>ENTER INTEREST</span>
              <strong>↗</strong>
            </a>
          ) : (
            <div className="planet-panel-link planet-panel-link-static">
              <span>SELECTED CELESTIAL BODY</span>
              <strong>◎</strong>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
