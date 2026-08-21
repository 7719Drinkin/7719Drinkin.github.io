import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { validateDynamicCollectionSource } from './music/dynamic-collection-resolver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'data/music/collections.json');
const DETAIL_ROOT = join(ROOT, 'data/music/collections');
const SONGS_PATH = join(ROOT, 'data/music/songs.json');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function main() {
  const [registryDocument, songDocument, detailFiles] = await Promise.all([
    readJson(REGISTRY_PATH),
    readJson(SONGS_PATH),
    readdir(DETAIL_ROOT)
  ]);

  assert(registryDocument?.schemaVersion === 1, 'Music collections must use schemaVersion 1.');
  assert(Array.isArray(registryDocument.collections), 'Music collections registry must contain a collections array.');
  assert(songDocument?.schemaVersion === 1 && Array.isArray(songDocument.songs), 'Music songs must use schemaVersion 1.');

  const ids = new Set();
  const routes = new Set();
  const registeredDetailFiles = new Set();
  const songIds = new Set(songDocument.songs.map((song) => song.id));
  const repository = createMusicCollectionRepository({ root: ROOT });

  for (const entry of registryDocument.collections) {
    const id = String(entry?.id ?? '').trim();
    const route = String(entry?.route ?? '').trim();
    assert(id, 'Music collection registry entry must define id.');
    assert(!ids.has(id), `Duplicate Music collection id: ${id}`);
    ids.add(id);
    assert(route.startsWith('/music/collections/'), `Music collection ${id} has invalid route: ${route}`);
    assert(!routes.has(route), `Duplicate Music collection route: ${route}`);
    routes.add(route);
    assert(['dynamic', 'editorial'].includes(entry.type), `Music collection ${id} has unsupported type: ${entry.type}`);
    assert(['published', 'draft'].includes(entry.status), `Music collection ${id} has unsupported status: ${entry.status}`);
    assert(Number.isFinite(Number(entry.order)), `Music collection ${id} must define numeric order.`);

    const detailFile = `${id}.json`;
    registeredDetailFiles.add(detailFile);
    assert(detailFiles.includes(detailFile), `Music collection ${id} is missing detail file ${detailFile}.`);

    const detail = await readJson(join(DETAIL_ROOT, detailFile));
    assert(detail?.id === id, `Music collection ${id} detail id must match registry id.`);
    assert(detail?.title?.zh || detail?.title?.en, `Music collection ${id} must define a title.`);

    if (entry.type === 'dynamic') {
      validateDynamicCollectionSource(detail.source);
    } else {
      assert(Array.isArray(detail.songs), `Editorial collection ${id} must define a songs array.`);
      const seenSongs = new Set();
      for (const songId of detail.songs) {
        assert(typeof songId === 'string' && songId.trim(), `Editorial collection ${id} contains an invalid song id.`);
        assert(songIds.has(songId), `Editorial collection ${id} references unknown song id: ${songId}`);
        assert(!seenSongs.has(songId), `Editorial collection ${id} contains duplicate song id: ${songId}`);
        seenSongs.add(songId);
      }
    }

    if (entry.status !== 'draft') {
      const resolved = await repository.resolveCollectionSongs(id);
      const resolvedIds = resolved.map((song) => song.songId);
      assert(new Set(resolvedIds).size === resolvedIds.length, `Music collection ${id} resolved duplicate songs.`);
      for (const songId of resolvedIds) {
        assert(songIds.has(songId), `Music collection ${id} resolved unknown song id: ${songId}`);
      }
    }
  }

  for (const file of detailFiles.filter((file) => file.endsWith('.json'))) {
    assert(registeredDetailFiles.has(file), `Unregistered Music collection detail file: ${file}`);
  }

  const visible = await repository.getVisibleCollections();
  const publishedCount = registryDocument.collections.filter((entry) => entry.status !== 'draft').length;
  assert(visible.length === publishedCount, `Visible Music collections mismatch: expected ${publishedCount}, got ${visible.length}.`);

  console.log(`Validated Music Collections: ${registryDocument.collections.length} collection(s), ${publishedCount} published.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
