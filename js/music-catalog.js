(() => {
  const CONFIG_URL = '/data/music/catalog.json';
  const CATALOG_STYLE_URL = '/css/music-catalog.css?v=20260806-2';
  const PLAYER_SCRIPT_URL = '/js/music-player.js?v=20260806-compact-2';

  const pageType = document.body.dataset.musicCatalogPage;
  const artistSlug = document.body.dataset.artistSlug;
  const requestedAlbumName = document.body.dataset.albumName || '';
  const songList = pageType === 'album'
    ? document.querySelector('.album-song-list')
    : document.querySelector('.artist-song-column .song-list');

  if (!pageType || !artistSlug || !songList) return;

  const artistName = document.querySelector('.artist-hero-copy h2, .album-detail-artist')?.textContent?.trim()
    || '7719 Music';
  const playerRoot = document.querySelector('[data-music-player]');
  const playerAudio = document.querySelector('[data-player-audio]');
  const featuredEntries = [...songList.querySelectorAll('[data-featured-title]')].map((row) => ({
    title: row.dataset.featuredTitle || '',
    album: row.dataset.featuredAlbum || '',
    note: row.dataset.featuredNote || ''
  }));

  if (playerAudio) {
    playerAudio.preload = 'none';
    playerAudio.removeAttribute('src');
  }

  const installStylesheet = () => {
    if (document.querySelector('link[data-music-catalog-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CATALOG_STYLE_URL;
    link.dataset.musicCatalogStyle = '';
    document.head.append(link);
  };

  const createState = (label, message, modifier = '') => {
    const state = document.createElement('div');
    state.className = `music-catalog-state${modifier ? ` ${modifier}` : ''}`;
    const title = document.createElement('span');
    title.textContent = label;
    const copy = document.createElement('p');
    copy.textContent = message;
    state.append(title, copy);
    return state;
  };

  const normalize = (value) => String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[《》〈〉「」『』【】（）()·•\s_\-—–:：'".,，。!?！？]/g, '');

  const cacheKey = (prefix) => `music-catalog-browser:v2:${prefix}`;

  const readCache = (prefix) => {
    try {
      const raw = localStorage.getItem(cacheKey(prefix));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeCache = (prefix, catalog) => {
    try {
      localStorage.setItem(cacheKey(prefix), JSON.stringify({ savedAt: Date.now(), catalog }));
    } catch {
      // Worker/KV caching remains available when browser storage is disabled.
    }
  };

  const catalogAlbums = (catalog) => (Array.isArray(catalog?.albums) ? catalog.albums : [])
    .map((album) => ({
      name: String(album?.name || '未分类专辑'),
      tracks: Array.isArray(album?.tracks)
        ? album.tracks.filter((track) => track?.src && (track?.title || track?.fileName))
        : []
    }))
    .filter((album) => album.tracks.length > 0);

  const findAlbum = (albums, targetName) => {
    const target = normalize(targetName);
    if (!target) return null;

    const exact = albums.find((album) => normalize(album.name) === target);
    if (exact) return exact;

    return albums.find((album) => {
      const candidate = normalize(album.name);
      return candidate.length >= 3 && (candidate.includes(target) || target.includes(candidate));
    }) || null;
  };

  const findTrack = (albums, entry) => {
    const title = normalize(entry.title);
    if (!title) return null;

    const preferredAlbum = entry.album ? findAlbum(albums, entry.album) : null;
    const searchAlbums = preferredAlbum ? [preferredAlbum] : albums;

    for (const album of searchAlbums) {
      const exact = album.tracks.find((track) => normalize(track.title || track.fileName) === title);
      if (exact) return { album, track: exact };
    }

    for (const album of searchAlbums) {
      const partial = album.tracks.find((track) => {
        const candidate = normalize(track.title || track.fileName);
        return candidate.length >= 2 && (candidate.includes(title) || title.includes(candidate));
      });
      if (partial) return { album, track: partial };
    }

    return null;
  };

  const createSongRow = (track, albumName, index, note = '') => {
    const row = document.createElement('button');
    row.className = 'song-row song-row--playable';
    row.type = 'button';
    row.dataset.audioSrc = track.src;
    row.dataset.audioType = track.type || 'audio/mpeg';
    row.dataset.songTitle = track.title || track.fileName || 'Untitled';
    row.dataset.songArtist = artistName;
    row.dataset.songAlbum = albumName;
    row.setAttribute('aria-label', `播放 ${row.dataset.songTitle}`);

    const number = document.createElement('span');
    number.className = 'song-index';
    number.textContent = String(index + 1).padStart(2, '0');

    const primary = document.createElement('div');
    primary.className = 'song-primary';
    const title = document.createElement('h3');
    title.textContent = row.dataset.songTitle;
    const meta = document.createElement('p');
    meta.textContent = albumName;
    primary.append(title, meta);

    const description = document.createElement('small');
    description.textContent = note || track.fileName || 'R2 AUDIO OBJECT';

    const action = document.createElement('b');
    action.className = 'song-row-action';
    action.setAttribute('aria-hidden', 'true');
    action.textContent = '▶';

    row.append(number, primary, description, action);
    return row;
  };

  const hydrateAlbumCards = (albums) => {
    document.querySelectorAll('.album-card[data-album-name]').forEach((card) => {
      const album = findAlbum(albums, card.dataset.albumName);
      const count = card.querySelector('[data-album-track-count]');
      if (!count) return;

      if (album) {
        count.textContent = `${album.tracks.length} TRACK${album.tracks.length === 1 ? '' : 'S'}`;
        card.classList.add('has-catalog-tracks');
      } else {
        count.textContent = 'DETAIL PAGE';
        card.classList.remove('has-catalog-tracks');
      }
    });
  };

  const renderFeatured = (albums) => {
    if (!featuredEntries.length) {
      songList.replaceChildren(createState(
        'CURATOR PICKS',
        '这里不会自动堆放全部歌曲；网页创建者尚未选择本页的反复聆听曲目。'
      ));
      return false;
    }

    const rows = featuredEntries
      .map((entry) => ({ entry, match: findTrack(albums, entry) }))
      .filter(({ match }) => Boolean(match))
      .map(({ entry, match }, index) => createSongRow(match.track, match.album.name, index, entry.note));

    if (!rows.length) {
      songList.replaceChildren(createState(
        'CURATOR PICKS UNAVAILABLE',
        '已选择的歌曲暂时没有在当前 R2 专辑目录中匹配到，因此不会显示失效的播放项。'
      ));
      return false;
    }

    songList.replaceChildren(...rows);
    return true;
  };

  const renderAlbumTracks = (albums, sourceLabel) => {
    const album = findAlbum(albums, requestedAlbumName);
    const countLabels = document.querySelectorAll('[data-album-track-count]');
    const source = document.querySelector('[data-catalog-source]');

    if (!album) {
      countLabels.forEach((label) => { label.textContent = '0 TRACKS'; });
      if (source) source.textContent = sourceLabel;
      songList.replaceChildren(createState(
        'ALBUM NOT FOUND',
        `当前缓存目录中没有匹配“${requestedAlbumName}”的专辑文件夹。请检查 R2 文件夹名称或 album.catalogName。`
      ));
      return false;
    }

    const rows = album.tracks.map((track, index) => createSongRow(track, album.name, index));
    countLabels.forEach((label) => {
      label.textContent = `${rows.length} TRACK${rows.length === 1 ? '' : 'S'}`;
    });
    if (source) source.textContent = sourceLabel;
    songList.replaceChildren(...rows);
    return rows.length > 0;
  };

  const ensurePlayer = () => {
    if (!playerRoot || !document.querySelector('.song-row--playable')) return;
    if (playerRoot.dataset.playerReady === 'true') return;
    if (document.querySelector('script[data-dynamic-music-player]')) return;

    const script = document.createElement('script');
    script.src = PLAYER_SCRIPT_URL;
    script.dataset.dynamicMusicPlayer = '';
    script.addEventListener('load', () => {
      playerRoot.dataset.playerReady = 'true';
    }, { once: true });
    document.body.append(script);
  };

  const renderCatalog = (catalog, sourceLabel = 'WORKER CACHE', initializePlayer = true) => {
    const albums = catalogAlbums(catalog);
    hydrateAlbumCards(albums);

    const rendered = pageType === 'album'
      ? renderAlbumTracks(albums, sourceLabel)
      : renderFeatured(albums);

    if (rendered && initializePlayer) ensurePlayer();
    window.dispatchEvent(new CustomEvent('music:catalog-ready', {
      detail: { artistSlug, pageType, catalog }
    }));
    return rendered;
  };

  const loadCatalog = async () => {
    installStylesheet();

    let config;
    try {
      const response = await fetch(CONFIG_URL, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Catalog config ${response.status}`);
      config = await response.json();
    } catch {
      songList.replaceChildren(createState(
        'CATALOG CONFIG ERROR',
        '曲目目录配置暂时无法读取，请稍后刷新页面。'
      ));
      return;
    }

    const artistConfig = config?.artists?.[artistSlug];
    const workerBase = String(config?.workerBase || '').replace(/\/+$/, '');
    const prefix = artistConfig?.prefix;
    if (!workerBase || !prefix) {
      songList.replaceChildren(createState(
        'CATALOG NOT CONFIGURED',
        '当前歌手还没有绑定 R2 曲目目录。'
      ));
      return;
    }

    const localTtl = Math.max(60, Number(config.browserCacheTtlSeconds) || 600) * 1000;
    const cached = readCache(prefix);
    const hasCachedCatalog = Boolean(cached?.catalog);
    const cacheIsFresh = hasCachedCatalog && Date.now() - Number(cached.savedAt || 0) < localTtl;

    if (hasCachedCatalog) {
      renderCatalog(
        cached.catalog,
        cacheIsFresh ? 'BROWSER CACHE' : 'STALE BROWSER CACHE',
        cacheIsFresh
      );
      if (cacheIsFresh) return;
    }

    try {
      const response = await fetch(`${workerBase}/catalog/${encodeURIComponent(prefix)}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'default',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Catalog request ${response.status}`);

      const catalog = await response.json();
      writeCache(prefix, catalog);
      renderCatalog(catalog, response.headers.get('X-Music-Catalog-Cache') || 'WORKER CACHE', true);
    } catch {
      if (hasCachedCatalog) {
        ensurePlayer();
      } else {
        songList.replaceChildren(createState(
          'CATALOG UNAVAILABLE',
          '曲目目录服务暂时无法访问。页面不会直接扫描 R2，也不会逐个探测音频文件。'
        ));
      }
    }
  };

  loadCatalog();
})();
