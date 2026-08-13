(() => {
  const FRAME_PARAM = '__site_frame';
  const STATE_KEY = '7719:persistent-player:v1';
  const THREE_D_PATH = /^\/(?:preview\/)?solar-universe(?:\/|$)/;
  const frame = document.querySelector('[data-shell-frame]');
  const loading = document.querySelector('[data-shell-loading]');
  const playerRoot = document.querySelector('[data-persistent-player]');
  const audio = document.querySelector('[data-persistent-audio]');

  if (!frame || !playerRoot || !audio) return;

  const ui = {
    cover: playerRoot.querySelector('[data-persistent-cover]'),
    state: playerRoot.querySelector('[data-persistent-state]'),
    title: playerRoot.querySelector('[data-persistent-title]'),
    artist: playerRoot.querySelector('[data-persistent-artist]'),
    album: playerRoot.querySelector('[data-persistent-album]'),
    previous: playerRoot.querySelector('[data-persistent-prev]'),
    toggle: playerRoot.querySelector('[data-persistent-toggle]'),
    next: playerRoot.querySelector('[data-persistent-next]'),
    current: playerRoot.querySelector('[data-persistent-current]'),
    duration: playerRoot.querySelector('[data-persistent-duration]'),
    seek: playerRoot.querySelector('[data-persistent-seek]'),
    volume: playerRoot.querySelector('[data-persistent-volume]'),
    close: playerRoot.querySelector('[data-persistent-close]'),
    status: playerRoot.querySelector('[data-persistent-status]')
  };

  const state = {
    route: '/',
    queue: [],
    index: -1,
    track: null,
    seeking: false,
    restoring: false
  };

  const sameOriginUrl = (value, base = window.location.href) => {
    try {
      const url = new URL(value, base);
      return url.origin === window.location.origin ? url : null;
    } catch {
      return null;
    }
  };

  const cleanRoute = (value) => {
    const url = sameOriginUrl(value);
    if (!url) return '/';
    url.searchParams.delete(FRAME_PARAM);
    return `${url.pathname}${url.search}${url.hash}` || '/';
  };

  const frameUrl = (route) => {
    const url = new URL(cleanRoute(route), window.location.origin);
    url.searchParams.set(FRAME_PARAM, '1');
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const isThreeDRoute = (value) => {
    const url = sameOriginUrl(value);
    return Boolean(url && THREE_D_PATH.test(url.pathname));
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  };

  const initials = (value = '') => {
    const normalized = String(value).trim();
    if (!normalized) return '77';
    const latin = normalized
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    if (latin) return latin;
    return normalized.slice(0, 2);
  };

  const normalizeTrack = (track) => {
    if (!track?.src) return null;
    const source = sameOriginUrl(track.src) || (() => {
      try { return new URL(track.src); } catch { return null; }
    })();
    if (!source) return null;

    const cover = track.coverSrc ? sameOriginUrl(track.coverSrc) : null;

    return {
      id: String(track.id || source.href),
      src: source.href,
      type: String(track.type || 'audio/mpeg'),
      title: String(track.title || 'Untitled'),
      artist: String(track.artist || '7719 Music'),
      album: String(track.album || ''),
      coverSrc: cover?.href || ''
    };
  };

  const normalizeQueue = (queue) => (Array.isArray(queue) ? queue : [])
    .map(normalizeTrack)
    .filter(Boolean);

  const activeTrack = () => state.queue[state.index] || state.track;

  const renderCover = (track) => {
    if (!ui.cover) return;

    const fallback = () => {
      ui.cover.replaceChildren();
      ui.cover.classList.remove('has-cover-art');
      ui.cover.textContent = initials(track?.artist);
    };

    if (!track?.coverSrc) {
      fallback();
      return;
    }

    const image = document.createElement('img');
    image.src = track.coverSrc;
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;
    image.addEventListener('error', fallback, { once: true });

    ui.cover.replaceChildren(image);
    ui.cover.classList.add('has-cover-art');
  };

  const updateMetadata = (track) => {
    if (!track) return;
    ui.title.textContent = track.title;
    ui.artist.textContent = track.artist;
    ui.album.textContent = track.album ? ` · ${track.album}` : '';
    renderCover(track);
    ui.state.textContent = audio.paused ? 'PAUSED' : 'NOW PLAYING';
    document.title = document.title || '7719 Universe';
  };

  const updatePlayingState = () => {
    const playing = !audio.paused && !audio.ended && Boolean(audio.src);
    playerRoot.classList.toggle('is-playing', playing);
    ui.toggle.textContent = playing ? 'Ⅱ' : '▶';
    ui.toggle.setAttribute('aria-label', playing ? '暂停' : '播放');
    ui.state.textContent = playing ? 'NOW PLAYING' : 'PAUSED';
    broadcastPlayerState();
    persistState();
  };

  const updateProgress = () => {
    ui.current.textContent = formatTime(audio.currentTime);
    ui.duration.textContent = formatTime(audio.duration);
    if (!state.seeking && Number.isFinite(audio.duration) && audio.duration > 0) {
      ui.seek.value = String((audio.currentTime / audio.duration) * 100);
    }
  };

  const persistState = () => {
    const track = activeTrack();
    if (!track) {
      sessionStorage.removeItem(STATE_KEY);
      return;
    }

    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        queue: state.queue,
        index: state.index,
        track,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        volume: audio.volume,
        paused: audio.paused,
        savedAt: Date.now()
      }));
    } catch {
      // Playback remains available when session storage is unavailable.
    }
  };

  const broadcastPlayerState = () => {
    const track = activeTrack();
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type: 'site:player-state',
      track: track ? { ...track } : null,
      playing: !audio.paused && !audio.ended,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0
    }, window.location.origin);
  };

  const setSource = (track, currentTime = 0) => {
    if (!track) return;
    state.track = track;
    updateMetadata(track);
    playerRoot.hidden = false;

    if (audio.dataset.source !== track.src) {
      audio.dataset.source = track.src;
      audio.src = track.src;
      audio.load();
    }

    const seekWhenReady = () => {
      if (Number.isFinite(currentTime) && currentTime > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(currentTime, Math.max(0, audio.duration - .1));
      }
      updateProgress();
    };

    if (audio.readyState >= 1) seekWhenReady();
    else audio.addEventListener('loadedmetadata', seekWhenReady, { once: true });
  };

  const playCurrent = async () => {
    const track = activeTrack();
    if (!track) return;
    if (!audio.src || audio.dataset.source !== track.src) setSource(track);

    try {
      await audio.play();
      ui.status.textContent = '';
    } catch {
      ui.status.textContent = '浏览器阻止了自动播放，请点击播放按钮继续。';
      updatePlayingState();
    }
  };

  const selectTrack = (payload = {}) => {
    const queue = normalizeQueue(payload.queue);
    const selected = normalizeTrack(payload.track);
    if (!selected) return;

    if (queue.length) {
      state.queue = queue;
      const requestedIndex = Number.parseInt(payload.index, 10);
      const byIndex = Number.isInteger(requestedIndex) ? requestedIndex : -1;
      const bySource = queue.findIndex((item) => item.src === selected.src);
      state.index = byIndex >= 0 && byIndex < queue.length ? byIndex : Math.max(0, bySource);
      state.track = state.queue[state.index] || selected;
    } else {
      state.queue = [selected];
      state.index = 0;
      state.track = selected;
    }

    const current = activeTrack();
    if (audio.dataset.source === current.src) {
      if (audio.paused) playCurrent();
      else audio.pause();
      return;
    }

    setSource(current);
    playCurrent();
  };

  const moveQueue = (direction) => {
    if (!state.queue.length) return;
    state.index = (state.index + direction + state.queue.length) % state.queue.length;
    state.track = state.queue[state.index];
    setSource(state.track);
    playCurrent();
  };

  const stopPlayback = ({ clear = true } = {}) => {
    audio.pause();
    audio.removeAttribute('src');
    audio.dataset.source = '';
    audio.load();
    ui.current.textContent = '0:00';
    ui.duration.textContent = '0:00';
    ui.seek.value = '0';
    ui.status.textContent = '';
    playerRoot.classList.remove('is-playing');

    if (clear) {
      state.queue = [];
      state.index = -1;
      state.track = null;
      playerRoot.hidden = true;
      sessionStorage.removeItem(STATE_KEY);
    }

    broadcastPlayerState();
  };

  const stopAndNavigate = (value) => {
    const url = sameOriginUrl(value);
    if (!url) return;
    stopPlayback({ clear: true });
    window.location.assign(url.href);
  };

  const setLoading = (visible) => {
    loading?.classList.toggle('is-visible', visible);
  };

  const navigate = (value, { push = true } = {}) => {
    const url = sameOriginUrl(value);
    if (!url) return false;

    if (isThreeDRoute(url.href)) {
      stopAndNavigate(url.href);
      return true;
    }

    const route = cleanRoute(url.href);
    if (!route || route === '/site-shell.html') return false;

    state.route = route;
    setLoading(true);
    if (push) history.pushState({ route }, '', route);
    else history.replaceState({ route }, '', route);
    frame.src = frameUrl(route);
    return true;
  };

  const restorePlayerState = () => {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null');
    } catch {
      saved = null;
    }
    if (!saved?.track) return;

    state.restoring = true;
    state.queue = normalizeQueue(saved.queue);
    state.index = Number.isInteger(saved.index) ? saved.index : 0;
    state.track = normalizeTrack(saved.track);
    audio.volume = Math.min(1, Math.max(0, Number(saved.volume) || .8));
    ui.volume.value = String(audio.volume);
    setSource(activeTrack() || state.track, Number(saved.currentTime) || 0);
    ui.state.textContent = 'PAUSED';
    state.restoring = false;
  };

  const routeFromShellQuery = () => {
    const shellUrl = new URL(window.location.href);
    const requested = shellUrl.searchParams.get('route');
    if (requested) return cleanRoute(requested);
    if (shellUrl.pathname !== '/site-shell.html') return cleanRoute(shellUrl.href);
    return '/';
  };

  ui.previous.addEventListener('click', () => moveQueue(-1));
  ui.next.addEventListener('click', () => moveQueue(1));
  ui.toggle.addEventListener('click', () => {
    if (!activeTrack()) return;
    if (audio.paused) playCurrent();
    else audio.pause();
  });
  ui.close.addEventListener('click', () => stopPlayback({ clear: true }));

  ui.volume.addEventListener('input', () => {
    audio.volume = Number(ui.volume.value);
    persistState();
  });

  ui.seek.addEventListener('input', () => {
    state.seeking = true;
    if (Number.isFinite(audio.duration)) {
      ui.current.textContent = formatTime((Number(ui.seek.value) / 100) * audio.duration);
    }
  });

  ui.seek.addEventListener('change', () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (Number(ui.seek.value) / 100) * audio.duration;
    }
    state.seeking = false;
    persistState();
  });

  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('durationchange', updateProgress);
  audio.addEventListener('timeupdate', () => {
    updateProgress();
    if (Math.floor(audio.currentTime) % 3 === 0) persistState();
  });
  audio.addEventListener('play', updatePlayingState);
  audio.addEventListener('pause', updatePlayingState);
  audio.addEventListener('ended', () => {
    if (state.queue.length > 1) moveQueue(1);
    else updatePlayingState();
  });
  audio.addEventListener('waiting', () => { ui.status.textContent = '正在缓冲…'; });
  audio.addEventListener('canplay', () => { ui.status.textContent = ''; });
  audio.addEventListener('error', () => {
    ui.status.textContent = '音频暂时无法播放，请检查资源地址或跨域配置。';
    updatePlayingState();
  });

  frame.addEventListener('load', () => {
    setLoading(false);
    broadcastPlayerState();
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    const message = event.data || {};

    if (message.type === 'site:frame-ready') {
      const route = cleanRoute(message.route || state.route);
      state.route = route;
      if (window.location.pathname + window.location.search + window.location.hash !== route) {
        history.replaceState({ route }, '', route);
      }
      if (message.title) document.title = message.title;
      setLoading(false);
      broadcastPlayerState();
      return;
    }

    if (message.type === 'site:navigate') {
      navigate(message.href);
      return;
    }

    if (message.type === 'site:player-select') {
      selectTrack(message);
      return;
    }

    if (message.type === 'site:stop-and-navigate') {
      stopAndNavigate(message.href);
    }
  });

  window.addEventListener('popstate', () => {
    navigate(window.location.href, { push: false });
  });

  window.addEventListener('pagehide', persistState);

  window.__SITE_SHELL__ = Object.freeze({
    navigate,
    selectTrack,
    stopAndNavigate,
    getPlayerState: () => ({
      track: activeTrack() ? { ...activeTrack() } : null,
      playing: !audio.paused && !audio.ended,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0
    })
  });

  restorePlayerState();
  const initialRoute = routeFromShellQuery();
  navigate(initialRoute, { push: false });
})();
