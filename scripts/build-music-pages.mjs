import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(ROOT, 'data/music/artists.json');
const detailsDir = join(ROOT, 'data/music/artists');
const musicRoot = join(ROOT, 'music');
const library = createMusicLibraryRepository({ root: ROOT });

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const localized = (value, language = 'zh') => {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? '';
};

const initials = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part[0])
  .join('')
  .slice(0, 3)
  .toUpperCase();

function assertArtist(artist, seenIds, seenSlugs) {
  if (!artist || typeof artist !== 'object') throw new Error('Artist entry must be an object.');
  for (const field of ['id', 'slug', 'assetKey', 'route', 'status']) {
    if (!artist[field]) throw new Error(`Artist is missing required field: ${field}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(artist.slug)) {
    throw new Error(`Invalid artist slug: ${artist.slug}`);
  }
  if (artist.route !== `/music/artists/${artist.slug}/`) {
    throw new Error(`Artist route does not match slug: ${artist.id}`);
  }
  if (!['published', 'preview', 'draft'].includes(artist.status)) {
    throw new Error(`Unsupported artist status: ${artist.status}`);
  }
  if (seenIds.has(artist.id) || seenSlugs.has(artist.slug)) {
    throw new Error(`Duplicate artist id or slug: ${artist.id}`);
  }
  seenIds.add(artist.id);
  seenSlugs.add(artist.slug);
}

function renderHeader({ artist = null } = {}) {
  const context = artist
    ? `<a href="/music/" class="music-header-context">MUSIC / ${escapeHtml(localized(artist.name, 'en').toUpperCase())}</a>`
    : `<a href="/music/" class="music-header-context is-current">COLLECTIONS / MUSIC</a>`;

  const links = artist
    ? `<a href="#overview">OVERVIEW</a><a href="#songs">SONGS</a><a href="#albums">ALBUMS</a><a href="#gallery">VISUAL</a>`
    : `<a href="/">HOME</a><a class="is-current" href="/music/">COLLECTIONS</a><a href="#artists">ARTISTS</a><a href="#listening">LISTENING</a>`;

  return `<header class="music-site-header">
    <a class="music-site-brand" href="/" aria-label="返回 7719 Universe">
      <span>77</span><strong>19</strong>
    </a>
    <div class="music-header-middle">${context}</div>
    <nav class="music-site-nav" aria-label="音乐收藏导航">${links}</nav>
  </header>`;
}

function renderSectionHeader(kicker, title, note = '', action = '') {
  return `<div class="music-section-header reveal">
    <div>
      <p>${escapeHtml(kicker)}</p>
      <h2>${escapeHtml(title)}</h2>
    </div>
    ${note ? `<span>${escapeHtml(note)}</span>` : ''}
    ${action ? `<a href="${escapeHtml(action)}">VIEW ALL <b>↗</b></a>` : ''}
  </div>`;
}

function renderVisual(artist, className, label, priority = false) {
  const nameEn = localized(artist.name, 'en');
  if (artist.cover) {
    return `<img class="${className}" src="${escapeHtml(artist.cover)}" alt="${escapeHtml(label)}" ${priority ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
  }
  return `<div class="${className} artist-visual-placeholder" aria-hidden="true">
    <span>${escapeHtml(initials(nameEn))}</span>
    <i></i><b></b><em></em>
  </div>`;
}

function renderArtistCard(artist, index) {
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');
  return `<a class="collection-artist-card reveal" href="${escapeHtml(artist.route)}"
      style="--card-accent:${escapeHtml(artist.theme.accent)};--card-bg:${escapeHtml(artist.theme.background)}">
    <div class="collection-artist-image">
      ${renderVisual(artist, 'collection-artist-cover', `${nameZh} artist cover`)}
      <span class="collection-artist-index">${String(index + 1).padStart(2, '0')}</span>
    </div>
    <div class="collection-artist-copy">
      <p>${escapeHtml(nameEn)}</p>
      <h3>${escapeHtml(nameZh)}</h3>
      <span>${escapeHtml(localized(artist.subtitle, 'zh'))}</span>
      <b aria-hidden="true">↗</b>
    </div>
  </a>`;
}

function flattenSongs(artists, detailsById) {
  const rows = [];
  for (const artist of artists) {
    const detail = detailsById.get(artist.id);
    for (const song of detail?.selectedSongs ?? []) {
      rows.push({ artist, song });
    }
  }
  return rows.slice(0, 5);
}

function renderCollectionSongRows(items) {
  return items.map(({ artist, song }, index) => `<a class="collection-song-row reveal" href="${escapeHtml(artist.route)}#songs">
    <span>${String(index + 1).padStart(2, '0')}</span>
    <div>
      <strong>${escapeHtml(song.title)}</strong>
      <small>${escapeHtml(localized(artist.name, 'en'))}</small>
    </div>
    <p>${escapeHtml(song.note ?? '')}</p>
    <em>${song.audio?.src ? 'PLAYABLE' : 'ARCHIVE'}</em>
    <b aria-hidden="true">↗</b>
  </a>`).join('');
}

function renderMusicIndex(artists, detailsById) {
  const artistCards = artists.map(renderArtistCard).join('');
  const songRows = renderCollectionSongRows(flattenSongs(artists, detailsById));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="7719 Universe 的个人音乐收藏：按歌手整理歌曲、专辑、影像与聆听记忆。">
  <title>Music Collection · 7719 Universe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/music.css?v=20260805-2">
</head>
<body class="music-page music-collection-page">
  ${renderHeader()}
  <main>
    <section class="collection-hero">
      <div class="collection-hero-copy reveal">
        <p class="music-eyebrow">03 / PERSONAL COLLECTION</p>
        <h1><span>Music</span><strong>Collection</strong></h1>
        <h2>音乐收藏</h2>
        <p class="collection-intro">不是完整的音乐资料库，而是一份持续整理的个人聆听档案。收藏歌手、歌曲，也收藏与声音有关的记忆。</p>
        <a class="music-text-link" href="#artists">进入收藏 <b>↓</b></a>
      </div>
      <div class="collection-record" aria-hidden="true">
        <div class="collection-record-disc"><i></i><b></b></div>
        <div class="collection-record-arm"><span></span></div>
        <p>PERSONAL LISTENING ARCHIVE</p>
      </div>
    </section>

    <section id="artists" class="music-content-section">
      ${renderSectionHeader('01 / CURATED ARTISTS', '歌手收藏', '每位歌手拥有独立页面，但共享统一的内容组件与数据结构。')}
      <div class="collection-artist-grid">
        ${artistCards}
        <article class="collection-artist-card collection-artist-card--more reveal">
          <div class="collection-more-mark" aria-hidden="true"><i></i><b></b></div>
          <div class="collection-artist-copy">
            <p>MORE ARTISTS</p>
            <h3>持续加入</h3>
            <span>新增歌手只注册数据，不复制页面结构。</span>
            <b aria-hidden="true">+</b>
          </div>
        </article>
      </div>
    </section>

    <section id="listening" class="music-content-section collection-listening">
      ${renderSectionHeader('02 / SELECTED LISTENING', '最近整理', '从不同歌手的收藏中抽取少量条目，保持页面克制。')}
      <div class="collection-song-list">${songRows}</div>
    </section>

    <section class="music-content-section collection-manifesto reveal">
      <p>COLLECTION PRINCIPLE</p>
      <blockquote>少量、可持续、以个人记忆为核心。页面负责整理与呈现，播放器只是其中一个可复用组件。</blockquote>
      <a href="/">返回 7719 Universe <b>↗</b></a>
    </section>
  </main>
  <footer class="music-site-footer"><span>7719 / MUSIC COLLECTION</span><span>CURATED, NOT COMPLETE.</span></footer>
  <script src="/js/music.js?v=20260805-2"></script>
</body>
</html>`;
}

function renderSongRow(song, index, artistName) {
  const meta = [song.album, song.year].filter(Boolean).join(' · ') || 'COLLECTION NOTE';
  const core = `<span class="song-index">${String(index + 1).padStart(2, '0')}</span>
    <div class="song-primary"><h3>${escapeHtml(song.title)}</h3><p>${escapeHtml(meta)}</p></div>
    <small>${escapeHtml(song.note ?? '')}</small>`;

  if (song.audio?.src) {
    return `<button class="song-row song-row--playable" type="button"
      data-player-track
      data-audio-src="${escapeHtml(song.audio.src)}"
      data-audio-type="${escapeHtml(song.audio.type ?? 'audio/mpeg')}"
      data-song-title="${escapeHtml(song.title)}"
      data-song-artist="${escapeHtml(artistName)}"
      data-song-album="${escapeHtml(song.album ?? '')}"
      aria-label="播放 ${escapeHtml(song.title)}">
      ${core}<b class="song-row-action" data-player-action aria-hidden="true">▶</b>
    </button>`;
  }

  return song.url
    ? `<a class="song-row" href="${escapeHtml(song.url)}" target="_blank" rel="noreferrer">${core}<b>↗</b></a>`
    : `<article class="song-row">${core}<b>—</b></article>`;
}

function renderSongs(songs = [], artistName = '') {
  if (!songs.length) {
    return `<div class="music-empty"><span>SELECTED SONGS</span><p>精选歌曲将在整理后加入。</p></div>`;
  }
  return songs.map((song, index) => renderSongRow(song, index, artistName)).join('');
}

function renderAlbums(albums = []) {
  if (!albums.length) {
    return `<div class="music-empty music-empty--line"><span>ALBUM ARCHIVE / RESERVED</span><p>专辑封面和个人选曲会在素材准备完成后进入这里。</p></div>`;
  }
  return albums.map((album) => `<article class="album-card">
    ${album.cover ? `<img src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} album cover" loading="lazy" decoding="async">` : '<div class="album-placeholder" aria-hidden="true"><i></i></div>'}
    <div><span>${escapeHtml(album.year ?? 'YEAR TBD')}</span><h3>${escapeHtml(album.title)}</h3><p>${escapeHtml(album.note ?? '')}</p></div>
  </article>`).join('');
}

function renderGallery(gallery = []) {
  if (!gallery.length) {
    return `<div class="music-empty music-empty--visual"><span>VISUAL ARCHIVE / RESERVED</span><p>照片、GIF 与演出影像将从对应的素材目录读取。</p></div>`;
  }
  return gallery.map((item, index) => `<figure class="visual-card">
    <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt ?? `Artist archive image ${index + 1}`)}" loading="lazy" decoding="async">
    ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
  </figure>`).join('');
}

function renderRelated(current, artists) {
  return artists
    .filter((artist) => artist.id !== current.id)
    .slice(0, 3)
    .map((artist) => `<a class="related-artist" href="${escapeHtml(artist.route)}">
      <span>${escapeHtml(localized(artist.name, 'en'))}</span>
      <strong>${escapeHtml(localized(artist.name, 'zh'))}</strong>
      <b>↗</b>
    </a>`).join('');
}

function renderPlayer(artist) {
  const nameEn = localized(artist.name, 'en');
  return `<aside class="site-music-player is-collapsed" data-music-player hidden aria-label="网站音乐播放器">
    <audio data-player-audio preload="metadata"></audio>
    <div class="site-player-track">
      <div class="site-player-cover" aria-hidden="true">${escapeHtml(initials(nameEn))}</div>
      <div class="site-player-copy">
        <span>NOW PLAYING</span>
        <strong data-player-title>尚未选择歌曲</strong>
        <small><span data-player-artist>${escapeHtml(nameEn)}</span><span data-player-album></span></small>
      </div>
    </div>
    <div class="site-player-controls">
      <button type="button" data-player-prev aria-label="上一首">‹</button>
      <button class="site-player-toggle" type="button" data-player-toggle aria-label="播放">▶</button>
      <button type="button" data-player-next aria-label="下一首">›</button>
    </div>
    <div class="site-player-progress">
      <time data-player-current>0:00</time>
      <input data-player-seek type="range" min="0" max="100" value="0" step="0.1" aria-label="播放进度">
      <time data-player-duration>0:00</time>
      <p data-player-status aria-live="polite"></p>
    </div>
    <div class="site-player-volume">
      <span>VOL</span>
      <input data-player-volume type="range" min="0" max="1" value="0.8" step="0.05" aria-label="音量">
    </div>
    <button class="site-player-expand" type="button" data-player-expand aria-expanded="false" aria-label="展开播放器">⌃</button>
  </aside>`;
}

function renderArtistPage(artist, detail, artists) {
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');
  const heroImage = detail.heroImage ?? artist.cover;
  const hero = heroImage
    ? `<img class="artist-hero-image" src="${escapeHtml(heroImage)}" alt="${escapeHtml(nameZh)} artist portrait" fetchpriority="high">`
    : `<div class="artist-hero-placeholder" aria-hidden="true">
        <span>${escapeHtml(initials(nameEn))}</span><i></i><b></b><em></em>
      </div>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(localized(artist.description, 'zh'))}">
  <title>${escapeHtml(nameZh)} · Music Collection · 7719 Universe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/music.css?v=20260805-2">
  <link rel="stylesheet" href="/css/music-player.css?v=20260805-4">
</head>
<body class="music-page music-artist-page"
  style="--artist-accent:${escapeHtml(artist.theme.accent)};--artist-accent-soft:${escapeHtml(artist.theme.accentSoft)};--artist-bg:${escapeHtml(artist.theme.background)};--artist-fg:${escapeHtml(artist.theme.foreground)}">
  ${renderHeader({ artist })}
  <main>
    <section class="artist-hero">
      <div class="artist-hero-copy reveal">
        <p class="music-eyebrow">${escapeHtml(detail.eyebrow)}</p>
        <h1>${escapeHtml(nameZh)}</h1>
        <h2>${escapeHtml(nameEn)}</h2>
        <span></span>
        <blockquote>${escapeHtml(localized(detail.headline, 'zh'))}</blockquote>
        <a class="music-text-link" href="#overview">进入收藏 <b>↓</b></a>
      </div>
      <div class="artist-hero-media">${hero}</div>
    </section>

    <nav class="artist-tabs" aria-label="${escapeHtml(nameZh)}收藏分区">
      <a class="is-current" href="#overview">OVERVIEW</a>
      <a href="#songs">SONGS</a>
      <a href="#albums">ALBUMS</a>
      <a href="#gallery">VISUAL ARCHIVE</a>
    </nav>

    <section id="overview" class="artist-overview music-content-section">
      <div id="songs" class="artist-song-column">
        ${renderSectionHeader('01 / SELECTED SONGS', '反复聆听', '只有配置了音频源的条目才显示播放控制。')}
        <div class="song-list reveal"
          data-playback-queue
          data-queue-id="artist-selection:${escapeHtml(artist.slug)}"
          data-queue-kind="artist-selection"
          data-queue-title="${escapeHtml(nameEn)}">${renderSongs(detail.selectedSongs, nameEn)}</div>
      </div>
      <aside class="artist-note reveal">
        <p>ABOUT THE COLLECTION</p>
        <h2>${escapeHtml(localized(detail.headline, 'en'))}</h2>
        <div>${escapeHtml(localized(detail.introduction, 'zh'))}</div>
        <blockquote>${escapeHtml(localized(detail.personalNote, 'zh'))}</blockquote>
        <span>${(artist.tags ?? []).map((tag) => `<i>${escapeHtml(tag)}</i>`).join('')}</span>
      </aside>
    </section>

    <section id="albums" class="music-content-section">
      ${renderSectionHeader('02 / ALBUM ARCHIVE', '专辑收藏', '以少量封面建立作品脉络，避免把页面做成完整唱片数据库。')}
      <div class="album-grid">${renderAlbums(detail.albums)}</div>
    </section>

    <section id="gallery" class="music-content-section">
      ${renderSectionHeader('03 / VISUAL ARCHIVE', '影像记录', `素材目录：/assets/Music/Artists/${artist.assetKey}/`)}
      <div class="visual-grid">${renderGallery(detail.gallery)}</div>
    </section>

    <section class="music-content-section related-section">
      ${renderSectionHeader('04 / CONTINUE', '其他歌手', '返回音乐收藏，或进入其他歌手的独立档案。')}
      <div class="related-grid">${renderRelated(artist, artists)}</div>
    </section>
  </main>

  ${renderPlayer(artist)}
  <footer class="music-site-footer"><a href="/music/">← MUSIC COLLECTION</a><span>${escapeHtml(nameEn.toUpperCase())} / 7719</span></footer>
  <script src="/js/music.js?v=20260805-2"></script>
  <script src="/js/music-player.js?v=20260805-2"></script>
</body>
</html>`;
}

async function main() {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  if (!Array.isArray(registry)) throw new Error('data/music/artists.json must contain an array.');

  const seenIds = new Set();
  const seenSlugs = new Set();
  registry.forEach((artist) => assertArtist(artist, seenIds, seenSlugs));

  const published = registry
    .filter((artist) => artist.status !== 'draft')
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const detailsById = new Map();
  for (const artist of published) {
    const canonicalDetail = JSON.parse(await readFile(join(detailsDir, `${artist.slug}.json`), 'utf8'));
    if (canonicalDetail.id !== artist.id) throw new Error(`Detail id mismatch for ${artist.id}`);
    detailsById.set(artist.id, await library.hydrateArtistDetail(canonicalDetail, 'zh'));
  }

  await mkdir(musicRoot, { recursive: true });
  await writeFile(join(musicRoot, 'index.html'), renderMusicIndex(published, detailsById), 'utf8');

  for (const artist of published) {
    const output = join(musicRoot, 'artists', artist.slug, 'index.html');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderArtistPage(artist, detailsById.get(artist.id), published), 'utf8');
  }

  console.log(`Generated Music collection and ${published.length} artist pages from canonical song/album references.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
