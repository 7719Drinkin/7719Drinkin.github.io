import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUSIC_RUNTIME_VERSION } from './music-runtime-config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [home, interestsRaw, universeRuntime, musicRuntime, catalogRuntime, playerRuntime, playerCss, frameBridge, shellRuntime, shellCss, vinylToggleCss, vinylHitRuntime, shellPage] = await Promise.all([
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
  read('css/site-shell-vinyl-toggle.css'),
  read('js/site-shell-vinyl-hit.js'),
  read('site-shell.html')
]);

const interests = JSON.parse(interestsRaw);
const musicInterest = interests.find((interest) => interest?.theme === 'music');
assert(musicInterest?.cover, 'Universe Music interest must define a cover in data/interests.json.');
assert(universeRuntime.includes("cache: 'no-cache'"), 'Universe interest metadata must revalidate instead of force-cache.');
assert(home.includes('/js/universe-refined.js?v=20260813-cover-runtime-1'), 'Universe refined runtime version was not bumped.');

assert(musicRuntime.includes("musicRuntimeAsset('/js/music-catalog.js')"), 'music.js must propagate its release version to music-catalog.js.');
assert(musicRuntime.includes('const TRAILING_MEDIA_CUE ='), 'Music runtime must distinguish trailing media-placement notes from the song title.');
assert(musicRuntime.includes('主題曲|主题曲|插曲'), 'Track display filtering must recognize soundtrack role labels in Traditional and Simplified Chinese.');
assert(musicRuntime.includes("heading.closest('[data-song-title]')"), 'Display-title cleanup must read the canonical full title from the playable row when available.');
assert(musicRuntime.includes('heading.textContent = displaySongTitle(sourceTitle);'), 'Only the large visual song title should receive the simplified display form.');
assert(catalogRuntime.includes("runtimeAsset('/js/music-player.js')"), 'music-catalog.js must propagate its release version to music-player.js.');
assert(catalogRuntime.includes("row.dataset.songTitle = track.title || track.fileName || 'Untitled';"), 'Catalog rows must preserve the original full title for playback and metadata.');
assert(catalogRuntime.includes('title.textContent = row.dataset.songTitle;'), 'Catalog renderer must expose the canonical title before display-only cleanup runs.');
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
assert(shellRuntime.includes('ui.toggle.innerHTML = playing ? ICONS.pause : ICONS.play'), 'Persistent player must keep play/pause semantics in the expanded transport deck.');
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
assert(shellCss.includes('width: 44px;\n  height: 44px;'), 'Desktop collapse control must expose a large square hit target.');
assert(shellCss.includes('border-radius: 12px;'), 'Desktop collapse control must use a rounded-square shape.');
assert(shellCss.includes('@keyframes persistent-collapse-hint-right'), 'Expanded collapse affordance must animate toward the collapse direction.');
assert(shellCss.includes('@keyframes persistent-collapse-hint-left'), 'Collapsed expand affordance must animate toward the expansion direction.');
assert(!shellCss.includes('.persistent-player-center-toggle'), 'Play/pause must not overlay the record artwork in expanded mode.');

assert(vinylToggleCss.includes('.persistent-player-chassis {'), 'Persistent player must isolate the animated body inside a dedicated chassis.');
assert(vinylToggleCss.includes('.persistent-music-player,\n.persistent-music-player.is-collapsed {\n  width: min(660px'), 'Outer player stage must keep one stable desktop width through collapse.');
assert(vinylToggleCss.includes('.persistent-music-player.is-collapsed .persistent-player-chassis {\n  width: 128px;'), 'Desktop minimized dock must retract only the chassis to 128px.');
assert(vinylToggleCss.includes('width: 116px;'), 'Mobile minimized chassis must collapse to 116px.');
assert(vinylToggleCss.includes('backdrop-filter: blur(22px) saturate(125%);'), 'Backdrop filtering must stay on the chassis instead of the vinyl-containing outer stage.');
assert(vinylToggleCss.includes('.persistent-music-player.is-collapsed .persistent-player-transport {\n  opacity: 0;\n  visibility: hidden;'), 'Collapsed transport must disappear instead of morphing into a vinyl-sized click layer.');
assert(!vinylToggleCss.includes('.persistent-music-player.is-collapsed .persistent-player-toggle,'), 'Collapsed mode must not stretch the transport play button over the record.');
assert(vinylToggleCss.includes('.persistent-music-player.is-collapsed .persistent-player-turntable {\n  pointer-events: auto;\n  cursor: pointer;'), 'Collapsed turntable must directly own the pointer interaction.');
assert(vinylToggleCss.includes('animation-play-state: paused;'), 'Paused vinyl must freeze at its current rotation angle instead of snapping upright.');
assert(vinylToggleCss.includes('.persistent-music-player.is-playing .persistent-player-platter {\n  animation-play-state: running;'), 'Playing vinyl must resume the same platter animation from the paused angle.');
assert(!vinylToggleCss.includes('scale('), 'Collapsed vinyl interaction must not scale or move the record on click.');
assert(vinylToggleCss.includes('border-color: rgba(190, 200, 214, .22);'), 'Collapse control must use a neutral border instead of route-independent gold.');
assert(vinylToggleCss.includes('color: rgba(220, 228, 238, .78);'), 'Collapse icon must use a neutral foreground color across page palettes.');
assert(vinylToggleCss.includes('border-color: rgba(205, 214, 226, .28);'), 'Collapsed expand control must keep the same neutral palette.');

assert(vinylHitRuntime.includes("turntable.setAttribute('role', 'button')"), 'Collapsed turntable must expose keyboard button semantics without rendering a visible button.');
assert(vinylHitRuntime.includes("turntable.setAttribute('aria-label', audio.paused ? '播放' : '暂停')"), 'Collapsed turntable accessibility label must track playback state.');
assert(vinylHitRuntime.includes('transportToggle.click();'), 'Collapsed turntable must reuse the existing playback action instead of duplicating player state logic.');
assert(vinylHitRuntime.includes("event.key !== 'Enter' && event.key !== ' '"), 'Collapsed vinyl must support keyboard activation.');
assert(vinylHitRuntime.includes('new MutationObserver(syncTurntableSemantics)'), 'Turntable semantics must follow collapse/expand state changes.');

assert(shellPage.includes('class="persistent-player-chassis"'), 'Persistent shell must render the animated chassis separately from the record anchor.');
assert(shellPage.includes('class="persistent-player-copy"'), 'Persistent shell must render song metadata as one horizontal content line.');
assert(shellPage.includes('class="persistent-player-transport"'), 'Persistent shell must render a separate transport deck.');
assert(shellPage.includes('data-persistent-turntable tabindex="-1"'), 'Persistent shell must keep the turntable statically mounted for collapsed playback interaction.');
assert(shellPage.includes('class="persistent-player-toggle"'), 'Persistent shell must retain the visible expanded transport play/pause control.');
assert(!shellPage.includes('persistent-player-center-toggle'), 'Persistent shell must not place a visible play/pause button over the record.');
assert(!shellPage.includes('persistent-player-spindle'), 'Persistent shell must not render an unnecessary center spindle.');
assert(shellPage.includes('L62 36'), 'Tonearm geometry must land the cartridge on the outer groove area.');
assert(!shellPage.includes('data-persistent-state'), 'Persistent shell must not render textual playback-state labels.');
assert(!shellPage.includes('NOW PLAYING'), 'Persistent shell must not render NOW PLAYING labels.');
assert(shellPage.includes('data-persistent-collapse-icon'), 'Persistent shell must render the directional collapse indicator.');
assert(!shellPage.includes('persistent-player-collapse-rail'), 'Large square collapse control must not retain the old thin rail affordance.');
assert(shellPage.includes('data-persistent-volume-control'), 'Persistent shell must render the inline volume control in expanded mode.');
assert(shellPage.includes('data-persistent-volume-icon'), 'Persistent shell must render a visible volume icon.');
assert(shellPage.includes('persistent-player-tonearm-cartridge'), 'Persistent shell must render the detailed decorative tonearm.');
assert(shellPage.includes('/js/site-shell.js?v=20260814-minimized-dock-1'), 'Persistent shell base player runtime version must remain pinned.');
assert(shellPage.includes('/js/site-shell-vinyl-hit.js?v=20260814-vinyl-chassis-3'), 'Persistent shell must load the dedicated collapsed-vinyl interaction runtime.');
assert(shellPage.includes('/css/site-shell.css?v=20260814-minimized-dock-1'), 'Persistent shell base CSS cache version must remain available.');
assert(shellPage.includes('/css/site-shell-vinyl-toggle.css?v=20260814-vinyl-chassis-3'), 'Persistent shell must load the isolated chassis refinement stylesheet.');

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
