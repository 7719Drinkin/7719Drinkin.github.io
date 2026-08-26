(() => {
  const FRAME_PARAM = '__site_frame';
  const THREE_D_PATH = /^\/(?:preview\/)?solar-universe(?:\/|$)/;
  const PLAYABLE_TRACK_SELECTOR = '[data-player-track][data-audio-src], .song-row--playable[data-audio-src]';
  const params = new URLSearchParams(window.location.search);
  const hasParentShell = () => {
    try {
      return Boolean(window.parent.__SITE_SHELL__);
    } catch {
      return false;
    }
  };
  const framed = window.self !== window.top
    && (params.get(FRAME_PARAM) === '1' || hasParentShell());

  const cleanUrl = (value) => {
    const url = new URL(value, window.location.href);
    url.searchParams.delete(FRAME_PARAM);
    return url;
  };

  const currentRoute = () => {
    const url = cleanUrl(window.location.href);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const redirectToShell = () => {
    const path = window.location.pathname;
    if (path === '/site-shell.html' || THREE_D_PATH.test(path)) return;
    const route = currentRoute();
    window.location.replace(`/site-shell.html?route=${encodeURIComponent(route)}`);
  };

  if (!framed) {
    if (window.self === window.top) redirectToShell();
    return;
  }

  document.documentElement.classList.add('site-shell-frame-document');

  const frameStyle = document.createElement('style');
  frameStyle.dataset.siteFrameStyle = '';
  frameStyle.textContent = `
    html.site-shell-frame-document .site-music-player {
      display: none !important;
    }

    html.site-shell-frame-document body {
      min-height: 100%;
    }
  `;
  document.head.append(frameStyle);

  const shell = () => {
    try {
      return window.parent.__SITE_SHELL__ || null;
    } catch {
      return null;
    }
  };

  const notifyParent = (message) => {
    window.parent.postMessage(message, window.location.origin);
  };

  const sendReady = () => {
    notifyParent({
      type: 'site:frame-ready',
      route: currentRoute(),
      title: document.title
    });
  };

  const trackFromRow = (row) => {
    const source = row.dataset.audioSrc;
    if (!source) return null;

    return {
      id: row.dataset.trackId || new URL(source, window.location.href).href,
      src: new URL(source, window.location.href).href,
      type: row.dataset.audioType || 'audio/mpeg',
      title: row.dataset.songTitle || row.querySelector('.song-primary h3')?.textContent?.trim() || 'Untitled',
      artist: row.dataset.songArtist || document.querySelector('.artist-hero-copy h2, .album-detail-artist')?.textContent?.trim() || '7719 Music',
      album: row.dataset.songAlbum || '',
      coverSrc: row.dataset.coverSrc || ''
    };
  };

  const playableRows = () => {
    const queueRoot = document.querySelector('[data-playback-queue]');
    const queueRows = queueRoot
      ? [...queueRoot.querySelectorAll('[data-player-track][data-audio-src]')]
      : [];
    return queueRows.length
      ? queueRows
      : [...document.querySelectorAll('.song-row--playable[data-audio-src]')];
  };

  const queueFromPage = () => playableRows()
    .map(trackFromRow)
    .filter(Boolean);

  const selectTrack = (row) => {
    const queue = queueFromPage();
    const track = trackFromRow(row);
    if (!track) return;
    const index = Math.max(0, queue.findIndex((item) => item.src === track.src));
    const payload = { type: 'site:player-select', track, queue, index };

    const parentShell = shell();
    if (parentShell?.selectTrack) parentShell.selectTrack(payload);
    else notifyParent(payload);
  };

  const navigate = (url) => {
    const parentShell = shell();
    if (THREE_D_PATH.test(url.pathname)) {
      if (parentShell?.stopAndNavigate) parentShell.stopAndNavigate(url.href);
      else notifyParent({ type: 'site:stop-and-navigate', href: url.href });
      return;
    }

    if (parentShell?.navigate) parentShell.navigate(url.href);
    else notifyParent({ type: 'site:navigate', href: url.href });
  };

  const applyPlayerState = (message = {}) => {
    const activeSource = message.track?.src || '';
    const playing = Boolean(message.playing);

    playableRows().forEach((row) => {
      const rowSource = new URL(row.dataset.audioSrc, window.location.href).href;
      const active = Boolean(activeSource && rowSource === activeSource);
      row.classList.toggle('is-active', active);
      row.classList.toggle('is-playing', active && playing);
      row.setAttribute('aria-pressed', String(active && playing));

      const action = row.querySelector('[data-player-action], .song-row-action');
      const nextLabel = active && playing ? 'Ⅱ' : '▶';
      if (action && action.textContent !== nextLabel) action.textContent = nextLabel;
    });
  };

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;

    const row = target.closest(PLAYABLE_TRACK_SELECTOR);
    if (row) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectTrack(row);
      return;
    }

    const link = target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.target) return;
    if (link.hasAttribute('data-full-navigation')) return;

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }

    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (url.origin !== window.location.origin) return;
    if (url.pathname === '/site-shell.html') return;

    event.preventDefault();
    event.stopImmediatePropagation();
    url.searchParams.delete(FRAME_PARAM);
    navigate(url);
  }, true);

  window.addEventListener('hashchange', sendReady);

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const message = event.data || {};
    if (message.type === 'site:player-state') applyPlayerState(message);
  });

  let stateRefreshFrame = 0;
  const refreshFromParent = () => {
    stateRefreshFrame = 0;
    const playerState = shell()?.getPlayerState?.();
    if (playerState) applyPlayerState(playerState);
  };

  const observer = new MutationObserver(() => {
    if (!stateRefreshFrame) stateRefreshFrame = requestAnimationFrame(refreshFromParent);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  refreshFromParent();
  sendReady();
})();
