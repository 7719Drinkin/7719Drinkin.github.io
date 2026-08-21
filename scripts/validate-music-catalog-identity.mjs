import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMusicCatalogConfig } from './validate-music-catalog-config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const configResult = await validateMusicCatalogConfig({ root: ROOT });
if (configResult.errors.length) throw new Error(configResult.errors.join('\n'));

const [artistPage, albumPage] = await Promise.all([
  read('music/artists/tan-yonglin/index.html'),
  read('music/artists/tan-yonglin/albums/album-28/index.html')
]);

assert(artistPage.includes('data-artist-key="tan-yonglin"'), 'Generated artist page must expose its canonical artist identity key.');
assert(albumPage.includes('data-artist-key="tan-yonglin"'), 'Generated album page must expose its canonical artist identity key.');
assert(artistPage.includes('data-artist-slug="tan-yonglin"'), 'Generated artist page keeps the profile slug compatibility alias.');
assert(albumPage.includes('data-artist-slug="tan-yonglin"'), 'Generated album page keeps the profile slug compatibility alias.');

console.log(`Validated Music catalog identity boundary for ${configResult.artistKeys.length} configured artist key(s).`);
