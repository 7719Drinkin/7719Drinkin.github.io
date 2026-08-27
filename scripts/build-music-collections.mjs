import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MUSIC_BOOTSTRAP_SRC,
  MUSIC_PLAYER_SCRIPT_SRC,
  MUSIC_PLAYER_STYLE_HREF
} from './music-runtime-config.mjs';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';
import { renderMusicPlayer } from './music/music-player-view.mjs';
import { createPlaybackTrackView } from './music/playback-track-view.mjs';
import { createRuntimeTrackResolver } from './music/runtime-playability-resolver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STYLE_HREF = '/css/music-collections.css?v=20260827-song-row-1';
const LISTENING_COMPAT_ROUTE = '/music/listening/';
const RECENT_COLLECTION_ID = 'recently-curated';

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

const routeOutputPath = (root, route) => join(root, String(route).replace(/^\/+/, ''), 'index.html');

async function prepareSongRow({ entry, index, library, resolveRuntimeTrack }) {
  const song = await library.getSong(entry.songId);
  const album = song.albumId ? await library.getAlbum(song.albumId) : null;
  const artwork = await library.resolveSongArtwork(song.id);
  const primary = song.artists?.find((artist) => artist?.role === 'primary') ?? song.artists?.[0] ?? null;
  const runtimeMatch = primary?.key
    ? await resolveRuntimeTrack({ artistKey: primary.key, title: entry.title, album: entry.album })
    : null;
  const playbackTrack = createPlaybackTrackView({
    song,
    album,
    artwork,
    primary,
    runtimeMatch
  });

  return { entry, index, song, album, artwork, primary, playbackTrack };
}

const trackPresentation = (row) => {
  const track = row.playbackTrack;
  const titleZh = localized(row.song.title, 'zh') || track?.title || '';
  const titleEn = localized(row.song.title, 'en') || titleZh;
  const artistZh = localized(row.primary?.name, 'zh') || track?.artist || '';
  const artistEn = localized(row.primary?.name, 'en') || artistZh;
  const albumZh = localized(row.album?.title, 'zh') || track?.album || '';
  const albumEn = localized(row.album?.title, 'en') || albumZh;
  const contextZh = [artistZh, albumZh].filter(Boolean).join(' · ') || '7719 Music';
  const contextEn = [artistEn, albumEn].filter(Boolean).join(' · ') || contextZh;
  const fileName = String(track?.playback?.fileName || '').trim();
  const note = row.song.note ?? '';

  return {
    track,
    titleZh,
    titleEn,
    artistZh,
    artistEn,
    albumZh,
    albumEn,
    context: { zh: contextZh, en: contextEn },
    description: fileName || localized(note, 'zh') || 'ARCHIVE'
  };
};

export function renderCollectionSongRow(row) {
  const presentation = trackPresentation(row);
  const core = `<span class="song-index">${String(row.index + 1).padStart(2, '0')}</span>
    <div class="song-primary">
      <h3>${renderLocalized(row.song.title)}</h3>
      <p>${renderLocalized(presentation.context)}</p>
    </div>
    <small>${escapeHtml(presentation.description)}</small>`;

  if (!presentation.track?.playback) {
    return `<article class="song-row collection-song-row reveal" data-collection-song="${escapeHtml(row.song.id)}">
      ${core}
      <b aria-hidden="true">—</b>
    </article>`;
  }

  const cover = presentation.track.artwork
    ? ` data-cover-src="${escapeHtml(presentation.track.artwork)}"`
    : '';

  return `<button class="song-row song-row--playable collection-song-row reveal" type="button"
      data-collection-song="${escapeHtml(row.song.id)}"
      data-player-track
      data-audio-src="${escapeHtml(presentation.track.playback.src)}"
      data-audio-type="${escapeHtml(presentation.track.playback.type)}"
      data-song-title="${escapeHtml(presentation.titleZh)}"
      data-song-title-zh="${escapeHtml(presentation.titleZh)}"
      data-song-title-en="${escapeHtml(presentation.titleEn)}"
      data-song-artist="${escapeHtml(presentation.artistZh)}"
      data-song-artist-zh="${escapeHtml(presentation.artistZh)}"
      data-song-artist-en="${escapeHtml(presentation.artistEn)}"
      data-song-album="${escapeHtml(presentation.albumZh)}"
      data-song-album-zh="${escapeHtml(presentation.albumZh)}"
      data-song-album-en="${escapeHtml(presentation.albumEn)}"${cover}
      aria-label="播放 ${escapeHtml(presentation.titleZh)}">
    ${core}
    <b class="song-row-action" data-player-action aria-hidden="true">▶</b>
  </button>`;
}

function renderListeningCompatibilityPage(targetRoute) {
  const target = escapeHtml(targetRoute);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0; url=${target}">
  <meta name="robots" content="noindex">
  <title>Listening moved · Music · 7719 Universe</title>
  <link rel="stylesheet" href="/css/music.css?v=20260805-2">
  <link rel="stylesheet" href="${STYLE_HREF}">
  <style>
    .music-listening-compat-page main{display:grid;min-height:100svh;place-content:center;padding:96px 24px;text-align:center}.music-listening-compat-page h1{margin:20px 0 0;font-family:var(--music-serif);font-size:clamp(58px,10vw,132px);font-weight:600;line-height:.86;letter-spacing:-.06em}.music-listening-compat-page h2{margin:22px 0 0;color:var(--music-gold-soft);font-family:var(--music-serif);font-size:clamp(22px,3vw,38px);font-weight:500}.music-listening-compat-page p:not(.music-eyebrow){max-width:34em;margin:20px auto 0;color:var(--music-muted);font-size:13px;line-height:1.8}.music-listening-compat-page a{display:inline-flex;margin:28px auto 0;padding-bottom:7px;border-bottom:1px solid rgba(216,168,78,.5);color:var(--music-gold-soft);font:10px/1.4 var(--music-mono);letter-spacing:.1em;text-decoration:none}
  </style>
</head>
<body class="music-page music-listening-compat-page" data-listening-compat="collections">
  <main>
    <p class="music-eyebrow">LISTENING / MOVED</p>
    <h1>Collections</h1>
    <h2>歌曲已整理至专栏</h2>
    <p>Listening 不再作为完整歌曲目录展示。歌曲现在从专栏进入。</p>
    <a href="${target}">进入最近整理 <b aria-hidden="true">↗</b></a>
  </main>
  <script>window.location.replace(${JSON.stringify(targetRoute)});</script>
</body>
</html>
`;
}

async function writeListeningCompatibilityPage(root, targetRoute) {
  const outputPath = routeOutputPath(root, LISTENING_COMPAT_ROUTE);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderListeningCompatibilityPage(targetRoute), 'utf8');
  return outputPath;
}

export async function buildMusicCollections({ root = ROOT } = {}) {
  const collections = createMusicCollectionRepository({ root });
  const library = createMusicLibraryRepository({ root });
  const resolveRuntimeTrack = createRuntimeTrackResolver({ root });
  const visibleCollections = await collections.getVisibleCollections();
  const outputs = [];

  for (const registryEntry of visibleCollections) {
    const collection = await collections.getCollection(registryEntry.id);
    const songs = await collections.resolveCollectionSongs(collection.id);
    const rows = [];
    for (const [index, entry] of songs.entries()) {
      rows.push(await prepareSongRow({ entry, index, library, resolveRuntimeTrack }));
    }

    const titleEn = localized(collection.title, 'en') || collection.id;
    const titleZh = localized(collection.title, 'zh') || titleEn;
    const description = renderLocalized(collection.description ?? '');
    const queueId = `collection:${collection.id}`;
    const defaultCover = rows.find((row) => row.playbackTrack?.playback && row.playbackTrack?.artwork)
      ?.playbackTrack?.artwork || '';
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(titleZh)} · 7719 Music Collection">
  <title>${escapeHtml(titleEn)} · Music · 7719 Universe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@500;600&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/music.css?v=20260805-2">
  <link rel="stylesheet" href="${STYLE_HREF}">
  <link rel="stylesheet" href="${MUSIC_PLAYER_STYLE_HREF}">
  <link rel="stylesheet" href="/css/music-header.css?v=20260818-5">
</head>
<body class="music-page music-collection-detail-page" data-music-collection="${escapeHtml(collection.id)}">
  <header class="music-site-header">
    <div class="music-header-identity">
      <a class="music-site-brand" href="/" aria-label="返回 7719 Universe"><span>77</span><strong>19</strong></a>
      <span class="music-header-divider" aria-hidden="true"></span>
      <nav class="music-header-crumbs" aria-label="音乐页面层级">
        <a class="music-header-section" href="/music/"><span class="music-lang-zh">音乐</span><span class="music-lang-en">MUSIC</span></a>
        <span class="music-header-slash" aria-hidden="true">/</span>
        <span class="music-header-current">${renderLocalized(collection.title)}</span>
      </nav>
    </div>
    <nav class="music-site-nav" aria-label="专栏页面导航">
      <a href="#tracks"><span class="music-lang-zh">歌曲</span><span class="music-lang-en">TRACKS</span></a>
      <a href="/music/#artists"><span class="music-lang-zh">歌手</span><span class="music-lang-en">ARTISTS</span></a>
    </nav>
  </header>

  <main>
    <section class="collection-detail-hero">
      <div class="collection-detail-hero-copy reveal">
        <h1>${renderLocalized(collection.title)}</h1>
        <p class="collection-detail-description">${description}</p>
      </div>
      <aside class="collection-detail-stats reveal" aria-label="专栏统计">
        <div><strong>${songs.length}</strong><span><span class="music-lang-zh">首歌曲</span><span class="music-lang-en">TRACKS</span></span></div>
      </aside>
    </section>

    <section id="tracks" class="music-content-section collection-detail-tracks">
      <header class="collection-detail-section-header reveal">
        <h2><span class="music-lang-zh">歌曲</span><span class="music-lang-en">TRACKS</span></h2>
      </header>
      <div class="song-list collection-track-list"
        data-playback-queue
        data-queue-id="${escapeHtml(queueId)}"
        data-queue-kind="collection"
        data-queue-title="${escapeHtml(titleEn)}">
        ${rows.map(renderCollectionSongRow).join('\n        ')}
      </div>
    </section>

    <section class="music-content-section collection-detail-return reveal" aria-label="返回音乐收藏">
      <a href="/music/#collections"><span class="music-lang-zh">返回专栏</span><span class="music-lang-en">BACK TO COLLECTIONS</span> <b aria-hidden="true">↗</b></a>
    </section>
  </main>

  ${renderMusicPlayer({ fallbackLabel: '77', defaultArtist: '7719 Music', defaultCover })}
  <footer class="music-site-footer"><span>7719 / MUSIC / COLLECTIONS</span><span>${renderLocalized(collection.title)}</span></footer>
  <script src="${MUSIC_BOOTSTRAP_SRC}"></script>
  <script src="/js/music-header.js?v=20260818-5"></script>
  <script src="${MUSIC_PLAYER_SCRIPT_SRC}"></script>
</body>
</html>
`;

    const outputPath = routeOutputPath(root, collection.route);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, 'utf8');
    outputs.push({ collection, songs, rows, outputPath });
  }

  const recent = outputs.find(({ collection }) => collection.id === RECENT_COLLECTION_ID);
  if (!recent) throw new Error(`Music Collections requires published ${RECENT_COLLECTION_ID} for the Listening compatibility route.`);
  const compatibilityPath = await writeListeningCompatibilityPage(root, recent.collection.route);

  console.log(`Built ${outputs.length} Music Collection page(s): ${outputs.map(({ collection, songs }) => `${collection.id} (${songs.length})`).join(', ')}; Listening compatibility route -> ${recent.collection.route}`);
  return { outputs, compatibilityPath };
}

async function main() {
  await buildMusicCollections();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}