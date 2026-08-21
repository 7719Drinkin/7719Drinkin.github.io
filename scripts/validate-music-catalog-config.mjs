import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function validateMusicCatalogConfig({ root = ROOT } = {}) {
  const path = join(root, 'data/music/catalog.json');
  const config = JSON.parse(await readFile(path, 'utf8'));
  const errors = [];
  const artistCatalogs = config?.artists;

  if (!artistCatalogs || typeof artistCatalogs !== 'object' || Array.isArray(artistCatalogs)) {
    errors.push('data/music/catalog.json artists must be an object keyed by artist identity key.');
    return { errors, artistKeys: [] };
  }

  const artistKeys = Object.keys(artistCatalogs);
  const prefixes = new Set();

  for (const artistKey of artistKeys) {
    if (!ID_PATTERN.test(artistKey)) {
      errors.push(`catalog artist identity key is invalid: ${artistKey}`);
    }
    const prefix = String(artistCatalogs[artistKey]?.prefix ?? '').trim();
    if (!prefix) {
      errors.push(`catalog artist identity ${artistKey} is missing prefix.`);
      continue;
    }
    if (prefixes.has(prefix)) {
      errors.push(`catalog prefix is duplicated: ${prefix}`);
    }
    prefixes.add(prefix);
  }

  return { errors, artistKeys };
}

async function main() {
  const result = await validateMusicCatalogConfig();
  if (result.errors.length) {
    result.errors.forEach((error) => console.error(`ERROR: ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Music catalog identity map valid: ${result.artistKeys.length} artist key(s). Profile pages are not required.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
