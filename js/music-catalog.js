(() => {
  const CONFIG_URL = '/data/music/catalog.json';
  const CATALOG_STYLE_URL = '/css/music-catalog.css?v=20260806-1';
  const PLAYER_SCRIPT_URL = '/js/music-player.js?v=20260806-catalog-1';

  const artistPageMatch = window.location.pathname.match(/\/music\/artists\/([^/]+)\/?/);
  const songList = document.querySelector('.artist-song-column .song-list');
  if (!artistPageMatch || !songList) return;

  const artistSlug = decodeURIComponent(artistPageMatch[1]);
  const artistName = document.querySelector('.artist-hero-copy h2')?.textContent?.trim() || '7719 Music';
  const playerRoot = document.querySelector('[data-music-player]');
  const playerAudio = document.querySelector('[data-player-audio]');

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

  const showLoading = () => {
    songList.replaceChildren(createState(
      'LOADING CATALOG',
      '正在读取缓存曲目目录。歌曲音频不会在此时加载。',
      'music-catalog-state--loading'
    ));
  };

  const cacheKey = (prefix) => `music-catalog-browser:v1:${prefix}`;

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
      localStorage.setItem(cacheKey(prefix), JSON.stringify({
        savedAt: Date.now(),
        catalog
      }));
    } catch {
      // Storage can be unavailable in private browsing; the Worker cache still applies.
    }
  };

  const createSongRow = (track, albumName, index) => {
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

    const note = document.createElement('small');
    note.textContent = track.fileName || 'R2 AUDIO OBJECT';

    const action = document.createElement('b');
    action.className = 'song-row-action';
    action.setAttribute('aria-hidden', 'true');
    action.textContent = '▶';

    row.append(number, primary, note, action);
    return row;
  };

  const renderCatalog = (catalog, sourceLabel = 'WORKER CACHE') => {
    const albums = Array.isArray(catalog?.albums) ? catalog.albums : [];
    const validAlbums = albums
      .map((album) => ({
        name: String(album?.name || '未分类专辑'),
        tracks: Array.isArray(album?.tracks)
          ? album.tracks.filter((track) => track?.src && (track?.title || track?.fileName))
          : []
      }))
      .filter((album) => album.tracks.length > 0);

    if (!validAlbums.length) {
      songList.replaceChildren(createState(
        'NO PLAYABLE TRACKS',
        '当前歌手目录中没有符合“歌手 / 专辑 / 音频文件”结构的可播放歌曲。'
      ));
      return false;
    }

    const albumsRoot = document.createElement('div');
    albumsRoot.className = 'music-catalog-albums';

    validAlbums.forEach((album, albumIndex) => {
      const section = document.createElement('section');
      section.className = 'music-catalog-album';

      const header = document.createElement('header');
      header.className = 'music-catalog-album-header';
      const index = document.createElement('span');
      index.textContent = `ALBUM ${String(albumIndex + 1).padStart(2, '0')}`;
      const title = document.createElement('h3');
      title.textContent = album.name;
      const count = document.createElement('small');
      count.textContent = `${album.tracks.length} TRACK${album.tracks.length > 1 ? 'S' : ''}`;
      header.append(index, title, count);

      const trackList = document.createElement('div');
      trackList.className = 'music-catalog-track-list';
      album.tracks.forEach((track, trackIndex) => {
        trackList.append(createSongRow(track, album.name, trackIndex));
      });

      section.append(header, trackList);
      albumsRoot.append(section);
    });

    const meta = document.createElement('div');
    meta.className = 'music-catalog-meta';
    const total = document.createElement('span');
    total.textContent = `${catalog.totalTracks ?? validAlbums.reduce((sum, album) => sum + album.tracks.length, 0)} TRACKS / ${validAlbums.length} ALBUMS`;
    const source = document.createElement('span');
    source.textContent = sourceLabel;
    meta.append(total, source);

    songList.replaceChildren(albumsRoot, meta);
    window.dispatchEvent(new CustomEvent('music:catalog-ready', {
      detail: { artistSlug, catalog }
    }));
    return true;
  };

  const ensurePlayer = () => {
    if (!playerRoot || !document.querySelector('.song-row--playable')) return;

    window.setTimeout(() => {
      if (!playerRoot.hidden) return;
      if (document.querySelector('script[data-dynamic-music-player]')) return;
      const script = document.createElement('script');
      script.src = PLAYER_SCRIPT_URL;
      script.dataset.dynamicMusicPlayer = '';
      document.body.append(script);
    }, 0);
  };

  const loadCatalog = async () => {
    installStylesheet();
    showLoading();

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
      const rendered = renderCatalog(cached.catalog, cacheIsFresh ? 'BROWSER CACHE' : 'STALE CACHE');
      if (rendered) ensurePlayer();
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
      const rendered = renderCatalog(catalog, response.headers.get('X-Music-Catalog-Cache') || 'WORKER CACHE');
      if (rendered) ensurePlayer();
    } catch {
      if (!hasCachedCatalog) {
        songList.replaceChildren(createState(
          'CATALOG UNAVAILABLE',
          '曲目目录服务暂时无法访问。页面没有直接扫描 R2，也不会尝试逐个探测音频文件。'
        ));
      }
    }
  };

  loadCatalog();
})();
