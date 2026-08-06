import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ARTISTS_ROOT = join(ROOT, 'music', 'artists');

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return extname(entry.name) === '.html' ? [path] : [];
  }));
  return nested.flat();
}

async function fetchBilibiliMetadata(bvid) {
  try {
    const response = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
      {
        signal: AbortSignal.timeout(6500),
        headers: {
          Accept: 'application/json',
          Referer: 'https://www.bilibili.com/',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151 Safari/537.36'
        }
      }
    );

    if (!response.ok) return null;
    const payload = await response.json();
    if (payload?.code !== 0 || !payload?.data) return null;

    return {
      title: String(payload.data.title || '').trim(),
      pages: Array.isArray(payload.data.pages) ? payload.data.pages : []
    };
  } catch {
    return null;
  }
}

function decodeAttribute(value = '') {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'");
}

function pageFromAttributes(rawAttributes = '') {
  const rawUrl = rawAttributes.match(/data-playlist-src="([^"]+)"/)?.[1];
  if (!rawUrl) return 1;

  try {
    const url = new URL(decodeAttribute(rawUrl));
    return Math.max(1, Number.parseInt(url.searchParams.get('p'), 10) || 1);
  } catch {
    return 1;
  }
}

function titleFromMetadata(metadata, page) {
  if (!metadata) return '';
  const pageRow = metadata.pages.find((entry) => Number(entry?.page) === page);
  const partTitle = String(pageRow?.part || '').trim();

  if (metadata.pages.length > 1 && partTitle) return partTitle;
  return metadata.title || partTitle;
}

async function titleMapFor(source) {
  const entries = [...source.matchAll(/<button([\s\S]*?)<\/button>/g)]
    .map((match) => {
      const rawAttributes = match[1];
      if (!rawAttributes.includes('data-playlist-src=')) return null;
      const bvid = match[0].match(/<small>(BV[0-9A-Za-z]{10})<\/small>/i)?.[1];
      if (!bvid) return null;
      return { bvid, page: pageFromAttributes(rawAttributes) };
    })
    .filter(Boolean);

  const uniqueBvids = [...new Set(entries.map((entry) => entry.bvid))];
  const metadataEntries = await Promise.all(uniqueBvids.map(async (bvid) => [
    bvid,
    await fetchBilibiliMetadata(bvid)
  ]));
  const metadata = new Map(metadataEntries);

  return new Map(entries.map((entry) => [
    `${entry.bvid}:p${entry.page}`,
    titleFromMetadata(metadata.get(entry.bvid), entry.page)
  ]));
}

function escapeAttribute(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeText(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setAttribute(rawAttributes, name, value) {
  const encoded = escapeAttribute(value);
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  if (pattern.test(rawAttributes)) {
    return rawAttributes.replace(pattern, `\n      ${name}="${encoded}"`);
  }
  return `${rawAttributes}\n      ${name}="${encoded}"`;
}

function refinePlaylist(block, titles) {
  let output = block.replace(
    /<header>\s*<p>BILIBILI PLAYLIST<\/p>\s*<h4>[\s\S]*?<\/h4>\s*<span>\d+ VIDEOS<\/span>\s*<\/header>/,
    '<header><h4>播放列表</h4></header>'
  );

  output = output.replace(
    /<button([\s\S]*?)>\s*<span>[\s\S]*?<\/span>\s*<strong>[\s\S]*?<\/strong>\s*<small>([^<]+)<\/small>\s*<i([^>]*)>[\s\S]*?<\/i>\s*<\/button>/g,
    (match, rawAttributes, rawId, iconAttributes) => {
      const id = String(rawId || '').trim();
      const page = pageFromAttributes(rawAttributes);
      const title = titles.get(`${id}:p${page}`) || '正在读取视频标题…';

      let attributes = setAttribute(rawAttributes, 'data-playlist-title', title);
      if (/^BV[0-9A-Za-z]{10}$/i.test(id)) {
        attributes = setAttribute(attributes, 'data-playlist-bvid', id);
      }
      attributes = setAttribute(attributes, 'data-playlist-page', String(page));

      return `<button${attributes}>
    <strong data-playlist-label>${escapeText(title)}</strong>
    <i${iconAttributes}>▶</i>
  </button>`;
    }
  );

  return output;
}

async function main() {
  const files = await htmlFiles(MUSIC_ARTISTS_ROOT);
  let updated = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const titles = await titleMapFor(source);
    const output = source.replace(
      /<article class="visual-playlist" data-bilibili-playlist>[\s\S]*?<\/article>/g,
      (block) => refinePlaylist(block, titles)
    );

    if (output === source) continue;
    await writeFile(file, output, 'utf8');
    updated += 1;
  }

  console.log(`Refined Bilibili playlists in ${updated} Music page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
