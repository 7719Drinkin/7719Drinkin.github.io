import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUSIC_BOOTSTRAP_SRC } from './music-runtime-config.mjs';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';
import { createRuntimePlayabilityResolver } from './music/runtime-playability-resolver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STYLE_HREF = '/css/music-collections.css?v=20260821-2';
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

async function prepareSongRow({ entry, index, library, resolvePlayable }) {
  const song = await library.getSong(entry.songId);
  const album = song.albumId ? await library.getAlbum(song.albumId) : null;
  const artwork = await library.resolveSongArtwork(song.id);
  const artists = await Promise.all((song.artists ?? []).map(async (artist) => ({
    reference: artist,
    profile: artist?.key ? await library.getArtistProfile(artist.key) : null
  })));
  const primary = song.artists?.find((artist) => artist?.role === 'primary') ?? song.artists?.[0] ?? null;
  const playable = primary?.key
    ? await resolvePlayable({ artistKey: primary.key, title: entry.title, album: entry.album })
    : false;

  return { entry, index, song, album, artwork, artists, primary, playable };
}

export function renderCollectionSongRow(row) {
  const artistHtml = row.artists.map(({ reference, profile }) => {
    const label = renderLocalized(reference?.name ?? reference?.key ?? '');
    if (!profile?.route) return `<span class="collection-track-artist">${label}</span>`;
    return `<a class="collection-track-artist collection-track-artist--linked" href="${escapeHtml(profile.route)}">${label}</a>`;
  }).join('<span class="collection-track-artist-separator" aria-hidden="true">·</span>');

  const artwork = row.artwork
    ? `<img src="${escapeHtml(row.artwork)}" alt="" loading="lazy" decoding="async" aria-hidden="true">`
    : '<span class="collection-track-artwork-placeholder" aria-hidden="true"></span>';
  const albumTitle = row.album ? renderLocalized(row.album.title) : '<span aria-hidden="true">—</span>';
  const primaryProfile = row.primary?.key
    ? row.artists.find(({ reference }) => reference?.key === row.primary.key)?.profile ?? null
    : null;
  const action = primaryProfile?.route
    ? `<a class="collection-track-action" href="${escapeHtml(primaryProfile.route)}#songs"><span class="music-lang-zh">进入歌手页</span><span class="music-lang-en">OPEN ARTIST</span><b aria-hidden="true">↗</b></a>`
    : `<span class="collection-track-state"><span class="music-lang-zh">收藏</span><span class="music-lang-en">ARCHIVE</span></span>`;
  const state = row.playable
    ? '<span class="music-lang-zh">可播放</span><span class="music-lang-en">PLAYABLE</span>'
    : '<span class="music-lang-zh">收藏</span><span class="music-lang-en">ARCHIVE</span>';

  return `<article class="collection-track-row reveal" data-collection-song="${escapeHtml(row.song.id)}">
    <span class="collection-track-index">${String(row.index + 1).padStart(2, '0')}</span>
    <div class="collection-track-artwork">${artwork}</div>
    <div class="collection-track-primary">
      <h3>${renderLocalized(row.song.title)}</h3>
      <div class="collection-track-artists">${artistHtml}</div>
    </div>
    <div class="collection-track-album">
      <small><span class="music-lang-zh">专辑</span><span class="music-lang-en">ALBUM</span></small>
      <p>${albumTitle}</p>
    </div>
    <p class="collection-track-note">${escapeHtml(row.song.note ?? '')}</p>
    <div class="collection-track-meta">
      <em>${state}</em>
      ${action}
    </div>
  </article>`;
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
  const resolvePlayable = createRuntimePlayabilityResolver({ root });
  const visibleCollections = await collections.getVisibleCollections();
  const outputs = [];

  for (const registryEntry of visibleCollections) {
    const collection = await collections.getCollection(registryEntry.id);
    const songs = await collections.resolveCollectionSongs(collection.id);
    const rows = [];
    for (const [index, entry] of songs.entries()) {
      rows.push(await prepareSongRow({ entry, index, library, resolvePlayable }));
    }

    const titleEn = localized(collection.title, 'en') || collection.id;
    const titleZh = localized(collection.title, 'zh') || titleEn;
    const description = renderLocalized(collection.description ?? '');
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
      <div class="collection-track-list">
        ${rows.map(renderCollectionSongRow).join('\n        ')}
      </div>
    </section>

    <section class="music-content-section collection-detail-return reveal" aria-label="返回音乐收藏">
      <a href="/music/#collections"><span class="music-lang-zh">返回专栏</span><span class="music-lang-en">BACK TO COLLECTIONS</span> <b aria-hidden="true">↗</b></a>
    </section>
  </main>

  <footer class="music-site-footer"><span>7719 / MUSIC / COLLECTIONS</span><span>${renderLocalized(collection.title)}</span></footer>
  <script src="${MUSIC_BOOTSTRAP_SRC}"></script>
  <script src="/js/music-header.js?v=20260818-5"></script>
</body>
</html>
`;

    const outputPath = routeOutputPath(root, collection.route);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, 'utf8');
    outputs.push({ collection, songs, outputPath });
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
