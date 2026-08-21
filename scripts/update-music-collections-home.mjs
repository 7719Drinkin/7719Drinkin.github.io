import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = join(ROOT, 'music/index.html');
const STYLE_HREF = '/css/music-home-collections.css?v=20260821-1';
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

async function renderCollectionCard({ registryEntry, repository, library, index }) {
  const collection = await repository.getCollection(registryEntry.id);
  const songs = await repository.resolveCollectionSongs(collection.id);
  const artworks = [];

  for (const song of songs.slice(0, 3)) {
    const artwork = await library.resolveSongArtwork(song.songId);
    if (artwork) artworks.push(artwork);
  }

  const titleEn = localized(collection.title, 'en') || collection.id;
  const titleZh = localized(collection.title, 'zh') || titleEn;
  const descriptionZh = localized(collection.description, 'zh');
  const descriptionEn = localized(collection.description, 'en') || descriptionZh;
  const typeLabel = collection.type === 'dynamic' ? 'DYNAMIC COLLECTION' : 'EDITORIAL COLLECTION';

  return `<a class="collection-curation-card reveal" href="${escapeHtml(collection.route)}" data-music-collection-card="${escapeHtml(collection.id)}">
    <span class="collection-curation-index">${String(index + 1).padStart(2, '0')}</span>
    <div class="collection-curation-copy">
      <p>${typeLabel}</p>
      <h3>${escapeHtml(titleEn)}</h3>
      <strong>${escapeHtml(titleZh)}</strong>
      <span><span class="music-lang-zh">${escapeHtml(descriptionZh)}</span><span class="music-lang-en">${escapeHtml(descriptionEn)}</span></span>
    </div>
    ${renderArtworkStack(artworks)}
    <div class="collection-curation-meta">
      <span>${String(songs.length).padStart(2, '0')} TRACKS</span>
      <em>${collection.type === 'dynamic' ? 'LIVE' : 'EDIT'}</em>
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
  for (const [index, collection] of collections.entries()) {
    cards.push(await renderCollectionCard({ registryEntry: collection, repository, library, index }));
  }

  return `<section id="collections" class="music-content-section collection-curations">
      <header class="collection-curations-header reveal">
        <div>
          <p>02 / COLLECTIONS</p>
          <h2>专栏</h2>
        </div>
        <span><span class="music-lang-zh">歌曲不单独陈列，而是在专栏里形成自己的次序与语境。</span><span class="music-lang-en">Songs are organized through collections, each with its own order and context.</span></span>
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
