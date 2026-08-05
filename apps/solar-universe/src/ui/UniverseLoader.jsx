import { translate } from '../i18n.js';

const STAGE_PROGRESS = {
  boot: 12,
  module: 48,
  canvas: 78,
  ready: 100
};

export default function UniverseLoader({ language, stage }) {
  const progress = STAGE_PROGRESS[stage] ?? STAGE_PROGRESS.boot;
  const complete = stage === 'ready';

  return (
    <div
      className={`universe-loader${complete ? ' is-complete' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={translate(language, 'loading.aria')}
    >
      <div className="universe-loader-backdrop" />
      <div className="universe-loader-content">
        <span className="universe-loader-kicker">7719 / SOLAR UNIVERSE</span>
        <strong>{translate(language, 'loading.title')}</strong>
        <div
          className="universe-loader-track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="universe-loader-meta">
          <span>{translate(language, `loading.${stage}`)}</span>
          <b>{progress}%</b>
        </div>
      </div>
    </div>
  );
}
