import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARTS_ROOT = join(ROOT, 'scripts', 'music-i18n');
const OUTPUT = join(ROOT, 'js', 'music-i18n.js');

const parts = (await readdir(PARTS_ROOT))
  .filter((name) => name.endsWith('.js.part'))
  .sort();

if (!parts.length) throw new Error('No Music i18n runtime fragments found.');

const source = (await Promise.all(parts.map((name) => readFile(join(PARTS_ROOT, name), 'utf8')))).join('');
await writeFile(OUTPUT, source, 'utf8');
console.log(`Built Music i18n runtime from ${parts.length} fragment(s).`);
