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

function refinePlaylist(block) {
  let output = block.replace(
    /<header>\s*<p>BILIBILI PLAYLIST<\/p>\s*<h4>[\s\S]*?<\/h4>\s*<span>\d+ VIDEOS<\/span>\s*<\/header>/,
    '<header><h4>播放列表</h4></header>'
  );

  output = output.replace(
    /<button([\s\S]*?)>\s*<span>[\s\S]*?<\/span>\s*<strong>[\s\S]*?<\/strong>\s*<small>([^<]+)<\/small>\s*<i([^>]*)>[\s\S]*?<\/i>\s*<\/button>/g,
    (match, rawAttributes, rawId, iconAttributes) => {
      const id = String(rawId || '').trim();
      let attributes = rawAttributes.replace(
        /\sdata-playlist-title="[^"]*"/,
        '\n      data-playlist-title="正在读取视频标题…"'
      );

      if (/^BV[0-9A-Za-z]{10}$/i.test(id) && !attributes.includes('data-playlist-bvid=')) {
        attributes += `\n      data-playlist-bvid="${id}"`;
      }

      return `<button${attributes}>
    <strong data-playlist-label>正在读取视频标题…</strong>
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
    const output = source.replace(
      /<article class="visual-playlist" data-bilibili-playlist>[\s\S]*?<\/article>/g,
      refinePlaylist
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
