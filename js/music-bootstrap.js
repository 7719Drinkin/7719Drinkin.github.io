(() => {
  const artistPage = document.body.classList.contains('music-artist-page');
  const playerAudio = document.querySelector('[data-player-audio]');

  if (playerAudio) {
    playerAudio.preload = 'none';
    playerAudio.removeAttribute('src');
  }

  if (artistPage) {
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
    const listening = document.querySelector('#listening');
    if (listening && !listening.querySelector('.collection-song-row')) {
      listening.hidden = true;
    }
  }
})();
