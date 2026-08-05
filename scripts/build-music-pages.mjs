import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(ROOT, 'data/music/artists.json');
const detailsDir = join(ROOT, 'data/music/artists');
const musicRoot = join(ROOT, 'music');

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

function renderVisual(artist, className, label) {
  if (artist.cover) {
    return `<img class="${className}" src="${escapeHtml(artist.cover)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async">`;
  }
  const initials = localized(artist.name, 'en')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return `<div class="${className} music-placeholder-visual" aria-hidden="true"><span>${escapeHtml(initials)}</span><i></i><b></b></div>`;
}

function renderMusicIndex(artists) {
  const cards = artists.map((artist, index) => {
    const nameZh = localized(artist.name, 'zh');
    const nameEn = localized(artist.name, 'en');
    const tags = (artist.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    return `
        <a class="artist-card reveal" href="${escapeHtml(artist.route)}" style="--artist-accent:${escapeHtml(artist.theme.accent)};--artist-bg:${escapeHtml(artist.theme.background)}">
          <div class="artist-card-media">
            ${renderVisual(artist, 'artist-card-cover', `${nameZh} artist cover`)}
            <span class="artist-card-number">${String(index + 1).padStart(2, '0')}</span>
          </div>
          <div class="artist-card-copy">
            <div class="artist-card-status"><span>${artist.status === 'published' ? 'OPEN ARCHIVE' : 'IN DEVELOPMENT'}</span><strong>↗</strong></div>
            <p>${escapeHtml(nameEn)}</p>
            <h2>${escapeHtml(nameZh)}</h2>
            <div class="artist-card-tags">${tags}</div>
            <p class="artist-card-description">${escapeHtml(localized(artist.description, 'zh'))}</p>
          </div>
        </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="7719 Universe 音乐档案：按歌手整理歌曲、专辑、图片与个人聆听记录。">
  <title>Music Archive · 7719 Universe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/universe.css?v=20260730-5">
  <link rel="stylesheet" href="/css/music.css?v=20260805-1">
</head>
<body class="theme-music music-catalog-page">
  <div class="universe-noise" aria-hidden="true"></div>
  <header class="universe-header music-header">
    <a class="universe-brand" href="/" aria-label="返回 7719 Universe">7719</a>
    <nav class="universe-nav" aria-label="音乐页面导航">
      <a href="/">UNIVERSE</a>
      <a href="#artists">ARTISTS</a>
      <a href="#roadmap">ROADMAP</a>
    </nav>
  </header>

  <main>
    <section class="music-hero">
      <div class="music-hero-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="music-hero-copy reveal">
        <p class="music-kicker">03 / PERSONAL SOUND ARCHIVE</p>
        <h1><span>MUSIC</span><strong>档案馆</strong></h1>
        <p class="music-lead">这里不追求完整的音乐百科，而是按歌手整理我反复聆听的歌曲、专辑、影像和私人记忆。</p>
        <a class="music-primary-link" href="#artists">浏览歌手主页 <span>↓</span></a>
      </div>
      <aside class="music-hero-readout">
        <div><span>ARTISTS</span><strong>${String(artists.length).padStart(2, '0')}</strong></div>
        <div><span>MODEL</span><strong>EXPANDABLE</strong></div>
        <div><span>STATUS</span><strong>BUILDING</strong></div>
      </aside>
    </section>

    <section id="artists" class="music-section">
      <div class="music-section-heading reveal">
        <div><p>01 / ARTIST DIRECTORY</p><h2>歌手<br>主页.</h2></div>
        <span>每位歌手拥有独立路由、数据文件和素材目录，共享同一套可扩展页面系统。</span>
      </div>
      <div class="artist-grid">
        ${cards}
        <article class="artist-card artist-card--future reveal">
          <div class="artist-card-media music-placeholder-visual" aria-hidden="true"><span>+</span><i></i><b></b></div>
          <div class="artist-card-copy">
            <div class="artist-card-status"><span>EXPANDING</span><strong>∞</strong></div>
            <p>NEXT ARTIST</p>
            <h2>更多歌手</h2>
            <p class="artist-card-description">后续新增歌手只需要注册数据和素材，不需要复制整套页面代码。</p>
          </div>
        </article>
      </div>
    </section>

    <section id="roadmap" class="music-section music-roadmap">
      <div class="music-section-heading reveal">
        <div><p>02 / SYSTEM ROADMAP</p><h2>持续<br>扩展.</h2></div>
        <span>当前先建立歌手主页系统，之后逐步开放专辑、歌单、现场与主题收藏。</span>
      </div>
      <div class="roadmap-grid">
        <article class="roadmap-item reveal"><span>NOW</span><h3>ARTISTS</h3><p>张雨生、谭咏麟及后续新增的独立歌手主页。</p></article>
        <article class="roadmap-item reveal"><span>NEXT</span><h3>ALBUMS</h3><p>专辑封面、年份、曲目选择和个人短评。</p></article>
        <article class="roadmap-item reveal"><span>LATER</span><h3>PLAYLISTS</h3><p>跨歌手的主题歌单与不同人生阶段的声音记录。</p></article>
      </div>
    </section>
  </main>

  <footer class="universe-footer">
    <span>7719 / MUSIC ARCHIVE</span>
    <a href="/">BACK TO UNIVERSE →</a>
  </footer>
  <script src="/js/music.js?v=20260805-1"></script>
</body>
</html>
`;
}

function renderSongs(songs = []) {
  if (!songs.length) {
    return `<div class="artist-empty"><span>SELECTED SONGS</span><p>精选歌曲将在后续整理后加入。</p></div>`;
  }
  return songs.map((song, index) => {
    const meta = [song.album, song.year].filter(Boolean).join(' · ') || 'COLLECTION NOTE';
    const content = `
      <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(song.title)}</h3><p>${escapeHtml(meta)}</p></div>
      <small>${escapeHtml(song.note ?? '')}</small>`;
    return song.url
      ? `<a class="song-row" href="${escapeHtml(song.url)}" target="_blank" rel="noreferrer">${content}<b>↗</b></a>`
      : `<article class="song-row">${content}<b>—</b></article>`;
  }).join('');
}

function renderAlbums(albums = []) {
  if (!albums.length) {
    return `<div class="artist-empty artist-empty--large"><span>ALBUM ARCHIVE / RESERVED</span><p>专辑封面和个人选曲将在素材准备完成后自动进入这里。</p></div>`;
  }
  return albums.map((album) => `
    <article class="album-card">
      ${album.cover ? `<img src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} album cover" loading="lazy">` : '<div class="album-placeholder" aria-hidden="true"></div>'}
      <div><span>${escapeHtml(album.year ?? 'YEAR TBD')}</span><h3>${escapeHtml(album.title)}</h3><p>${escapeHtml(album.note ?? '')}</p></div>
    </article>`).join('');
}

function renderGallery(gallery = []) {
  if (!gallery.length) {
    return `<div class="artist-empty artist-empty--gallery"><span>VISUAL ARCHIVE / RESERVED</span><p>照片、GIF 和演出影像将从对应的 Asset 目录读取。</p></div>`;
  }
  return gallery.map((item, index) => `
    <figure class="artist-gallery-item">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt ?? `Artist archive image ${index + 1}`)}" loading="lazy" decoding="async">
      ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
    </figure>`).join('');
}

function renderRelated(current, artists) {
  return artists
    .filter((artist) => artist.id !== current.id)
    .slice(0, 3)
    .map((artist) => `
      <a class="related-artist" href="${escapeHtml(artist.route)}">
        <span>${escapeHtml(localized(artist.name, 'en'))}</span>
        <strong>${escapeHtml(localized(artist.name, 'zh'))}</strong>
        <b>↗</b>
      </a>`).join('');
}

function renderArtistPage(artist, detail, artists) {
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');
  const theme = artist.theme;
  const heroImage = detail.heroImage ?? artist.cover;
  const hero = heroImage
    ? `<img class="artist-hero-image" src="${escapeHtml(heroImage)}" alt="${escapeHtml(nameZh)} artist portrait" fetchpriority="high">`
    : `<div class="artist-hero-placeholder music-placeholder-visual" aria-hidden="true"><span>${escapeHtml(nameEn.split(/\s+/).map((part) => part[0]).join('').slice(0, 3))}</span><i></i><b></b></div>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(localized(artist.description, 'zh'))}">
  <title>${escapeHtml(nameZh)} · Music · 7719 Universe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/universe.css?v=20260730-5">
  <link rel="stylesheet" href="/css/music.css?v=20260805-1">
</head>
<body class="theme-music music-artist-page" style="--artist-accent:${escapeHtml(theme.accent)};--artist-accent-soft:${escapeHtml(theme.accentSoft)};--artist-bg:${escapeHtml(theme.background)};--artist-fg:${escapeHtml(theme.foreground)}">
  <div class="universe-noise" aria-hidden="true"></div>
  <header class="universe-header music-header">
    <a class="universe-brand" href="/" aria-label="返回 7719 Universe">7719</a>
    <nav class="universe-nav" aria-label="${escapeHtml(nameZh)}页面导航">
      <a href="/music/">MUSIC</a>
      <a href="#songs">SONGS</a>
      <a href="#albums">ALBUMS</a>
      <a href="#gallery">GALLERY</a>
    </nav>
  </header>

  <main>
    <section class="artist-hero">
      <div class="artist-hero-media">${hero}</div>
      <div class="artist-hero-shade"></div>
      <div class="artist-hero-copy reveal">
        <p>${escapeHtml(detail.eyebrow)}</p>
        <span>${escapeHtml(nameEn)}</span>
        <h1>${escapeHtml(nameZh)}</h1>
        <h2>${escapeHtml(localized(detail.headline, 'zh'))}</h2>
        <a href="#story">进入声音档案 <b>↓</b></a>
      </div>
      <div class="artist-hero-order" aria-hidden="true">${String(artist.order).padStart(2, '0')}</div>
    </section>

    <section id="story" class="music-section artist-story">
      <div class="artist-story-heading reveal"><p>01 / PERSONAL ARCHIVE</p><h2>${escapeHtml(localized(detail.headline, 'en'))}</h2></div>
      <div class="artist-story-copy reveal">
        <p>${escapeHtml(localized(detail.introduction, 'zh'))}</p>
        <blockquote>${escapeHtml(localized(detail.personalNote, 'zh'))}</blockquote>
        <div class="artist-tags">${(artist.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
    </section>

    <section id="songs" class="music-section artist-section">
      <div class="music-section-heading reveal">
        <div><p>02 / SELECTED SONGS</p><h2>反复<br>聆听.</h2></div>
        <span>这里记录个人选择与聆听印象，不提供站内音频托管。</span>
      </div>
      <div class="song-list reveal">${renderSongs(detail.selectedSongs)}</div>
    </section>

    <section id="albums" class="music-section artist-section">
      <div class="music-section-heading reveal">
        <div><p>03 / ALBUM ARCHIVE</p><h2>专辑<br>收藏.</h2></div>
        <span>数据结构已经就位，加入封面与说明后会自动生成专辑卡片。</span>
      </div>
      <div class="album-grid">${renderAlbums(detail.albums)}</div>
    </section>

    <section id="gallery" class="music-section artist-section">
      <div class="music-section-heading reveal">
        <div><p>04 / VISUAL ARCHIVE</p><h2>影像<br>记录.</h2></div>
        <span>素材目录：/assets/Music/Artists/${escapeHtml(artist.assetKey)}/</span>
      </div>
      <div class="artist-gallery">${renderGallery(detail.gallery)}</div>
    </section>

    <section class="music-section artist-related">
      <div class="music-section-heading reveal">
        <div><p>05 / CONTINUE LISTENING</p><h2>其他<br>歌手.</h2></div>
        <span>回到音乐目录，继续进入其他独立歌手主页。</span>
      </div>
      <div class="related-grid">${renderRelated(artist, artists)}</div>
    </section>
  </main>

  <footer class="universe-footer">
    <a href="/music/">← MUSIC DIRECTORY</a>
    <span>${escapeHtml(nameEn.toUpperCase())} / 7719</span>
  </footer>
  <script src="/js/music.js?v=20260805-1"></script>
</body>
</html>
`;
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

  await mkdir(musicRoot, { recursive: true });
  await writeFile(join(musicRoot, 'index.html'), renderMusicIndex(published), 'utf8');

  for (const artist of published) {
    const detailPath = join(detailsDir, `${artist.slug}.json`);
    const detail = JSON.parse(await readFile(detailPath, 'utf8'));
    if (detail.id !== artist.id) {
      throw new Error(`Detail id mismatch for ${artist.id}`);
    }

    const output = join(musicRoot, 'artists', artist.slug, 'index.html');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderArtistPage(artist, detail, published), 'utf8');
  }

  console.log(`Generated Music directory and ${published.length} artist pages.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
