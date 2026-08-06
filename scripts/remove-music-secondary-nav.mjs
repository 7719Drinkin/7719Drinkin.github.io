import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'data/music/artists.json');
const MUSIC_ROOT = join(ROOT, 'music', 'artists');

async function main() {
  const artists = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
  let removed = 0;

  for (const artist of artists.filter((entry) => entry.status !== 'draft')) {
    const pagePath = join(MUSIC_ROOT, artist.slug, 'index.html');
    const source = await readFile(pagePath, 'utf8');
    const output = source.replace(
      /\n\s*<nav class="artist-tabs"[\s\S]*?<\/nav>\s*\n/,
      '\n\n'
    );

    if (output !== source) {
      await writeFile(pagePath, output, 'utf8');
      removed += 1;
    }
  }

  console.log(`Removed duplicate artist navigation from ${removed} Music page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
