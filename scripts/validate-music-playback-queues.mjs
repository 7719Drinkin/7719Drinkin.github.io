import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MUSIC_PLAYER_SCRIPT_SRC,
  MUSIC_PLAYER_STYLE_HREF
} from './music-runtime-config.mjs';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { createRuntimeTrackResolver } from './music/runtime-playability-resolver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const count = (source, pattern) => [...source.matchAll(pattern)].length;
const routePath = (route) => join(String(route).replace(/^\/+/, ''), 'index.html');

const collections = createMusicCollectionRepository({ root: ROOT });
const resolveRuntimeTrack = createRuntimeTrackResolver({ root: ROOT });
const visibleCollections = await collections.getVisibleCollections();

for (const entry of visibleCollections) {
  const collection = await collections.getCollection(entry.id);
  const songs = await collections.resolveCollectionSongs(collection.id);
  const page = await read(routePath(collection.route));
  const runtimeMatches = await Promise.all(songs.map((song) => resolveRuntimeTrack({
    artistKey: song.artistKey,
    title: song.title,
    album: song.album
  })));
  const expectedPlayable = runtimeMatches.filter(Boolean).length;
  const renderedPlayable = count(page, /\bdata-player-track\b/g);

  assert(count(page, /\bdata-playback-queue\b/g) === 1,
    `Collection ${collection.id} must render exactly one playback queue.`);
  assert(page.includes(`data-queue-id="collection:${collection.id}"`),
    `Collection ${collection.id} must expose its stable queue id.`);
  assert(page.includes('data-queue-kind="collection"'),
    `Collection ${collection.id} must expose collection queue semantics.`);
  assert(renderedPlayable === expectedPlayable,
    `Collection ${collection.id} rendered ${renderedPlayable} playable tracks; expected ${expectedPlayable}.`);
  assert(count(page, /\bdata-music-player\b/g) === 1,
    `Collection ${collection.id} must mount exactly one local fallback player.`);
  assert(count(page, /\bdata-player-audio\b/g) === 1,
    `Collection ${collection.id} must mount exactly one local audio element.`);
  assert(page.includes(MUSIC_PLAYER_STYLE_HREF),
    `Collection ${collection.id} must load the shared player stylesheet.`);
  assert(page.includes(MUSIC_PLAYER_SCRIPT_SRC),
    `Collection ${collection.id} must load the shared player runtime.`);
  assert(!page.includes('song-row--playable'),
    `Collection ${collection.id} must not impersonate the legacy Artist song-row UI.`);

  const triggerTags = [...page.matchAll(/<button class="collection-track-play"[\s\S]*?<\/button>/g)]
    .map((match) => match[0]);
  assert(triggerTags.length === expectedPlayable,
    `Collection ${collection.id} play-trigger count must match its runtime-resolved queue.`);
  triggerTags.forEach((tag, index) => {
    assert(tag.includes('data-player-track'), `Collection ${collection.id} trigger ${index + 1} is missing data-player-track.`);
    assert(tag.includes('data-audio-src='), `Collection ${collection.id} trigger ${index + 1} is missing audio src.`);
    assert(tag.includes('data-song-title='), `Collection ${collection.id} trigger ${index + 1} is missing song title.`);
    assert(tag.includes('data-song-artist='), `Collection ${collection.id} trigger ${index + 1} is missing artist metadata.`);
    assert(tag.includes('data-player-action'), `Collection ${collection.id} trigger ${index + 1} is missing the generic player action hook.`);
  });
}

const [playerRuntime, catalogRuntime, frameBridge, playerView] = await Promise.all([
  read('js/music-player.js'),
  read('js/music-catalog.js'),
  read('js/site-frame-bridge.js'),
  read('scripts/music/music-player-view.mjs')
]);

assert(playerRuntime.includes("document.querySelector('[data-playback-queue]')"),
  'MusicPlayer must discover the current queue through the generic playback queue contract.');
assert(playerRuntime.includes("queueRoot.querySelectorAll('[data-player-track]')"),
  'MusicPlayer must consume generic playback track triggers from the active queue.');
assert(playerRuntime.includes("row?.querySelector('[data-player-action], .song-row-action')"),
  'MusicPlayer must use the generic action hook while retaining legacy fallback compatibility.');
assert(catalogRuntime.includes("songList.dataset.playbackQueue = '';"),
  'Runtime catalog pages must identify their generated song list as a playback queue.');
assert(catalogRuntime.includes("row.dataset.playerTrack = '';"),
  'Runtime catalog rows must expose the generic playback track contract.');
assert(frameBridge.includes("document.querySelector('[data-playback-queue]')"),
  'Site frame bridge must scope persistent-player queues through the playback queue contract.');
assert(frameBridge.includes("queueRoot.querySelectorAll('[data-player-track][data-audio-src]')"),
  'Site frame bridge must forward generic playable tracks to the persistent shell player.');
assert(frameBridge.includes("row.querySelector('[data-player-action], .song-row-action')"),
  'Site frame bridge must update generic playback actions when persistent player state changes.');
assert(frameBridge.includes('html.site-shell-frame-document .site-music-player'),
  'Framed pages must keep the local fallback player hidden while the persistent shell player is active.');
assert(count(playerView, /\bdata-player-audio\b/g) === 1,
  'Shared player view must own exactly one audio element.');

console.log(`Music playback queue contract validated for ${visibleCollections.length} collection(s).`);
