const playerAudio = document.querySelector('[data-player-audio]');

if (playerAudio) {
  playerAudio.preload = 'none';
  playerAudio.removeAttribute('src');
}

document.querySelectorAll('.collection-song-row em').forEach((label) => {
  if (label.textContent.trim() === 'ARCHIVE') label.textContent = 'CURATED';
});

const catalogPage = document.body.dataset.musicCatalogPage;

if (catalogPage === 'artist') {
  const albumGrid = document.querySelector('.album-grid');

  if (albumGrid) {
    const cards = [...albumGrid.querySelectorAll('.album-card[data-album-name]')];

    const releaseTime = (card) => {
      const label = card.querySelector('.album-card-meta span')?.textContent?.trim() || '';
      const match = label.match(/^(\d{4})-(\d{2})/);
      if (!match) return Number.POSITIVE_INFINITY;
      return Date.UTC(Number(match[1]), Number(match[2]) - 1, 1);
    };

    const compareTime = (left, right, direction = 'asc') => {
      const leftTime = releaseTime(left);
      const rightTime = releaseTime(right);
      const leftMissing = !Number.isFinite(leftTime);
      const rightMissing = !Number.isFinite(rightTime);

      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (!leftMissing && leftTime !== rightTime) {
        return direction === 'desc' ? rightTime - leftTime : leftTime - rightTime;
      }
      return Number(left.dataset.albumSourceIndex || 0) - Number(right.dataset.albumSourceIndex || 0);
    };

    cards.forEach((card, index) => {
      card.dataset.albumSourceIndex = String(index);
    });

    let sortMode = 'default';

    const sortCards = () => {
      [...albumGrid.querySelectorAll('.album-card[data-album-name]')]
        .sort((left, right) => {
          if (sortMode === 'default') {
            const trackDifference = Number(right.classList.contains('has-catalog-tracks'))
              - Number(left.classList.contains('has-catalog-tracks'));
            if (trackDifference) return trackDifference;
            return compareTime(left, right, 'asc');
          }

          return compareTime(left, right, sortMode);
        })
        .forEach((card) => albumGrid.append(card));
    };

    if (cards.length > 1) {
      const controls = document.createElement('div');
      controls.className = 'album-sort-controls';
      controls.setAttribute('aria-label', '专辑排序');
      controls.innerHTML = `
        <span>排序</span>
        <div>
          <button type="button" class="is-active" data-album-sort="default" aria-pressed="true">默认排序</button>
          <button type="button" data-album-sort="asc" aria-pressed="false">时间正序</button>
          <button type="button" data-album-sort="desc" aria-pressed="false">时间倒序</button>
        </div>
      `;

      albumGrid.before(controls);

      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/css/music-album-sort.css?v=20260807-1';
      style.dataset.musicAlbumSortStyle = '';
      document.head.append(style);

      controls.addEventListener('click', (event) => {
        const button = event.target.closest('[data-album-sort]');
        if (!button) return;

        sortMode = button.dataset.albumSort || 'default';
        controls.querySelectorAll('[data-album-sort]').forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        sortCards();
      });

      sortCards();
      window.addEventListener('music:catalog-ready', sortCards);
    }
  }
}

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
