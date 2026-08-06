import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ARTISTS_ROOT = join(ROOT, 'music', 'artists');
const VISUAL_RUNTIME_VERSION = '20260806-4';

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
    const output = source.replace(
      /\/js\/music-visual-video\.js\?v=[^"]+/g,
      `/js/music-visual-video.js?v=${VISUAL_RUNTIME_VERSION}`
    );

    if (output === source) continue;
    await writeFile(file, output, 'utf8');
    updated += 1;
  }

  console.log(`Versioned Music visual runtime in ${updated} page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
