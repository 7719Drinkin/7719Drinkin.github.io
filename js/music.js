const playerAudio = document.querySelector('[data-player-audio]');

if (playerAudio) {
  playerAudio.preload = 'none';
  playerAudio.removeAttribute('src');
}

if (document.body.classList.contains('music-artist-page')) {
  const songList = document.querySelector('.artist-song-column .song-list');
  if (songList) {
    const state = document.createElement('div');
    state.className = 'music-empty';
    state.innerHTML = '<span>LOADING CATALOG</span><p>正在读取曲目目录；音频只会在点击播放后加载。</p>';
    songList.replaceChildren(state);
  }

  if (!document.querySelector('script[data-music-catalog-loader]')) {
    const script = document.createElement('script');
    script.src = '/js/music-catalog.js?v=20260806-1';
    script.dataset.musicCatalogLoader = '';
    document.body.append(script);
  }
} else {
  document.querySelectorAll('.collection-song-row').forEach((row) => row.remove());
  const listening = document.querySelector('#listening');
  if (listening) listening.hidden = true;
}

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
