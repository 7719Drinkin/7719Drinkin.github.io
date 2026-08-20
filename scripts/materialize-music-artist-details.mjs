import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createMusicLibraryRepository } from './music/music-library-repository.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DETAILS_ROOT = join(ROOT, 'data/music/artists');
const BACKUP_ROOT = join(tmpdir(), '7719-music-canonical-artist-details');

async function jsonFiles(directory) {
  return (await readdir(directory)).filter((name) => name.endsWith('.json'));
}

async function applyMaterializedProjection() {
  await rm(BACKUP_ROOT, { recursive: true, force: true });
  await mkdir(BACKUP_ROOT, { recursive: true });

  const repository = createMusicLibraryRepository({ root: ROOT });
  const files = await jsonFiles(DETAILS_ROOT);

  for (const fileName of files) {
    const sourcePath = join(DETAILS_ROOT, fileName);
    const backupPath = join(BACKUP_ROOT, fileName);
    const source = await readFile(sourcePath, 'utf8');
    await writeFile(backupPath, source, 'utf8');

    const canonical = JSON.parse(source);
    const hydrated = await repository.hydrateArtistDetail(canonical, 'zh');
    await writeFile(sourcePath, `${JSON.stringify(hydrated, null, 2)}\n`, 'utf8');
  }

  console.log(`Materialized legacy Music build projection for ${files.length} artist detail file(s).`);
}

async function restoreCanonicalSources() {
  const files = await jsonFiles(BACKUP_ROOT);
  for (const fileName of files) {
    await cp(join(BACKUP_ROOT, fileName), join(DETAILS_ROOT, fileName));
  }
  await rm(BACKUP_ROOT, { recursive: true, force: true });
  console.log(`Restored ${files.length} canonical Music artist detail file(s).`);
}

const mode = process.argv[2];
if (!['apply', 'restore'].includes(mode)) {
  console.error('Usage: node scripts/materialize-music-artist-details.mjs <apply|restore>');
  process.exitCode = 1;
} else {
  const action = mode === 'apply' ? applyMaterializedProjection : restoreCanonicalSources;
  action().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
