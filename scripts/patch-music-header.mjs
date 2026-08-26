import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const ARTIST_REGISTRY = join(ROOT, 'data/music/artists.json');
const COLLECTION_REGISTRY = join(ROOT, 'data/music/collections.json');
const COLLECTION_DETAILS_ROOT = join(ROOT, 'data/music/collections');
const HEADER_STYLE_HREF = '/css/music-header.css?v=20260818-5';
const HEADER_SCRIPT_SRC = '/js/music-header.js?v=20260818-5';

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

function renderIdentity(currentZh = '', currentEn = '') {
  const current = currentZh || currentEn
    ? `\n        <span class="music-header-slash" aria-hidden="true">/</span>\n        <span class="music-header-current">\n          <span class="music-lang-zh">${escapeHtml(currentZh)}</span><span class="music-lang-en">${escapeHtml(currentEn.toUpperCase())}</span>\n        </span>`
    : '';

  return `<div class="music-header-identity">\n      <a class="music-site-brand" href="/" aria-label="返回 7719 Universe">\n        <span>77</span><strong>19</strong>\n      </a>\n      <span class="music-header-divider" aria-hidden="true"></span>\n      <nav class="music-header-crumbs" aria-label="音乐页面层级">\n        <a class="music-header-section" href="/music/">\n          <span class="music-lang-zh">音乐</span><span class="music-lang-en">MUSIC</span>\n        </a>${current}\n      </nav>\n    </div>`;
}

function renderLandingHeader() {
  return `<header class="music-site-header">\n    ${renderIdentity()}\n    <nav class="music-site-nav" aria-label="音乐收藏导航">\n      <a href="#artists"><span class="music-lang-zh">歌手</span><span class="music-lang-en">ARTISTS</span></a>\n      <a href="#collections"><span class="music-lang-zh">专栏</span><span class="music-lang-en">COLLECTIONS</span></a>\n    </nav>\n  </header>`;
}

function renderArtistHeader(artist) {
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');

  return `<header class="music-site-header">\n    ${renderIdentity(nameZh, nameEn)}\n    <nav class="music-site-nav" aria-label="${escapeHtml(nameZh)}收藏导航">\n      <a href="#overview"><span class="music-lang-zh">概览</span><span class="music-lang-en">OVERVIEW</span></a>\n      <a href="#songs"><span class="music-lang-zh">歌曲</span><span class="music-lang-en">SONGS</span></a>\n      <a href="#albums"><span class="music-lang-zh">专辑</span><span class="music-lang-en">ALBUMS</span></a>\n      <a href="#gallery"><span class="music-lang-zh">影像</span><span class="music-lang-en">VISUAL</span></a>\n    </nav>\n  </header>`;
}

function renderAlbumHeader(artist) {
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');
  const artistRoute = artist.route || `/music/artists/${artist.slug}/`;

  return `<header class="music-site-header">\n    ${renderIdentity(nameZh, nameEn)}\n    <nav class="music-site-nav" aria-label="${escapeHtml(nameZh)}专辑导航">\n      <a href="${escapeHtml(artistRoute)}#overview"><span class="music-lang-zh">歌手</span><span class="music-lang-en">ARTIST</span></a>\n      <a href="${escapeHtml(artistRoute)}#albums"><span class="music-lang-zh">专辑</span><span class="music-lang-en">ALBUMS</span></a>\n      <a href="#tracks"><span class="music-lang-zh">曲目</span><span class="music-lang-en">TRACKS</span></a>\n    </nav>\n  </header>`;
}

function renderCollectionHeader(collection) {
  const titleZh = localized(collection.title, 'zh');
  const titleEn = localized(collection.title, 'en');
  return `<header class="music-site-header">\n    ${renderIdentity(titleZh, titleEn)}\n    <nav class="music-site-nav" aria-label="${escapeHtml(titleZh)}专栏导航">\n      <a href="#tracks"><span class="music-lang-zh">歌曲</span><span class="music-lang-en">TRACKS</span></a>\n      <a href="/music/#artists"><span class="music-lang-zh">歌手</span><span class="music-lang-en">ARTISTS</span></a>\n    </nav>\n  </header>`;
}

function replaceHeader(html, replacement, label) {
  const headerPattern = /<header class="music-site-header"[^>]*>[\s\S]*?<\/header>/;
  if (!headerPattern.test(html)) throw new Error(`Music header not found in ${label}`);
  return html.replace(headerPattern, replacement);
}

function installHeaderAssets(html) {
  let output = html
    .replace(/\s*<link rel="stylesheet" href="\/css\/music-header\.css\?v=[^"]+">\s*/g, '\n')
    .replace(/\s*<script src="\/js\/music-header\.js\?v=[^"]+"><\/script>\s*/g, '\n');

  if (!output.includes('</head>')) throw new Error('Cannot install Music header stylesheet: </head> missing.');
  if (!output.includes('</body>')) throw new Error('Cannot install Music header script: </body> missing.');

  output = output.replace('</head>', `  <link rel="stylesheet" href="${HEADER_STYLE_HREF}">\n</head>`);
  output = output.replace('</body>', `  <script src="${HEADER_SCRIPT_SRC}"></script>\n</body>`);
  return output;
}

async function patchFile(file, header, label) {
  const source = await readFile(file, 'utf8');
  const output = installHeaderAssets(replaceHeader(source, header, label));
  await writeFile(file, output, 'utf8');
}

async function patchAlbumHeaders(artist) {
  const albumsRoot = join(MUSIC_ROOT, 'artists', artist.slug, 'albums');
  let entries;
  try {
    entries = await readdir(albumsRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return 0;
    throw error;
  }

  let count = 0;
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const file = join(albumsRoot, entry.name, 'index.html');
    await patchFile(file, renderAlbumHeader(artist), `${artist.route || artist.slug}albums/${entry.name}/`);
    count += 1;
  }
  return count;
}

const collectionOutputPath = (route) => join(ROOT, String(route).replace(/^\/+/, ''), 'index.html');

async function main() {
  const registry = JSON.parse(await readFile(ARTIST_REGISTRY, 'utf8'));
  const artists = registry.filter((artist) => artist.status !== 'draft');
  const collectionDocument = JSON.parse(await readFile(COLLECTION_REGISTRY, 'utf8'));
  const collections = (collectionDocument.collections ?? []).filter((collection) => collection.status !== 'draft');

  await patchFile(
    join(MUSIC_ROOT, 'index.html'),
    renderLandingHeader(),
    'music/index.html'
  );

  let albumPageCount = 0;
  for (const artist of artists) {
    const file = join(MUSIC_ROOT, 'artists', artist.slug, 'index.html');
    await patchFile(file, renderArtistHeader(artist), artist.route || artist.slug);
    albumPageCount += await patchAlbumHeaders(artist);
  }

  for (const collection of collections) {
    const detail = JSON.parse(await readFile(join(COLLECTION_DETAILS_ROOT, `${collection.id}.json`), 'utf8'));
    const file = collectionOutputPath(collection.route);
    await patchFile(file, renderCollectionHeader(detail), collection.route || collection.id);
  }

  console.log(`Patched canonical Music header on landing, ${artists.length} artist page(s), ${albumPageCount} album page(s), and ${collections.length} collection page(s). Listening remains a compatibility redirect outside the public Music IA.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
