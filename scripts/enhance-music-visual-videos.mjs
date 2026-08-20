import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'data/music/artists.json');
const DETAILS_ROOT = join(ROOT, 'data/music/artists');
const MUSIC_ROOT = join(ROOT, 'music', 'artists');
const PHOTO_STYLE_HREF = '/css/music-photo-archive.css?v=20260820-2';

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

function bilibiliEmbedUrl(item) {
  const identity = bilibiliIdentity(item);
  if (!identity) return null;

  const page = Math.max(1, Number.parseInt(item.page, 10) || 1);
  const quality = Math.max(16, Number.parseInt(item.quality, 10) || 80);
  return `https://player.bilibili.com/player.html?${identity.key}=${encodeURIComponent(identity.value)}&p=${page}&poster=1&autoplay=0&danmaku=0&high_quality=1&qn=${quality}`;
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
      videoId: id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1`
    };
  }

  if (provider === 'bilibili') {
    const embedUrl = bilibiliEmbedUrl(item);
    if (!embedUrl) return null;
    return { provider, embedUrl };
  }

  return null;
}

function isPlaylist(item) {
  return item?.type === 'bilibili-playlist' && Array.isArray(item?.videos);
}

function isVideo(item) {
  return isPlaylist(item)
    || item?.type === 'video'
    || Boolean(item?.provider || item?.embedUrl || item?.videoId || item?.bvid || item?.aid);
}

function renderImage(item, index) {
  return `<figure class="visual-card visual-card--photo">
    <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt ?? `Artist archive image ${index + 1}`)}" loading="lazy" decoding="async">
    ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
  </figure>`;
}

function renderPlaylist(item, index) {
  const videos = (item.videos ?? [])
    .map((video, videoIndex) => {
      const embedUrl = bilibiliEmbedUrl(video);
      if (!embedUrl) return null;
      const identity = bilibiliIdentity(video);
      return {
        embedUrl,
        title: video.title || `影像记录 ${String(videoIndex + 1).padStart(2, '0')}`,
        id: identity?.value || '',
        url: video.url || `https://www.bilibili.com/video/${identity?.value || ''}/`
      };
    })
    .filter(Boolean);

  if (!videos.length) {
    return `<div class="music-empty music-empty--visual"><span>PLAYLIST EMPTY</span><p>当前播放列表中没有可用的哔哩哔哩视频。</p></div>`;
  }

  const title = item.title || `影像播放列表 ${String(index + 1).padStart(2, '0')}`;
  const first = videos[0];
  const buttons = videos.map((video, videoIndex) => `<button
      class="visual-playlist-item${videoIndex === 0 ? ' is-active' : ''}"
      type="button"
      data-playlist-src="${escapeHtml(video.embedUrl)}"
      data-playlist-title="${escapeHtml(video.title)}"
      aria-pressed="${videoIndex === 0 ? 'true' : 'false'}">
    <span>${String(videoIndex + 1).padStart(2, '0')}</span>
    <strong>${escapeHtml(video.title)}</strong>
    <small>${escapeHtml(video.id)}</small>
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
      <header>
        <p>BILIBILI PLAYLIST</p>
        <h4>${escapeHtml(title)}</h4>
        <span>${videos.length} VIDEOS</span>
      </header>
      <div class="visual-playlist-items" role="list" aria-label="${escapeHtml(title)}">${buttons}</div>
    </aside>
  </article>`;
}

function renderVideo(item, index) {
  if (isPlaylist(item)) return renderPlaylist(item, index);

  const spec = videoSpec(item);
  const title = item.title || item.alt || `影像记录 ${String(index + 1).padStart(2, '0')}`;
  const caption = item.caption || item.note || '';
  const providerLabel = spec?.provider === 'youtube'
    ? 'YOUTUBE'
    : spec?.provider === 'bilibili'
      ? 'BILIBILI'
      : 'EXTERNAL VIDEO';
  const originalUrl = item.url || item.embedUrl || '#';

  if (!spec) {
    return `<figure class="visual-card visual-card--video visual-card--external">
      <div class="visual-video-stage">
        <div class="visual-video-placeholder" aria-hidden="true"></div>
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

  if (spec.provider === 'bilibili') {
    return `<figure class="visual-card visual-card--video visual-card--bilibili" aria-label="${escapeHtml(title)}">
      <div class="visual-video-stage visual-video-stage--native">
        <iframe
          src="${escapeHtml(spec.embedUrl)}"
          title="${escapeHtml(title)}"
          loading="lazy"
          scrolling="no"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen></iframe>
      </div>
    </figure>`;
  }

  const derivedPoster = item.poster || (spec.videoId
    ? `https://i.ytimg.com/vi/${encodeURIComponent(spec.videoId)}/hqdefault.jpg`
    : '');
  const poster = derivedPoster
    ? `<img src="${escapeHtml(derivedPoster)}" alt="${escapeHtml(title)} 视频封面" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : '<div class="visual-video-placeholder" aria-hidden="true"></div>';

  return `<figure class="visual-card visual-card--video"
      data-video-embed="${escapeHtml(spec.embedUrl)}"
      data-video-title="${escapeHtml(title)}">
    <div class="visual-video-stage">
      ${poster}
      <button class="visual-video-play" type="button" data-video-play aria-label="播放 ${escapeHtml(title)}">
        <span class="visual-video-provider">${providerLabel}</span>
        <span class="visual-video-play-icon" aria-hidden="true"></span>
        <span class="visual-video-open">PLAY IN PAGE</span>
      </button>
    </div>
    <figcaption>
      <div><strong>${escapeHtml(title)}</strong>${caption ? `<span>${escapeHtml(caption)}</span>` : ''}</div>
      <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noreferrer">SOURCE ↗</a>
    </figcaption>
  </figure>`;
}

function renderArchiveHeader(index, eyebrow, title, description) {
  return `<header class="visual-archive-subheader">
    <div><p>${escapeHtml(index)} / ${escapeHtml(eyebrow)}</p><h3>${escapeHtml(title)}</h3></div>
    <span>${escapeHtml(description)}</span>
  </header>`;
}

function renderGallery(gallery = []) {
  if (!gallery.length) {
    return '<div class="music-empty music-empty--visual"><span>VISUAL ARCHIVE / RESERVED</span><p>盘旋归燕树待栖~</p></div>';
  }

  const videos = gallery.filter(isVideo);
  const photos = gallery.filter((item) => !isVideo(item));
  const sections = [];

  if (videos.length) {
    sections.push(`<section class="visual-archive-group visual-archive-group--videos">
      ${renderArchiveHeader('03A', 'VIDEO ARCHIVE', '影像放映', '视频使用独立的宽屏展映区，与照片档案分开呈现。')}
      <div class="visual-video-grid">${videos.map(renderVideo).join('')}</div>
    </section>`);
  }

  if (photos.length) {
    sections.push(`<section class="visual-archive-group visual-archive-group--photos">
      ${renderArchiveHeader(videos.length ? '03B' : '03A', 'PHOTO ARCHIVE', '照片记录', '人物照片使用多列照片墙，保持原始比例完整陈列。')}
      <div class="visual-photo-grid">${photos.map(renderImage).join('')}</div>
    </section>`);
  }

  return `<div class="visual-archive-layout">${sections.join('')}</div>`;
}

function enhancePage(html, gallery) {
  const galleryHtml = renderGallery(gallery);
  const galleryPattern = /(<section id="gallery" class="music-content-section">[\s\S]*?<div class="visual-grid">)[\s\S]*?(<\/div>\s*<\/section>)/;

  let output = html.replace(galleryPattern, `$1${galleryHtml}$2`);
  output = output.replace(
    /素材目录：\/assets\/Music\/Artists\/[^<]+\//,
    '视频与照片分区展示；支持 YouTube、哔哩哔哩及本地图片。'
  );

  const hasVisualArchive = gallery.length > 0;
  const hasVideo = gallery.some(isVideo);
  const hasPhoto = gallery.some((item) => !isVideo(item));

  if (hasVisualArchive) {
    if (!output.includes('/css/music-visual-video.css')) {
      output = output.replace(
        '</head>',
        '  <link rel="stylesheet" href="/css/music-visual-video.css?v=20260806-3">\n</head>'
      );
    } else {
      output = output.replace(/\/css\/music-visual-video\.css\?v=[^"]+/, '/css/music-visual-video.css?v=20260806-3');
    }
  }

  if (hasPhoto) {
    if (!output.includes('/css/music-photo-archive.css')) {
      output = output.replace(
        '</head>',
        `  <link rel="stylesheet" href="${PHOTO_STYLE_HREF}">\n</head>`
      );
    } else {
      output = output.replace(/\/css\/music-photo-archive\.css\?v=[^"]+/, PHOTO_STYLE_HREF);
    }
  }

  if (!hasVideo) return output;

  if (!output.includes('/js/music-visual-video.js')) {
    output = output.replace(
      '</body>',
      '  <script src="/js/music-visual-video.js?v=20260806-3"></script>\n</body>'
    );
  } else {
    output = output.replace(/\/js\/music-visual-video\.js\?v=[^"]+/, '/js/music-visual-video.js?v=20260806-3');
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
