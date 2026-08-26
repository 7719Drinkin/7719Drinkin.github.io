const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export function renderMusicPlayer({
  fallbackLabel = '7719',
  defaultArtist = '7719 Music',
  defaultCover = ''
} = {}) {
  const coverAttribute = defaultCover
    ? ` data-default-cover="${escapeHtml(defaultCover)}"`
    : '';

  return `<aside class="site-music-player is-collapsed" data-music-player${coverAttribute} hidden aria-label="网站音乐播放器">
    <audio data-player-audio preload="metadata"></audio>
    <div class="site-player-track">
      <div class="site-player-cover" aria-hidden="true">${escapeHtml(fallbackLabel)}</div>
      <div class="site-player-copy">
        <span>NOW PLAYING</span>
        <strong data-player-title>尚未选择歌曲</strong>
        <small><span data-player-artist>${escapeHtml(defaultArtist)}</span><span data-player-album></span></small>
      </div>
    </div>
    <div class="site-player-controls">
      <button type="button" data-player-prev aria-label="上一首">‹</button>
      <button class="site-player-toggle" type="button" data-player-toggle aria-label="播放">▶</button>
      <button type="button" data-player-next aria-label="下一首">›</button>
    </div>
    <div class="site-player-progress">
      <time data-player-current>0:00</time>
      <input data-player-seek type="range" min="0" max="100" value="0" step="0.1" aria-label="播放进度">
      <time data-player-duration>0:00</time>
      <p data-player-status aria-live="polite"></p>
    </div>
    <div class="site-player-volume">
      <span>VOL</span>
      <input data-player-volume type="range" min="0" max="1" value="0.8" step="0.05" aria-label="音量">
    </div>
    <button class="site-player-expand" type="button" data-player-expand aria-expanded="false" aria-label="展开播放器">⌃</button>
  </aside>`;
}
