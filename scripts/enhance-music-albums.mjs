import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const DETAILS_ROOT = join(ROOT, 'data/music/artists');
const REGISTRY_PATH = join(ROOT, 'data/music/artists.json');

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

const fallbackAlbumSlug = (album, index) => {
  const ascii = String(album.title || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `album-${String(index + 1).padStart(2, '0')}`;
};

const albumSlug = (album, index) => album.slug || fallbackAlbumSlug(album, index);
const albumCatalogName = (album) => album.catalogName || album.title;

function renderPlayer(artist) {
  const nameEn = localized(artist.name, 'en');
  return `<aside class="site-music-player is-collapsed" data-music-player hidden aria-label="网站音乐播放器">
    <audio data-player-audio preload="none"></audio>
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

function renderFeaturedSongs(songs = []) {
  if (!songs.length) {
    return `<div class="music-empty"><span>CURATOR PICKS</span><p>这里仅保留网页创建者主动挑选的少量歌曲。</p></div>`;
  }

  return songs.map((song, index) => `<article class="song-row song-row--featured-pending"
      data-featured-title="${escapeHtml(song.title)}"
      data-featured-album="${escapeHtml(song.album ?? '')}"
      data-featured-note="${escapeHtml(song.note ?? '')}">
    <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
    <div class="song-primary">
      <h3>${escapeHtml(song.title)}</h3>
      <p>${escapeHtml(song.album || 'CURATOR PICK')}</p>
    </div>
    <small>${escapeHtml(song.note ?? '')}</small>
    <b>SYNC</b>
  </article>`).join('');
}

function renderAlbumCards(artist, albums = []) {
  if (!albums.length) {
    return `<div class="music-empty music-empty--line"><span>ALBUM ARCHIVE / RESERVED</span><p>专辑封面与详情页将在素材准备完成后加入。</p></div>`;
  }

  return albums.map((album, index) => {
    const slug = albumSlug(album, index);
    const route = `${artist.route}albums/${slug}/`;
    return `<a class="album-card" href="${escapeHtml(route)}" data-album-name="${escapeHtml(albumCatalogName(album))}">
      ${album.cover
        ? `<img src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} album cover" loading="lazy" decoding="async">`
        : '<div class="album-placeholder" aria-hidden="true"><i></i></div>'}
      <div class="album-card-copy">
        <div class="album-card-meta">
          <span>${escapeHtml(album.year ?? 'ALBUM ARCHIVE')}</span>
          <span class="album-card-track-count" data-album-track-count>VIEW ALBUM</span>
        </div>
        <h3>${escapeHtml(album.title)}</h3>
        <p>${escapeHtml(album.note ?? '进入专辑查看收录歌曲。')}</p>
      </div>
    </a>`;
  }).join('');
}

function enhanceArtistPage(html, artist, detail) {
  const nameZh = localized(artist.name, 'zh');
  const featured = renderFeaturedSongs(detail.selectedSongs ?? []);
  const albums = renderAlbumCards(artist, detail.albums ?? []);

  html = html.replace(
    /<body class="music-page music-artist-page"/,
    `<body class="music-page music-artist-page" data-music-catalog-page="artist" data-artist-slug="${escapeHtml(artist.slug)}"`
  );

  html = html.replace(
    /(<link rel="stylesheet" href="\/css\/music-player\.css[^>]*>)/,
    `$1\n  <link rel="stylesheet" href="/css/music-album.css?v=20260806-1">\n  <link rel="stylesheet" href="/css/music-player-compact.css?v=20260806-1">`
  );

  html = html.replaceAll('>SONGS<', '>FEATURED<');

  html = html.replace(
    /      <div id="songs" class="artist-song-column">[\s\S]*?      <aside class="artist-note reveal">/,
    `      <div id="songs" class="artist-song-column">
        <div class="music-section-header reveal">
          <div><p>01 / CURATOR PICKS</p><h2>反复聆听</h2></div>
          <span>这里只放网页创建者主动挑选的少量歌曲；完整曲目请从专辑封面进入。</span>
        </div>
        <div class="song-list reveal">${featured}</div>
      </div>
      <aside class="artist-note reveal">`
  );

  html = html.replace(
    /    <section id="albums" class="music-content-section">[\s\S]*?    <section id="gallery" class="music-content-section">/,
    `    <section id="albums" class="music-content-section">
      <div class="music-section-header reveal">
        <div><p>02 / ALBUM LIBRARY</p><h2>专辑收藏</h2></div>
        <span>每张封面对应一个独立专辑页；进入后查看该专辑在 R2 中实际收录的歌曲。</span>
      </div>
      <div class="album-grid">${albums}</div>
    </section>

    <section id="gallery" class="music-content-section">`
  );

  html = html.replace(/\n\s*<script src="\/js\/music-player\.js[^>]*><\/script>/g, '');
  html = html.replace(/\/js\/music\.js\?v=[^"]+/, '/js/music.js?v=20260806-albums-1');
  html = html.replace(
    `aria-label="${escapeHtml(nameZh)}收藏分区"`,
    `aria-label="${escapeHtml(nameZh)}收藏分区"`
  );

  return html;
}

function renderAlbumPage(artist, album, index) {
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');
  const slug = albumSlug(album, index);
  const catalogName = albumCatalogName(album);
  const year = album.year ?? 'ALBUM ARCHIVE';
  const cover = album.cover
    ? `<img class="album-detail-cover" src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} album cover" fetchpriority="high">`
    : `<div class="album-detail-cover album-placeholder" aria-hidden="true"><i></i></div>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(nameZh)}《${escapeHtml(album.title)}》专辑收藏与曲目。">
  <title>${escapeHtml(album.title)} · ${escapeHtml(nameZh)} · 7719 Music</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/music.css?v=20260805-2">
  <link rel="stylesheet" href="/css/music-player.css?v=20260805-4">
  <link rel="stylesheet" href="/css/music-album.css?v=20260806-1">
  <link rel="stylesheet" href="/css/music-player-compact.css?v=20260806-1">
</head>
<body class="music-page music-artist-page music-album-page"
  data-music-catalog-page="album"
  data-artist-slug="${escapeHtml(artist.slug)}"
  data-album-name="${escapeHtml(catalogName)}"
  style="--artist-accent:${escapeHtml(artist.theme.accent)};--artist-accent-soft:${escapeHtml(artist.theme.accentSoft)};--artist-bg:${escapeHtml(artist.theme.background)};--artist-fg:${escapeHtml(artist.theme.foreground)}">
  <header class="music-site-header">
    <a class="music-site-brand" href="/" aria-label="返回 7719 Universe"><span>77</span><strong>19</strong></a>
    <div class="music-header-middle"><a href="${escapeHtml(artist.route)}" class="music-header-context">MUSIC / ${escapeHtml(nameEn.toUpperCase())} / ALBUM</a></div>
    <nav class="music-site-nav" aria-label="专辑导航"><a href="${escapeHtml(artist.route)}">ARTIST</a><a class="is-current" href="#tracks">TRACKS</a><a href="/music/">COLLECTIONS</a></nav>
  </header>

  <main>
    <section class="album-detail-hero">
      <div class="album-detail-cover-wrap reveal">${cover}</div>
      <div class="album-detail-copy reveal">
        <a class="album-detail-back" href="${escapeHtml(artist.route)}#albums">← 返回 ${escapeHtml(nameZh)}专辑收藏</a>
        <p class="music-eyebrow">ALBUM / ${String(index + 1).padStart(2, '0')}</p>
        <h1>${escapeHtml(album.title)}</h1>
        <p class="album-detail-artist">${escapeHtml(nameZh)} · ${escapeHtml(nameEn)}</p>
        <p class="album-detail-note">${escapeHtml(album.note ?? '从专辑封面进入完整曲目；歌曲目录来自 R2 缓存索引。')}</p>
        <div class="album-detail-meta">
          <span>${escapeHtml(year)}</span>
          <span data-album-track-count>READING CATALOG</span>
          <span>R2 / CACHED INDEX</span>
        </div>
      </div>
    </section>

    <section id="tracks" class="music-content-section album-track-section">
      <div class="music-section-header reveal">
        <div><p>01 / TRACK LIST</p><h2>专辑曲目</h2></div>
        <span>目录从 Worker/KV 缓存读取；只有点击歌曲时才访问实际音频对象。</span>
      </div>
      <div class="song-list album-song-list reveal">
        <div class="music-empty"><span>LOADING CATALOG</span><p>正在匹配《${escapeHtml(album.title)}》的歌曲。</p></div>
      </div>
      <div class="album-catalog-footer"><span>${escapeHtml(catalogName)}</span><span data-catalog-source>WAITING FOR CATALOG</span></div>
    </section>
  </main>

  ${renderPlayer(artist)}
  <footer class="music-site-footer"><a href="${escapeHtml(artist.route)}#albums">← ${escapeHtml(nameEn.toUpperCase())} ALBUMS</a><span>${escapeHtml(album.title)} / 7719</span></footer>
  <script src="/js/music.js?v=20260806-albums-1"></script>
</body>
</html>`;
}

async function main() {
  const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
  let albumPageCount = 0;

  for (const artist of registry.filter((entry) => entry.status !== 'draft')) {
    const detail = JSON.parse(await readFile(join(DETAILS_ROOT, `${artist.slug}.json`), 'utf8'));
    const artistPagePath = join(MUSIC_ROOT, 'artists', artist.slug, 'index.html');
    let artistHtml = await readFile(artistPagePath, 'utf8');
    artistHtml = enhanceArtistPage(artistHtml, artist, detail);
    await writeFile(artistPagePath, artistHtml, 'utf8');

    for (const [index, album] of (detail.albums ?? []).entries()) {
      const output = join(MUSIC_ROOT, 'artists', artist.slug, 'albums', albumSlug(album, index), 'index.html');
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, renderAlbumPage(artist, album, index), 'utf8');
      albumPageCount += 1;
    }
  }

  console.log(`Enhanced Music artist pages and generated ${albumPageCount} album pages.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
