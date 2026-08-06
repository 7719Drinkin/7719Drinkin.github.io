const playerAudio = document.querySelector('[data-player-audio]');

// R2 is never scanned or probed when the page opens. The audio element has no
// source until the visitor explicitly selects a playable track.
if (playerAudio) {
  playerAudio.preload = 'none';
  playerAudio.removeAttribute('src');
}

const createEmptyTrackState = () => {
  const empty = document.createElement('div');
  empty.className = 'music-empty';
  empty.innerHTML = '<span>NO PLAYABLE TRACKS</span><p>当前没有配置可播放音频；接入真实音频源后曲目会自动显示。</p>';
  return empty;
};

// A song is visible only when the generated row contains a real audio source.
// This is a local manifest check and does not issue any request to R2.
document.querySelectorAll('.song-list').forEach((list) => {
  [...list.querySelectorAll('.song-row')].forEach((row) => {
    if (!row.dataset.audioSrc?.trim()) row.remove();
  });

  const playableRows = [...list.querySelectorAll('.song-row[data-audio-src]')];
  playableRows.forEach((row, index) => {
    const number = row.querySelector('.song-index');
    if (number) number.textContent = String(index + 1).padStart(2, '0');
  });

  if (!playableRows.length && !list.querySelector('.music-empty')) {
    list.replaceChildren(createEmptyTrackState());
  }
});

// The collection landing page follows the same rule: archive-only or mock
// entries are not surfaced as playable music.
document.querySelectorAll('.collection-song-row').forEach((row) => {
  const state = row.querySelector('em')?.textContent.trim();
  if (state !== 'PLAYABLE') row.remove();
});

const revealItems = [...document.querySelectorAll('.reveal')];

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}
