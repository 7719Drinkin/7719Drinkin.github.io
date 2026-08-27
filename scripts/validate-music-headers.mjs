import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { albumSlug } from './music/music-album-route.mjs';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const ARTIST_REGISTRY = join(ROOT, 'data/music/artists.json');
const ARTIST_DETAILS_ROOT = join(ROOT, 'data/music/artists');
const COLLECTION_REGISTRY = join(ROOT, 'data/music/collections.json');
const COLLECTION_DETAILS_ROOT = join(ROOT, 'data/music/collections');
const HEADER_STYLE_PATH = join(ROOT, 'css/music-header.css');
const HEADER_STYLE_HREF = '/css/music-header.css?v=20260827-breadcrumb-1';
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

const outputPath = (route) => join(ROOT, String(route).replace(/^\/+/, ''), 'index.html');

function requireIncludes(source, expected, label) {
  if (!source.includes(expected)) throw new Error(`${label} is missing ${expected}`);
}

function extractHeader(html, label) {
  const match = html.match(/<header class="music-site-header"[^>]*>[\s\S]*?<\/header>/);
  if (!match) throw new Error(`${label} is missing the canonical Music header.`);
  return match[0];
}

function count(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

function validateSharedHeaderAssets(html, label) {
  requireIncludes(html, `<link rel="stylesheet" href="${HEADER_STYLE_HREF}">`, `${label} header stylesheet`);
}

function validateBaseSection(header, label) {
  requireIncludes(header, 'class="music-header-section music-header-crumb music-header-crumb--section"', `${label} Music section crumb`);
  requireIncludes(header, '<span class="music-lang-zh">音乐</span><span class="music-lang-en">MUSIC</span>', `${label} Music section label`);
}

async function validateLanding() {
  const file = join(MUSIC_ROOT, 'index.html');
  const html = await readFile(file, 'utf8');
  const header = extractHeader(html, 'Music landing');
  validateSharedHeaderAssets(html, 'Music landing');
  validateBaseSection(header, 'Music landing');
  if (count(header, /class="music-header-slash"/g) !== 0) {
    throw new Error('Music landing must not render breadcrumb separators after 音乐/MUSIC.');
  }
}

async function validateArtist(artist) {
  const file = join(MUSIC_ROOT, 'artists', artist.slug, 'index.html');
  const html = await readFile(file, 'utf8');
  const header = extractHeader(html, `Artist ${artist.slug}`);
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');

  validateSharedHeaderAssets(html, `Artist ${artist.slug}`);
  validateBaseSection(header, `Artist ${artist.slug}`);
  if (count(header, /class="music-header-slash"/g) !== 1) {
    throw new Error(`Artist ${artist.slug} must render exactly one breadcrumb separator.`);
  }
  requireIncludes(header, 'class="music-header-crumb music-header-crumb--current"', `Artist ${artist.slug} current crumb`);
  requireIncludes(header, `<span class="music-lang-zh">${escapeHtml(nameZh)}</span>`, `Artist ${artist.slug} Chinese name`);
  requireIncludes(header, `<span class="music-lang-en">${escapeHtml(nameEn.toUpperCase())}</span>`, `Artist ${artist.slug} English name`);
}

async function validateAlbums(artist) {
  const canonicalDetail = JSON.parse(await readFile(join(ARTIST_DETAILS_ROOT, `${artist.slug}.json`), 'utf8'));
  const albums = await library.getAlbums(canonicalDetail.albums ?? []);
  const albumsRoot = join(MUSIC_ROOT, 'artists', artist.slug, 'albums');
  let actualDirectories = [];

  try {
    actualDirectories = (await readdir(albumsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (error?.code === 'ENOENT' && !albums.length) return 0;
    throw error;
  }

  const expectedSlugs = albums.map((album, index) => albumSlug(album, index));
  const expectedSet = new Set(expectedSlugs);
  const actualSet = new Set(actualDirectories);
  const missing = expectedSlugs.filter((slug) => !actualSet.has(slug));
  const unexpected = actualDirectories.filter((slug) => !expectedSet.has(slug));

  if (missing.length || unexpected.length) {
    throw new Error(`Album header validation route mismatch for ${artist.slug}: missing [${missing.join(', ')}], unexpected [${unexpected.join(', ')}].`);
  }

  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');
  const artistRoute = artist.route || `/music/artists/${artist.slug}/`;

  for (const [index, album] of albums.entries()) {
    const slug = albumSlug(album, index);
    const file = join(albumsRoot, slug, 'index.html');
    const html = await readFile(file, 'utf8');
    const header = extractHeader(html, `Album ${artist.slug}/${slug}`);
    const titleZh = localized(album.title, 'zh');
    const titleEn = localized(album.title, 'en') || titleZh;

    validateSharedHeaderAssets(html, `Album ${artist.slug}/${slug}`);
    validateBaseSection(header, `Album ${artist.slug}/${slug}`);
    if (count(header, /class="music-header-slash"/g) !== 2) {
      throw new Error(`Album ${artist.slug}/${slug} must render exactly two breadcrumb separators.`);
    }
    requireIncludes(header, `class="music-header-crumb music-header-crumb--ancestor" href="${escapeHtml(artistRoute)}"`, `Album ${artist.slug}/${slug} artist ancestor`);
    requireIncludes(header, `<span class="music-lang-zh">${escapeHtml(nameZh)}</span>`, `Album ${artist.slug}/${slug} artist Chinese label`);
    requireIncludes(header, `<span class="music-lang-en">${escapeHtml(nameEn.toUpperCase())}</span>`, `Album ${artist.slug}/${slug} artist English label`);
    requireIncludes(header, 'class="music-header-crumb music-header-crumb--current" aria-current="page"', `Album ${artist.slug}/${slug} current album crumb`);
    requireIncludes(header, `<span class="music-lang-zh">${escapeHtml(titleZh)}</span>`, `Album ${artist.slug}/${slug} album Chinese label`);
    requireIncludes(header, `<span class="music-lang-en">${escapeHtml(String(titleEn).toUpperCase())}</span>`, `Album ${artist.slug}/${slug} album English label`);
  }

  return albums.length;
}

async function validateCollections() {
  const registry = JSON.parse(await readFile(COLLECTION_REGISTRY, 'utf8'));
  const collections = (registry.collections ?? []).filter((collection) => collection.status !== 'draft');

  for (const collection of collections) {
    const detail = JSON.parse(await readFile(join(COLLECTION_DETAILS_ROOT, `${collection.id}.json`), 'utf8'));
    const html = await readFile(outputPath(collection.route), 'utf8');
    const header = extractHeader(html, `Collection ${collection.id}`);
    const titleZh = localized(detail.title, 'zh');
    const titleEn = localized(detail.title, 'en');

    validateSharedHeaderAssets(html, `Collection ${collection.id}`);
    validateBaseSection(header, `Collection ${collection.id}`);
    if (count(header, /class="music-header-slash"/g) !== 1) {
      throw new Error(`Collection ${collection.id} must render exactly one breadcrumb separator.`);
    }
    requireIncludes(header, 'class="music-header-crumb music-header-crumb--current"', `Collection ${collection.id} current crumb`);
    requireIncludes(header, `<span class="music-lang-zh">${escapeHtml(titleZh)}</span>`, `Collection ${collection.id} Chinese title`);
    requireIncludes(header, `<span class="music-lang-en">${escapeHtml(String(titleEn).toUpperCase())}</span>`, `Collection ${collection.id} English title`);
  }

  return collections.length;
}

async function validateTypographyContract() {
  const css = await readFile(HEADER_STYLE_PATH, 'utf8');
  requireIncludes(css, '--music-header-crumb-size: 10px;', 'Desktop breadcrumb size token');
  requireIncludes(css, '--music-header-crumb-size: 9px;', 'Mobile breadcrumb size token');
  requireIncludes(css, 'font-size: var(--music-header-crumb-size);', 'Shared breadcrumb font-size binding');
  if (css.includes('font-size: 11px;')) {
    throw new Error('Music header must not reintroduce the old 11px current-crumb size split.');
  }
}

async function main() {
  const artistRegistry = JSON.parse(await readFile(ARTIST_REGISTRY, 'utf8'));
  const artists = artistRegistry.filter((artist) => artist.status !== 'draft');

  await validateLanding();
  let albumCount = 0;
  for (const artist of artists) {
    await validateArtist(artist);
    albumCount += await validateAlbums(artist);
  }
  const collectionCount = await validateCollections();
  await validateTypographyContract();

  console.log(`Validated canonical Music headers: landing, ${artists.length} artist page(s), ${albumCount} album page(s), ${collectionCount} collection page(s); breadcrumb typography uses one shared size token.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
