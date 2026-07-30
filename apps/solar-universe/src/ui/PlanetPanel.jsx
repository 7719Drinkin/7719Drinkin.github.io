export default function PlanetPanel({ interest, onClose }) {
  return (
    <aside className={`planet-panel${interest ? ' is-open' : ''}`} aria-hidden={!interest}>
      <button className="planet-panel-close" type="button" onClick={onClose} aria-label="关闭行星信息">×</button>
      {interest && (
        <>
          <div className="planet-panel-meta" style={{ '--panel-accent': interest.accent }}>
            <span>PLANET {interest.number}</span>
            <span>{interest.worldName}</span>
          </div>
          <h2>{interest.title}</h2>
          <p>{interest.description}</p>
          <a className="planet-panel-link" href={interest.route}>
            <span>ENTER INTEREST</span>
            <strong>↗</strong>
          </a>
        </>
      )}
    </aside>
  );
}
