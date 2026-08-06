import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'data/music/artists.json');
const DETAILS_ROOT = join(ROOT, 'data/music/artists');
const MUSIC_ROOT = join(ROOT, 'music', 'artists');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function youtubeId(item) {
  if (/^[A-Za-z0-9_-]{11}$/.test(String(item.videoId || ''))) return item.videoId;

  try {
    const url = new URL(item.url);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (/(^|\.)youtube\.com$/.test(url.hostname)) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
      return match?.[1] || null;
    }
  } catch {
    return null;
  }

  return null;
}

function bilibiliIdentity(item) {
  const directBvid = String(item.bvid || '').match(/BV[0-9A-Za-z]{10}/i)?.[0];
  if (directBvid) return { key: 'bvid', value: directBvid };

  const directAid = String(item.aid || '').match(/\d+/)?.[0];
  if (directAid) return { key: 'aid', value: directAid };

  try {
    const url = new URL(item.url);
    const bvid = url.pathname.match(/\/(BV[0-9A-Za-z]{10})(?:\/|$)/i)?.[1];
    if (bvid) return { key: 'bvid', value: bvid };

    const aid = url.pathname.match(/\/av(\d+)(?:\/|$)/i)?.[1];
    if (aid) return { key: 'aid', value: aid };
  } catch {
    return null;
  }

  return null;
}

function detectProvider(item) {
  const explicit = String(item.provider || '').trim().toLowerCase();
  if (['youtube', 'bilibili'].includes(explicit)) return explicit;

  try {
    const hostname = new URL(item.url).hostname.toLowerCase();
    if (hostname === 'youtu.be' || hostname.endsWith('youtube.com')) return 'youtube';
    if (hostname.endsWith('bilibili.com')) return 'bilibili';
  } catch {
    return '';
  }

  return '';
}

function videoSpec(item) {
  const provider = detectProvider(item);

  if (item.embedUrl) {
    try {
      const embed = new URL(item.embedUrl);
      const allowed = embed.hostname === 'www.youtube-nocookie.com'
        || embed.hostname === 'www.youtube.com'
        || embed.hostname === 'player.bilibili.com';
      if (allowed) return { provider: provider || 'video', embedUrl: embed.toString() };
    } catch {
      return null;
    }
  }

  if (provider === 'youtube') {
    const id = youtubeId(item);
    if (!id) return null;
    return {
      provider,
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1`
    };
  }

  if (provider === 'bilibili') {
    const identity = bilibiliIdentity(item);
    if (!identity) return null;
    const page = Math.max(1, Number.parseInt(item.page, 10) || 1);
    return {
      provider,
      embedUrl: `https://player.bilibili.com/player.html?${identity.key}=${encodeURIComponent(identity.value)}&page=${page}&high_quality=1&danmaku=0`
    };
  }

  return null;
}

function renderImage(item, index) {
  return `<figure class="visual-card">
    <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt ?? `Artist archive image ${index + 1}`)}" loading="lazy" decoding="async">
    ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
  </figure>`;
}

function renderVideo(item, index) {
  const spec = videoSpec(item);
  const title = item.title || item.alt || `影像记录 ${String(index + 1).padStart(2, '0')}`;
  const caption = item.caption || item.note || '';
  const providerLabel = spec?.provider === 'youtube'
    ? 'YOUTUBE'
    : spec?.provider === 'bilibili'
      ? 'BILIBILI'
      : 'EXTERNAL VIDEO';
  const originalUrl = item.url || item.embedUrl || '#';
  const poster = item.poster
    ? `<img src="${escapeHtml(item.poster)}" alt="" loading="lazy" decoding="async">`
    : '<div class="visual-video-placeholder" aria-hidden="true"></div>';

  if (!spec) {
    return `<figure class="visual-card visual-card--video">
      <div class="visual-video-stage">
        ${poster}
        <a class="visual-video-play" href="${escapeHtml(originalUrl)}" target="_blank" rel="noreferrer" aria-label="在外部网站观看 ${escapeHtml(title)}">
          <span class="visual-video-provider">${providerLabel}</span>
          <span class="visual-video-play-icon" aria-hidden="true"></span>
          <span class="visual-video-open">OPEN EXTERNALLY ↗</span>
        </a>
      </div>
      <figcaption>
        <div><strong>${escapeHtml(title)}</strong>${caption ? `<span>${escapeHtml(caption)}</span>` : ''}</div>
        <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noreferrer">SOURCE ↗</a>
      </figcaption>
    </figure>`;
  }

  return `<figure class="visual-card visual-card--video"
      data-video-embed="${escapeHtml(spec.embedUrl)}"
      data-video-title="${escapeHtml(title)}">
    <div class="visual-video-stage">
      ${poster}
      <button class="visual-video-play" type="button" data-video-play aria-label="播放 ${escapeHtml(title)}">
        <span class="visual-video-provider">${providerLabel}</span>
        <span class="visual-video-play-icon" aria-hidden="true"></span>
        <span class="visual-video-open">CLICK TO LOAD</span>
      </button>
    </div>
    <figcaption>
      <div><strong>${escapeHtml(title)}</strong>${caption ? `<span>${escapeHtml(caption)}</span>` : ''}</div>
      <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noreferrer">SOURCE ↗</a>
    </figcaption>
  </figure>`;
}

function renderGallery(gallery = []) {
  if (!gallery.length) {
    return '<div class="music-empty music-empty--visual"><span>VISUAL ARCHIVE / RESERVED</span><p>盘旋归燕树待栖~</p></div>';
  }

  return gallery.map((item, index) => {
    const isVideo = item?.type === 'video' || Boolean(item?.provider || item?.embedUrl || item?.videoId || item?.bvid || item?.aid);
    return isVideo ? renderVideo(item, index) : renderImage(item, index);
  }).join('');
}

function enhancePage(html, gallery) {
  const galleryHtml = renderGallery(gallery);
  const galleryPattern = /(<section id="gallery" class="music-content-section">[\s\S]*?<div class="visual-grid">)[\s\S]*?(<\/div>\s*<\/section>)/;

  let output = html.replace(galleryPattern, `$1${galleryHtml}$2`);
  output = output.replace(
    /素材目录：\/assets\/Music\/Artists\/[^<]+\//,
    '支持本地图片、YouTube 与哔哩哔哩链接；外部播放器仅在点击后加载。'
  );

  const hasVideo = gallery.some((item) => item?.type === 'video' || item?.provider || item?.embedUrl || item?.videoId || item?.bvid || item?.aid);
  if (!hasVideo) return output;

  if (!output.includes('/css/music-visual-video.css')) {
    output = output.replace(
      '</head>',
      '  <link rel="stylesheet" href="/css/music-visual-video.css?v=20260806-1">\n</head>'
    );
  }

  if (!output.includes('/js/music-visual-video.js')) {
    output = output.replace(
      '</body>',
      '  <script src="/js/music-visual-video.js?v=20260806-1"></script>\n</body>'
    );
  }

  return output;
}

async function main() {
  const artists = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
  let enhanced = 0;

  for (const artist of artists.filter((entry) => entry.status !== 'draft')) {
    const detail = JSON.parse(await readFile(join(DETAILS_ROOT, `${artist.slug}.json`), 'utf8'));
    const pagePath = join(MUSIC_ROOT, artist.slug, 'index.html');
    const source = await readFile(pagePath, 'utf8');
    const output = enhancePage(source, detail.gallery ?? []);

    if (output !== source) {
      await writeFile(pagePath, output, 'utf8');
      enhanced += 1;
    }
  }

  console.log(`Enhanced visual archives for ${enhanced} Music artist page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
