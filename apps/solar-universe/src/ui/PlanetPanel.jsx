import { translate } from '../i18n.js';

export default function PlanetPanel({ interest, language, onClose }) {
  const bodyLabel = interest?.kind === 'star'
    ? translate(language, 'panel.star')
    : interest?.kind === 'satellite'
      ? (language === 'zh' ? '卫星' : 'SATELLITE')
      : translate(language, 'panel.planet');

  return (
    <aside className={`planet-panel${interest ? ' is-open' : ''}`} aria-hidden={!interest}>
      <button
        className="planet-panel-close"
        type="button"
        onClick={onClose}
        aria-label={translate(language, 'panel.close')}
      >
        ×
      </button>
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
              <span>{translate(language, 'panel.enter')}</span>
              <strong>↗</strong>
            </a>
          ) : (
            <div className="planet-panel-link planet-panel-link-static">
              <span>{translate(language, 'panel.selected')}</span>
              <strong>◎</strong>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
