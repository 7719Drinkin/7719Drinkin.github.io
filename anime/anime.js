const ANIME_LANGUAGE_KEY = '7719-language';
const ANIME_CATALOG_URL = '/data/anime/catalog.json?v=20260818-series-1';

const ANIME_COPY = {
  en: {
    navSeries: 'SERIES',
    navCharacters: 'CHARACTERS',
    navScenes: 'MOMENTS',
    navSound: 'SOUND',
    home: 'HOME',
    anime: 'ANIME',
    heroEyebrow: '04 / PERSONAL ANIMATION ARCHIVE',
    heroCaption: 'Whole series, selectively remembered',
    heroBody: 'No season-by-season database and no claim to completeness. Each series keeps only the characters, moments, sounds, images and viewing memories worth returning to.',
    enterArchive: 'ENTER THE COLLECTION',
    scroll: 'SCROLL TO BROWSE',
    letterTitle: 'Series\nNotes',
    seriesKicker: 'SERIES COLLECTION',
    seriesTitle: 'ENTER A WHOLE WORLD FIRST.',
    seriesBody: 'Seasons, films and OVAs remain release metadata inside a series. Characters, scenes, music and memories are organized around the series as a whole.',
    charactersKicker: 'SELECTED CHARACTERS',
    charactersTitle: 'MEET A FEW PEOPLE ACROSS DIFFERENT WORLDS.',
    charactersBody: 'This is not a separate character database. It is a shortcut across series; every character still belongs to their own series page.',
    scenesKicker: 'SELECTED MOMENTS',
    scenesTitle: 'WHAT REMAINS IS OFTEN A SINGLE MOMENT.',
    scenesBody: 'Scenes belong to a series. Season, film or episode information is only provenance metadata and never becomes another navigation layer.',
    soundKicker: 'ANIME SOUND',
    soundTitle: 'SOME WORLDS ARE REMEMBERED BY SOUND FIRST.',
    soundBody: 'Openings, endings, scores and insert songs remain attached to their series. The homepage surfaces only a small selection worth returning to quickly.',
    recentKicker: 'RECENTLY WATCHED / CURATED',
    recentTitle: 'THE ARCHIVE GROWS WITH EACH RETURN.',
    emptyLabel: 'ARCHIVE READY',
    emptySeriesTitle: 'No series have been entered yet.',
    emptySeriesBody: 'The structure is ready. The first real series can now be added without changing the page architecture.',
    emptyCharactersTitle: 'Characters will appear from collected series.',
    emptyCharactersBody: 'Homepage character entries are shortcuts only. No standalone global character library will be created.',
    emptyScenesTitle: 'Selected moments will appear here.',
    emptyScenesBody: 'Each moment will link back into its own series and keep release or episode information only as a source label.',
    emptySoundTitle: 'Anime sound entries will appear here.',
    emptySoundBody: 'OP, ED, OST and insert songs can be selected from individual series after the first collections are entered.',
    emptyRecentTitle: 'No recent viewing records yet.',
    emptyRecentBody: 'This area will show recent watching or archive updates without creating another content hierarchy.',
    seriesOpen: 'OPEN SERIES',
    characterOpen: 'OPEN CHARACTER',
    sceneOpen: 'OPEN MOMENT',
    releaseFallback: 'SERIES',
    back: 'BACK TO UNIVERSE →'
  },
  zh: {
    navSeries: '系列',
    navCharacters: '人物',
    navScenes: '瞬间',
    navSound: '动画之声',
    home: '首页',
    anime: '动漫',
    heroEyebrow: '04 / 私人动画档案',
    heroCaption: '以完整系列为单位，收藏真正留下来的部分',
    heroBody: '不逐季复刻资料库，也不追求完整。每一部系列只留下值得反复回望的人物、瞬间、声音、影像与观看记忆。',
    enterArchive: '进入收藏',
    scroll: '向下翻阅',
    letterTitle: '系列\n札记',
    seriesKicker: '系列收藏',
    seriesTitle: '先进入一个完整的世界。',
    seriesBody: '季度、剧场版与 OVA 只作为系列内部的发行信息；人物、场景、音乐与记忆都围绕整个系列整理。',
    charactersKicker: '人物选录',
    charactersTitle: '从不同世界里，先遇见几个人。',
    charactersBody: '这里不是独立的人物库，只是跨系列的快捷入口。每个人物仍然归属于自己的系列页面。',
    scenesKicker: '瞬间选录',
    scenesTitle: '真正记住的，往往只是一个瞬间。',
    scenesBody: '场景属于具体系列；季度、剧场版或集数只作为来源标签，不形成新的页面层级。',
    soundKicker: '动画之声',
    soundTitle: '有些世界，是先被声音记住的。',
    soundBody: 'OP、ED、OST 与插曲继续归属于对应系列；主页只展示少量值得快速回到的声音。',
    recentKicker: '最近观看 / 最近整理',
    recentTitle: '档案会随着观看继续生长。',
    emptyLabel: '结构已就绪',
    emptySeriesTitle: '还没有录入具体系列。',
    emptySeriesBody: '页面结构已经准备完成。接下来加入第一批真实收藏时，不需要再改变信息架构。',
    emptyCharactersTitle: '人物会从已收藏的系列中出现。',
    emptyCharactersBody: '主页人物只承担快捷入口，不建立独立于作品之外的全局人物库。',
    emptyScenesTitle: '精选瞬间会从系列中抽取到这里。',
    emptyScenesBody: '每个瞬间仍然回到对应系列；季度、剧场版或集数只保留为来源标签。',
    emptySoundTitle: '动画之声会从系列收藏中出现。',
    emptySoundBody: '录入第一批系列后，可以从其中选择 OP、ED、OST 与插曲展示在这里。',
    emptyRecentTitle: '暂时没有最近观看记录。',
    emptyRecentBody: '这里以后只记录最近观看或整理状态，不产生新的内容层级。',
    seriesOpen: '进入系列',
    characterOpen: '查看人物',
    sceneOpen: '查看瞬间',
    releaseFallback: '系列',
    back: '返回宇宙 →'
  }
};

function detectAnimeLanguage() {
  try {
    const stored = localStorage.getItem(ANIME_LANGUAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {}
  return (navigator.language || 'zh-CN').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let animeLanguage = detectAnimeLanguage();
let animeCatalog = { series: [], featured: {}, recent: [] };
const languageToggle = document.querySelector('#anime-language-toggle');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function localized(value, language = animeLanguage) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.[language] ?? value?.zh ?? value?.en ?? value?.ja ?? '';
}

function seriesById(id) {
  return (animeCatalog.series || []).find((series) => series.id === id || series.slug === id);
}

function normalizeRef(reference) {
  if (typeof reference === 'string') {
    const [seriesId, itemId] = reference.split(':');
    return { seriesId, itemId };
  }
  return {
    seriesId: reference?.seriesId ?? reference?.series,
    itemId: reference?.itemId ?? reference?.id
  };
}

function itemFromSeries(reference, field) {
  const { seriesId, itemId } = normalizeRef(reference);
  const series = seriesById(seriesId);
  if (!series) return null;
  const item = (series[field] || []).find((entry) => entry.id === itemId || entry.slug === itemId);
  return item ? { series, item } : null;
}

function emptyState(titleKey, bodyKey) {
  const copy = ANIME_COPY[animeLanguage];
  return `<div class="anime-empty-state reveal"><div>
    <small>${escapeHtml(copy.emptyLabel)}</small>
    <strong>${escapeHtml(copy[titleKey])}</strong>
    <p>${escapeHtml(copy[bodyKey])}</p>
  </div></div>`;
}

function renderSeries() {
  const root = document.querySelector('#anime-series-grid');
  if (!root) return;
  const featuredIds = animeCatalog.featured?.series || [];
  const entries = featuredIds.length
    ? featuredIds.map(seriesById).filter(Boolean)
    : (animeCatalog.series || []);

  if (!entries.length) {
    root.innerHTML = emptyState('emptySeriesTitle', 'emptySeriesBody');
    return;
  }

  root.innerHTML = entries.map((series, index) => {
    const titleZh = localized(series.title, 'zh');
    const titleAlt = localized(series.title, animeLanguage === 'zh' ? 'en' : 'zh');
    const route = series.route || `/anime/${series.slug}/`;
    const visual = series.cover
      ? `<img src="${escapeHtml(series.cover)}" alt="" loading="lazy" decoding="async">`
      : '';
    const releaseCount = (series.releases || []).length;
    const releaseLabel = releaseCount
      ? `${String(releaseCount).padStart(2, '0')} RELEASE${releaseCount === 1 ? '' : 'S'}`
      : ANIME_COPY[animeLanguage].releaseFallback;

    return `<a class="anime-series-card reveal" href="${escapeHtml(route)}" aria-label="${escapeHtml(ANIME_COPY[animeLanguage].seriesOpen)} ${escapeHtml(localized(series.title))}">
      <div class="anime-series-visual">${visual}<span class="anime-series-index">SERIES / ${String(index + 1).padStart(2, '0')}</span></div>
      <div class="anime-series-copy">
        <div class="anime-series-meta"><span>${escapeHtml(series.years || series.year || '')}</span><span>${escapeHtml(releaseLabel)}</span></div>
        <h3>${escapeHtml(animeLanguage === 'zh' ? titleZh : localized(series.title))}${titleAlt ? `<small>${escapeHtml(titleAlt)}</small>` : ''}</h3>
        ${series.tagline ? `<p>${escapeHtml(localized(series.tagline))}</p>` : ''}
      </div>
    </a>`;
  }).join('');
}

function renderCharacters() {
  const root = document.querySelector('#anime-character-grid');
  if (!root) return;
  const refs = animeCatalog.featured?.characters || [];
  const entries = refs.map((ref) => itemFromSeries(ref, 'characters')).filter(Boolean);

  if (!entries.length) {
    root.innerHTML = emptyState('emptyCharactersTitle', 'emptyCharactersBody');
    return;
  }

  root.innerHTML = entries.map(({ series, item }) => {
    const route = item.route || `/anime/${series.slug}/characters/${item.slug}/`;
    const visual = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">`
      : '';
    const altName = localized(item.name, animeLanguage === 'zh' ? 'en' : 'zh');
    return `<a class="anime-character-card reveal" href="${escapeHtml(route)}">
      <div class="anime-character-visual">${visual}</div>
      <div class="anime-character-copy">
        <small>${escapeHtml(localized(series.title))}</small>
        <h3>${escapeHtml(localized(item.name))}</h3>
        ${altName ? `<p>${escapeHtml(altName)}</p>` : ''}
      </div>
    </a>`;
  }).join('');
}

function renderScenes() {
  const root = document.querySelector('#anime-scene-grid');
  if (!root) return;
  const refs = animeCatalog.featured?.scenes || [];
  const entries = refs.map((ref) => itemFromSeries(ref, 'scenes')).filter(Boolean);

  if (!entries.length) {
    root.innerHTML = emptyState('emptyScenesTitle', 'emptyScenesBody');
    return;
  }

  root.innerHTML = entries.map(({ series, item }) => {
    const route = item.route || `/anime/${series.slug}/scenes/${item.slug}/`;
    const visual = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">`
      : '';
    const source = [item.release, item.episode].filter(Boolean).join(' · ');
    return `<a class="anime-scene-card reveal" href="${escapeHtml(route)}">
      <div class="anime-scene-visual">${visual}</div>
      <div class="anime-scene-copy">
        <small>${escapeHtml(localized(series.title))}${source ? ` · ${escapeHtml(source)}` : ''}</small>
        <h3>${escapeHtml(localized(item.title))}</h3>
        ${item.note ? `<p>${escapeHtml(localized(item.note))}</p>` : ''}
      </div>
    </a>`;
  }).join('');
}

function renderSounds() {
  const root = document.querySelector('#anime-sound-list');
  if (!root) return;
  const refs = animeCatalog.featured?.sounds || [];
  const entries = refs.map((ref) => itemFromSeries(ref, 'music')).filter(Boolean);

  if (!entries.length) {
    root.innerHTML = emptyState('emptySoundTitle', 'emptySoundBody');
    return;
  }

  root.innerHTML = entries.map(({ series, item }, index) => {
    const tag = [item.type, item.release].filter(Boolean).join(' · ');
    const href = item.url || item.route || (series.route || `/anime/${series.slug}/`);
    return `<a class="anime-sound-row reveal" href="${escapeHtml(href)}"${item.external ? ' target="_blank" rel="noreferrer"' : ''}>
      <span>${String(index + 1).padStart(2, '0')}</span>
      <strong>${escapeHtml(localized(item.title))}</strong>
      <small>${escapeHtml(item.artist || '')}</small>
      <em>${escapeHtml(localized(series.title))}${tag ? ` · ${escapeHtml(tag)}` : ''}</em>
      <b aria-hidden="true">↗</b>
    </a>`;
  }).join('');
}

function renderRecent() {
  const root = document.querySelector('#anime-recent-list');
  if (!root) return;
  const entries = animeCatalog.recent || [];
  if (!entries.length) {
    root.innerHTML = emptyState('emptyRecentTitle', 'emptyRecentBody');
    return;
  }

  root.innerHTML = entries.map((entry) => {
    const series = seriesById(entry.seriesId || entry.series);
    return `<div class="anime-recent-row reveal">
      <time>${escapeHtml(entry.date || '')}</time>
      <div><strong>${escapeHtml(series ? localized(series.title) : localized(entry.title))}</strong>${entry.note ? `<small>${escapeHtml(localized(entry.note))}</small>` : ''}</div>
      <span>${escapeHtml(localized(entry.status) || '')}</span>
    </div>`;
  }).join('');
}

function renderCatalog() {
  renderSeries();
  renderCharacters();
  renderScenes();
  renderSounds();
  renderRecent();
}

function applyAnimeLanguage() {
  const copy = ANIME_COPY[animeLanguage];
  document.documentElement.lang = animeLanguage === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.dataset.language = animeLanguage;
  document.title = animeLanguage === 'zh' ? '动漫 · 7719 宇宙' : 'Anime · 7719 Universe';

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.content = animeLanguage === 'zh'
      ? '7719 宇宙中的私人动漫系列收藏、人物、瞬间与观看记忆。'
      : 'A personal anime archive of series, characters, moments and viewing memories in 7719 Universe.';
  }

  document.querySelectorAll('[data-copy]').forEach((element) => {
    const value = copy[element.dataset.copy];
    if (value === undefined) return;
    const normalized = String(value).replaceAll('\n', '<br>');
    if (element.hasAttribute('data-html') || String(value).includes('\n')) element.innerHTML = normalized;
    else element.textContent = value;
  });

  if (languageToggle) {
    languageToggle.textContent = animeLanguage === 'zh' ? 'EN' : '中文';
    languageToggle.setAttribute('aria-label', animeLanguage === 'zh' ? 'Switch to English' : '切换为中文');
    languageToggle.lang = animeLanguage === 'zh' ? 'en' : 'zh-CN';
  }

  renderCatalog();
  installRevealObservers();
}

languageToggle?.addEventListener('click', () => {
  animeLanguage = animeLanguage === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem(ANIME_LANGUAGE_KEY, animeLanguage); } catch {}
  applyAnimeLanguage();
});

const header = document.querySelector('.universe-header');
const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 22);
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

let revealObserver;
function installRevealObservers() {
  revealObserver?.disconnect();
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach((item) => item.classList.add('visible'));
    return;
  }
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  reveals.forEach((item) => revealObserver.observe(item));
}

function installHeroMotion() {
  const hero = document.querySelector('.anime-hero');
  const letter = document.querySelector('.anime-letter');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!hero || !letter || !finePointer.matches || reduceMotion.matches) return;

  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 10;
    letter.style.setProperty('--anime-shift-x', `${x.toFixed(2)}px`);
    letter.style.setProperty('--anime-shift-y', `${y.toFixed(2)}px`);
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    letter.style.setProperty('--anime-shift-x', '0px');
    letter.style.setProperty('--anime-shift-y', '0px');
  });
}

async function loadAnimeCatalog() {
  try {
    const response = await fetch(ANIME_CATALOG_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Anime catalog request failed: ${response.status}`);
    const data = await response.json();
    animeCatalog = {
      series: Array.isArray(data.series) ? data.series : [],
      featured: data.featured && typeof data.featured === 'object' ? data.featured : {},
      recent: Array.isArray(data.recent) ? data.recent : []
    };
  } catch (error) {
    console.warn('[anime] catalog unavailable; keeping graceful empty state.', error);
  }
}

async function initAnimeArchive() {
  await loadAnimeCatalog();
  applyAnimeLanguage();
  installHeroMotion();
}

initAnimeArchive();
