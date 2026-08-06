import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ARTISTS_ROOT = join(ROOT, 'music', 'artists');
const MUSIC_ALBUM_CSS_VERSION = '20260806-2';
const MUSIC_RUNTIME_VERSION = '20260806-albums-2';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return extname(entry.name) === '.html' ? [path] : [];
  }));
  return nested.flat();
}

async function main() {
  const files = await htmlFiles(MUSIC_ARTISTS_ROOT);
  let updated = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const output = source
      .replace(
        /\/css\/music-album\.css\?v=[^"]+/g,
        `/css/music-album.css?v=${MUSIC_ALBUM_CSS_VERSION}`
      )
      .replace(
        /\/js\/music\.js\?v=[^"]+/g,
        `/js/music.js?v=${MUSIC_RUNTIME_VERSION}`
      );

    if (output === source) continue;
    await writeFile(file, output, 'utf8');
    updated += 1;
  }

  console.log(`Versioned Music album assets in ${updated} page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
