import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = join(ROOT, 'music/index.html');
const STYLE_HREF = '/css/music-home-collections.css?v=20260821-2';
const SECTION_PATTERN = /<section id="(?:listening|collections)" class="music-content-section (?:collection-listening|collection-curations)">[\s\S]*?<\/section>/;

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

const renderLocalized = (value) => {
  const zh = localized(value, 'zh');
  const en = localized(value, 'en') || zh;
  return `<span class="music-lang-zh">${escapeHtml(zh)}</span><span class="music-lang-en">${escapeHtml(en)}</span>`;
};

function installStyle(html) {
  if (html.includes('/css/music-home-collections.css')) {
    return html.replace(/\/css\/music-home-collections\.css\?v=[^"]+/g, STYLE_HREF);
  }
  if (!html.includes('</head>')) throw new Error('Cannot install Music Collections home stylesheet: </head> missing.');
  return html.replace('</head>', `  <link rel="stylesheet" href="${STYLE_HREF}">\n</head>`);
}

function renderArtworkStack(artworks) {
  if (!artworks.length) {
    return '<div class="collection-curation-artworks collection-curation-artworks--empty" aria-hidden="true"><span></span><span></span></div>';
  }

  return `<div class="collection-curation-artworks" aria-hidden="true">${artworks
    .slice(0, 3)
    .map((src, index) => `<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" style="--art-index:${index}">`)
    .join('')}</div>`;
}

async function renderCollectionCard({ registryEntry, repository, library }) {
  const collection = await repository.getCollection(registryEntry.id);
  const songs = await repository.resolveCollectionSongs(collection.id);
  const artworks = [];

  for (const song of songs.slice(0, 3)) {
    const artwork = await library.resolveSongArtwork(song.songId);
    if (artwork) artworks.push(artwork);
  }

  return `<a class="collection-curation-card reveal" href="${escapeHtml(collection.route)}" data-music-collection-card="${escapeHtml(collection.id)}">
    <div class="collection-curation-copy">
      <h3>${renderLocalized(collection.title)}</h3>
    </div>
    ${renderArtworkStack(artworks)}
    <div class="collection-curation-meta">
      <span><span class="music-lang-zh">${songs.length} 首</span><span class="music-lang-en">${String(songs.length).padStart(2, '0')} TRACKS</span></span>
      <b aria-hidden="true">↗</b>
    </div>
  </a>`;
}

export async function buildCollectionsHomeSection({ root = ROOT } = {}) {
  const repository = createMusicCollectionRepository({ root });
  const library = createMusicLibraryRepository({ root });
  const collections = await repository.getVisibleCollections();
  if (!collections.length) throw new Error('Music Collections home requires at least one published collection.');

  const cards = [];
  for (const collection of collections) {
    cards.push(await renderCollectionCard({ registryEntry: collection, repository, library }));
  }

  return `<section id="collections" class="music-content-section collection-curations">
      <header class="collection-curations-header reveal">
        <h2><span class="music-lang-zh">专栏</span><span class="music-lang-en">COLLECTIONS</span></h2>
      </header>
      <div class="collection-curation-list">
        ${cards.join('\n        ')}
      </div>
    </section>`;
}

export async function updateMusicCollectionsHome({ root = ROOT } = {}) {
  const indexPath = join(root, 'music/index.html');
  const source = await readFile(indexPath, 'utf8');
  if (!SECTION_PATTERN.test(source)) {
    throw new Error('Music homepage Listening/Collections section was not found exactly where expected.');
  }

  const section = await buildCollectionsHomeSection({ root });
  const output = installStyle(source.replace(SECTION_PATTERN, section));
  if (output !== source) await writeFile(indexPath, output, 'utf8');
  return { changed: output !== source, section };
}

async function main() {
  const result = await updateMusicCollectionsHome();
  console.log(`Music Collections home ${result.changed ? 'updated' : 'already current'}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { INDEX_PATH, STYLE_HREF, SECTION_PATTERN };
