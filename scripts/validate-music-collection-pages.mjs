import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const routePath = (route) => join(String(route).replace(/^\/+/, ''), 'index.html');

async function main() {
  const repository = createMusicCollectionRepository({ root: ROOT });
  const collections = await repository.getVisibleCollections();
  assert(collections.length === 1, `Current Music scope expects exactly one published collection; got ${collections.length}.`);
  assert(collections[0].id === 'recently-curated', `Published collection must be recently-curated; got ${collections[0].id}.`);

  const [home, listening] = await Promise.all([
    read('music/index.html'),
    read('music/listening/index.html')
  ]);

  assert(home.includes('id="collections"'), 'Music home must expose the Collections section.');
  assert(!home.includes('id="listening"'), 'Music home must not expose the old Listening section.');
  assert(home.includes('href="#collections"'), 'Music home header must link to #collections.');
  assert(home.includes('>COLLECTIONS<'), 'Music home header must identify COLLECTIONS.');
  assert(home.includes('data-music-collection-card="recently-curated"'), 'Music home must render the Recently Curated collection entry.');
  assert(home.includes('href="/music/collections/recently-curated/"'), 'Music home collection entry must link to Recently Curated.');
  assert(!home.includes('VIEW ALL SONGS'), 'Music home must not retain the all-songs Listening CTA.');
  assert(!home.includes('href="/music/listening/"'), 'Music home must not expose the retired Listening archive route.');

  assert(listening.includes('data-listening-compat="collections"'), 'Legacy /music/listening/ must be a Collections compatibility route.');
  assert(listening.includes('href="/music/collections/recently-curated/"'), 'Listening compatibility route must link to Recently Curated.');
  assert(listening.includes('window.location.replace("/music/collections/recently-curated/")'), 'Listening compatibility route must redirect to Recently Curated.');
  assert(!listening.includes('data-listening-song='), 'Listening compatibility route must not render the retired all-songs archive.');
  assert(!listening.includes('music-listening-page'), 'Listening compatibility route must not retain the old Listening page shell.');

  for (const collectionEntry of collections) {
    const collection = await repository.getCollection(collectionEntry.id);
    const resolvedSongs = await repository.resolveCollectionSongs(collection.id);
    const page = await read(routePath(collection.route));
    assert(page.includes('class="music-page music-collection-detail-page"'), `Collection ${collection.id} must use the collection detail shell.`);
    assert(page.includes(`data-music-collection="${collection.id}"`), `Collection ${collection.id} must expose its identity on body.`);
    assert(page.includes('music-header-current'), `Collection ${collection.id} must expose the canonical Music breadcrumb.`);
    assert(page.includes('>RECENTLY CURATED<'), `Collection ${collection.id} header must identify RECENTLY CURATED.`);
    assert(page.includes('href="/music/#collections"'), `Collection ${collection.id} must return to the Music Collections section.`);

    const renderedIds = [...page.matchAll(/data-collection-song="([^"]+)"/g)].map((match) => match[1]);
    assert(renderedIds.length === resolvedSongs.length, `Collection ${collection.id} rendered ${renderedIds.length} songs; expected ${resolvedSongs.length}.`);
    assert(new Set(renderedIds).size === renderedIds.length, `Collection ${collection.id} must not render duplicate song rows.`);
    assert(
      JSON.stringify(renderedIds) === JSON.stringify(resolvedSongs.map((song) => song.songId)),
      `Collection ${collection.id} rendered song order differs from its resolver.`
    );
    assert(!page.includes('/music/artists/undefined/'), `Collection ${collection.id} must never invent an undefined artist route.`);
    assert(!page.includes('/music/artists/null/'), `Collection ${collection.id} must never invent a null artist route.`);
  }

  let directoryIndexExists = true;
  try {
    await access(join(ROOT, 'music/collections/index.html'));
  } catch {
    directoryIndexExists = false;
  }
  assert(!directoryIndexExists, 'Do not create a /music/collections/ directory page while only one collection exists.');

  console.log(`Validated Music Collection pages: ${collections.map((collection) => collection.id).join(', ')}; legacy Listening route redirects to Collections.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
