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

async function fetchBilibiliTitle(bvid) {
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

    if (!response.ok) return '';
    const payload = await response.json();
    return payload?.code === 0 ? String(payload?.data?.title || '').trim() : '';
  } catch {
    return '';
  }
}

async function titleMapFor(source) {
  const bvids = [...new Set(
    [...source.matchAll(/<small>(BV[0-9A-Za-z]{10})<\/small>/gi)]
      .map((match) => match[1])
  )];

  const entries = await Promise.all(bvids.map(async (bvid) => [
    bvid,
    await fetchBilibiliTitle(bvid)
  ]));

  return new Map(entries);
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

function refinePlaylist(block, titles) {
  let output = block.replace(
    /<header>\s*<p>BILIBILI PLAYLIST<\/p>\s*<h4>[\s\S]*?<\/h4>\s*<span>\d+ VIDEOS<\/span>\s*<\/header>/,
    '<header><h4>播放列表</h4></header>'
  );

  output = output.replace(
    /<button([\s\S]*?)>\s*<span>[\s\S]*?<\/span>\s*<strong>[\s\S]*?<\/strong>\s*<small>([^<]+)<\/small>\s*<i([^>]*)>[\s\S]*?<\/i>\s*<\/button>/g,
    (match, rawAttributes, rawId, iconAttributes) => {
      const id = String(rawId || '').trim();
      const title = titles.get(id) || '正在读取视频标题…';
      let attributes = rawAttributes.replace(
        /\sdata-playlist-title="[^"]*"/,
        `\n      data-playlist-title="${escapeAttribute(title)}"`
      );

      if (/^BV[0-9A-Za-z]{10}$/i.test(id) && !attributes.includes('data-playlist-bvid=')) {
        attributes += `\n      data-playlist-bvid="${id}"`;
      }

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
