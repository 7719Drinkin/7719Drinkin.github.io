(() => {
  const body = document.body;
  if (!body || body.dataset.siteModule !== 'games') return;

  const STORAGE_KEY = '7719-language';
  const CATALOG_URL = '/data/games/catalog.json?v=20260820-1';
  const copy = {
    zh: {
      channel: '游戏',
      navLibrary: '游戏',
      navExplore: '探索',
      navMoments: '瞬间',
      navSound: '声音',
      navMemory: '足迹',
      navRecent: '近来',
      heroLead: '记录玩过的游戏、探索过的内容与留下的游玩记忆。',
      statLibrary: '游戏',
      statRecent: '近来',
      enterArchive: '进入档案 ↓',
      libraryTitle: '游戏',
      libraryDescription: '进入个人档案的游戏。具体作品是整个 Games 模块的核心入口。',
      exploreTitle: '探索',
      exploreDescription: '世界、人物、系统、车辆、阵营、地图或任何值得继续进入的内容。',
      momentsTitle: '瞬间',
      momentsDescription: '剧情、战斗、风景与偶然截下来的画面。这里记录时间，而不是百科条目。',
      soundTitle: '声音',
      soundDescription: 'OST、主题曲、广播与游戏中反复听到的声音。',
      memoryTitle: '足迹',
      memoryDescription: '完成、暂停、重返，以及真正属于自己的游玩记录。',
      recentTitle: '近来',
      recentDescription: '最近开始、完成、重返或留下新记录的游戏。',
      backUniverse: '返回 UNIVERSE →'
    },
    en: {
      channel: 'GAMES',
      navLibrary: 'LIBRARY',
      navExplore: 'EXPLORE',
      navMoments: 'MOMENTS',
      navSound: 'SOUND',
      navMemory: 'MEMORY',
      navRecent: 'RECENT',
      heroLead: 'Games played, things explored, and memories left behind.',
      statLibrary: 'LIBRARY',
      statRecent: 'RECENT',
      enterArchive: 'ENTER ARCHIVE ↓',
      libraryTitle: 'LIBRARY',
      libraryDescription: 'Games admitted into the personal archive. Each game is the canonical entry point.',
      exploreTitle: 'EXPLORE',
      exploreDescription: 'Worlds, characters, systems, vehicles, factions, maps, or anything worth entering again.',
      momentsTitle: 'MOMENTS',
      momentsDescription: 'Story beats, battles, landscapes, and accidental screenshots. Time, not encyclopedia entries.',
      soundTitle: 'SOUND',
      soundDescription: 'OSTs, themes, radio, and sounds that remain after leaving the game.',
      memoryTitle: 'MEMORY',
      memoryDescription: 'Completed, paused, returned to, and the records that belong to the player.',
      recentTitle: 'RECENT',
      recentDescription: 'Games recently started, finished, revisited, or newly recorded.',
      backUniverse: 'BACK TO UNIVERSE →'
    }
  };

  const state = {
    language: localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh',
    catalog: null
  };

  const text = (item, zhKey, enKey = `${zhKey}En`) => {
    if (!item) return '';
    const value = state.language === 'en' ? item[enKey] || item[zhKey] : item[zhKey] || item[enKey];
    return value == null ? '' : String(value);
  };

  const safeUrl = (value, fallback = '#') => {
    const url = String(value || '').trim();
    if (!url) return fallback;
    if (url.startsWith('/') || url.startsWith('#')) return url;
    try {
      const parsed = new URL(url, window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
    } catch {
      return fallback;
    }
  };

  const image = (src, alt) => {
    if (!src) return null;
    const node = document.createElement('img');
    node.src = src;
    node.alt = alt || '';
    node.loading = 'lazy';
    node.decoding = 'async';
    return node;
  };

  const linkTarget = (node, item) => {
    const href = safeUrl(item?.href || item?.url, '#');
    node.href = href;
    if (item?.external || /^https?:\/\//i.test(href)) {
      node.target = '_blank';
      node.rel = 'noreferrer';
    }
  };

  const setCopy = () => {
    const langCopy = copy[state.language];
    document.documentElement.lang = state.language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-games-copy]').forEach((node) => {
      const key = node.dataset.gamesCopy;
      if (langCopy[key]) node.textContent = langCopy[key];
    });
    const toggle = document.querySelector('#games-language-toggle');
    if (toggle) toggle.textContent = state.language === 'en' ? '中' : 'EN';
  };

  const setCount = (name, value) => {
    const formatted = String(Math.max(0, Number(value) || 0)).padStart(2, '0');
    document.querySelectorAll(`[data-games-count="${name}"]`).forEach((node) => {
      node.textContent = formatted;
    });
  };

  const clearSlot = (name) => {
    const slot = document.querySelector(`[data-games-slot="${name}"]`);
    if (slot) slot.replaceChildren();
    return slot;
  };

  const renderLibrary = (games = []) => {
    const slot = clearSlot('library');
    if (!slot) return;
    games.forEach((game) => {
      const card = document.createElement('a');
      card.className = 'games-library-card';
      card.href = safeUrl(game.href, game.slug ? `/games/${game.slug}/` : '#');

      const media = document.createElement('div');
      media.className = 'games-library-card-media';
      const img = image(game.cover || game.hero, text(game, 'title'));
      if (img) media.append(img);

      const copyWrap = document.createElement('div');
      copyWrap.className = 'games-library-card-copy';
      const titleWrap = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = text(game, 'title');
      titleWrap.append(title);
      const sub = text(game, 'subtitle');
      if (sub) {
        const p = document.createElement('p');
        p.textContent = sub;
        titleWrap.append(p);
      }

      const meta = document.createElement('span');
      meta.className = 'games-library-card-meta';
      meta.textContent = text(game, 'status') || (Array.isArray(game.platforms) ? game.platforms.join(' / ') : '');

      copyWrap.append(titleWrap, meta);
      card.append(media, copyWrap);
      slot.append(card);
    });
  };

  const renderExplore = (items = []) => {
    const slot = clearSlot('explore');
    if (!slot) return;
    items.forEach((item) => {
      const card = document.createElement('a');
      card.className = 'games-explore-card';
      linkTarget(card, item);

      const media = document.createElement('div');
      media.className = 'games-explore-card-media';
      const img = image(item.image, text(item, 'title'));
      if (img) media.append(img);

      const copyWrap = document.createElement('div');
      copyWrap.className = 'games-explore-card-copy';
      const type = document.createElement('span');
      type.className = 'games-explore-card-type';
      type.textContent = String(item.type || 'EXPLORE');
      const title = document.createElement('h3');
      title.textContent = text(item, 'title');
      copyWrap.append(type, title);
      const game = text(item, 'game');
      if (game) {
        const p = document.createElement('p');
        p.textContent = game;
        copyWrap.append(p);
      }

      card.append(media, copyWrap);
      slot.append(card);
    });
  };

  const renderMoments = (items = []) => {
    const slot = clearSlot('moments');
    if (!slot) return;
    items.forEach((item) => {
      const figure = document.createElement('figure');
      figure.className = 'games-moment-card';
      const img = image(item.image, text(item, 'title'));
      if (img) figure.append(img);
      const caption = document.createElement('figcaption');
      const title = document.createElement('h3');
      title.textContent = text(item, 'title');
      caption.append(title);
      const game = text(item, 'game');
      if (game) {
        const p = document.createElement('p');
        p.textContent = game;
        caption.append(p);
      }
      figure.append(caption);
      slot.append(figure);
    });
  };

  const renderSound = (items = []) => {
    const slot = clearSlot('sound');
    if (!slot) return;
    items.forEach((item, index) => {
      const row = document.createElement('a');
      row.className = 'games-sound-row';
      linkTarget(row, item);
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('strong');
      title.textContent = text(item, 'title');
      const source = document.createElement('small');
      source.textContent = text(item, 'game') || text(item, 'artist');
      const arrow = document.createElement('b');
      arrow.textContent = '↗';
      row.append(number, title, source, arrow);
      slot.append(row);
    });
  };

  const renderMemory = (items = []) => {
    const slot = clearSlot('memory');
    if (!slot) return;
    items.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'games-memory-item';
      const time = document.createElement('time');
      time.textContent = item.date || '';
      const copyWrap = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = text(item, 'title') || text(item, 'game');
      copyWrap.append(title);
      const note = text(item, 'note');
      if (note) {
        const p = document.createElement('p');
        p.textContent = note;
        copyWrap.append(p);
      }
      article.append(time, copyWrap);
      slot.append(article);
    });
  };

  const renderRecent = (items = []) => {
    const slot = clearSlot('recent');
    if (!slot) return;
    items.forEach((item) => {
      const row = document.createElement('a');
      row.className = 'games-recent-item';
      linkTarget(row, item);
      const time = document.createElement('time');
      time.textContent = item.date || '';
      const title = document.createElement('strong');
      title.textContent = text(item, 'title') || text(item, 'game');
      const action = document.createElement('span');
      action.textContent = text(item, 'action');
      const arrow = document.createElement('b');
      arrow.textContent = '→';
      row.append(time, title, action, arrow);
      slot.append(row);
    });
  };

  const render = () => {
    const catalog = state.catalog || {};
    const featured = catalog.featured || {};
    const games = Array.isArray(catalog.games) ? catalog.games : [];
    const explore = Array.isArray(featured.explore) ? featured.explore : [];
    const moments = Array.isArray(featured.moments) ? featured.moments : [];
    const sound = Array.isArray(featured.sound) ? featured.sound : [];
    const memory = Array.isArray(featured.memory) ? featured.memory : [];
    const recent = Array.isArray(catalog.recent) ? catalog.recent : [];

    setCount('games', games.length);
    setCount('explore', explore.length);
    setCount('moments', moments.length);
    setCount('sound', sound.length);
    setCount('memory', memory.length);
    setCount('recent', recent.length);

    renderLibrary(games);
    renderExplore(explore);
    renderMoments(moments);
    renderSound(sound);
    renderMemory(memory);
    renderRecent(recent);

    const hero = catalog.home || {};
    if (hero.heroBackground) {
      body.style.setProperty('--games-hero-image', `url("${String(hero.heroBackground).replaceAll('"', '%22')}")`);
    }
    if (hero.heroPosition) body.style.setProperty('--games-hero-position', String(hero.heroPosition));
  };

  const loadCatalog = async () => {
    try {
      const response = await fetch(CATALOG_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Games catalog HTTP ${response.status}`);
      state.catalog = await response.json();
    } catch (error) {
      console.warn('[games] catalog unavailable', error);
      state.catalog = { games: [], featured: {}, recent: [] };
    }
    render();
  };

  document.querySelector('#games-language-toggle')?.addEventListener('click', () => {
    state.language = state.language === 'zh' ? 'en' : 'zh';
    localStorage.setItem(STORAGE_KEY, state.language);
    setCopy();
    render();
  });

  setCopy();
  loadCatalog();
})();
