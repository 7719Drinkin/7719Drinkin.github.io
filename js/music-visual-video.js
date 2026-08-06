(() => {
  const cards = [...document.querySelectorAll('.visual-card--video[data-video-embed]')];
  const playlists = [...document.querySelectorAll('[data-bilibili-playlist]')];
  if (!cards.length && !playlists.length) return;

  const TITLE_CACHE_PREFIX = 'music:bilibili-title:v1:';
  const TITLE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  const appendAutoplay = (url) => {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set('autoplay', '1');
    return parsed.toString();
  };

  const readCachedTitle = (bvid) => {
    try {
      const raw = localStorage.getItem(`${TITLE_CACHE_PREFIX}${bvid}`);
      if (!raw) return '';
      const cached = JSON.parse(raw);
      if (!cached?.title || Date.now() - Number(cached.savedAt || 0) > TITLE_CACHE_TTL) return '';
      return String(cached.title).trim();
    } catch {
      return '';
    }
  };

  const cacheTitle = (bvid, title) => {
    try {
      localStorage.setItem(`${TITLE_CACHE_PREFIX}${bvid}`, JSON.stringify({
        title,
        savedAt: Date.now()
      }));
    } catch {
      // The playlist still works when browser storage is unavailable.
    }
  };

  const requestTitleWithJsonp = (bvid) => new Promise((resolve, reject) => {
    const callbackName = `__musicBilibiliTitle_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => finish('', new Error('Bilibili title request timed out.')), 6500);

    const finish = (title, error = null) => {
      window.clearTimeout(timeout);
      script.remove();
      try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
      if (error) reject(error);
      else resolve(title);
    };

    window[callbackName] = (payload) => {
      const title = payload?.code === 0 ? String(payload?.data?.title || '').trim() : '';
      finish(title);
    };

    script.async = true;
    script.onerror = () => finish('', new Error('Bilibili title request failed.'));
    script.src = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}&jsonp=jsonp&callback=${encodeURIComponent(callbackName)}`;
    document.head.append(script);
  });

  const requestBilibiliTitle = async (bvid) => {
    const cached = readCachedTitle(bvid);
    if (cached) return cached;

    try {
      const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Bilibili metadata ${response.status}`);
      const payload = await response.json();
      const title = payload?.code === 0 ? String(payload?.data?.title || '').trim() : '';
      if (title) {
        cacheTitle(bvid, title);
        return title;
      }
    } catch {
      // Fall back to JSONP because browser CORS behavior can vary.
    }

    try {
      const title = await requestTitleWithJsonp(bvid);
      if (title) cacheTitle(bvid, title);
      return title;
    } catch {
      return '';
    }
  };

  cards.forEach((card) => {
    const trigger = card.querySelector('[data-video-play]');
    const stage = card.querySelector('.visual-video-stage');
    if (!trigger || !stage) return;

    trigger.addEventListener('click', () => {
      if (card.classList.contains('is-playing')) return;

      const iframe = document.createElement('iframe');
      iframe.src = appendAutoplay(card.dataset.videoEmbed);
      iframe.title = card.dataset.videoTitle || '外部视频播放器';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;

      stage.append(iframe);
      card.classList.add('is-playing');
      iframe.focus({ preventScroll: true });
    });
  });

  playlists.forEach((playlist) => {
    const iframe = playlist.querySelector('[data-playlist-player]');
    const items = [...playlist.querySelectorAll('[data-playlist-src]')];
    if (!iframe || !items.length) return;

    const panelHeader = playlist.querySelector('.visual-playlist-panel > header');
    panelHeader?.querySelector('p')?.remove();
    panelHeader?.querySelector('span')?.remove();
    const playlistHeading = panelHeader?.querySelector('h4');
    if (playlistHeading) playlistHeading.textContent = '播放列表';

    const applyTitle = (item, title) => {
      const label = item.querySelector('[data-playlist-label]');
      if (!label) return;

      const resolvedTitle = title || '视频标题暂不可用';
      label.textContent = resolvedTitle;
      item.dataset.playlistTitle = resolvedTitle;
      item.setAttribute('aria-label', `播放 ${resolvedTitle}`);
      if (item.classList.contains('is-active')) iframe.title = resolvedTitle;
    };

    items.forEach((item) => {
      const metadata = item.querySelector('small');
      const bvid = item.dataset.playlistBvid || metadata?.textContent?.trim() || '';
      if (bvid) item.dataset.playlistBvid = bvid;

      item.querySelector(':scope > span')?.remove();
      metadata?.remove();

      const label = item.querySelector('strong');
      if (label) {
        label.dataset.playlistLabel = '';
        label.textContent = '正在读取视频标题…';
      }

      if (bvid) {
        requestBilibiliTitle(bvid).then((title) => applyTitle(item, title));
      } else {
        applyTitle(item, '视频标题暂不可用');
      }

      item.addEventListener('click', () => {
        if (item.classList.contains('is-active')) return;

        items.forEach((candidate) => {
          const active = candidate === item;
          candidate.classList.toggle('is-active', active);
          candidate.setAttribute('aria-pressed', String(active));
        });

        iframe.src = appendAutoplay(item.dataset.playlistSrc);
        iframe.title = item.dataset.playlistTitle || '哔哩哔哩播放列表视频';
        playlist.dataset.activeVideo = item.dataset.playlistTitle || '';
        iframe.focus({ preventScroll: true });
      });
    });
  });
})();
