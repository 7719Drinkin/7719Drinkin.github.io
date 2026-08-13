import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUSIC_RUNTIME_VERSION } from './music-runtime-config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [home, interestsRaw, universeRuntime, musicRuntime, catalogRuntime, playerRuntime, playerCss, frameBridge, shellRuntime, shellCss, shellPage] = await Promise.all([
  read('index.html'),
  read('data/interests.json'),
  read('js/universe-refined.js'),
  read('js/music.js'),
  read('js/music-catalog.js'),
  read('js/music-player.js'),
  read('css/music-player.css'),
  read('js/site-frame-bridge.js'),
  read('js/site-shell.js'),
  read('css/site-shell.css'),
  read('site-shell.html')
]);

const interests = JSON.parse(interestsRaw);
const musicInterest = interests.find((interest) => interest?.theme === 'music');
assert(musicInterest?.cover, 'Universe Music interest must define a cover in data/interests.json.');
assert(universeRuntime.includes("cache: 'no-cache'"), 'Universe interest metadata must revalidate instead of force-cache.');
assert(home.includes('/js/universe-refined.js?v=20260813-cover-runtime-1'), 'Universe refined runtime version was not bumped.');

assert(musicRuntime.includes("musicRuntimeAsset('/js/music-catalog.js')"), 'music.js must propagate its release version to music-catalog.js.');
assert(catalogRuntime.includes("runtimeAsset('/js/music-player.js')"), 'music-catalog.js must propagate its release version to music-player.js.');
assert(catalogRuntime.includes('row.dataset.coverSrc'), 'Catalog adapter must expose coverSrc on playable rows.');
assert(catalogRuntime.includes('playerRoot.dataset.defaultCover'), 'Catalog adapter must expose the idle/default player cover.');
assert(playerRuntime.includes('row?.dataset.coverSrc'), 'MusicPlayer must consume coverSrc from the track row.');
assert(!playerRuntime.includes("querySelectorAll('.album-card[data-album-name]')"), 'MusicPlayer must not scan album-card DOM for covers.');
assert(playerCss.includes('img[data-player-cover-art]'), 'Player cover art styles must live in music-player.css.');

assert(frameBridge.includes('coverSrc: row.dataset.coverSrc'), 'Site frame bridge must forward track coverSrc to the persistent player.');
assert(shellRuntime.includes("coverSrc: cover?.href || ''"), 'Persistent player track model must retain coverSrc.');
assert(shellRuntime.includes('renderCover(track)'), 'Persistent player metadata must render cover artwork.');
assert(shellRuntime.includes("ui.cover.classList.add('has-cover-art')"), 'Persistent player must expose its cover-art state to CSS.');
assert(shellRuntime.includes("const STATE_KEY = '7719:persistent-player:v2'"), 'Persistent player playback state schema must remain v2.');
assert(shellRuntime.includes("const VIEW_KEY = '7719:persistent-player-view:v1'"), 'Persistent player view state must be independent from playback state.');
assert(shellRuntime.includes('const setCollapsed ='), 'Persistent player must expose a collapse/expand view transition.');
assert(shellRuntime.includes('restoreViewState();'), 'Persistent player must restore its view state independently.');
assert(shellRuntime.includes("ui.album.textContent = track.album || ''"), 'Persistent player must not concatenate album metadata into the artist line.');
assert(shellRuntime.includes('updateMetadata(current);'), 'Persistent player must refresh metadata when selecting the already-loaded track.');
assert(shellCss.includes('.persistent-player-cover.has-cover-art > img'), 'Persistent player cover image styles must live in site-shell.css.');
assert(shellCss.includes('.persistent-music-player.is-collapsed'), 'Persistent player CSS must define a compact view.');
assert(shellCss.includes('.persistent-player-meta'), 'Persistent player metadata must have a dedicated layout container.');
assert(shellPage.includes('data-persistent-collapse'), 'Persistent shell must render an explicit collapse control.');
assert(shellPage.includes('class="persistent-player-meta"'), 'Persistent shell must separate artist and album metadata structurally.');
assert(shellPage.includes('/js/site-shell.js?v=20260813-layout-1'), 'Persistent shell JS cache version was not bumped for the layout refactor.');
assert(shellPage.includes('/css/site-shell.css?v=20260813-layout-1'), 'Persistent shell CSS cache version was not bumped for the layout refactor.');

const [artistPage, albumPage] = await Promise.all([
  read('music/artists/tan-yonglin/index.html'),
  read('music/artists/tan-yonglin/albums/album-28/index.html')
]);

for (const [label, page] of [['artist', artistPage], ['album', albumPage]]) {
  assert(page.includes(`/js/music.js?v=${MUSIC_RUNTIME_VERSION}`), `Generated ${label} page has stale music.js runtime version.`);
  assert(page.includes(`/css/music-player.css?v=${MUSIC_RUNTIME_VERSION}`), `Generated ${label} page has stale music-player.css runtime version.`);
  assert(!page.includes('music-cover-art.js'), `Legacy music-cover-art.js must not be loaded by ${label} pages.`);
}

assert(artistPage.includes('data-album-name="爱情陷阱"'), 'Representative artist page must expose album metadata for the cover adapter.');
assert(albumPage.includes('class="album-detail-cover"'), 'Representative album page must expose its detail cover.');

console.log(`Music runtime contract validated for ${MUSIC_RUNTIME_VERSION}.`);
