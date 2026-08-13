(() => {
  const player = document.querySelector('[data-music-player]');
  const coverHost = player?.querySelector('.site-player-cover');
  if (!player || !coverHost) return;

  const STYLE_URL = '/css/music-cover-art.css?v=20260813-1';
  const HAN_FOLD = {
    '後': '后',
    '傾': '倾',
    '聽': '听',
    '愛': '爱',
    '飛': '飞',
    '馬': '马',
    '牆': '墙',
    '實': '实',
    '們': '们',
    '過': '过',
    '擁': '拥',
    '風': '风',
    '夢': '梦',
    '獨': '独',
    '無': '无',
    '話': '话',
    '淚': '泪',
    '選': '选',
    '遲': '迟',
    '來': '来',
    '霧': '雾',
    '戀': '恋',
    '見': '见',
    '動': '动',
    '譚': '谭',
    '詠': '咏',
    '與': '与',
    '從': '从'
  };

  const installStylesheet = () => {
    if (document.querySelector('link[data-music-cover-art-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLE_URL;
    link.dataset.musicCoverArtStyle = '';
    document.head.append(link);
  };

  const normalize = (value) => Array.from(String(value || '').normalize('NFKC'), (character) => (
    HAN_FOLD[character] || character
  )).join('')
    .toLocaleLowerCase('zh-CN')
    .replace(/[《》〈〉「」『』【】（）()·•\s_\-—–:：'".,，。!?！？]/g, '');

  const imageSource = (image) => image?.getAttribute('src') || image?.currentSrc || image?.src || '';

  let albumCovers = [];
  let fallbackCover = '';

  const collectCovers = () => {
    const detailCover = document.querySelector('img.album-detail-cover');
    const artistCover = document.querySelector('img.artist-hero-image');
    fallbackCover = imageSource(detailCover) || imageSource(artistCover) || fallbackCover;

    const cards = [...document.querySelectorAll('.album-card[data-album-name]')]
      .map((card) => ({
        name: card.dataset.albumName || '',
        src: imageSource(card.querySelector('img'))
      }))
      .filter((entry) => entry.name && entry.src);

    if (detailCover && document.body.dataset.albumName) {
      cards.push({
        name: document.body.dataset.albumName,
        src: imageSource(detailCover)
      });
    }

    albumCovers = cards;
  };

  const findAlbumCover = (albumName) => {
    const target = normalize(albumName);
    if (!target) return '';

    const exact = albumCovers.find((entry) => normalize(entry.name) === target);
    if (exact) return exact.src;

    const partial = albumCovers.find((entry) => {
      const candidate = normalize(entry.name);
      return candidate.length >= 3 && (candidate.includes(target) || target.includes(candidate));
    });
    return partial?.src || '';
  };

  const ensureCoverImage = () => {
    let image = coverHost.querySelector('img[data-player-cover-art]');
    if (image) return image;

    coverHost.textContent = '';
    image = document.createElement('img');
    image.dataset.playerCoverArt = '';
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;
    coverHost.append(image);
    return image;
  };

  const setCover = (src, kind = 'artist') => {
    if (!src) return;
    const image = ensureCoverImage();
    if (image.getAttribute('src') !== src) image.src = src;
    coverHost.dataset.coverKind = kind;
    coverHost.classList.add('has-cover-art');
  };

  const coverForRow = (row) => {
    const albumCover = findAlbumCover(row?.dataset.songAlbum || '');
    return {
      src: albumCover || fallbackCover,
      kind: albumCover ? 'album' : 'artist'
    };
  };

  const syncActiveRow = () => {
    const active = document.querySelector('.song-row--playable.is-active');
    if (!active) return;
    const cover = coverForRow(active);
    setCover(cover.src, cover.kind);
  };

  installStylesheet();
  collectCovers();
  if (fallbackCover) setCover(fallbackCover, document.body.dataset.albumName ? 'album' : 'artist');

  document.addEventListener('click', (event) => {
    const row = event.target.closest?.('.song-row--playable');
    if (row) {
      const cover = coverForRow(row);
      setCover(cover.src, cover.kind);
      return;
    }

    if (event.target.closest?.('[data-player-prev], [data-player-next]')) {
      requestAnimationFrame(syncActiveRow);
    }
  }, true);

  const songRegion = document.querySelector('.song-list');
  if (songRegion) {
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'childList')) collectCovers();
      syncActiveRow();
    });
    observer.observe(songRegion, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  const audio = player.querySelector('[data-player-audio]');
  ['play', 'loadedmetadata', 'ended'].forEach((eventName) => {
    audio?.addEventListener(eventName, () => requestAnimationFrame(syncActiveRow));
  });

  window.addEventListener('music:catalog-ready', () => {
    collectCovers();
    syncActiveRow();
  });
})();