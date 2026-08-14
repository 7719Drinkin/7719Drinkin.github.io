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
assert(shellRuntime.includes("const VIEW_KEY = '7719:persistent-player-view:v1'"), 'Persistent player view state must remain independent from playback state.');
assert(shellRuntime.includes('const setCollapsed ='), 'Persistent player must expose a collapse/expand view transition.');
assert(shellRuntime.includes('restoreViewState();'), 'Persistent player must restore its view state independently.');
assert(shellRuntime.includes("ui.album.textContent = track.album || ''"), 'Persistent player must retain album metadata independently.');
assert(shellRuntime.includes('updateMetadata(current);'), 'Persistent player must refresh metadata when selecting the already-loaded track.');
assert(shellRuntime.includes('const ICONS = Object.freeze'), 'Persistent player controls must use the shared inline SVG icon set.');
assert(shellRuntime.includes('ui.toggle.innerHTML = playing ? ICONS.pause : ICONS.play'), 'Persistent player must expose play and pause through the transport button.');
assert(shellRuntime.includes('ICONS.collapseRight'), 'Expanded player collapse affordance must indicate motion toward the right-side record anchor.');
assert(shellRuntime.includes('ICONS.expandLeft'), 'Collapsed player affordance must indicate expansion toward the left.');
assert(shellRuntime.includes('const setRangeFill ='), 'Persistent player ranges must expose visual progress without external UI libraries.');
assert(shellRuntime.includes("volumeIcon: playerRoot.querySelector('[data-persistent-volume-icon]')"), 'Persistent player must bind the visible inline volume icon.');
assert(shellRuntime.includes("audio.addEventListener('volumechange', updateVolumeUi)"), 'Persistent player volume UI must follow native audio volume changes.');
assert(shellRuntime.includes('setCollapsed,'), 'Persistent shell API must expose collapse state transitions explicitly.');
assert(shellRuntime.includes('collapsed: isCollapsed()'), 'Persistent shell player state must report the current view state.');
assert(!shellRuntime.includes('NOW PLAYING'), 'Persistent player must not render textual playback-state labels.');
assert(!shellRuntime.includes("'PAUSED'"), 'Persistent player must not render textual paused-state labels.');

assert(shellCss.includes('--persistent-player-height: 84px;'), 'Persistent player must define one fixed desktop height.');
assert(shellCss.includes('--persistent-record-size: 108px;'), 'Persistent record must remain larger than the player body height.');
assert(shellCss.includes('height: var(--persistent-player-height);'), 'Persistent player body must use the fixed horizontal-rail height.');
assert(shellCss.includes('width .52s var(--shell-ease)'), 'Persistent player collapse must animate its horizontal width.');
assert(!shellCss.includes('translateY'), 'Persistent player stylesheet must not use vertical translation for player interaction.');
assert(!shellCss.includes('min-height:'), 'Persistent player must not change vertical size between view states.');
assert(shellCss.includes('.persistent-player-copy {'), 'Persistent player must define a dedicated song-content rail.');
assert(shellCss.includes('display: flex;\n  align-items: baseline;'), 'Song content must remain a single horizontal information stream.');
assert(shellCss.includes('.persistent-player-transport {'), 'Playback controls must live on their own horizontal deck.');
assert(shellCss.includes('.persistent-player-turntable {'), 'Persistent player must render an independent turntable anchor.');
assert(shellCss.includes('right: calc(var(--persistent-record-overhang) * -1);'), 'Record anchor must overlap the right edge instead of occupying a layout column.');
assert(shellCss.includes('.persistent-player-tonearm-cartridge'), 'Persistent player must retain the structured tonearm cartridge.');
assert(shellCss.includes('transform: rotate(0deg);'), 'Playing tonearm must use the shallow outer-groove landing pose.');
assert(!shellCss.includes('.persistent-player-spindle'), 'Record center must not render a fixed spindle ornament.');
assert(shellCss.includes('.persistent-player-volume-inline'), 'Expanded player must expose an always-visible inline volume control.');
assert(shellCss.includes('width: 44px;\n  height: 44px;'), 'Desktop collapse and minimized play controls must expose large square hit targets.');
assert(shellCss.includes('border-radius: 12px;'), 'Desktop collapse control must use a rounded-square shape.');
assert(shellCss.includes('.persistent-music-player.is-collapsed {\n  width: 172px;'), 'Desktop minimized player must collapse to the compact vinyl dock width.');
assert(shellCss.includes('.persistent-music-player.is-collapsed .persistent-player-copy {\n  opacity: 0;'), 'Minimized dock must fully hide song metadata instead of leaving an empty title rail.');
assert(shellCss.includes('.persistent-music-player.is-collapsed .persistent-player-toggle {'), 'Minimized dock must retain a dedicated play/pause control.');
assert(shellCss.includes('@keyframes persistent-collapse-hint-right'), 'Expanded collapse affordance must animate toward the collapse direction.');
assert(shellCss.includes('@keyframes persistent-collapse-hint-left'), 'Collapsed expand affordance must animate toward the expansion direction.');
assert(!shellCss.includes('.persistent-player-center-toggle'), 'Play/pause must not overlay the record artwork.');

assert(shellPage.includes('class="persistent-player-copy"'), 'Persistent shell must render song metadata as one horizontal content line.');
assert(shellPage.includes('class="persistent-player-transport"'), 'Persistent shell must render a separate transport deck.');
assert(shellPage.includes('data-persistent-turntable'), 'Persistent shell must render a dedicated right-side record anchor.');
assert(shellPage.includes('class="persistent-player-toggle"'), 'Persistent shell must render play/pause outside the record.');
assert(!shellPage.includes('persistent-player-center-toggle'), 'Persistent shell must not place play/pause over the record.');
assert(!shellPage.includes('persistent-player-spindle'), 'Persistent shell must not render an unnecessary center spindle.');
assert(shellPage.includes('L62 36'), 'Tonearm geometry must land the cartridge on the outer groove area.');
assert(!shellPage.includes('data-persistent-state'), 'Persistent shell must not render textual playback-state labels.');
assert(!shellPage.includes('NOW PLAYING'), 'Persistent shell must not render NOW PLAYING labels.');
assert(shellPage.includes('data-persistent-collapse-icon'), 'Persistent shell must render the directional collapse indicator.');
assert(!shellPage.includes('persistent-player-collapse-rail'), 'Large square collapse control must not retain the old thin rail affordance.');
assert(shellPage.includes('data-persistent-volume-control'), 'Persistent shell must render the inline volume control in expanded mode.');
assert(shellPage.includes('data-persistent-volume-icon'), 'Persistent shell must render a visible volume icon.');
assert(shellPage.includes('persistent-player-tonearm-cartridge'), 'Persistent shell must render the detailed decorative tonearm.');
assert(shellPage.includes('/js/site-shell.js?v=20260814-minimized-dock-1'), 'Persistent shell JS cache version was not bumped for the minimized dock.');
assert(shellPage.includes('/css/site-shell.css?v=20260814-minimized-dock-1'), 'Persistent shell CSS cache version was not bumped for the minimized dock.');

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
