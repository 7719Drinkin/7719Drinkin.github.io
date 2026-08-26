(() => {
  const CONFIG_URL = '/data/music/catalog.json';
  const CATALOG_STYLE_URL = '/css/music-catalog.css?v=20260806-2';
  const runtimeVersion = (() => {
    try {
      const source = document.currentScript?.src;
      return source ? new URL(source, window.location.href).searchParams.get('v') || 'dev' : 'dev';
    } catch {
      return 'dev';
    }
  })();
  const runtimeAsset = (path) => `${path}?v=${encodeURIComponent(runtimeVersion)}`;
  const PLAYER_SCRIPT_URL = runtimeAsset('/js/music-player.js');
  const DEFAULT_WORKER_REVALIDATE_MS = 6 * 60 * 60 * 1000;
  const DEFAULT_WORKER_TIMEOUT_MS = 3500;

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

  songList.dataset.playbackQueue = '';
  songList.dataset.queueKind = pageType === 'album' ? 'album' : 'artist-selection';
  songList.dataset.queueId = pageType === 'album'
    ? `album:${artistSlug}:${requestedAlbumName}`
    : `artist-selection:${artistSlug}`;
  songList.dataset.queueTitle = pageType === 'album' && requestedAlbumName
    ? requestedAlbumName
    : artistName;

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

  // R2 object/folder names for Cantonese records are commonly written in
  // Traditional Chinese while the site archive is currently labelled in
  // Simplified Chinese. NFKC does not convert between those writing systems,
  // so fold the characters used by this archive before album/track matching.
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

  const foldHan = (value) => Array.from(String(value || ''), (character) => (
    HAN_FOLD[character] || character
  )).join('');

  const normalize = (value) => foldHan(String(value || '').normalize('NFKC'))
    .toLocaleLowerCase('zh-CN')
    .replace(/[《》〈〉「」『』【】（）()·•\s_\-—–:：'".,，。!?！？]/g, '');

  const imageSource = (image) => image?.getAttribute('src') || image?.currentSrc || image?.src || '';

  // Adapter boundary: static archive metadata is translated once into a compact
  // cover index. The player receives coverSrc on each TrackViewModel row and
  // never needs to know how album cards or hero images are structured.
  const buildCoverIndex = () => {
    const detailCover = document.querySelector('img.album-detail-cover');
    const artistCover = document.querySelector('img.artist-hero-image');
    const fallback = imageSource(detailCover) || imageSource(artistCover);
    const albums = [...document.querySelectorAll('.album-card[data-album-name]')]
      .map((card) => ({
        name: card.dataset.albumName || '',
        src: imageSource(card.querySelector('img'))
      }))
      .filter((entry) => entry.name && entry.src);

    if (detailCover && requestedAlbumName) {
      albums.push({ name: requestedAlbumName, src: imageSource(detailCover) });
    }

    return { fallback, albums };
  };

  const coverIndex = buildCoverIndex();

  const coverForAlbum = (albumName) => {
    const target = normalize(albumName);
    if (!target) return coverIndex.fallback || '';

    const exact = coverIndex.albums.find((entry) => normalize(entry.name) === target);
    if (exact) return exact.src;

    const partial = coverIndex.albums.find((entry) => {
      const candidate = normalize(entry.name);
      return candidate.length >= 3 && (candidate.includes(target) || target.includes(candidate));
    });

    return partial?.src || coverIndex.fallback || '';
  };

  if (playerRoot) {
    const defaultCover = coverForAlbum(requestedAlbumName);
    if (defaultCover) playerRoot.dataset.defaultCover = defaultCover;
  }

  // v5 separates the snapshot-first loader from older Worker-first browser data.
  const cacheKey = (prefix) => `music-catalog-browser:v5:${prefix}`;
  const workerCheckKey = (prefix) => `music-catalog-worker-check:v1:${prefix}`;

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
      // Same-origin snapshot and Worker fallback remain available when storage is disabled.
    }
  };

  const readLastWorkerCheck = (prefix) => {
    try {
      return Number(localStorage.getItem(workerCheckKey(prefix))) || 0;
    } catch {
      return 0;
    }
  };

  const markWorkerCheck = (prefix) => {
    try {
      localStorage.setItem(workerCheckKey(prefix), String(Date.now()));
    } catch {
      // A disabled localStorage simply means the Worker may be checked more often.
    }
  };

  const catalogTimestamp = (catalog) => {
    const value = Date.parse(catalog?.generatedAt || '');
    return Number.isFinite(value) ? value : 0;
  };

  const catalogSignature = (catalog) => JSON.stringify({
    version: catalog?.version,
    artistPrefix: catalog?.artistPrefix,
    totalTracks: catalog?.totalTracks,
    ignoredObjects: catalog?.ignoredObjects,
    albums: catalog?.albums
  });

  const isUsableCatalog = (catalog, prefix) => Boolean(
    catalog
    && typeof catalog === 'object'
    && catalog.artistPrefix === prefix
    && Array.isArray(catalog.albums)
    && Number.isFinite(Number(catalog.totalTracks))
  );

  const pickFresherCatalog = (left, right) => {
    if (!left) return right || null;
    if (!right) return left;

    const leftTime = catalogTimestamp(left);
    const rightTime = catalogTimestamp(right);
    if (leftTime && rightTime && leftTime !== rightTime) {
      return rightTime > leftTime ? right : left;
    }

    return catalogSignature(left) === catalogSignature(right) ? right : right;
  };

  const catalogIsNewerOrDifferent = (candidate, current) => {
    if (!current) return true;
    const candidateTime = catalogTimestamp(candidate);
    const currentTime = catalogTimestamp(current);
    if (candidateTime && currentTime && candidateTime > currentTime) return true;
    return catalogSignature(candidate) !== catalogSignature(current);
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
    row.dataset.playerTrack = '';
    row.dataset.audioSrc = track.src;
    row.dataset.audioType = track.type || 'audio/mpeg';
    row.dataset.songTitle = track.title || track.fileName || 'Untitled';
    row.dataset.songArtist = artistName;
    row.dataset.songAlbum = albumName;
    const coverSrc = coverForAlbum(albumName);
    if (coverSrc) row.dataset.coverSrc = coverSrc;
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
    action.dataset.playerAction = '';
    action.setAttribute('aria-hidden', 'true');
    action.textContent = '▶';

    row.append(number, primary, description, action);
    return row;
  };

  const animateAlbumReorder = (cards, previousPositions) => {
    if (!('animate' in Element.prototype)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    requestAnimationFrame(() => {
      cards.forEach((card) => {
        const previous = previousPositions.get(card);
        const current = card.getBoundingClientRect();
        if (!previous) return;

        const x = previous.left - current.left;
        const y = previous.top - current.top;
        if (Math.abs(x) < 1 && Math.abs(y) < 1) return;

        card.animate([
          { transform: `translate(${x}px, ${y}px)` },
          { transform: 'translate(0, 0)' }
        ], {
          duration: 560,
          easing: 'cubic-bezier(.16, 1, .3, 1)'
        });
      });
    });
  };

  const hydrateAlbumCards = (albums) => {
    const grid = document.querySelector('.album-grid');
    if (!grid) return;

    const cards = [...grid.querySelectorAll('.album-card[data-album-name]')];
    if (!cards.length) return;

    const previousPositions = new Map(cards.map((card) => [card, card.getBoundingClientRect()]));

    cards.forEach((card, index) => {
      if (!card.dataset.archiveIndex) card.dataset.archiveIndex = String(index);

      const album = findAlbum(albums, card.dataset.albumName);
      const count = card.querySelector('[data-album-track-count]');
      const hasTracks = Boolean(album?.tracks?.length);

      card.classList.toggle('has-catalog-tracks', hasTracks);
      card.classList.toggle('is-empty-album', !hasTracks);
      card.dataset.catalogState = hasTracks ? 'populated' : 'empty';

      if (count) {
        count.textContent = hasTracks
          ? `${album.tracks.length} TRACK${album.tracks.length === 1 ? '' : 'S'}`
          : '0 TRACKS';
      }
    });

    cards
      .sort((left, right) => {
        const stateDifference = Number(right.dataset.catalogState === 'populated')
          - Number(left.dataset.catalogState === 'populated');
        if (stateDifference) return stateDifference;
        return Number(left.dataset.archiveIndex) - Number(right.dataset.archiveIndex);
      })
      .forEach((card) => grid.append(card));

    grid.classList.add('is-catalog-sorted');
    animateAlbumReorder(cards, previousPositions);
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
        '已选择的歌曲暂时没有在当前曲目目录中匹配到，因此不会显示失效的播放项。'
      ));
      return false;
    }

    songList.replaceChildren(...rows);
    return true;
  };

  const renderAlbumTracks = (albums, sourceLabel, catalog) => {
    const album = findAlbum(albums, requestedAlbumName);
    const countLabels = document.querySelectorAll('[data-album-track-count]');
    const source = document.querySelector('[data-catalog-source]');
    const totalTracks = Number.isFinite(Number(catalog?.totalTracks))
      ? Number(catalog.totalTracks)
      : albums.reduce((sum, item) => sum + item.tracks.length, 0);

    if (!album) {
      countLabels.forEach((label) => { label.textContent = '0 TRACKS'; });
      if (source) source.textContent = `${sourceLabel} · ${totalTracks} TRACKS`;

      const availableNames = albums.slice(0, 16).map((item) => `“${item.name}”`).join('、');
      const generated = catalog?.generatedAt ? `；目录时间 ${catalog.generatedAt}` : '';
      const message = albums.length
        ? `当前目录已返回 ${totalTracks} 首歌曲 / ${albums.length} 张专辑，但没有匹配“${requestedAlbumName}”。实际专辑名：${availableNames}${generated}`
        : `当前目录没有返回任何可播放专辑（totalTracks=${totalTracks}）${generated}。`;

      songList.replaceChildren(createState('ALBUM NOT MATCHED', message));
      return false;
    }

    const rows = album.tracks.map((track, index) => createSongRow(track, album.name, index));
    countLabels.forEach((label) => {
      label.textContent = `${rows.length} TRACK${rows.length === 1 ? '' : 'S'}`;
    });
    if (source) source.textContent = `${sourceLabel} · ${album.name}`;
    songList.replaceChildren(...rows);
    return rows.length > 0;
  };

  const ensurePlayer = () => {
    if (!playerRoot || !document.querySelector('[data-player-track]')) return;
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

  const renderCatalog = (catalog, sourceLabel = 'CATALOG', initializePlayer = true) => {
    const albums = catalogAlbums(catalog);
    hydrateAlbumCards(albums);

    const rendered = pageType === 'album'
      ? renderAlbumTracks(albums, sourceLabel, catalog)
      : renderFeatured(albums);

    if (rendered && initializePlayer) ensurePlayer();
    window.dispatchEvent(new CustomEvent('music:catalog-ready', {
      detail: { artistSlug, pageType, catalog }
    }));
    return rendered;
  };

  const fetchSnapshot = async (snapshotBase, prefix) => {
    const base = String(snapshotBase || '/data/music/runtime').replace(/\/+$/, '');
    const response = await fetch(`${base}/${encodeURIComponent(prefix)}.json`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-cache',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Snapshot request ${response.status}`);

    const catalog = await response.json();
    if (!isUsableCatalog(catalog, prefix)) throw new Error('Snapshot catalog is invalid.');
    return catalog;
  };

  const fetchWorkerCatalog = async (workerBase, prefix, timeoutMs) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${workerBase}/catalog/${encodeURIComponent(prefix)}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Worker catalog request ${response.status}`);

      const catalog = await response.json();
      if (!isUsableCatalog(catalog, prefix)) throw new Error('Worker catalog is invalid.');
      return catalog;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const scheduleIdle = (callback) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 1500 });
      return;
    }
    window.setTimeout(callback, 700);
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
    const prefix = artistConfig?.prefix;
    const workerBase = String(config?.workerBase || '').replace(/\/+$/, '');
    const snapshotBase = String(config?.snapshotBase || '/data/music/runtime').replace(/\/+$/, '');
    const workerRevalidateMs = Math.max(
      60 * 60 * 1000,
      Number(config?.workerRevalidateSeconds || 0) * 1000 || DEFAULT_WORKER_REVALIDATE_MS
    );
    const workerTimeoutMs = Math.max(
      1500,
      Number(config?.workerRequestTimeoutMs) || DEFAULT_WORKER_TIMEOUT_MS
    );

    if (!prefix) {
      songList.replaceChildren(createState(
        'CATALOG NOT CONFIGURED',
        '当前歌手还没有绑定 R2 曲目目录。'
      ));
      return;
    }

    const cached = readCache(prefix);
    const cachedCatalog = isUsableCatalog(cached?.catalog, prefix) ? cached.catalog : null;
    let activeCatalog = cachedCatalog;
    let snapshotAvailable = false;

    // Browser storage is only the fastest possible first paint. Do not bind the
    // player yet because the same-origin snapshot may replace these rows next.
    if (cachedCatalog) {
      renderCatalog(cachedCatalog, 'BROWSER CACHE · CHECKING SNAPSHOT', false);
    }

    try {
      const snapshot = await fetchSnapshot(snapshotBase, prefix);
      snapshotAvailable = true;
      activeCatalog = pickFresherCatalog(cachedCatalog, snapshot);

      if (activeCatalog === snapshot || !cachedCatalog) {
        writeCache(prefix, snapshot);
      }

      renderCatalog(
        activeCatalog,
        activeCatalog === snapshot ? 'SITE SNAPSHOT' : 'BROWSER CACHE · NEWER THAN SNAPSHOT',
        true
      );
    } catch (snapshotError) {
      if (cachedCatalog) {
        activeCatalog = cachedCatalog;
        renderCatalog(cachedCatalog, 'BROWSER CACHE · SNAPSHOT UNAVAILABLE', true);
      } else if (!workerBase) {
        songList.replaceChildren(createState(
          'CATALOG UNAVAILABLE',
          `站点曲目快照暂时无法访问：${snapshotError?.message || 'unknown snapshot error'}`
        ));
        return;
      }
    }

    const revalidateWorker = async ({ force = false, renderWhenEmpty = false } = {}) => {
      if (!workerBase) return;
      if (!force && Date.now() - readLastWorkerCheck(prefix) < workerRevalidateMs) return;

      markWorkerCheck(prefix);
      try {
        const workerCatalog = await fetchWorkerCatalog(workerBase, prefix, workerTimeoutMs);
        const changed = catalogIsNewerOrDifferent(workerCatalog, activeCatalog);
        if (!changed) return;

        writeCache(prefix, workerCatalog);

        // The current player binds directly to the rendered row nodes. Once it
        // is loaded, replacing those nodes would break playback controls. Keep
        // the newer Worker result for the next navigation; snapshot sync will
        // publish the same data site-wide on its next run.
        const playerBoundOrLoading = Boolean(
          playerRoot?.dataset.playerReady === 'true'
          || document.querySelector('script[data-dynamic-music-player]')
        );

        if (renderWhenEmpty && !playerBoundOrLoading) {
          activeCatalog = workerCatalog;
          renderCatalog(workerCatalog, 'WORKER FALLBACK', true);
        } else {
          const source = document.querySelector('[data-catalog-source]');
          if (source) source.dataset.workerUpdateAvailable = 'true';
        }
      } catch (error) {
        if (!activeCatalog) {
          songList.replaceChildren(createState(
            'CATALOG UNAVAILABLE',
            `站点快照和曲目目录服务都暂时无法访问：${error?.message || 'unknown request error'}`
          ));
        }
      }
    };

    if (!snapshotAvailable && !cachedCatalog) {
      await revalidateWorker({ force: true, renderWhenEmpty: true });
      return;
    }

    // A healthy same-origin snapshot means workers.dev is no longer on the
    // critical path. Revalidate only occasionally and only after the UI settles.
    scheduleIdle(() => {
      revalidateWorker({ force: !snapshotAvailable }).catch(() => {});
    });
  };

  loadCatalog();
})();
