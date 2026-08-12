import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const REGISTRY_PATH = join(ROOT, 'data/music/artists.json');
const DETAILS_ROOT = join(ROOT, 'data/music/artists');
const STYLE_HREF = '/css/music-design-system.css?v=20260807-1';
const HEADING_STYLE_HREF = '/css/music-heading-system.css?v=20260807-1';
const SCRIPT_SRC = '/js/music-motion.js?v=20260807-1';
const MUSIC_SCRIPT_SRC = '/js/music.js?v=20260812-catalog-2';
const VISUAL_STYLE_HREF = '/css/music-visual-video.css?v=20260806-3';
const VISUAL_SCRIPT_SRC = '/js/music-visual-video.js?v=20260806-5';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@500;600&display=swap';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return extname(entry.name) === '.html' ? [path] : [];
  }));
  return nested.flat();
}

function normalizeSectionHeaders(html) {
  let output = html.replace(
    /<div class="music-section-header reveal">\s*<div>\s*(?:<p>[\s\S]*?<\/p>\s*)?<h2>([\s\S]*?)<\/h2>\s*<\/div>\s*(?:<span>[\s\S]*?<\/span>\s*)?(?:<a[\s\S]*?<\/a>\s*)?<\/div>/g,
    '<header class="music-section-header music-section-header--unified reveal"><h2>$1</h2></header>'
  );

  output = output.replace(
    /music-section-header--(?:system|clean)/g,
    'music-section-header--unified'
  );

  return output;
}

function installFont(html) {
  const fontPattern = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^">]+" rel="stylesheet">/;
  const link = `<link href="${FONT_HREF}" rel="stylesheet">`;

  if (fontPattern.test(html)) return html.replace(fontPattern, link);
  return html.replace('</head>', `  ${link}\n</head>`);
}

function installStyles(html) {
  let output = html;

  if (output.includes('/css/music-design-system.css')) {
    output = output.replace(
      /\/css\/music-design-system\.css\?v=[^"]+/g,
      STYLE_HREF
    );
  } else {
    output = output.replace(
      '</head>',
      `  <link rel="stylesheet" href="${STYLE_HREF}">\n</head>`
    );
  }

  if (output.includes('/css/music-heading-system.css')) {
    return output.replace(
      /\/css\/music-heading-system\.css\?v=[^"]+/g,
      HEADING_STYLE_HREF
    );
  }

  return output.replace(
    '</head>',
    `  <link rel="stylesheet" href="${HEADING_STYLE_HREF}">\n</head>`
  );
}

function installScript(html) {
  if (html.includes('/js/music-motion.js')) {
    return html.replace(
      /\/js\/music-motion\.js\?v=[^"]+/g,
      SCRIPT_SRC
    );
  }

  return html.replace(
    '</body>',
    `  <script src="${SCRIPT_SRC}"></script>\n</body>`
  );
}

function versionMusicBootstrap(html) {
  if (!html.includes('/js/music.js')) return html;
  return html.replace(/\/js\/music\.js\?v=[^"]+/g, MUSIC_SCRIPT_SRC);
}

function markMusicModule(html) {
  return html.replace(
    /<body class="([^"]*music-page[^"]*)"([^>]*)>/,
    (match, className, rawAttributes) => {
      let attributes = rawAttributes;
      if (!/data-music-design=/.test(attributes)) {
        attributes += ' data-music-design="unified"';
      }
      if (!/data-site-module=/.test(attributes)) {
        attributes += ' data-site-module="music"';
      }
      return `<body class="${className}"${attributes}>`;
    }
  );
}

function hydrateCollectionCovers(html, artists) {
  let output = html;

  for (const artist of artists) {
    if (!artist.cover || !artist.route) continue;

    const route = escapeRegExp(artist.route);
    const pattern = new RegExp(
      `(<a class="collection-artist-card[^"]*"[\\s\\S]*?href="${route}"[\\s\\S]*?<div class="collection-artist-image">)\\s*<div class="collection-artist-cover artist-visual-placeholder"[\\s\\S]*?<\\/div>`
    );

    output = output.replace(
      pattern,
      `$1\n      <img class="collection-artist-cover" src="${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name?.zh || artist.id)} artist cover" loading="lazy" decoding="async">`
    );
  }

  return output;
}

function bilibiliIdentity(item) {
  const direct = String(item?.bvid || '').match(/BV[0-9A-Za-z]{10}/i)?.[0];
  if (direct) return direct;

  try {
    return new URL(item?.url).pathname.match(/\/(BV[0-9A-Za-z]{10})(?:\/|$)/i)?.[1] || '';
  } catch {
    return '';
  }
}

function bilibiliEmbedUrl(item) {
  const bvid = bilibiliIdentity(item);
  if (!bvid) return '';
  const page = Math.max(1, Number.parseInt(item?.page, 10) || 1);
  return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&p=${page}&poster=1&autoplay=0&danmaku=0&high_quality=1&qn=80`;
}

function renderPlaylist(item) {
  const videos = (item.videos || []).map((video) => {
    const bvid = bilibiliIdentity(video);
    const embedUrl = bilibiliEmbedUrl(video);
    const page = Math.max(1, Number.parseInt(video?.page, 10) || 1);
    if (!bvid || !embedUrl) return null;
    return {
      bvid,
      page,
      embedUrl,
      title: video.title || '正在读取视频标题…'
    };
  }).filter(Boolean);

  if (!videos.length) return '';
  const first = videos[0];
  const buttons = videos.map((video, index) => `<button
      class="visual-playlist-item${index === 0 ? ' is-active' : ''}"
      type="button"
      data-playlist-src="${escapeHtml(video.embedUrl)}"
      data-playlist-title="${escapeHtml(video.title)}"
      data-playlist-bvid="${escapeHtml(video.bvid)}"
      data-playlist-page="${video.page}"
      aria-pressed="${index === 0 ? 'true' : 'false'}">
    <strong data-playlist-label>${escapeHtml(video.title)}</strong>
    <i aria-hidden="true">▶</i>
  </button>`).join('');

  return `<article class="visual-playlist" data-bilibili-playlist>
    <div class="visual-playlist-player">
      <iframe
        data-playlist-player
        src="${escapeHtml(first.embedUrl)}"
        title="${escapeHtml(first.title)}"
        loading="lazy"
        scrolling="no"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen></iframe>
    </div>
    <aside class="visual-playlist-panel">
      <header><h4>播放列表</h4></header>
      <div class="visual-playlist-items" role="list" aria-label="播放列表">${buttons}</div>
    </aside>
  </article>`;
}

function ensureVisualAssets(html) {
  let output = html;

  if (!output.includes('/css/music-visual-video.css')) {
    output = output.replace('</head>', `  <link rel="stylesheet" href="${VISUAL_STYLE_HREF}">\n</head>`);
  }

  if (!output.includes('/js/music-visual-video.js')) {
    output = output.replace('</body>', `  <script src="${VISUAL_SCRIPT_SRC}"></script>\n</body>`);
  }

  return output;
}

function ensureArtistPlaylist(html, detail) {
  const playlists = (detail?.gallery || []).filter(
    (item) => item?.type === 'bilibili-playlist' && Array.isArray(item.videos)
  );
  if (!playlists.length || html.includes('data-bilibili-playlist')) return html;

  const rendered = playlists.map(renderPlaylist).filter(Boolean).join('');
  if (!rendered) return html;

  const visualContent = `<div class="visual-grid"><div class="visual-archive-layout">
    <section class="visual-archive-group visual-archive-group--videos">
      <header class="visual-archive-subheader"><h3>影像放映</h3></header>
      <div class="visual-video-grid">${rendered}</div>
    </section>
  </div></div>`;

  const galleryPattern = /(<section id="gallery" class="music-content-section">)[\s\S]*?(?=\s*<section class="music-content-section related-section">)/;
  const output = html.replace(galleryPattern, `$1\n      ${visualContent}\n    </section>\n`);
  return ensureVisualAssets(output);
}

function refine(html) {
  let output = normalizeSectionHeaders(html);
  output = installFont(output);
  output = installStyles(output);
  output = installScript(output);
  output = versionMusicBootstrap(output);
  output = markMusicModule(output);
  return output;
}

async function main() {
  const files = await htmlFiles(MUSIC_ROOT);
  const artists = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
  const details = new Map();

  for (const artist of artists) {
    try {
      const detail = JSON.parse(await readFile(join(DETAILS_ROOT, `${artist.slug}.json`), 'utf8'));
      details.set(artist.slug, detail);
    } catch {
      // Keep processing other Music pages when one optional detail file is unavailable.
    }
  }

  let updated = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    let output = source;

    if (file === join(MUSIC_ROOT, 'index.html')) {
      output = hydrateCollectionCovers(output, artists);
    } else if (basename(file) === 'index.html' && dirname(file).startsWith(join(MUSIC_ROOT, 'artists'))) {
      const slug = basename(dirname(file));
      if (details.has(slug)) output = ensureArtistPlaylist(output, details.get(slug));
    }

    output = refine(output);
    if (output === source) continue;

    await writeFile(file, output, 'utf8');
    updated += 1;
  }

  console.log(`Applied isolated Music design system to ${updated} Music page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
