import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';
import { createRuntimePlayabilityResolver } from './music/runtime-playability-resolver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'music/listening/index.html');
const STYLE_HREF = '/css/music-listening.css?v=20260821-1';

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

const primaryArtist = (song) => (
  song?.artists?.find((artist) => artist?.role === 'primary')
  ?? song?.artists?.[0]
  ?? null
);

const renderLocalized = (value) => {
  const zh = localized(value, 'zh');
  const en = localized(value, 'en') || zh;
  return `<span class="music-lang-zh">${escapeHtml(zh)}</span><span class="music-lang-en">${escapeHtml(en)}</span>`;
};

export function renderListeningArtist(artistReference, profile) {
  const label = renderLocalized(artistReference?.name ?? artistReference?.key ?? '');
  if (!profile?.route) {
    return `<span class="listening-artist-name">${label}</span>`;
  }
  return `<a class="listening-artist-name listening-artist-name--linked" href="${escapeHtml(profile.route)}">${label}<b aria-hidden="true">↗</b></a>`;
}

export function renderListeningSongRow({
  song,
  index,
  album = null,
  artistProfiles = new Map(),
  playable = false
}) {
  const artists = (song.artists ?? []).map((artist) => (
    renderListeningArtist(artist, artistProfiles.get(artist.key) ?? null)
  )).join('<span class="listening-artist-separator" aria-hidden="true">·</span>');
  const albumTitle = album ? renderLocalized(album.title) : '<span aria-hidden="true">—</span>';
  const note = String(song.note ?? '').trim();
  const primary = primaryArtist(song);
  const primaryProfile = primary?.key ? artistProfiles.get(primary.key) ?? null : null;
  const action = primaryProfile?.route
    ? `<a class="listening-song-action" href="${escapeHtml(primaryProfile.route)}#songs"><span class="music-lang-zh">进入歌手页</span><span class="music-lang-en">OPEN ARTIST</span><b aria-hidden="true">↗</b></a>`
    : `<span class="listening-song-state"><span class="music-lang-zh">仅歌曲收藏</span><span class="music-lang-en">SONG ARCHIVE</span></span>`;

  return `<article id="${escapeHtml(song.id)}" class="listening-song-row reveal" data-listening-song="${escapeHtml(song.id)}">
    <span class="listening-song-index">${String(index + 1).padStart(2, '0')}</span>
    <div class="listening-song-primary">
      <h3>${renderLocalized(song.title)}</h3>
      <div class="listening-song-artists">${artists}</div>
    </div>
    <div class="listening-song-album">
      <small>ALBUM</small>
      <p>${albumTitle}</p>
    </div>
    <p class="listening-song-note">${escapeHtml(note)}</p>
    <div class="listening-song-meta">
      <em>${playable ? 'PLAYABLE' : 'ARCHIVE'}</em>
      ${action}
    </div>
  </article>`;
}

export async function buildMusicListeningPage({ root = ROOT } = {}) {
  const library = createMusicLibraryRepository({ root });
  const resolvePlayable = createRuntimePlayabilityResolver({ root });
  const songs = await library.getAllSongs();
  const artistKeys = new Set();
  const artistProfiles = new Map();

  for (const song of songs) {
    for (const artist of song.artists ?? []) {
      if (!artist?.key) continue;
      artistKeys.add(artist.key);
      if (!artistProfiles.has(artist.key)) {
        artistProfiles.set(artist.key, await library.getArtistProfile(artist.key));
      }
    }
  }

  const rows = [];
  for (const [index, song] of songs.entries()) {
    const primary = primaryArtist(song);
    const album = song.albumId ? await library.getAlbum(song.albumId) : null;
    const materialized = await library.materializeSong(song, 'zh');
    const playable = primary?.key
      ? await resolvePlayable({ artistId: primary.key, title: materialized.title, album: materialized.album })
      : false;
    rows.push(renderListeningSongRow({ song, index, album, artistProfiles, playable }));
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="7719 Music 的歌曲收藏。歌曲可以独立于完整歌手档案存在。">
  <title>Listening · Music · 7719 Universe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@500;600&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/music.css?v=20260805-2">
  <link rel="stylesheet" href="${STYLE_HREF}">
  <link rel="stylesheet" href="/css/music-header.css?v=20260818-5">
</head>
<body class="music-page music-listening-page">
  <header class="music-site-header">
    <div class="music-header-identity">
      <a class="music-site-brand" href="/" aria-label="返回 7719 Universe"><span>77</span><strong>19</strong></a>
      <span class="music-header-divider" aria-hidden="true"></span>
      <nav class="music-header-crumbs" aria-label="音乐页面层级">
        <a class="music-header-section" href="/music/"><span class="music-lang-zh">音乐</span><span class="music-lang-en">MUSIC</span></a>
        <span class="music-header-slash" aria-hidden="true">/</span>
        <span class="music-header-current"><span class="music-lang-zh">聆听</span><span class="music-lang-en">LISTENING</span></span>
      </nav>
    </div>
    <nav class="music-site-nav" aria-label="聆听页面导航">
      <a href="#tracks"><span class="music-lang-zh">歌曲</span><span class="music-lang-en">SONGS</span></a>
      <a href="/music/#artists"><span class="music-lang-zh">歌手</span><span class="music-lang-en">ARTISTS</span></a>
    </nav>
  </header>

  <main>
    <section class="listening-hero">
      <div class="listening-hero-copy reveal">
        <p class="music-eyebrow">02 / LISTENING ARCHIVE</p>
        <h1>Listening</h1>
        <h2>聆听</h2>
        <p class="listening-hero-description"><span class="music-lang-zh">这里按歌曲保存收藏。演唱者可以拥有完整歌手档案，也可以只作为歌曲信息存在。</span><span class="music-lang-en">Songs live here independently. A performer may have a full profile, or exist only as song metadata.</span></p>
      </div>
      <div class="listening-hero-stats reveal" aria-label="歌曲收藏统计">
        <div><strong>${songs.length}</strong><span>TRACKS</span></div>
        <div><strong>${artistKeys.size}</strong><span>ARTISTS</span></div>
        <p>CURATED, NOT COMPLETE.</p>
      </div>
    </section>

    <section id="tracks" class="music-content-section listening-library">
      <header class="music-section-header reveal">
        <div>
          <p>ALL TRACKS</p>
          <h2><span class="music-lang-zh">歌曲收藏</span><span class="music-lang-en">SONG ARCHIVE</span></h2>
        </div>
        <span><span class="music-lang-zh">歌曲使用同一套数据结构；只有本站存在完整歌手档案时，歌手名字才会成为链接。</span><span class="music-lang-en">Every song uses the same schema. Artist names become links only when a full profile exists here.</span></span>
      </header>
      <div class="listening-song-list">
        ${rows.join('\n        ')}
      </div>
    </section>

    <section class="music-content-section listening-return reveal" aria-label="返回音乐收藏">
      <a href="/music/"><span class="music-lang-zh">返回音乐收藏</span><span class="music-lang-en">BACK TO MUSIC</span> <b aria-hidden="true">↗</b></a>
    </section>
  </main>

  <footer class="music-site-footer"><span>7719 / MUSIC / LISTENING</span><span>SONGS FIRST.</span></footer>
  <script src="/js/music-header.js?v=20260818-5"></script>
</body>
</html>
`;

  const outputPath = join(root, 'music/listening/index.html');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');
  return { songs, artistKeys, outputPath };
}

async function main() {
  const result = await buildMusicListeningPage();
  console.log(`Built Music Listening page with ${result.songs.length} song(s) across ${result.artistKeys.size} artist key(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
