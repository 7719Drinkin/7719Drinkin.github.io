import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const DETAILS_ROOT = join(ROOT, 'data', 'music', 'artists');
const REGISTRY_PATH = join(ROOT, 'data', 'music', 'artists.json');
const MUSIC_I18N_VERSION = '20260807-3';

const fallbackAlbumSlug = (album, index) => {
  const ascii = String(album.title || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `album-${String(index + 1).padStart(2, '0')}`;
};

const albumSlug = (album, index) => album.slug || fallbackAlbumSlug(album, index);

function safeJson(data) {
  return JSON.stringify(data)
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function compactArtist(artist) {
  return {
    id: artist.id,
    slug: artist.slug,
    route: artist.route,
    name: artist.name,
    subtitle: artist.subtitle,
    description: artist.description,
    tags: artist.tags ?? []
  };
}

function compactDetail(detail) {
  return {
    headline: detail.headline,
    introduction: detail.introduction,
    personalNote: detail.personalNote,
    selectedSongs: (detail.selectedSongs ?? []).map((song) => ({
      title: song.title,
      album: song.album,
      note: song.note
    })),
    albums: (detail.albums ?? []).map((album) => ({
      slug: album.slug,
      catalogName: album.catalogName,
      title: album.title,
      year: album.year,
      note: album.note
    }))
  };
}

function injectData(html, data) {
  const dataScript = `<script id="music-i18n-page-data" type="application/json">${safeJson(data)}</script>`;
  const runtimeScript = `<script src="/js/music-i18n.js?v=${MUSIC_I18N_VERSION}" data-music-i18n-runtime></script>`;
  const styleLink = `<link rel="stylesheet" href="/css/music-i18n.css?v=${MUSIC_I18N_VERSION}" data-music-i18n-style>`;

  let output = html
    .replace(/\n?\s*<script id="music-i18n-page-data" type="application\/json">[\s\S]*?<\/script>/g, '')
    .replace(/\n?\s*<script src="\/js\/music-i18n\.js[^"]*"[^>]*><\/script>/g, '')
    .replace(/\n?\s*<link rel="stylesheet" href="\/css\/music-i18n\.css[^"]*"[^>]*>/g, '');

  output = output.replace('</head>', `  ${styleLink}\n</head>`);

  const musicRuntime = output.match(/\s*<script src="\/js\/music\.js[^>]*><\/script>/);
  if (musicRuntime) {
    return output.replace(
      musicRuntime[0],
      `\n  ${dataScript}\n  ${runtimeScript}${musicRuntime[0]}`
    );
  }

  return output.replace('</body>', `  ${dataScript}\n  ${runtimeScript}\n</body>`);
}

async function updatePage(path, data) {
  const source = await readFile(path, 'utf8');
  const output = injectData(source, data);
  if (output !== source) await writeFile(path, output, 'utf8');
}

async function main() {
  const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'))
    .filter((artist) => artist.status !== 'draft');

  const collectionArtists = registry.map(compactArtist);
  await updatePage(join(MUSIC_ROOT, 'index.html'), {
    pageType: 'collection',
    artists: collectionArtists
  });

  let artistPages = 0;
  let albumPages = 0;

  for (const artist of registry) {
    const detail = JSON.parse(await readFile(join(DETAILS_ROOT, `${artist.slug}.json`), 'utf8'));
    const artistData = compactArtist(artist);
    const detailData = compactDetail(detail);

    await updatePage(join(MUSIC_ROOT, 'artists', artist.slug, 'index.html'), {
      pageType: 'artist',
      artist: artistData,
      detail: detailData
    });
    artistPages += 1;

    for (const [index, album] of (detail.albums ?? []).entries()) {
      await updatePage(
        join(MUSIC_ROOT, 'artists', artist.slug, 'albums', albumSlug(album, index), 'index.html'),
        {
          pageType: 'album',
          artist: artistData,
          album: {
            slug: album.slug,
            catalogName: album.catalogName,
            title: album.title,
            year: album.year,
            note: album.note
          }
        }
      );
      albumPages += 1;
    }
  }

  console.log(`Embedded Music i18n data into 1 collection page, ${artistPages} artist page(s) and ${albumPages} album page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});