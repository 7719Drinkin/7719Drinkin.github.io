const musicRuntimeVersion = (() => {
  try {
    const source = document.currentScript?.src;
    return source ? new URL(source, window.location.href).searchParams.get('v') || 'dev' : 'dev';
  } catch {
    return 'dev';
  }
})();

const musicRuntimeAsset = (path) => `${path}?v=${encodeURIComponent(musicRuntimeVersion)}`;

const playerAudio = document.querySelector('[data-player-audio]');

if (playerAudio) {
  playerAudio.preload = 'none';
  playerAudio.removeAttribute('src');
}

document.querySelectorAll('.collection-song-row em').forEach((label) => {
  if (label.textContent.trim() === 'ARCHIVE') label.textContent = 'CURATED';
});

const catalogPage = document.body.dataset.musicCatalogPage;

// The catalog title remains the source of truth for playback, matching and accessibility.
// Only the large visual title drops a trailing media-placement note such as
// “(电影恭喜发财主题曲)” or “（電影花仔多情插曲）”. Other parentheses —
// duet credits, remixes, alternate names or parentheses that belong to the song title — stay.
const TRAILING_MEDIA_CUE = /\s*[（(]([^（）()]*(?:主題曲|主题曲|插曲|片頭曲|片头曲|片尾曲|開場曲|开场曲|結尾曲|结尾曲|主題歌|主题歌|片頭歌|片头歌|片尾歌|電影歌曲|电影歌曲|電視劇歌曲|电视剧歌曲|劇集歌曲|剧集歌曲|原聲插曲|原声插曲)[^（）()]*)[）)]\s*$/u;

const displaySongTitle = (value = '') => {
  const title = String(value).trim();
  const simplified = title.replace(TRAILING_MEDIA_CUE, '').trim();
  return simplified || title;
};

const refreshSongDisplayTitles = (root = document) => {
  root.querySelectorAll?.('.song-primary h3').forEach((heading) => {
    const row = heading.closest('[data-song-title]');
    const sourceTitle = row?.dataset.songTitle || heading.textContent || '';
    heading.textContent = displaySongTitle(sourceTitle);
  });
};

refreshSongDisplayTitles();
window.addEventListener('music:catalog-ready', () => refreshSongDisplayTitles());

const initAlbumSorting = () => {
  const albumGrid = document.querySelector('.album-grid');
  if (!albumGrid || albumGrid.dataset.albumSortReady === 'true') return;

  const cards = [...albumGrid.querySelectorAll('.album-card[data-album-name]')];
  if (cards.length < 2) return;

  const parseReleaseDate = (value) => {
    const match = String(value || '').match(/(?:^|[^0-9])(\d{4})-(\d{2})(?:[^0-9]|$)/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || month < 1 || month > 12) return null;

    return {
      label: `${match[1]}-${match[2]}`,
      time: Date.UTC(year, month - 1, 1)
    };
  };

  const releaseInfo = (card) => {
    const explicit = parseReleaseDate(card.dataset.releaseDate);
    if (explicit) return explicit;

    const meta = parseReleaseDate(card.querySelector('.album-card-meta span')?.textContent);
    if (meta) return meta;

    const image = card.querySelector('img');
    if (image) {
      const fromSource = parseReleaseDate(decodeURIComponent(image.getAttribute('src') || image.src || ''));
      if (fromSource) return fromSource;
    }

    return null;
  };

  const compareTime = (left, right, direction = 'asc') => {
    const leftRelease = releaseInfo(left);
    const rightRelease = releaseInfo(right);
    const leftMissing = !leftRelease;
    const rightMissing = !rightRelease;

    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    if (leftRelease && rightRelease && leftRelease.time !== rightRelease.time) {
      return direction === 'desc'
        ? rightRelease.time - leftRelease.time
        : leftRelease.time - rightRelease.time;
    }

    return Number(left.dataset.albumSourceIndex || 0) - Number(right.dataset.albumSourceIndex || 0);
  };

  cards.forEach((card, index) => {
    card.dataset.albumSourceIndex = String(index);

    const release = releaseInfo(card);
    if (release) {
      card.dataset.releaseDate = release.label;

      const label = card.querySelector('.album-card-meta span');
      if (label && !parseReleaseDate(label.textContent)) {
        label.textContent = release.label;
      }
    }
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
  albumGrid.dataset.albumSortReady = 'true';

  if (!document.querySelector('link[data-music-album-sort-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/css/music-album-sort.css?v=20260807-2';
    style.dataset.musicAlbumSortStyle = '';
    document.head.append(style);
  }

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
};

initAlbumSorting();

if (catalogPage === 'album') {
  const trackSection = document.querySelector('.album-track-section');
  const redundantHeader = trackSection?.querySelector(':scope > .music-section-header');
  redundantHeader?.remove();

  if (trackSection) {
    trackSection.style.paddingTop = '28px';
  }
}

if (catalogPage && !document.querySelector('script[data-music-catalog-loader]')) {
  const script = document.createElement('script');
  script.src = musicRuntimeAsset('/js/music-catalog.js');
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
