const playerAudio = document.querySelector('[data-player-audio]');

if (playerAudio) {
  playerAudio.preload = 'none';
  playerAudio.removeAttribute('src');
}

document.querySelectorAll('.collection-song-row em').forEach((label) => {
  if (label.textContent.trim() === 'ARCHIVE') label.textContent = 'CURATED';
});

const catalogPage = document.body.dataset.musicCatalogPage;

if (catalogPage === 'album') {
  const trackSection = document.querySelector('.album-track-section');
  const redundantHeader = trackSection?.querySelector(':scope > .music-section-header');
  redundantHeader?.remove();

  if (trackSection) {
    trackSection.style.paddingTop = '28px';
  }

  const albumSongList = document.querySelector('.album-song-list');
  const applyEmptyAlbumMessage = () => {
    const state = albumSongList?.querySelector('.music-catalog-state');
    const label = state?.querySelector('span');
    const message = state?.querySelector('p');

    if (!label || !message || label.textContent.trim() !== 'ALBUM NOT FOUND') return;
    label.textContent = 'EMPTY ALBUM';
    message.textContent = '盘旋归燕树待栖~';
  };

  applyEmptyAlbumMessage();
  window.addEventListener('music:catalog-ready', applyEmptyAlbumMessage);

  if (albumSongList && 'MutationObserver' in window) {
    const emptyStateObserver = new MutationObserver(applyEmptyAlbumMessage);
    emptyStateObserver.observe(albumSongList, { childList: true, subtree: true });
  }
}

if (catalogPage && !document.querySelector('script[data-music-catalog-loader]')) {
  const script = document.createElement('script');
  script.src = '/js/music-catalog.js?v=20260806-albums-3';
  script.dataset.musicCatalogLoader = '';
  document.body.append(script);
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
