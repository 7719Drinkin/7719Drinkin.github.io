import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ID_PATTERN = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasLocalizedText = (value) => hasText(value)
  || (value && typeof value === 'object' && (hasText(value.zh) || hasText(value.en)));

const pathExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

function pushDuplicateErrors(items, label, errors) {
  const seen = new Set();
  for (const item of items) {
    const id = String(item?.id ?? '').trim();
    if (!id) {
      errors.push(`${label} entry is missing id.`);
      continue;
    }
    if (!ID_PATTERN.test(id)) errors.push(`${label} id is invalid: ${id}`);
    if (seen.has(id)) errors.push(`${label} id is duplicated: ${id}`);
    seen.add(id);
  }
}

function validateArtistReference(reference, label, errors) {
  if (!reference || typeof reference !== 'object') {
    errors.push(`${label} must be an object.`);
    return;
  }
  const key = String(reference.key ?? '').trim();
  if (!key || !ID_PATTERN.test(key)) errors.push(`${label}.key is invalid.`);
  if (!hasLocalizedText(reference.name)) errors.push(`${label}.name must contain text.`);
  if (reference.role != null && !hasText(reference.role)) errors.push(`${label}.role must be a non-empty string when present.`);
}

async function validateLocalAsset(root, value, label, errors) {
  if (!hasText(value) || !value.startsWith('/')) return;
  const filePath = join(root, value.slice(1));
  if (!(await pathExists(filePath))) errors.push(`${label} does not exist: ${value}`);
}

export async function validateMusicLibrary({ root = ROOT } = {}) {
  const errors = [];

  const registryPath = join(root, 'data/music/artists.json');
  const detailsDir = join(root, 'data/music/artists');
  const songsPath = join(root, 'data/music/songs.json');
  const albumsPath = join(root, 'data/music/albums.json');

  const [artistRegistry, songDocument, albumDocument] = await Promise.all([
    readJson(registryPath),
    readJson(songsPath),
    readJson(albumsPath)
  ]);

  if (!Array.isArray(artistRegistry)) errors.push('data/music/artists.json must contain an array.');
  if (songDocument?.schemaVersion !== 1 || !Array.isArray(songDocument?.songs)) {
    errors.push('data/music/songs.json must use schemaVersion 1 with a songs array.');
  }
  if (albumDocument?.schemaVersion !== 1 || !Array.isArray(albumDocument?.albums)) {
    errors.push('data/music/albums.json must use schemaVersion 1 with an albums array.');
  }

  const artists = Array.isArray(artistRegistry) ? artistRegistry : [];
  const songs = Array.isArray(songDocument?.songs) ? songDocument.songs : [];
  const albums = Array.isArray(albumDocument?.albums) ? albumDocument.albums : [];

  pushDuplicateErrors(artists, 'artist', errors);
  pushDuplicateErrors(songs, 'song', errors);
  pushDuplicateErrors(albums, 'album', errors);

  const songIds = new Set(songs.map((song) => song.id));
  const albumIds = new Set(albums.map((album) => album.id));

  for (const song of songs) {
    if (!hasLocalizedText(song.title)) errors.push(`song ${song.id} must have a title.`);
    if (!Array.isArray(song.artists) || song.artists.length === 0) {
      errors.push(`song ${song.id} must have at least one artist reference.`);
    } else {
      song.artists.forEach((artist, index) => validateArtistReference(artist, `song ${song.id}.artists[${index}]`, errors));
    }
    if (song.albumId != null && !albumIds.has(song.albumId)) {
      errors.push(`song ${song.id} references unknown albumId: ${song.albumId}`);
    }
    await validateLocalAsset(root, song.artwork, `song ${song.id} artwork`, errors);
  }

  for (const album of albums) {
    if (!hasLocalizedText(album.title)) errors.push(`album ${album.id} must have a title.`);
    if (album.artists != null) {
      if (!Array.isArray(album.artists)) {
        errors.push(`album ${album.id}.artists must be an array when present.`);
      } else {
        album.artists.forEach((artist, index) => validateArtistReference(artist, `album ${album.id}.artists[${index}]`, errors));
      }
    }
    if (album.detail?.enabled != null && typeof album.detail.enabled !== 'boolean') {
      errors.push(`album ${album.id}.detail.enabled must be boolean when present.`);
    }
    await validateLocalAsset(root, album.cover, `album ${album.id} cover`, errors);
  }

  let detailFiles = [];
  try {
    detailFiles = (await readdir(detailsDir)).filter((name) => name.endsWith('.json'));
  } catch {
    errors.push('data/music/artists directory is missing.');
  }

  for (const fileName of detailFiles) {
    const detail = await readJson(join(detailsDir, fileName));
    const expectedId = fileName.replace(/\.json$/i, '');
    if (detail?.id !== expectedId) errors.push(`${fileName} detail id must equal ${expectedId}.`);

    const inspectReferences = (items, kind) => {
      if (!Array.isArray(items)) {
        errors.push(`${fileName}.${kind} must be an array.`);
        return;
      }
      const seen = new Set();
      for (const item of items) {
        if (typeof item !== 'string') {
          errors.push(`${fileName}.${kind} must contain canonical id references only.`);
          continue;
        }
        if (seen.has(item)) errors.push(`${fileName}.${kind} contains duplicate id: ${item}`);
        seen.add(item);
        const targetSet = kind === 'selectedSongs' ? songIds : albumIds;
        if (!targetSet.has(item)) errors.push(`${fileName}.${kind} references unknown id: ${item}`);
      }
    };

    inspectReferences(detail?.selectedSongs ?? [], 'selectedSongs');
    inspectReferences(detail?.albums ?? [], 'albums');
  }

  return {
    errors,
    warnings: [],
    stats: {
      artists: artists.length,
      songs: songs.length,
      albums: albums.length,
      artistDetails: detailFiles.length
    }
  };
}

async function main() {
  const result = await validateMusicLibrary();

  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
    return;
  }

  const { stats } = result;
  console.log(
    `Music library valid: ${stats.artists} artist profile(s), ${stats.songs} canonical song(s), `
    + `${stats.albums} canonical album(s), ${stats.artistDetails} artist detail file(s).`
  );
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
